import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react';

const SLOW_RENDER_MS = 8;

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration) => {
  if (actualDuration < SLOW_RENDER_MS) return;
  console.debug(
    `[perf] ${id} ${phase} ${actualDuration.toFixed(1)}ms (base ${baseDuration.toFixed(1)}ms)`,
  );
};

/** Dev-only React Profiler — logs commits slower than 8ms to the console. */
export function DevRenderProfiler({ id, children }: { id: string; children: ReactNode }) {
  if (!import.meta.env.DEV) return children;
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
