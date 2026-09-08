import { render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { InviteSheet } from './team-sheets';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(
    this: HTMLDialogElement,
  ) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(
    this: HTMLDialogElement,
  ) {
    this.open = false;
  });
});

function renderInviteSheet(
  inviteFeedback: {
    color: 'error' | 'success';
    text: string;
  } | null = null,
) {
  return render(
    <InviteSheet
      formatExpiry={() => '7 вер. 2026 р., 18:00'}
      inviteExpiry="2026-09-07T15:00:00.000Z"
      inviteFeedback={inviteFeedback}
      inviteLink="https://example.test/join/secret-token"
      onClose={vi.fn()}
      onShareInvite={vi.fn()}
      open
    />,
  );
}

describe('InviteSheet', () => {
  it('shows an outlined success widget and one content action without exposing the URL', () => {
    renderInviteSheet();

    const dialog = screen.getByRole('dialog', {
      name: 'Запрошення до команди',
    });
    const content = dialog;
    expect(content).not.toBeNull();
    expect(
      screen.getByText('Посилання готове').closest('[role="alert"]'),
    ).toHaveClass('alert-success', 'alert-outline');
    expect(
      within(content!)
        .getAllByRole('button')
        .filter((button) => !button.classList.contains('sr-only')),
    ).toHaveLength(1);
    expect(
      within(content!).getByRole('button', { name: 'Поділитися' }),
    ).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('secret-token');
    expect(screen.queryByDisplayValue(/secret-token/)).not.toBeInTheDocument();
  });

  it.each([
    ['success' as const, 'Посилання скопійовано.'],
    ['error' as const, 'Не вдалося поділитися запрошенням.'],
  ])('announces %s feedback without revealing the URL', (color, text) => {
    renderInviteSheet({ color, text });

    const feedback = screen.getByText(text).closest('[role="alert"]');
    expect(feedback).toHaveAttribute('aria-live', 'polite');
    expect(feedback).toHaveClass(`alert-${color}`);
    expect(document.body).not.toHaveTextContent('secret-token');
  });
});
