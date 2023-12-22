import React, { useState } from 'react';
import { useTestStore } from './stores/useTestStore';
import { Comp2ConstProp } from './Comp2ConstProp';
import { Comp2StateProp } from './Comp2StateProp';
import { Comp3A } from './Comp3A';
function* calls() {
  let i = 0;
  while (true) yield i++;
}

const calledTimes = calls();
export const Comp2: React.FC = () => {
  const counter = calledTimes.next().value;

  const { state, actions } = useTestStore();
  console.log('here 2', state);

  const [value] = useState(33);

  return (
    <div>
      <h1>
        hi + render {counter || 0} + {state.counter}
      </h1>
      <button onClick={actions?.incCounter}>test</button>
      <Comp2ConstProp value={44} />
      <Comp2StateProp value={value} />
      <Comp3A />
    </div>
  );
};
