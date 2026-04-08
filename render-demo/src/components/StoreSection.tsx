/**
 * StoreSection — components connected directly to the store via selective
 * key-path subscriptions.
 *
 * Key demonstration:
 *  • CountWidget  subscribes to ['count']       — ignores name / description changes
 *  • NameWidget   subscribes to ['name']         — ignores count / description changes
 *  • DescWidget   subscribes to ['description']  — ignores count / name changes
 *  • FullWidget   subscribes to ['*']            — re-renders on any change
 *
 * Deep tree (4 levels):
 *   Each level connects independently and subscribes only to what it reads.
 *   A change to `count` re-renders L0 and L2, but NOT L1 or L3.
 */

import { useDemo } from '../stores/useDemo'
import { RenderCounter } from './RenderCounter'
import { ComponentBox } from './ComponentBox'

const BLUE = '#3b82f6'

// ─── Flat widgets ─────────────────────────────────────────────────────────────

export function CountWidget() {
  const store = useDemo(['count'])
  return (
    <ComponentBox title="CountWidget" badge="subscribed: ['count']" accent={BLUE}>
      <RenderCounter label="CountWidget" />
      <div className="value-row">
        count: <strong>{store.count}</strong>
      </div>
    </ComponentBox>
  )
}

export function NameWidget() {
  const store = useDemo(['name'])
  return (
    <ComponentBox title="NameWidget" badge="subscribed: ['name']" accent={BLUE}>
      <RenderCounter label="NameWidget" />
      <div className="value-row">
        name: <strong>{store.name}</strong>
      </div>
    </ComponentBox>
  )
}

export function DescWidget() {
  const store = useDemo(['description'])
  return (
    <ComponentBox title="DescWidget" badge="subscribed: ['description']" accent={BLUE}>
      <RenderCounter label="DescWidget" />
      <div className="value-row">
        description: <strong>{store.description}</strong>
      </div>
    </ComponentBox>
  )
}

export function FullWidget() {
  const store = useDemo() // default ['*']
  return (
    <ComponentBox title="FullWidget" badge="subscribed: ['*']" accent="#f59e0b">
      <RenderCounter label="FullWidget" />
      <div className="value-row">
        count: <strong>{store.count}</strong> &nbsp;|&nbsp;
        name: <strong>{store.name}</strong> &nbsp;|&nbsp;
        desc: <strong>{store.description}</strong>
      </div>
    </ComponentBox>
  )
}

// ─── Deep tree ────────────────────────────────────────────────────────────────
// Each node independently declares its subscription — depth doesn't force
// re-renders on siblings or cousins.

/**
 * L0 — root of the tree; subscribes to ['count', 'name'].
 * Re-renders when count OR name changes. NOT when description changes.
 */
function StoreL0() {
  const store = useDemo(['count', 'name'])
  return (
    <ComponentBox
      title="StoreL0"
      badge="subscribed: ['count', 'name']"
      depth={0}
      accent={BLUE}
    >
      <RenderCounter label="StoreL0" />
      <div className="value-row">
        count: <strong>{store.count}</strong> &nbsp;|&nbsp;
        name: <strong>{store.name}</strong>
      </div>
      <StoreL1 />
    </ComponentBox>
  )
}

/**
 * L1 — subscribes only to ['description'].
 * Re-renders only when description changes — NOT when count or name changes.
 */
function StoreL1() {
  const store = useDemo(['description'])
  return (
    <ComponentBox
      title="StoreL1"
      badge="subscribed: ['description']"
      depth={1}
      accent={BLUE}
    >
      <RenderCounter label="StoreL1" />
      <div className="value-row">
        description: <strong>{store.description}</strong>
      </div>
      <StoreL2 />
    </ComponentBox>
  )
}

/**
 * L2 — subscribes only to ['count'].
 * Re-renders when count changes. Shares the same subscription key as L0
 * but is a completely independent subscriber — L0 re-rendering does NOT
 * force L2 to re-render.
 */
function StoreL2() {
  const store = useDemo(['count'])
  return (
    <ComponentBox
      title="StoreL2"
      badge="subscribed: ['count']"
      depth={2}
      accent={BLUE}
    >
      <RenderCounter label="StoreL2" />
      <div className="value-row">
        count × 10 = <strong>{store.count * 10}</strong>
      </div>
      <StoreL3 />
    </ComponentBox>
  )
}

/**
 * L3 — subscribes to ['*']; re-renders on every change.
 * Even though all ancestors subscribe selectively, this leaf can still
 * opt in to everything without affecting its siblings.
 */
function StoreL3() {
  const store = useDemo()
  return (
    <ComponentBox
      title="StoreL3"
      badge="subscribed: ['*']"
      depth={3}
      accent="#f59e0b"
    >
      <RenderCounter label="StoreL3" />
      <div className="value-row">
        {store.count} · {store.name} · {store.description}
      </div>
    </ComponentBox>
  )
}

export function StoreDeepTree() {
  return (
    <div className="deep-tree">
      <p className="deep-tree__legend">
        <strong>Deep tree</strong> — each level subscribes independently.
        A change to <code>count</code> re-renders <em>L0, L2, L3</em> only.
        A change to <code>description</code> re-renders <em>L1, L3</em> only.
      </p>
      <StoreL0 />
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

export function StoreSection() {
  return (
    <div className="section">
      <div className="section__intro">
        Each component calls <code>useDemo(keyPaths)</code> independently.
        Only components whose subscribed keys actually changed will re-render.
      </div>
      <div className="widget-list">
        <CountWidget />
        <NameWidget />
        <DescWidget />
        <FullWidget />
      </div>
      <StoreDeepTree />
    </div>
  )
}
