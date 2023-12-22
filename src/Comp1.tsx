import React from 'react';
import { useTestStore } from './stores/useTestStore';
function* calls() {
  let i = 0;
  while (true) yield i++;
}

const calledTimes = calls();
export const Comp1: React.FC = () => {
  const counter = calledTimes.next().value;

  const { state, actions } = useTestStore();
  console.log('here 1', state);

  return (
    <div>
      <h1>
        Comp 1 + re-render {counter || 0} + {state.counter}
      </h1>
      <button onClick={actions?.incCounter}>test</button>
    </div>
  );
};
