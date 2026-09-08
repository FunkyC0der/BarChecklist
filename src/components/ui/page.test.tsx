import { screen } from '@testing-library/react';
import { renderWithRouter } from '@/test/router';
import { describe, expect, it } from 'vitest';

import { Page } from './page';
import { IconButton } from './icon-button';

describe('Page', () => {
  it('renders title', async () => {
    renderWithRouter({
      component: () => (
        <Page title="Чеклісти">
          <p>content</p>
        </Page>
      ),
      path: '/page',
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Чеклісти' }),
    ).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('renders back link with href', async () => {
    renderWithRouter({
      component: () => (
        <Page back="/checklists" title="Деталі">
          <p>content</p>
        </Page>
      ),
      path: '/page',
    });

    expect(await screen.findByRole('link', { name: 'Назад' })).toHaveAttribute(
      'href',
      '/checklists',
    );
  });

  it('renders root actions on the title row without an empty toolbar', async () => {
    renderWithRouter({
      component: () => (
        <Page
          actions={<IconButton icon="pencil" label="Редагувати" />}
          title="Деталі"
        >
          <p>content</p>
        </Page>
      ),
      path: '/page',
    });

    expect(
      await screen.findByRole('button', { name: 'Редагувати' }),
    ).toBeInTheDocument();
    expect(document.querySelector('.sticky')).not.toBeInTheDocument();
  });

  it('keeps the toolbar for detail pages with back navigation', async () => {
    renderWithRouter({
      component: () => (
        <Page
          actions={<IconButton icon="pencil" label="Редагувати" />}
          back="/checklists"
          title="Деталі"
        >
          <p>content</p>
        </Page>
      ),
      path: '/page',
    });

    expect(
      await screen.findByRole('link', { name: 'Назад' }),
    ).toBeInTheDocument();
    expect(document.querySelector('.sticky')).toBeInTheDocument();
  });
});
