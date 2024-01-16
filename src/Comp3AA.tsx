import React, { useEffect, useState } from 'react';
import { useTestStore } from './stores/useTestStore';
import { ModalWithStoreValues } from './ModalWithStoreValues';

function* calls() {
  let i = 0;
  while (true) yield i++;
}

const calledTimes = calls();

export const Comp3AA: React.FC = () => {
  const counter = calledTimes.next().value;

  const { state, getters, actions } = useTestStore();

  useEffect(() => {
    actions.incCounter();
  }, []);

  const test = getters.getCounterDoubled;

  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <h1>Render Comp 3 AA for: {state.welcome}</h1>
      <h2>
        {state.counter} – {counter || 0}
      </h2>
      <div>
        <button onClick={() => setShowModal(!showModal)}>
          Toggle Modal: {`${showModal}`}
        </button>
        {showModal && <ModalWithStoreValues />}
      </div>

      <ul>
        <li>{`${test}`}</li>
        {/* <li>{getters.getDoubledMultiplied(4)}</li> */}
      </ul>
    </div>
  );
};
