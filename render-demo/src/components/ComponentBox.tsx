import React from 'react'

interface ComponentBoxProps {
  /** Component name displayed in the header. */
  title: string
  /** Small tag shown on the right (subscription info or "via props"). */
  badge?: string
  /** 0 = top-level, 1+ = nested child — drives left-indent and bg tint. */
  depth?: number
  /** Accent colour for the left border strip (default: blue for store, red for props). */
  accent?: string
  children: React.ReactNode
}

/**
 * Visual wrapper for each demo component.
 * Shows the component title, an optional badge, and indents by depth level.
 */
export function ComponentBox({
  title,
  badge,
  depth = 0,
  accent = '#3b82f6',
  children,
}: ComponentBoxProps) {
  return (
    <div
      className="component-box"
      style={{
        marginLeft: depth * 20,
        borderLeftColor: accent,
      }}
    >
      <div className="component-box__header">
        <span className="component-box__title">{title}</span>
        {badge && <span className="component-box__badge">{badge}</span>}
      </div>
      <div className="component-box__body">{children}</div>
    </div>
  )
}
