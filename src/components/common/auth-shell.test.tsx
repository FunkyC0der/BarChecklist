import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthShell } from './auth-shell';

describe('AuthShell', () => {
  it('renders title, description, footer, and brand', () => {
    render(
      <AuthShell
        description="Test description"
        footer={<span>Footer link</span>}
        title="Test title"
      >
        <button type="submit">Submit</button>
      </AuthShell>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Checklister' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Test title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Footer link')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { level: 2, name: 'Test title' }),
    );
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('hides brand when brand={false}', () => {
    render(
      <AuthShell
        brand={false}
        description="Desc"
        footer={<span>Footer</span>}
        title="Title"
      >
        <p>Content</p>
      </AuthShell>,
    );

    expect(
      screen.queryByRole('heading', { level: 1, name: 'Checklister' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
