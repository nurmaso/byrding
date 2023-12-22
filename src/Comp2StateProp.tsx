import React from 'react';
function* calls() {
  let i = 0;
  while (true) yield i++;
}

type Props = {
  value: number;
};

const calledTimes = calls();
export const Comp2StateProp: React.FC<Props> = (props: Props) => {
  const counter = calledTimes.next().value;

  console.log('here 2 State Prop', counter, props.value);

  return (
    <div>
      <h1>
        hi + render {counter || 0} + {props.value}
      </h1>
    </div>
  );
};
