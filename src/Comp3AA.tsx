import React from 'react';
import { useTestStore } from './stores/useTestStore';

function* calls() {
  let i = 0;
  while (true) yield i++;
}

const calledTimes = calls();

export const Comp3AA: React.FC = () => {
  const counter = calledTimes.next().value;

  const { state, actions } = useTestStore();
  console.log('here 3aa', state, actions);

  return (
    <div>
      <h1>Render Comp 3 AA</h1>
      <h2>
        {state.counter} – {counter || 0}
      </h2>
    </div>
  );
};
