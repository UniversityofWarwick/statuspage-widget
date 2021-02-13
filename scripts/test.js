const rewire = require('rewire');
const defaults = rewire('react-scripts/scripts/test.js');

const createJestConfig = defaults.__get__('createJestConfig');
defaults.__set__('createJestConfig', (resolve, rootDir, isEjecting) => {
  const config = createJestConfig(resolve, rootDir, isEjecting);
  console.log(config);
  return config;
});
