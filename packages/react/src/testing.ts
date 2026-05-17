import { renderHook, act as rtlAct } from '@testing-library/react'

export function renderStore<T>(useStore: () => T) {
  const { result, rerender, unmount } = renderHook(() => useStore())
  const act = (fn: () => void | Promise<void>) => rtlAct(fn)
  return { result, act, rerender, unmount }
}
