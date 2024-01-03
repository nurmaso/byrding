import React, { useEffect } from 'react';
import { useTestStore } from './stores/useTestStore';

function* calls() {
  let i = 0;
  while (true) yield i++;
}

const calledTimes = calls();

export const Comp3AA: React.FC = () => {
  const counter = calledTimes.next().value;

  const { state, getters, actions } = useTestStore();
  console.log('here 3aa', state, getters);
  useEffect(() => {
    console.log('ACTIONS', actions.test(''));
    // actions.test();
  }, []);

  return (
    <div>
      <h1>Render Comp 3 AA</h1>
      <h2>
        {state.counter} – {counter || 0}
      </h2>
    </div>
  );
};
