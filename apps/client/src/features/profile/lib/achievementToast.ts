import { toast } from 'sonner';
import { achievementXp } from '@aniquizz/shared';
import { ACHIEVEMENT_COPY, isAchievementId } from '@/features/profile/copy/achievementCopy';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';

/** One toast for the successes that just landed. */
export function toastUnlockedAchievements(ids: string[]): void {
  if (ids.length === 0) return;
  const xp = ids.reduce((sum, id) => sum + achievementXp(id), 0);
  if (ids.length === 1) {
    const id = ids[0] ?? '';
    const title = isAchievementId(id) ? ACHIEVEMENT_COPY[id].title : 'Succès';
    toast.success(PROFILE_COPY.achievementsUnlockedOne(title, xp));
    return;
  }
  toast.success(PROFILE_COPY.achievementsUnlockedMany(ids.length, xp));
}
