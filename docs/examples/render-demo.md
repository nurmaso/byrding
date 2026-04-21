# Render-demo

Location: [`render-demo/`](https://github.com/nurmaso/bocal/tree/main/render-demo)

An interactive React app that makes re-render behaviour visible. Each `ComponentBox` shows a badge that flashes amber on every render and then fades grey, so you can literally see which components woke up after a mutation.

## Run it

```bash
pnpm install                 # from repo root
pnpm dev:render-demo         # opens http://localhost:5174
```

## What it shows

Two columns, same underlying `DemoStore` (`count`, `name`, `description`):

### Left — Store (selective subscriptions)

- `CountWidget` subscribes to `['count']`
- `NameWidget` subscribes to `['name']`
- `DescWidget` subscribes to `['description']`
- `FullWidget` subscribes to `['*']`

A 4-level deep tree where each level independently declares its own subscription. A change to `count` re-renders only the count-subscribed levels; siblings and cousins stay still.

### Right — Props (prop drilling)

- `PropsRoot` subscribes to `['*']` (forced — it has to read everything to distribute props).
- Children receive only the prop they use, but because they're rendered inside `PropsRoot`, React re-renders all of them whenever the parent re-renders. `React.memo` is deliberately omitted.
- The deep tree cascades from the root down through 4 levels on **every** mutation.

## What to observe

| Button click | Left column | Right column |
| --- | --- | --- |
| `count++` | Only count-subscribed components flash | Every component flashes |
| `cycle name` | Only name-subscribed components flash | Every component flashes |
| `update description` | Only description-subscribed components flash | Every component flashes |

## How the flash works

`RenderCounter` is a regular component that uses `useRef` to count renders and renders a badge with `key={count}`. Changing `key` unmounts/remounts the badge `<span>`, which restarts the CSS `@keyframes flash-out` animation (amber → grey over 0.6s). No `useEffect`, no `useState` — the animation is pure CSS.

## What's missing on purpose

- No `React.memo` in the Props column. Adding it would let leaves bail out, but the parent still subscribes to `['*']` and always re-renders. The demo shows the default React behaviour.
- No `React.StrictMode`. Double-rendering in strict mode would make the counters harder to read.
