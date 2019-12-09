import './polyfills';

import React from 'react';
import ReactDOM from 'react-dom';
import StatusPageEmbed from './StatusPageEmbed';

function init() {
  Array.from(document.querySelectorAll('.statuspage-embed-container')).forEach((element) => {
    const {apiBase, components, pollInterval, position} = element.dataset;
    const componentsArray = components && JSON.parse(components);

    ReactDOM.render(<StatusPageEmbed apiBase={apiBase} components={componentsArray} pollInterval={pollInterval} position={position}/>, element);
  });
}

if (document.readyState === 'complete' || document.readyState === 'loaded' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init, false);
}
