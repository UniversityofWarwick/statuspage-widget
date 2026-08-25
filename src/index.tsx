import { render } from 'preact';
import StatusPageEmbed from './StatusPageEmbed';

function init() {
  Array.from(document.querySelectorAll<HTMLElement>('.statuspage-embed-container')).forEach((element) => {
    const { apiBase, components, pollInterval, position, testMode } = element.dataset;
    const componentsArray = components ? JSON.parse(components) as string[] : undefined;

    render(
      <StatusPageEmbed
        apiBase={apiBase}
        components={componentsArray}
        pollInterval={pollInterval ? Number(pollInterval) : undefined}
        position={position as 'bl' | 'br' | 'tl' | 'tr' | undefined}
        testMode={testMode === 'true'}
      />,
      element,
    );
  });
}

if (document.readyState === 'complete' || document.readyState === 'loaded' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init, false);
}
