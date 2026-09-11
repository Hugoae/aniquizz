import { describe, expect, it } from 'vitest';
import { answerMatchesOfferedChoice, resolveEffectiveAnswerType } from './answerType';

const qcmChoices = ['Naruto', 'Bleach', 'One Piece', 'Dragon Ball'];
const duoChoices = ['Naruto', 'Bleach'];

describe('answerMatchesOfferedChoice', () => {
  it('matches an offered label after normalization', () => {
    expect(answerMatchesOfferedChoice('naruto', qcmChoices)).toBe(true);
    expect(answerMatchesOfferedChoice('One Piece', qcmChoices)).toBe(true);
  });

  it('rejects titles that were not offered as buttons', () => {
    expect(answerMatchesOfferedChoice('Cowboy Bebop', qcmChoices)).toBe(false);
    expect(answerMatchesOfferedChoice('', qcmChoices)).toBe(false);
  });
});

describe('resolveEffectiveAnswerType', () => {
  it('forces typing in a typing-only room', () => {
    expect(resolveEffectiveAnswerType('qcm', 'typing', 'Naruto', { choices: qcmChoices })).toBe(
      'typing',
    );
  });

  it('clamps claimed typing to qcm in a qcm-only room', () => {
    expect(resolveEffectiveAnswerType('typing', 'qcm', 'Naruto', { choices: qcmChoices })).toBe(
      'qcm',
    );
  });

  it('allows the duo lifeline in a qcm-only room', () => {
    expect(resolveEffectiveAnswerType('duo', 'qcm', 'Naruto', { duo: duoChoices })).toBe('duo');
  });

  it('clamps mix typing to qcm when the string is an offered choice', () => {
    expect(
      resolveEffectiveAnswerType('typing', 'mix', 'Naruto', { choices: qcmChoices, duo: duoChoices }),
    ).toBe('qcm');
  });

  it('keeps mix typing when the player typed a valid title that is not a button', () => {
    expect(
      resolveEffectiveAnswerType('typing', 'mix', 'Cowboy Bebop', {
        choices: qcmChoices,
        duo: duoChoices,
      }),
    ).toBe('typing');
  });

  it('preserves claimed qcm and duo in mix mode', () => {
    expect(resolveEffectiveAnswerType('qcm', 'mix', 'Naruto', { choices: qcmChoices })).toBe('qcm');
    expect(resolveEffectiveAnswerType('duo', 'mix', 'Naruto', { duo: duoChoices })).toBe('duo');
  });
});
