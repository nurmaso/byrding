export type Hooks = {
  [key: string]: {
    [key: number | string]: (context?: unknown) => void;
  };
};
