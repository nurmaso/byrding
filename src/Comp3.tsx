import React from 'react';
import { Comp3A } from './Comp3A';

function* calls() {
  let i = 0;
  while (true) yield i++;
}

const calledTimes = calls();

export const Comp3: React.FC = () => {
  const counter = calledTimes.next().value;

  return (
    <div>
      <h1>Render Comp 3</h1>
      <h2>{counter || 0}</h2>
      <Comp3A />
    </div>
  );
};
