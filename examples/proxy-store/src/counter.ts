import { useProxyStoreExample } from './useProxyStoreExample';

export function setupCounter(element: HTMLButtonElement) {
  element.innerHTML = `count is 0`;

  const { state, actions } = useProxyStoreExample;

  console.log('STATe', state);

  state.watch((newValue) => {
    element.innerHTML = `count is ${newValue}`;
  });

  element.addEventListener('click', () => {
    state.name = 'hi';
    console.log(state);
  });

  // const setCounter = (count: number) => {
  //   counter = count
  //   element.innerHTML = `count is ${counter}`
  // }
  // element.addEventListener('click', () => setCounter(counter + 1))
  // setCounter(0)
}
