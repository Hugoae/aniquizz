import { describe, expect, it } from 'vitest';
import { resolveEffectiveAnswerType } from './answerType';

describe('resolveEffectiveAnswerType', () => {
  it('forces typing in a typing-only room', () => {
    expect(resolveEffectiveAnswerType('qcm', 'typing')).toBe('typing');
  });

  it('clamps claimed typing to qcm in a qcm-only room', () => {
    expect(resolveEffectiveAnswerType('typing', 'qcm')).toBe('qcm');
  });

  it('allows the duo lifeline in a qcm-only room', () => {
    expect(resolveEffectiveAnswerType('duo', 'qcm')).toBe('duo');
  });

  it('honours mix typing even when the title is also a QCM label', () => {
    expect(resolveEffectiveAnswerType('typing', 'mix')).toBe('typing');
  });

  it('preserves claimed qcm and duo in mix mode', () => {
    expect(resolveEffectiveAnswerType('qcm', 'mix')).toBe('qcm');
    expect(resolveEffectiveAnswerType('duo', 'mix')).toBe('duo');
  });
});
