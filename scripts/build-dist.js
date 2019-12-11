// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// Ensure environment variables are read.
require('react-scripts/config/env');

// Generate configuration
const configFactory = require('react-scripts/config/webpack.config');
const config = configFactory('production');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InlineChunkHtmlPlugin = require('react-dev-utils/InlineChunkHtmlPlugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');

const chalk = require('react-dev-utils/chalk');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const fs = require('fs-extra');
const webpack = require('webpack');

const path = require('path');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const paths = require('react-scripts/config/paths');

const appDist = resolveApp('dist');

config.output.path = appDist;
config.output.filename = '[name].js';
config.output.chunkFilename = '[name].chunk.js';

config.optimization.splitChunks = {
  cacheGroups: {
    default: false
  }
};

config.optimization.runtimeChunk = false;
config.plugins.forEach((plugin, index, plugins) => {
  if (plugin instanceof MiniCssExtractPlugin) {
    // Replace
    plugins.splice(index, 1, new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: '[name].css',
      chunkFilename: '[name].chunk.css',
    }));
  } else if (
    plugin instanceof ManifestPlugin ||
    plugin instanceof WorkboxWebpackPlugin.GenerateSW ||
    plugin instanceof HtmlWebpackPlugin ||
    plugin instanceof InlineChunkHtmlPlugin ||
    plugin instanceof InterpolateHtmlPlugin
  ) {
    // Delete
    plugins.splice(index, 1);
  }
});

fs.emptyDirSync(appDist);

// Merge with the public folder
fs.copySync(paths.appPublic, appDist, {
  dereference: true,
  filter: file => file !== paths.appHtml,
});

// Start the webpack build
// We used to support resolving modules according to `NODE_PATH`.
// This now has been deprecated in favor of jsconfig/tsconfig.json
// This lets you use absolute paths in imports inside large monorepos:
if (process.env.NODE_PATH) {
  console.log(
    chalk.yellow(
      'Setting NODE_PATH to resolve modules absolutely has been deprecated in favor of setting baseUrl in jsconfig.json (or tsconfig.json if you are using TypeScript) and will be removed in a future major release of create-react-app.'
    )
  );
  console.log();
}

console.log('Creating an optimized production build...');

const compiler = webpack(config);
compiler.run((err, stats) => {
  let messages;
  if (err) {
    if (!err.message) {
      return reject(err);
    }

    let errMessage = err.message;

    // Add additional information for postcss errors
    if (Object.prototype.hasOwnProperty.call(err, 'postcssNode')) {
      errMessage +=
        '\nCompileError: Begins at CSS selector ' +
        err['postcssNode'].selector;
    }

    messages = formatWebpackMessages({
      errors: [errMessage],
      warnings: [],
    });
  } else {
    messages = formatWebpackMessages(
      stats.toJson({ all: false, warnings: true, errors: true })
    );
  }
  if (messages.errors.length) {
    // Only keep the first error. Others are often indicative
    // of the same problem, but confuse the reader with noise.
    if (messages.errors.length > 1) {
      messages.errors.length = 1;
    }
    return reject(new Error(messages.errors.join('\n\n')));
  }
  if (
    process.env.CI &&
    (typeof process.env.CI !== 'string' ||
      process.env.CI.toLowerCase() !== 'false') &&
    messages.warnings.length
  ) {
    console.log(
      chalk.yellow(
        '\nTreating warnings as errors because process.env.CI = true.\n' +
        'Most CI servers set it automatically.\n'
      )
    );
    return reject(new Error(messages.warnings.join('\n\n')));
  }

  const { warnings } = messages;

  if (warnings.length) {
    console.log(chalk.yellow('Compiled with warnings.\n'));
    console.log(warnings.join('\n\n'));
    console.log(
      '\nSearch for the ' +
      chalk.underline(chalk.yellow('keywords')) +
      ' to learn more about each warning.'
    );
    console.log(
      'To ignore, add ' +
      chalk.cyan('// eslint-disable-next-line') +
      ' to the line before.\n'
    );
  } else {
    console.log(chalk.green('Compiled successfully.\n'));
  }
});