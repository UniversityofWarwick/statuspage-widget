process.env.BUILD_PATH = 'dist';

const rewire = require('rewire');
const defaults = rewire('react-scripts/scripts/build.js');
let config = defaults.__get__('config');

// Don't split chunks
config.optimization.splitChunks = {
  cacheGroups: {
    default: false
  }
};
config.optimization.runtimeChunk = false;

// Remove static/ and contenthash from output JS filenames
config.output.filename = '[name].js';
config.output.chunkFilename = '[name].chunk.js';

// Remove static/ and contenthash from putput CSS filenames
const miniCssExtractPlugin = config.plugins.find((plugin) => plugin.constructor.name === 'MiniCssExtractPlugin');
miniCssExtractPlugin.options.filename = '[name].css';
miniCssExtractPlugin.options.chunkFilename = '[name].chunk.css';
