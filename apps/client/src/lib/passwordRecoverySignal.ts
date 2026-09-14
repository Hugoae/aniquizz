let passwordRecoverySeen = false;

export function markPasswordRecovery(): void {
  passwordRecoverySeen = true;
}

export function consumePasswordRecovery(): boolean {
  const seen = passwordRecoverySeen;
  passwordRecoverySeen = false;
  return seen;
}
