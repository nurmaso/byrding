import React from 'react';
import { Comp3AA } from './Comp3AA';

function* calls() {
  let i = 0;
  while (true) yield i++;
}

const calledTimes = calls();

export const Comp3A: React.FC = () => {
  console.log('COMP 3 A');
  const counter = calledTimes.next().value;

  return (
    <div>
      <h1>Render Comp 3 A</h1>
      <h2>n/a – {counter || 0}</h2>
      <Comp3AA />
    </div>
  );
};
