import { useTestStore } from './stores/useTestStore';

export const ModalWithStoreValues = () => {
  const { store } = useTestStore();

  return <>Modal {store.counter}</>;
};
