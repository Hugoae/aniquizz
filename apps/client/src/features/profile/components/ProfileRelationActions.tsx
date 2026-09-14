import { Ban, Check, Clock, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Relation } from '@/features/friends/FriendsContext';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';

export function ProfileRelationActions({
  profileId,
  relation,
  onAddFriend,
  onBlock,
  onRemoveFriend,
  onUnblock,
}: {
  profileId: string;
  relation: Relation;
  onAddFriend: (id: string) => void;
  onBlock: (id: string) => void;
  onRemoveFriend: (id: string) => void;
  onUnblock: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 md:min-w-[160px]">
      {relation === 'none' && (
        <>
          <Button variant="glow" className="gap-2" onClick={() => onAddFriend(profileId)}>
            <UserPlus className="h-4 w-4" /> {PROFILE_COPY.addFriend}
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => onBlock(profileId)}
          >
            <Ban className="h-4 w-4" /> {PROFILE_COPY.block}
          </Button>
        </>
      )}
      {relation === 'incoming' && (
        <Button variant="glow" className="gap-2" onClick={() => onAddFriend(profileId)}>
          <Check className="h-4 w-4" /> {PROFILE_COPY.acceptRequest}
        </Button>
      )}
      {relation === 'outgoing' && (
        <Button variant="outline" disabled className="gap-2">
          <Clock className="h-4 w-4" /> {PROFILE_COPY.requestSent}
        </Button>
      )}
      {relation === 'friends' && (
        <Button
          variant="outline"
          className="gap-2 text-muted-foreground hover:text-destructive"
          onClick={() => onRemoveFriend(profileId)}
        >
          <UserMinus className="h-4 w-4" /> {PROFILE_COPY.removeFriend}
        </Button>
      )}
      {relation === 'blocked' && (
        <Button variant="outline" className="gap-2" onClick={() => onUnblock(profileId)}>
          {PROFILE_COPY.unblock}
        </Button>
      )}
    </div>
  );
}
