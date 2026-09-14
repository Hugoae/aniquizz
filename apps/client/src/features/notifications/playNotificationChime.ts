/** Short procedural ping — no external asset. Fails silently before a user gesture. */

let sharedCtx: AudioContext | null = null;

export function playNotificationChime(volumePercent: number): void {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!sharedCtx) sharedCtx = new Ctor();
    if (sharedCtx.state === 'suspended') void sharedCtx.resume();
    const osc = sharedCtx.createOscillator();
    const gain = sharedCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 784;
    const peak = Math.max(0.02, Math.min(0.1, (volumePercent / 100) * 0.1));
    const now = sharedCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(sharedCtx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  } catch {
    // Private mode / autoplay policy — the visual toast still fires.
  }
}
