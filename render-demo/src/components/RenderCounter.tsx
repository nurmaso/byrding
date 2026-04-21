import { useRef } from 'react'

interface RenderCounterProps {
  /** Short label shown before the count, e.g. the component name. */
  label: string
}

/**
 * Displays how many times the host component has rendered.
 *
 * The badge flashes amber on every render then fades to grey.
 * Technique: the `key` on the inner `<span>` increments with the render
 * count, forcing React to mount a new DOM element each time — which restarts
 * the CSS `flash-out` animation defined in `app.css`.
 *
 * `useRef` is used for the counter so it persists between renders without
 * triggering extra renders of its own.
 */
export function RenderCounter({ label }: RenderCounterProps) {
  const count = useRef(0)
  count.current++

  return (
    <div className="render-counter">
      <span className="render-counter__label">{label}</span>
      {/* New key on every render → new DOM element → animation restarts */}
      <span key={count.current} className="render-counter__badge">
        ×{count.current}
      </span>
    </div>
  )
}
