import { useEffect, useState } from 'react';

/** Re-renders only the calling leaf once per second (keeps big panels static). */
function useNowEverySecond(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Live text derived from the current time, e.g. "il y a 4s" or a countdown. */
export function LiveClock({ render }: { render: (now: number) => string }) {
  const now = useNowEverySecond();
  return <>{render(now)}</>;
}
