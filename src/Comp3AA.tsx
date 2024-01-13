import React, { useEffect } from 'react';
import { useTestStore } from './stores/useTestStore';

function* calls() {
  let i = 0;
  while (true) yield i++;
}

const calledTimes = calls();

export const Comp3AA: React.FC = () => {
  const counter = calledTimes.next().value;

  const { state, getters, actions, testStore } = useTestStore();
  console.log('TEST_STORE', testStore.getTestCounter, testStore);
  useEffect(() => {
    // console.log('ACTIONS', actions.test(''), getters);
    // actions.test();
    testStore.incCounter();
  }, []);

  const test = getters.getCounterDoubled;

  console.log(
    testStore.getWithInput(10),
    testStore.counter,
    testStore.getCounterDoubled
  );

  return (
    <div>
      <h1>Render Comp 3 AA</h1>
      <h2>
        {state.counter} – {counter || 0}
      </h2>

      <ul>
        <li>{test}</li>
        {/* <li>{getters.getDoubledMultiplied(4)}</li> */}
      </ul>
    </div>
  );
};
