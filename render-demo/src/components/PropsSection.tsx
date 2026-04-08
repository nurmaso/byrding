/**
 * PropsSection — traditional prop-drilling pattern for comparison.
 *
 * Key demonstration:
 *  • PropsRoot connects to the full store (['*']) and distributes props.
 *  • ALL children re-render whenever PropsRoot re-renders, even if the prop
 *    they receive didn't change — because React re-renders children when a
 *    parent re-renders (without React.memo).
 *  • The result: a change to `count` re-renders EVERY component in this tree,
 *    including NameChildProps and DescChildProps that don't even use count.
 *
 * Deep tree (4 levels):
 *   PropsRoot passes all values → L0 → L1 → L2 → L3.
 *   Every level re-renders on every store mutation because the parent always
 *   re-renders and passes new prop references down the chain.
 *
 * Without React.memo (deliberately omitted to show default behaviour):
 *   • Changing count: ALL 5 nodes re-render.
 *   • Changing name:  ALL 5 nodes re-render.
 *   With React.memo, leaf children could bail out, but the parent (PropsRoot)
 *   still must subscribe to everything and always re-renders.
 */

import React from 'react'
import { useDemo } from '../stores/useDemo'
import { RenderCounter } from './RenderCounter'
import { ComponentBox } from './ComponentBox'

const RED = '#ef4444'

// ─── Flat children (receive props from PropsRoot) ─────────────────────────────

function CountChildProps({ count }: { count: number }) {
  return (
    <ComponentBox title="CountChildProps" badge="props: { count }" depth={1} accent={RED}>
      <RenderCounter label="CountChildProps" />
      <div className="value-row">
        count: <strong>{count}</strong>
      </div>
      <p className="re-render-note">
        Re-renders whenever PropsRoot re-renders — even when only{' '}
        <code>name</code> or <code>description</code> changed.
      </p>
    </ComponentBox>
  )
}

function NameChildProps({ name }: { name: string }) {
  return (
    <ComponentBox title="NameChildProps" badge="props: { name }" depth={1} accent={RED}>
      <RenderCounter label="NameChildProps" />
      <div className="value-row">
        name: <strong>{name}</strong>
      </div>
      <p className="re-render-note">
        Re-renders whenever PropsRoot re-renders — even when only{' '}
        <code>count</code> or <code>description</code> changed.
      </p>
    </ComponentBox>
  )
}

function DescChildProps({ description }: { description: string }) {
  return (
    <ComponentBox title="DescChildProps" badge="props: { description }" depth={1} accent={RED}>
      <RenderCounter label="DescChildProps" />
      <div className="value-row">
        description: <strong>{description}</strong>
      </div>
      <p className="re-render-note">
        Re-renders whenever PropsRoot re-renders — even when only{' '}
        <code>count</code> or <code>name</code> changed.
      </p>
    </ComponentBox>
  )
}

function FullChildProps({
  count,
  name,
  description,
}: {
  count: number
  name: string
  description: string
}) {
  return (
    <ComponentBox
      title="FullChildProps"
      badge="props: { count, name, description }"
      depth={1}
      accent={RED}
    >
      <RenderCounter label="FullChildProps" />
      <div className="value-row">
        count: <strong>{count}</strong> &nbsp;|&nbsp;
        name: <strong>{name}</strong> &nbsp;|&nbsp;
        desc: <strong>{description}</strong>
      </div>
    </ComponentBox>
  )
}

/**
 * PropsRoot — must subscribe to ALL keys because it passes everything
 * to children.  Any store change re-renders this component and cascades
 * to all its children.
 */
function PropsRoot() {
  const store = useDemo() // forced ['*'] — can't avoid it with prop drilling
  return (
    <ComponentBox title="PropsRoot" badge="subscribed: ['*'] — forced" accent={RED}>
      <RenderCounter label="PropsRoot" />
      <div className="value-row">
        Must read everything to pass it down.
      </div>
      <div className="children-list">
        <CountChildProps count={store.count} />
        <NameChildProps name={store.name} />
        <DescChildProps description={store.description} />
        <FullChildProps
          count={store.count}
          name={store.name}
          description={store.description}
        />
      </div>
    </ComponentBox>
  )
}

// ─── Deep tree ────────────────────────────────────────────────────────────────

interface AllProps {
  count: number
  name: string
  description: string
}

/**
 * L0 — receives all values from PropsRoot; passes count + name to L1.
 * Re-renders whenever PropsRoot re-renders (which is on every store change).
 */
function PropsL0(props: AllProps) {
  return (
    <ComponentBox
      title="PropsL0"
      badge="props: { count, name, description }"
      depth={0}
      accent={RED}
    >
      <RenderCounter label="PropsL0" />
      <div className="value-row">
        count: <strong>{props.count}</strong> &nbsp;|&nbsp;
        name: <strong>{props.name}</strong>
      </div>
      <PropsL1 count={props.count} name={props.name} description={props.description} />
    </ComponentBox>
  )
}

/**
 * L1 — only uses count but receives count + name (needs name for L2).
 * Re-renders whenever L0 re-renders → whenever ANY store value changes.
 */
function PropsL1({ count, name, description }: AllProps) {
  return (
    <ComponentBox
      title="PropsL1"
      badge="props: { count }"
      depth={1}
      accent={RED}
    >
      <RenderCounter label="PropsL1" />
      <div className="value-row">
        count × 10 = <strong>{count * 10}</strong>
      </div>
      <PropsL2 count={count} name={name} description={description} />
    </ComponentBox>
  )
}

/**
 * L2 — only uses name but must receive description to pass to L3.
 * Re-renders whenever L1 re-renders → cascades from the root.
 */
function PropsL2({ count, name, description }: AllProps) {
  return (
    <ComponentBox
      title="PropsL2"
      badge="props: { name }"
      depth={2}
      accent={RED}
    >
      <RenderCounter label="PropsL2" />
      <div className="value-row">
        name: <strong>{name}</strong>
      </div>
      <PropsL3 count={count} name={name} description={description} />
    </ComponentBox>
  )
}

/** L3 — leaf; uses all values.  Re-renders on every store change. */
function PropsL3({ count, name, description }: AllProps) {
  return (
    <ComponentBox
      title="PropsL3"
      badge="props: { count, name, description }"
      depth={3}
      accent={RED}
    >
      <RenderCounter label="PropsL3" />
      <div className="value-row">
        {count} · {name} · {description}
      </div>
    </ComponentBox>
  )
}

function PropsDeepTree() {
  const store = useDemo() // must subscribe to everything for the tree
  return (
    <div className="deep-tree">
      <p className="deep-tree__legend">
        <strong>Deep tree</strong> — props drilled top-down.
        <em>Every</em> level re-renders on <em>any</em> store change because
        the root re-renders and cascades new props.
      </p>
      <ComponentBox
        title="PropsTreeRoot"
        badge="subscribed: ['*'] — forced"
        depth={0}
        accent={RED}
      >
        <RenderCounter label="PropsTreeRoot" />
        <div className="value-row">Top-level connector — passes everything.</div>
        <PropsL0
          count={store.count}
          name={store.name}
          description={store.description}
        />
      </ComponentBox>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

export function PropsSection() {
  return (
    <div className="section">
      <div className="section__intro section__intro--warning">
        The parent must connect to <em>all</em> state to distribute it.
        Any change re-renders the parent and cascades to every child,
        regardless of which prop changed — no{' '}
        <code>React.memo</code> used.
      </div>
      <PropsRoot />
      <PropsDeepTree />
    </div>
  )
}
