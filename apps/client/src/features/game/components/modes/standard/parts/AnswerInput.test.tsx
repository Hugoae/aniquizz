import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders as render } from '@/test/renderWithProviders';
import { AnswerInput } from './AnswerInput';

describe('AnswerInput QCM', () => {
  it('ignores number keys so OS screenshot shortcuts cannot submit a choice', () => {
    const onAction = vi.fn();
    render(
      <AnswerInput
        responseType="qcm"
        inputMode="carre"
        submittedAnswer={null}
        choices={['Zombie Land Saga', 'Free!', 'Baccano!', 'Death Parade']}
        onAction={onAction}
        onSwitchCarre={() => {}}
        onSwitchDuo={() => {}}
        roundKey={1}
        showShortcutReminder={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Free!' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: '2', code: 'Digit2', shiftKey: true, altKey: true });
    fireEvent.keyDown(window, { key: '2', code: 'Digit2' });
    expect(onAction).not.toHaveBeenCalled();
  });
});
