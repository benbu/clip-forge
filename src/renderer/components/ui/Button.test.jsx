import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders the label and handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Import</Button>);

    await user.click(screen.getByRole('button', { name: /import/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button while loading', () => {
    render(<Button isLoading>Saving</Button>);

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
