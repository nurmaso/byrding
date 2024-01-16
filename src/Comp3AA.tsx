import React, { useEffect } from 'react';
import { useTestStore } from './stores/useTestStore';

function* calls() {
  let i = 0;
  while (true) yield i++;
}

const calledTimes = calls();

export const Comp3AA: React.FC = () => {
  const counter = calledTimes.next().value;

  const { state, getters, actions, store } = useTestStore();
  console.log('TEST_STORE', store.getTestCounter, store);
  useEffect(() => {
    actions.incCounter();
  }, []);

  const test = getters.getCounterDoubled;

  console.log(store.getWithInput(10), store.counter, store.getCounterDoubled);

  return (
    <div>
      <h1>Render Comp 3 AA</h1>
      <h2>
        {state.counter} – {counter || 0}
      </h2>

      <ul>
        <li>{`${test}`}</li>
        {/* <li>{getters.getDoubledMultiplied(4)}</li> */}
      </ul>
    </div>
  );
};
