import { Camera } from 'lucide-react';
import type { ChangeEvent, Ref, RefObject } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';

const getAvatarSrc = (avatar: string) => (avatar.startsWith('http') ? avatar : undefined);

export function ProfileAvatarBlock({
  username,
  avatar,
  level,
  percent,
  isOwn,
  fileInputRef,
  onPickAvatarFile,
}: {
  username: string;
  avatar: string;
  level: number;
  percent: number;
  isOwn: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPickAvatarFile: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const ring = {
    background: `conic-gradient(hsl(var(--primary)), hsl(var(--accent)) ${percent}%, hsl(var(--secondary)) ${percent}%)`,
  };

  const badge = (
    <span className="absolute bottom-0 right-0 flex h-8 min-w-[32px] items-center justify-center rounded-full border-4 border-card bg-accent px-1.5 font-mono text-sm font-bold text-accent-foreground">
      {level}
    </span>
  );

  if (!isOwn) {
    return (
      <div className="relative">
        <div className="rounded-full p-[3px]" style={ring}>
          <div className="rounded-full bg-background p-[3px]">
            <UserAvatar avatar={avatar} username={username} className="h-28 w-28" loading="eager" />
          </div>
        </div>
        {badge}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="relative group cursor-pointer rounded-full border-0 bg-transparent p-0"
      aria-label={PROFILE_COPY.editAvatar(username)}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="rounded-full p-[3px]" style={ring}>
        <div className="rounded-full bg-background p-[3px]">
          <Avatar className="h-28 w-28 relative">
            <AvatarImage
              src={getAvatarSrc(avatar)}
              alt={`Avatar de ${username}`}
              className="object-cover"
            />
            <AvatarFallback className="bg-secondary text-4xl font-bold text-secondary-foreground">
              {username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="absolute inset-[3px] rounded-full bg-background/80 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Camera className="h-8 w-8 text-foreground" aria-hidden />
      </div>
      {badge}
      <input
        type="file"
        ref={fileInputRef as Ref<HTMLInputElement>}
        className="hidden"
        accept="image/*"
        onChange={onPickAvatarFile}
        aria-hidden
        tabIndex={-1}
      />
    </button>
  );
}
