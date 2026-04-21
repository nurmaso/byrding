import { useDemo } from '../stores/useDemo'

/**
 * Action buttons.  This component subscribes to all keys so it can display
 * current state values on the buttons.  Clicking a button mutates only ONE
 * slice of state — letting the user observe which components react.
 */
export function Controls() {
  const store = useDemo()

  return (
    <div className="controls">
      <div className="controls__row">
        <span className="controls__label">Mutate count:</span>
        <button className="btn btn--blue" onClick={store.increment}>
          count++ &nbsp;<em>({store.count})</em>
        </button>
        <button className="btn btn--blue" onClick={store.decrement}>
          count--
        </button>
      </div>

      <div className="controls__row">
        <span className="controls__label">Mutate name:</span>
        <button className="btn btn--green" onClick={store.cycleName}>
          cycle name &nbsp;<em>({store.name})</em>
        </button>
      </div>

      <div className="controls__row">
        <span className="controls__label">Mutate description:</span>
        <button className="btn btn--purple" onClick={store.updateDescription}>
          update description
        </button>
      </div>

      <p className="controls__hint">
        Watch the render counters flash. Selective subscriptions limit
        re-renders to components that actually use the changed value.
      </p>
    </div>
  )
}
