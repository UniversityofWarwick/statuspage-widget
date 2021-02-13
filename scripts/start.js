const rewire = require('rewire');
const defaults = rewire('react-scripts/scripts/start.js');
let config = defaults.__get__('config');
