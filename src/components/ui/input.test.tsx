import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './input';

describe('Input', () => {
  it('associates its visible label with the input', () => {
    render(<Input label="Email" type="email" />);

    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  });

  it('generates unique associations for repeated labels', () => {
    render(
      <>
        <Input label="Пароль" type="password" />
        <Input label="Пароль" type="password" />
      </>,
    );

    const inputs = screen.getAllByLabelText('Пароль');
    expect(inputs).toHaveLength(2);
    const [firstInput, secondInput] = inputs;
    if (!firstInput || !secondInput) {
      throw new Error('Expected two password inputs');
    }
    expect(firstInput).not.toHaveAttribute(
      'id',
      secondInput.getAttribute('id'),
    );
  });

  it('describes invalid input with its error message', () => {
    render(<Input error="Required" label="Email" />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Required');
  });
});
