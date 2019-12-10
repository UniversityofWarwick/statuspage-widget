import React from 'react';
import { render } from '@testing-library/react';
import StatusPageEmbed from './StatusPageEmbed';

test('renders default hidden embed', () => {
  const { getByText } = render(<StatusPageEmbed />);
  const titleElement = getByText(/all systems operational/i);
  expect(titleElement).toBeInTheDocument();
});
