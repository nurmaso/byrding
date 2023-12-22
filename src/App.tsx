import React from 'react';
import { Comp1 } from './Comp1';
import { Comp2 } from './Comp2';
import { Comp3 } from './Comp3';
// import { Comp4 } from './Comp4';

const App: React.FC = () => {
  return (
    <div>
      <Comp1 />
      <Comp2 />
      <Comp3 />
      {/* <Comp4 /> */}
    </div>
  );
};

export default App;
