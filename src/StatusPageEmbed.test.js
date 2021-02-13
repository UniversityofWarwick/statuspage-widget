import React from 'react';
import { render, waitFor } from '@testing-library/preact';
import StatusPageEmbed from './StatusPageEmbed';

test('renders default hidden embed', () => {
  const { getByText } = render(<StatusPageEmbed />);
  const titleElement = getByText(/all systems operational/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders test mode incident', async () => {
  const { getByText } = render(<StatusPageEmbed testMode={true} />);
  await waitFor(() => {
    const titleElement = getByText(/outage: test mode incident/i);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toBeVisible();
  });
});

test('close button is tabindex -1 when not visible', () => {
  const renderedElement = render(<StatusPageEmbed />);
  const closeButton = renderedElement.baseElement.querySelector('.StatusPageEmbed__close__button');
  expect(closeButton).toHaveAttribute("tabindex", "-1");
});

test ('close button is tabindex 0 when visible', async () => {
  const renderedElement = render(<StatusPageEmbed testMode={true} />);
  await waitFor(() => {
    const closeButton = renderedElement.baseElement.querySelector('.StatusPageEmbed__close__button');
    expect(closeButton).toHaveAttribute("tabindex", "0");
  });
});
