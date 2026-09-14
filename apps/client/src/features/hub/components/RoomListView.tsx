import { ArrowLeft, Plus } from 'lucide-react';
import type { RoomListItem } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoomList } from './RoomList';
import { HUB_COPY } from '@/features/hub/copy/hubCopy';

interface RoomListViewProps {
  rooms: RoomListItem[];
  joinCode: string;
  onJoinCodeChange: (code: string) => void;
  onJoin: (roomId: string) => void;
  onCreate: () => void;
  onBack: () => void;
  onRefresh: () => void;
}

/** The "join a room" screen: code entry + public room list. */
export function RoomListView({
  rooms,
  joinCode,
  onJoinCodeChange,
  onJoin,
  onCreate,
  onBack,
  onRefresh,
}: RoomListViewProps) {
  const canJoinByCode = joinCode.length >= 4;

  return (
    <div className="animate-fade-in">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 mb-6 text-muted-foreground hover:text-foreground pl-0"
      >
        <ArrowLeft className="h-4 w-4" />
        {HUB_COPY.back}
      </Button>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">
            {HUB_COPY.joinTitleLead}{' '}
            <span className="gradient-text">{HUB_COPY.joinTitleAccent}</span>
          </h1>
          <Button variant="glow" size="lg" className="gap-2" onClick={onCreate}>
            <Plus className="h-5 w-5" /> {HUB_COPY.createRoom}
          </Button>
        </div>

        <div className="flex gap-2 w-full max-w-md">
          <Input
            placeholder={HUB_COPY.codePlaceholder}
            className="text-center uppercase tracking-widest font-mono font-bold"
            value={joinCode}
            onChange={(e) => onJoinCodeChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canJoinByCode) onJoin(joinCode);
            }}
            maxLength={6}
          />
          <Button onClick={() => onJoin(joinCode)} variant="secondary" disabled={!canJoinByCode}>
            {HUB_COPY.join}
          </Button>
        </div>

        <RoomList rooms={rooms} onJoin={onJoin} onRefresh={onRefresh} />
      </div>
    </div>
  );
}
