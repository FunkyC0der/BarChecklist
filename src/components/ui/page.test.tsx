import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Page } from './page';
import { IconButton } from './icon-button';

describe('Page', () => {
  it('renders title', () => {
    render(
      <MemoryRouter>
        <Page title="Чеклісти">
          <p>content</p>
        </Page>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Чеклісти' }),
    ).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('renders back link with href', () => {
    render(
      <MemoryRouter>
        <Page back="/checklists" title="Деталі">
          <p>content</p>
        </Page>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Назад' })).toHaveAttribute(
      'href',
      '/checklists',
    );
  });

  it('renders toolbar actions', () => {
    render(
      <MemoryRouter>
        <Page
          actions={<IconButton icon="pencil" label="Редагувати" />}
          title="Деталі"
        >
          <p>content</p>
        </Page>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Редагувати' }),
    ).toBeInTheDocument();
  });
});
