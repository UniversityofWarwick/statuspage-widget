# StatusPage widget

[![Build status](https://github.com/UniversityofWarwick/statuspage-widget/workflows/Build%20and%20Deploy/badge.svg)](https://github.com/UniversityofWarwick/statuspage-widget/actions)
[![Netlify Status](https://api.netlify.com/api/v1/badges/d97484f4-6eec-4351-a8b5-bc84332e168d/deploy-status)](https://app.netlify.com/sites/epic-bassi-0cb346/deploys)

[![Deploys by Netlify](https://www.netlify.com/img/global/badges/netlify-light.svg)](https://www.netlify.com)

A StatusPage widget that supports restricting by component. If you don't need to restrict by component
then you may wish to just use [@statuspage/status-widget](https://www.npmjs.com/package/@statuspage/status-widget).

## Available Scripts

In the project directory, you can run:

### `npm start`

NOTE: Currently broken since the move to Preact, needs looking at.

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder. This is what Netlify runs when it deploys the assets.

### `npm run dist`

Builds the app for distribution to the `dist` folder.  This is run on prepublish for npm.

## Analysing bundle size

You can analyse the webpack bundle size by running the following:

```shell
npm run dist -- --stats
npx webpack-bundle-analyzer dist/bundle-stats.json
```
