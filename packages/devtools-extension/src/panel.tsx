import { useEffect, useReducer, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Breakpoint, BreakpointsTab } from './panel/Breakpoints'

// ─── Event types (mirrors devtoolsPlugin.ts from @byrding/core) ───────────────

interface StoreInitEvent {
  type: 'store:init'
  storeId: string
  state: Record<string, unknown>
  stateKeys: string[]
  actionKeys: string[]
  computedKeys: string[]
  timestamp: number
}

interface StateChangeEvent {
  type: 'state:change'
  storeId: string
  keyPath: string
  oldValue: unknown
  newValue: unknown
  timestamp: number
}

interface ActionBeforeEvent {
  type: 'action:before'
  storeId: string
  action: string
  args: unknown[]
  timestamp: number
}

interface ActionAfterEvent {
  type: 'action:after'
  storeId: string
  action: string
  args: unknown[]
  result: unknown
  durationMs: number
  timestamp: number
}

interface ComponentMountedEvent {
  type: 'component:mounted'
  componentId: string
  name: string
  framework: 'react' | 'vue'
  storeId: string
  keyPaths: string[]
  timestamp: number
}

interface ComponentUnmountedEvent {
  type: 'component:unmounted'
  componentId: string
  storeId: string
  timestamp: number
}

interface ComponentRenderedEvent {
  type: 'component:rendered'
  componentId: string
  name: string
  storeId: string
  renderCount: number
  timestamp: number
}

type DevtoolsEvent =
  | StoreInitEvent
  | StateChangeEvent
  | ActionBeforeEvent
  | ActionAfterEvent
  | ComponentMountedEvent
  | ComponentUnmountedEvent
  | ComponentRenderedEvent
  | { type: string; [key: string]: unknown }

// ─── Panel state ──────────────────────────────────────────────────────────────

interface StoreData {
  storeId: string
  snapshot: Record<string, unknown>
  stateKeys: string[]
  actionKeys: string[]
  computedKeys: string[]
}

interface ComponentEntry {
  componentId: string
  name: string
  framework: 'react' | 'vue'
  storeId: string
  keyPaths: string[]
  renderCount: number
  mounted: boolean
}

interface ActionEntry {
  id: number
  storeId: string
  action: string
  args: unknown[]
  result?: unknown
  durationMs?: number
  timestamp: number
  stateBefore: Record<string, unknown>
}

const MAX_ACTION_LOG = 500
const FLASH_DURATION_MS = 800

interface PanelState {
  connected: boolean
  stores: Record<string, StoreData>
  storeOrder: string[]
  actionLog: ActionEntry[]
  components: Record<string, ComponentEntry>
  selectedStoreId: string | null
  activeTab: 'inspector' | 'actions' | 'components' | 'breakpoints'
  selectedActionId: number | null
  flashPaths: Record<string, string[]>
  breakpoints: Breakpoint[]
  bpErrors: Record<string, string>
}

type PanelAction =
  | { type: 'set_connected'; connected: boolean }
  | { type: 'devtools_event'; event: DevtoolsEvent }
  | { type: 'clear' }
  | { type: 'select_store'; storeId: string | null }
  | { type: 'set_tab'; tab: PanelState['activeTab'] }
  | { type: 'select_action'; actionId: number | null }
  | { type: 'flash_done'; storeId: string; keyPath: string }
  | { type: 'bp_add'; bp: Breakpoint }
  | { type: 'bp_remove'; id: string }
  | { type: 'bp_toggle'; id: string }
  | { type: 'bp_deactivate_all' }
  | { type: 'bp_reactivate_all' }
  | { type: 'bp_error'; bpId: string; message: string }

function makeInitialState(): PanelState {
  return {
    connected: false,
    stores: {},
    storeOrder: [],
    actionLog: [],
    components: {},
    selectedStoreId: null,
    activeTab: 'inspector',
    selectedActionId: null,
    flashPaths: {},
    breakpoints: [],
    bpErrors: {},
  }
}

function applyKeyPath(
  snapshot: Record<string, unknown>,
  keyPath: string,
  value: unknown,
): Record<string, unknown> {
  const parts = keyPath.split('.')
  const result = { ...snapshot }
  if (parts.length === 1) {
    result[keyPath] = value
    return result
  }
  let obj: Record<string, unknown> = result
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i]
    obj[k] = { ...(obj[k] as Record<string, unknown> ?? {}) }
    obj = obj[k] as Record<string, unknown>
  }
  obj[parts[parts.length - 1]] = value
  return result
}

function handleEvent(state: PanelState, event: DevtoolsEvent): PanelState {
  switch (event.type) {
    case 'store:init': {
      const e = event as StoreInitEvent
      const exists = state.stores[e.storeId]
      const storeData: StoreData = {
        storeId: e.storeId,
        snapshot: e.state,
        stateKeys: e.stateKeys,
        actionKeys: e.actionKeys,
        computedKeys: e.computedKeys,
      }
      return {
        ...state,
        stores: { ...state.stores, [e.storeId]: storeData },
        storeOrder: exists ? state.storeOrder : [...state.storeOrder, e.storeId],
        selectedStoreId: state.selectedStoreId ?? e.storeId,
      }
    }

    case 'state:change': {
      const e = event as StateChangeEvent
      const store = state.stores[e.storeId]
      if (!store) return state
      const newSnapshot = applyKeyPath(store.snapshot, e.keyPath, e.newValue)
      const existing = state.flashPaths[e.storeId] ?? []
      const newFlash = existing.includes(e.keyPath) ? existing : [...existing, e.keyPath]
      return {
        ...state,
        stores: { ...state.stores, [e.storeId]: { ...store, snapshot: newSnapshot } },
        flashPaths: { ...state.flashPaths, [e.storeId]: newFlash },
      }
    }

    case 'action:before': {
      const e = event as ActionBeforeEvent
      const store = state.stores[e.storeId]
      const entry: ActionEntry = {
        id: Date.now() + Math.random(),
        storeId: e.storeId,
        action: e.action,
        args: e.args,
        timestamp: e.timestamp,
        stateBefore: store ? { ...store.snapshot } : {},
      }
      const newLog = [...state.actionLog, entry]
      if (newLog.length > MAX_ACTION_LOG) newLog.splice(0, newLog.length - MAX_ACTION_LOG)
      return { ...state, actionLog: newLog }
    }

    case 'action:after': {
      const e = event as ActionAfterEvent
      // Match most recent unresolved action for this store + action name
      let matched = false
      const newLog = [...state.actionLog].reverse().map((a) => {
        if (!matched && a.storeId === e.storeId && a.action === e.action && a.durationMs === undefined) {
          matched = true
          return { ...a, result: e.result, durationMs: e.durationMs }
        }
        return a
      }).reverse()
      return { ...state, actionLog: newLog }
    }

    case 'component:mounted': {
      const e = event as ComponentMountedEvent
      const entry: ComponentEntry = {
        componentId: e.componentId,
        name: e.name,
        framework: e.framework,
        storeId: e.storeId,
        keyPaths: e.keyPaths,
        renderCount: 0,
        mounted: true,
      }
      return { ...state, components: { ...state.components, [e.componentId]: entry } }
    }

    case 'component:unmounted': {
      const e = event as ComponentUnmountedEvent
      const comp = state.components[e.componentId]
      if (!comp) return state
      return {
        ...state,
        components: { ...state.components, [e.componentId]: { ...comp, mounted: false } },
      }
    }

    case 'component:rendered': {
      const e = event as ComponentRenderedEvent
      const comp = state.components[e.componentId]
      if (!comp) return state
      return {
        ...state,
        components: { ...state.components, [e.componentId]: { ...comp, renderCount: e.renderCount } },
      }
    }

    default:
      return state
  }
}

function reducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case 'set_connected':
      return { ...state, connected: action.connected }
    case 'devtools_event':
      return handleEvent(state, action.event)
    case 'clear':
      // Preserve breakpoints across clears; they are managed independently
      return {
        ...makeInitialState(),
        connected: state.connected,
        breakpoints: state.breakpoints.map((bp) => ({ ...bp, active: false })),
        bpErrors: {},
      }
    case 'select_store':
      return { ...state, selectedStoreId: action.storeId, selectedActionId: null }
    case 'set_tab':
      return { ...state, activeTab: action.tab }
    case 'select_action':
      return { ...state, selectedActionId: action.actionId }
    case 'flash_done': {
      const existing = state.flashPaths[action.storeId] ?? []
      return {
        ...state,
        flashPaths: {
          ...state.flashPaths,
          [action.storeId]: existing.filter((p) => p !== action.keyPath),
        },
      }
    }
    case 'bp_add':
      return { ...state, breakpoints: [...state.breakpoints, action.bp] }
    case 'bp_remove':
      return {
        ...state,
        breakpoints: state.breakpoints.filter((bp) => bp.id !== action.id),
        bpErrors: Object.fromEntries(
          Object.entries(state.bpErrors).filter(([k]) => k !== action.id),
        ),
      }
    case 'bp_toggle':
      return {
        ...state,
        breakpoints: state.breakpoints.map((bp) =>
          bp.id === action.id ? { ...bp, active: !bp.active } : bp,
        ),
      }
    case 'bp_deactivate_all':
      return {
        ...state,
        breakpoints: state.breakpoints.map((bp) => ({ ...bp, active: false })),
      }
    case 'bp_reactivate_all':
      return {
        ...state,
        breakpoints: state.breakpoints.map((bp) => ({ ...bp, active: true })),
        bpErrors: {},
      }
    case 'bp_error':
      return { ...state, bpErrors: { ...state.bpErrors, [action.bpId]: action.message } }
  }
}

const STORAGE_KEY_PREFIX = 'byrding:bp:'

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const [state, dispatch] = useReducer(reducer, null, makeInitialState)
  const portRef = useRef<chrome.runtime.Port | null>(null)
  const breakpointsRef = useRef<Breakpoint[]>([])
  breakpointsRef.current = state.breakpoints
  const tabId = chrome.devtools.inspectedWindow.tabId

  function sendToPage(msg: Record<string, unknown>) {
    portRef.current?.postMessage(msg)
  }

  useEffect(() => {
    // Load persisted breakpoints for this tab
    chrome.storage.local.get(STORAGE_KEY_PREFIX + tabId, (result) => {
      const stored = result[STORAGE_KEY_PREFIX + tabId] as Breakpoint[] | undefined
      if (stored?.length) {
        for (const bp of stored) {
          dispatch({ type: 'bp_add', bp: { ...bp, active: false } })
        }
      }
    })
  }, [tabId])

  useEffect(() => {
    // Persist breakpoints to storage whenever they change
    chrome.storage.local.set({ [STORAGE_KEY_PREFIX + tabId]: state.breakpoints })
  }, [state.breakpoints, tabId])

  useEffect(() => {
    function checkConnection(onConnected?: () => void) {
      chrome.devtools.inspectedWindow.eval(
        "typeof window.__BYRDING_DEVTOOLS__ !== 'undefined'",
        (result: unknown) => {
          const connected = result === true
          dispatch({ type: 'set_connected', connected })
          if (connected) onConnected?.()
        },
      )
    }

    checkConnection()

    const port = chrome.runtime.connect({ name: 'byrding:devtools' })
    portRef.current = port
    port.postMessage({ type: 'byrding:init', tabId: chrome.devtools.inspectedWindow.tabId })

    port.onMessage.addListener((event: DevtoolsEvent) => {
      dispatch({ type: 'devtools_event', event })
      if (event.type === 'state:change') {
        const e = event as StateChangeEvent
        setTimeout(() => {
          dispatch({ type: 'flash_done', storeId: e.storeId, keyPath: e.keyPath })
        }, FLASH_DURATION_MS)
      }
      if (event.type === 'byrding:bp:error') {
        const e = event as { type: string; bpId: string; message: string }
        dispatch({ type: 'bp_error', bpId: e.bpId, message: e.message })
      }
    })

    function onNavigated() {
      dispatch({ type: 'clear' })
      // Clear injected script breakpoints; they will be re-registered on reconnect
      port.postMessage({ type: 'byrding:bp:clear' })
      setTimeout(
        () =>
          checkConnection(() => {
            // Re-activate all breakpoints after reconnection
            dispatch({ type: 'bp_reactivate_all' })
            // Re-send each breakpoint via ref to avoid stale closure
            for (const bp of breakpointsRef.current) {
              port.postMessage({ type: 'byrding:bp:add', config: { ...bp, active: true } })
            }
          }),
        500,
      )
    }

    chrome.devtools.network.onNavigated.addListener(onNavigated)

    return () => {
      port.disconnect()
      portRef.current = null
      chrome.devtools.network.onNavigated.removeListener(onNavigated)
    }
  }, [])

  const selectedStore = state.selectedStoreId ? state.stores[state.selectedStoreId] : null
  const flashPaths = state.selectedStoreId ? (state.flashPaths[state.selectedStoreId] ?? []) : []

  const selectedAction = state.selectedActionId !== null
    ? state.actionLog.find((a) => a.id === state.selectedActionId) ?? null
    : null

  function handleBpAdd(bp: Omit<Breakpoint, 'id' | 'active'>) {
    const newBp: Breakpoint = { ...bp, id: crypto.randomUUID(), active: true }
    dispatch({ type: 'bp_add', bp: newBp })
    sendToPage({ type: 'byrding:bp:add', config: newBp })
  }

  function handleBpRemove(id: string) {
    dispatch({ type: 'bp_remove', id })
    sendToPage({ type: 'byrding:bp:remove', id })
  }

  function handleBpToggle(id: string) {
    const bp = state.breakpoints.find((b) => b.id === id)
    if (!bp) return
    dispatch({ type: 'bp_toggle', id })
    if (bp.active) {
      sendToPage({ type: 'byrding:bp:remove', id })
    } else {
      sendToPage({ type: 'byrding:bp:add', config: { ...bp, active: true } })
    }
  }

  return (
    <div style={s.root}>
      <Header
        connected={state.connected}
        hasData={state.storeOrder.length > 0 || state.actionLog.length > 0}
        onClear={() => dispatch({ type: 'clear' })}
      />
      <div style={s.body}>
        <Sidebar
          storeOrder={state.storeOrder}
          selectedStoreId={state.selectedStoreId}
          onSelect={(id) => dispatch({ type: 'select_store', storeId: id })}
        />
        <div style={s.main}>
          <TabBar
            activeTab={state.activeTab}
            storeCount={state.storeOrder.length}
            actionCount={state.actionLog.length}
            componentCount={Object.keys(state.components).length}
            bpCount={state.breakpoints.filter((bp) => bp.active).length}
            onSetTab={(tab) => dispatch({ type: 'set_tab', tab })}
          />
          {state.activeTab === 'inspector' && (
            <InspectorTab store={selectedStore} flashPaths={flashPaths} />
          )}
          {state.activeTab === 'actions' && (
            <ActionsTab
              actionLog={state.actionLog}
              selectedActionId={state.selectedActionId}
              selectedAction={selectedAction}
              currentSnapshots={Object.fromEntries(
                Object.entries(state.stores).map(([id, st]) => [id, st.snapshot]),
              )}
              onSelectAction={(id) => dispatch({ type: 'select_action', actionId: id })}
            />
          )}
          {state.activeTab === 'components' && (
            <ComponentsTab components={Object.values(state.components)} />
          )}
          {state.activeTab === 'breakpoints' && (
            <BreakpointsTab
              breakpoints={state.breakpoints}
              bpErrors={state.bpErrors}
              storeIds={state.storeOrder}
              onAdd={handleBpAdd}
              onRemove={handleBpRemove}
              onToggle={handleBpToggle}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({
  connected,
  hasData,
  onClear,
}: {
  connected: boolean
  hasData: boolean
  onClear: () => void
}) {
  return (
    <div style={s.header}>
      <span style={s.title}>Byrding</span>
      <span style={{ ...s.badge, ...(connected ? s.badgeGreen : s.badgeRed) }}>
        {connected ? 'Connected' : 'Not detected'}
      </span>
      {hasData && (
        <button style={s.clearBtn} onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  storeOrder,
  selectedStoreId,
  onSelect,
}: {
  storeOrder: string[]
  selectedStoreId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div style={s.sidebar}>
      <div style={s.sidebarLabel}>Stores</div>
      {storeOrder.length === 0 && (
        <p style={s.empty}>No stores yet</p>
      )}
      {storeOrder.map((id) => (
        <button
          key={id}
          style={{
            ...s.storeBtn,
            ...(id === selectedStoreId ? s.storeBtnActive : {}),
          }}
          onClick={() => onSelect(id)}
        >
          {id}
        </button>
      ))}
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  activeTab,
  storeCount,
  actionCount,
  componentCount,
  bpCount,
  onSetTab,
}: {
  activeTab: PanelState['activeTab']
  storeCount: number
  actionCount: number
  componentCount: number
  bpCount: number
  onSetTab: (tab: PanelState['activeTab']) => void
}) {
  const tabs: { key: PanelState['activeTab']; label: string; count: number }[] = [
    { key: 'inspector', label: 'Inspector', count: storeCount },
    { key: 'actions', label: 'Actions', count: actionCount },
    { key: 'components', label: 'Components', count: componentCount },
    { key: 'breakpoints', label: 'Breakpoints', count: bpCount },
  ]
  return (
    <div style={s.tabBar}>
      {tabs.map((t) => (
        <button
          key={t.key}
          style={{ ...s.tab, ...(activeTab === t.key ? s.tabActive : {}) }}
          onClick={() => onSetTab(t.key)}
        >
          {t.label}
          {t.count > 0 && <span style={s.tabCount}>{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

// ─── Inspector tab ────────────────────────────────────────────────────────────

function InspectorTab({
  store,
  flashPaths,
}: {
  store: StoreData | null
  flashPaths: string[]
}) {
  if (!store) {
    return <p style={s.empty}>Select a store from the sidebar.</p>
  }

  return (
    <div style={s.tabContent}>
      <div style={s.storeHeader}>
        <strong>{store.storeId}</strong>
        {store.actionKeys.length > 0 && (
          <span style={s.pill}>
            actions: {store.actionKeys.join(', ')}
          </span>
        )}
      </div>
      <div style={s.treeWrap}>
        {store.stateKeys.length === 0 ? (
          <p style={s.empty}>No state keys.</p>
        ) : (
          store.stateKeys.map((k) => (
            <StateRow
              key={k}
              label={k}
              value={store.snapshot[k]}
              path={k}
              flashPaths={flashPaths}
              depth={0}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── State tree ───────────────────────────────────────────────────────────────

function StateRow({
  label,
  value,
  path,
  flashPaths,
  depth,
}: {
  label: string
  value: unknown
  path: string
  flashPaths: string[]
  depth: number
}) {
  const [open, setOpen] = useState(true)
  const isFlashing = flashPaths.includes(path)
  const isObject = value !== null && typeof value === 'object'
  const entries = isObject ? Object.entries(value as Record<string, unknown>) : null

  return (
    <div
      style={{
        ...s.stateRow,
        paddingLeft: depth * 12,
        background: isFlashing ? '#fef3c7' : undefined,
        transition: `background ${FLASH_DURATION_MS}ms ease-out`,
      }}
    >
      <span
        style={s.stateToggle}
        onClick={isObject ? () => setOpen((o) => !o) : undefined}
      >
        {isObject ? (open ? '▾' : '▸') : ' '}
      </span>
      <span style={s.stateKey}>{label}</span>
      <span style={s.stateColon}>: </span>
      {isObject ? (
        open ? (
          entries!.length === 0 ? (
            <span style={s.valNull}>{Array.isArray(value) ? '[]' : '{}'}</span>
          ) : null
        ) : (
          <span style={s.valNull}>
            {Array.isArray(value) ? `[${entries!.length}]` : `{…}`}
          </span>
        )
      ) : (
        <JsonValue value={value} />
      )}
      {isObject && open && entries!.length > 0 && (
        <div>
          {entries!.map(([k, v]) => (
            <StateRow
              key={k}
              label={Array.isArray(value) ? `[${k}]` : k}
              value={v}
              path={`${path}.${k}`}
              flashPaths={flashPaths}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function JsonValue({ value }: { value: unknown }) {
  if (value === null) return <span style={s.valNull}>null</span>
  if (value === undefined) return <span style={s.valNull}>undefined</span>
  if (typeof value === 'boolean') return <span style={s.valBool}>{String(value)}</span>
  if (typeof value === 'number') return <span style={s.valNum}>{value}</span>
  if (typeof value === 'string') return <span style={s.valStr}>"{value}"</span>
  return <span style={s.valNull}>{String(value)}</span>
}

// ─── Actions tab ──────────────────────────────────────────────────────────────

function ActionsTab({
  actionLog,
  selectedActionId,
  selectedAction,
  currentSnapshots,
  onSelectAction,
}: {
  actionLog: ActionEntry[]
  selectedActionId: number | null
  selectedAction: ActionEntry | null
  currentSnapshots: Record<string, Record<string, unknown>>
  onSelectAction: (id: number | null) => void
}) {
  return (
    <div style={s.actionsLayout}>
      <div style={s.actionList}>
        {actionLog.length === 0 && (
          <p style={s.empty}>No actions yet. Trigger store actions to see them here.</p>
        )}
        {[...actionLog].reverse().map((entry) => (
          <button
            key={entry.id}
            style={{
              ...s.actionEntry,
              ...(entry.id === selectedActionId ? s.actionEntryActive : {}),
            }}
            onClick={() =>
              onSelectAction(entry.id === selectedActionId ? null : entry.id)
            }
          >
            <span style={s.actionName}>{entry.action}</span>
            <span style={s.actionStore}>{entry.storeId}</span>
            {entry.durationMs !== undefined && (
              <span style={s.actionDuration}>{entry.durationMs.toFixed(1)}ms</span>
            )}
            <span style={s.actionTime}>{formatTime(entry.timestamp)}</span>
          </button>
        ))}
      </div>
      <div style={s.actionDetail}>
        {!selectedAction ? (
          <p style={s.empty}>Select an action to see state diff.</p>
        ) : (
          <ActionDetail
            entry={selectedAction}
            currentSnapshot={currentSnapshots[selectedAction.storeId] ?? {}}
          />
        )}
      </div>
    </div>
  )
}

function ActionDetail({
  entry,
  currentSnapshot,
}: {
  entry: ActionEntry
  currentSnapshot: Record<string, unknown>
}) {
  const diffKeys = new Set([
    ...Object.keys(entry.stateBefore),
    ...Object.keys(currentSnapshot),
  ])
  const diffs = Array.from(diffKeys).filter(
    (k) => JSON.stringify(entry.stateBefore[k]) !== JSON.stringify(currentSnapshot[k]),
  )

  return (
    <div style={s.detailWrap}>
      <div style={s.detailTitle}>
        <strong>{entry.action}</strong>
        <span style={s.actionStore}> · {entry.storeId}</span>
        {entry.durationMs !== undefined && (
          <span style={s.actionDuration}> · {entry.durationMs.toFixed(1)}ms</span>
        )}
      </div>

      {entry.args.length > 0 && (
        <section style={s.detailSection}>
          <div style={s.detailLabel}>Args</div>
          <pre style={s.pre}>{JSON.stringify(entry.args, null, 2)}</pre>
        </section>
      )}

      {entry.result !== undefined && (
        <section style={s.detailSection}>
          <div style={s.detailLabel}>Result</div>
          <pre style={s.pre}>{JSON.stringify(entry.result, null, 2)}</pre>
        </section>
      )}

      <section style={s.detailSection}>
        <div style={s.detailLabel}>State diff (before → current)</div>
        {diffs.length === 0 ? (
          <p style={s.empty}>No state changes detected.</p>
        ) : (
          diffs.map((k) => (
            <div key={k} style={s.diffRow}>
              <span style={s.diffKey}>{k}</span>
              <div style={s.diffValues}>
                <div style={s.diffBefore}>
                  <span style={s.diffLabel}>before</span>
                  <pre style={s.pre}>{JSON.stringify(entry.stateBefore[k], null, 2)}</pre>
                </div>
                <div style={s.diffAfter}>
                  <span style={s.diffLabel}>after</span>
                  <pre style={s.pre}>{JSON.stringify(currentSnapshot[k], null, 2)}</pre>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

// ─── Components tab ───────────────────────────────────────────────────────────

function ComponentsTab({ components }: { components: ComponentEntry[] }) {
  if (components.length === 0) {
    return (
      <p style={s.empty}>
        No component events detected. Component tracking requires framework adapters
        that emit component:mounted/unmounted/rendered events.
      </p>
    )
  }

  const mounted = components.filter((c) => c.mounted)
  const unmounted = components.filter((c) => !c.mounted)

  return (
    <div style={s.tabContent}>
      {mounted.length > 0 && (
        <section style={s.detailSection}>
          <div style={s.detailLabel}>Active ({mounted.length})</div>
          {mounted.map((c) => (
            <ComponentRow key={c.componentId} entry={c} />
          ))}
        </section>
      )}
      {unmounted.length > 0 && (
        <section style={s.detailSection}>
          <div style={s.detailLabel}>Unmounted ({unmounted.length})</div>
          {unmounted.map((c) => (
            <ComponentRow key={c.componentId} entry={c} />
          ))}
        </section>
      )}
    </div>
  )
}

function ComponentRow({ entry }: { entry: ComponentEntry }) {
  return (
    <div style={{ ...s.actionEntry, cursor: 'default' }}>
      <span style={s.actionName}>{entry.name}</span>
      <span style={s.actionStore}>{entry.storeId}</span>
      <span style={{ ...s.badge, ...(entry.framework === 'react' ? s.badgeBlue : s.badgeGreen) }}>
        {entry.framework}
      </span>
      {entry.renderCount > 0 && (
        <span style={s.actionDuration}>×{entry.renderCount}</span>
      )}
      <span style={{ ...s.badge, ...(entry.mounted ? s.badgeGreen : s.badgeRed) }}>
        {entry.mounted ? 'mounted' : 'unmounted'}
      </span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '12px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    color: '#1f2937',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
    background: '#f9fafb',
  },
  title: { fontWeight: 700, fontSize: '13px', letterSpacing: '0.02em' },
  badge: { padding: '1px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 500 },
  badgeGreen: { background: '#d1fae5', color: '#065f46' },
  badgeRed: { background: '#fee2e2', color: '#991b1b' },
  badgeBlue: { background: '#dbeafe', color: '#1e40af' },
  clearBtn: {
    marginLeft: 'auto',
    padding: '2px 8px',
    fontSize: '11px',
    cursor: 'pointer',
    border: '1px solid #d1d5db',
    borderRadius: '3px',
    background: '#fff',
    color: '#374151',
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: '160px',
    flexShrink: 0,
    borderRight: '1px solid #e5e7eb',
    overflowY: 'auto',
    background: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarLabel: {
    padding: '6px 10px 4px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#9ca3af',
  },
  storeBtn: {
    textAlign: 'left',
    padding: '5px 10px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#374151',
    fontSize: '12px',
    borderLeft: '2px solid transparent',
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  storeBtnActive: {
    background: '#ede9fe',
    color: '#5b21b6',
    borderLeftColor: '#7c3aed',
    fontWeight: 600,
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
    background: '#fff',
  },
  tab: {
    padding: '6px 12px',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  tabActive: { color: '#7c3aed', borderBottomColor: '#7c3aed', fontWeight: 600 },
  tabCount: {
    background: '#e5e7eb',
    color: '#374151',
    borderRadius: '10px',
    padding: '0 5px',
    fontSize: '10px',
    minWidth: '16px',
    textAlign: 'center',
  },
  tabContent: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  storeHeader: {
    padding: '6px 12px 4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid #f3f4f6',
    flexWrap: 'wrap',
  },
  pill: {
    fontSize: '10px',
    background: '#f3f4f6',
    color: '#6b7280',
    borderRadius: '4px',
    padding: '1px 6px',
  },
  treeWrap: { padding: '4px 0' },
  stateRow: {
    padding: '2px 0 2px 8px',
    lineHeight: '1.6',
    borderLeft: '2px solid transparent',
  },
  stateToggle: { cursor: 'pointer', color: '#9ca3af', fontSize: '10px', marginRight: '3px', userSelect: 'none' },
  stateKey: { color: '#1e40af', fontWeight: 500 },
  stateColon: { color: '#9ca3af' },
  valNull: { color: '#9ca3af' },
  valBool: { color: '#7c3aed' },
  valNum: { color: '#2563eb' },
  valStr: { color: '#059669' },
  empty: { color: '#9ca3af', padding: '12px 16px', margin: 0, fontStyle: 'italic' },
  actionsLayout: { display: 'flex', flex: 1, overflow: 'hidden' },
  actionList: { width: '260px', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid #e5e7eb' },
  actionEntry: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 10px',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#f3f4f6',
    width: '100%',
    textAlign: 'left',
    fontSize: '12px',
    flexWrap: 'wrap',
  },
  actionEntryActive: { background: '#ede9fe' },
  actionName: { fontWeight: 600, color: '#1f2937', flex: '0 0 auto' },
  actionStore: { color: '#9ca3af', fontSize: '11px', flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  actionDuration: { color: '#6b7280', fontSize: '11px', flex: '0 0 auto' },
  actionTime: { color: '#d1d5db', fontSize: '10px', flex: '0 0 auto', marginLeft: 'auto' },
  actionDetail: { flex: 1, overflowY: 'auto' },
  detailWrap: { padding: '10px 14px' },
  detailTitle: { marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' },
  detailSection: { marginBottom: '12px' },
  detailLabel: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#9ca3af',
    marginBottom: '4px',
  },
  pre: {
    margin: 0,
    padding: '6px 8px',
    background: '#f9fafb',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: '#374151',
    border: '1px solid #f3f4f6',
  },
  diffRow: { marginBottom: '8px' },
  diffKey: { fontWeight: 600, color: '#1e40af', fontSize: '12px' },
  diffValues: { display: 'flex', gap: '8px', marginTop: '3px' },
  diffBefore: { flex: 1 },
  diffAfter: { flex: 1 },
  diffLabel: { fontSize: '10px', color: '#9ca3af', display: 'block', marginBottom: '2px' },
}

createRoot(document.getElementById('root')!).render(<App />)
