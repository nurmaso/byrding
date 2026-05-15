import { useState } from 'react'

export interface Breakpoint {
  id: string
  type: 'action' | 'state'
  storeId: string
  name: string
  condition: string
  active: boolean
}

interface Props {
  breakpoints: Breakpoint[]
  bpErrors: Record<string, string>
  storeIds: string[]
  onAdd: (bp: Omit<Breakpoint, 'id' | 'active'>) => void
  onRemove: (id: string) => void
  onToggle: (id: string) => void
}

export function BreakpointsTab({ breakpoints, bpErrors, storeIds, onAdd, onRemove, onToggle }: Props) {
  const [bpType, setBpType] = useState<'action' | 'state'>('action')
  const [storeId, setStoreId] = useState('')
  const [name, setName] = useState('')
  const [condition, setCondition] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!storeId.trim() || !name.trim()) return
    onAdd({ type: bpType, storeId: storeId.trim(), name: name.trim(), condition: condition.trim() })
    setName('')
    setCondition('')
  }

  return (
    <div style={bs.root}>
      <form style={bs.form} onSubmit={handleAdd}>
        <div style={bs.formTitle}>Add Breakpoint</div>
        <div style={bs.row}>
          <label style={bs.label}>Type</label>
          <select
            style={bs.select}
            value={bpType}
            onChange={(e) => setBpType(e.target.value as 'action' | 'state')}
          >
            <option value="action">Action</option>
            <option value="state">State path</option>
          </select>
        </div>
        <div style={bs.row}>
          <label style={bs.label}>Store ID</label>
          <select
            style={bs.select}
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            <option value="">— select store —</option>
            {storeIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
        <div style={bs.row}>
          <label style={bs.label}>{bpType === 'action' ? 'Action name' : 'Key path'}</label>
          <input
            style={bs.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={bpType === 'action' ? 'e.g. increment' : 'e.g. cart.items'}
          />
        </div>
        <div style={bs.row}>
          <label style={bs.label}>Condition</label>
          <input
            style={bs.input}
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="optional JS expression — e.g. event.newValue > 10"
          />
        </div>
        <button style={bs.addBtn} type="submit">
          Add Breakpoint
        </button>
      </form>

      <div style={bs.list}>
        {breakpoints.length === 0 ? (
          <p style={bs.empty}>No breakpoints set.</p>
        ) : (
          breakpoints.map((bp) => (
            <BreakpointRow
              key={bp.id}
              bp={bp}
              error={bpErrors[bp.id]}
              onRemove={() => onRemove(bp.id)}
              onToggle={() => onToggle(bp.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function BreakpointRow({
  bp,
  error,
  onRemove,
  onToggle,
}: {
  bp: Breakpoint
  error?: string
  onRemove: () => void
  onToggle: () => void
}) {
  return (
    <div style={{ ...bs.bpRow, opacity: bp.active ? 1 : 0.45 }}>
      <button
        style={bs.toggleBtn}
        onClick={onToggle}
        title={bp.active ? 'Deactivate' : 'Activate'}
      >
        {bp.active ? '⏸' : '▶'}
      </button>
      <div style={bs.bpInfo}>
        <span style={bs.bpType}>{bp.type}</span>
        <span style={bs.bpStore}>{bp.storeId}</span>
        <span style={bs.bpName}>{bp.name}</span>
        {bp.condition && <span style={bs.bpCond}>if {bp.condition}</span>}
        {error && <span style={bs.bpError} title={error}>⚠ condition error</span>}
      </div>
      <button style={bs.removeBtn} onClick={onRemove} title="Remove breakpoint">
        ×
      </button>
    </div>
  )
}

const bs: Record<string, React.CSSProperties> = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  form: {
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexShrink: 0,
  },
  formTitle: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#9ca3af',
    marginBottom: '2px',
  },
  row: { display: 'flex', alignItems: 'center', gap: '8px' },
  label: { fontSize: '11px', color: '#6b7280', width: '90px', flexShrink: 0 },
  select: {
    flex: 1,
    fontSize: '12px',
    padding: '3px 6px',
    border: '1px solid #d1d5db',
    borderRadius: '3px',
    background: '#fff',
    color: '#1f2937',
  },
  input: {
    flex: 1,
    fontSize: '12px',
    padding: '3px 6px',
    border: '1px solid #d1d5db',
    borderRadius: '3px',
    background: '#fff',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  addBtn: {
    alignSelf: 'flex-end',
    marginTop: '2px',
    padding: '3px 10px',
    fontSize: '11px',
    cursor: 'pointer',
    border: '1px solid #7c3aed',
    borderRadius: '3px',
    background: '#7c3aed',
    color: '#fff',
  },
  list: { flex: 1, overflowY: 'auto', padding: '4px 0' },
  empty: { color: '#9ca3af', padding: '12px 16px', margin: 0, fontStyle: 'italic' },
  bpRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 10px',
    borderBottom: '1px solid #f3f4f6',
  },
  toggleBtn: {
    padding: '1px 5px',
    fontSize: '10px',
    cursor: 'pointer',
    border: '1px solid #d1d5db',
    borderRadius: '3px',
    background: '#f9fafb',
    flexShrink: 0,
  },
  bpInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    overflow: 'hidden',
    flexWrap: 'wrap',
  },
  bpType: {
    fontSize: '10px',
    background: '#ede9fe',
    color: '#5b21b6',
    borderRadius: '3px',
    padding: '1px 5px',
    flexShrink: 0,
  },
  bpStore: { fontSize: '11px', color: '#9ca3af', flexShrink: 0 },
  bpName: {
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'monospace',
    color: '#1f2937',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  bpCond: {
    fontSize: '10px',
    color: '#6b7280',
    fontFamily: 'monospace',
    fontStyle: 'italic',
  },
  bpError: {
    fontSize: '10px',
    color: '#991b1b',
    background: '#fee2e2',
    borderRadius: '3px',
    padding: '1px 5px',
    cursor: 'help',
  },
  removeBtn: {
    padding: '1px 5px',
    fontSize: '13px',
    cursor: 'pointer',
    border: '1px solid #d1d5db',
    borderRadius: '3px',
    background: '#f9fafb',
    color: '#6b7280',
    flexShrink: 0,
    lineHeight: '1',
  },
}
