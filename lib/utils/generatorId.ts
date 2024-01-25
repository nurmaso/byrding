export const generatorFunctionId = function* () {
  let index = 1;
  while (true) yield index++;
};

export const generatorId = generatorFunctionId();
