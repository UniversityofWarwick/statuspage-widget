import React from 'react';
import { render, wait } from '@testing-library/react';
import StatusPageEmbed from './StatusPageEmbed';

test('renders default hidden embed', () => {
  const { getByText } = render(<StatusPageEmbed />);
  const titleElement = getByText(/all systems operational/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders test mode incident', async () => {
  const { getByText } = render(<StatusPageEmbed testMode={true} />);
  await wait(() => {
    const titleElement = getByText(/outage: test mode incident/i);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toBeVisible();
  });
});
