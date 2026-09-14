import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GAME_COPY } from '@/features/game/copy/gameCopy';

/** Shown when `/game` has no valid room id (refresh without query, or a pasted URL). */
export function MissingGameRoom() {
  const copy = GAME_COPY.missingRoom;
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
      <p className="max-w-md text-muted-foreground">{copy.body}</p>
      <Button asChild>
        <Link to="/play">{copy.cta}</Link>
      </Button>
    </div>
  );
}
