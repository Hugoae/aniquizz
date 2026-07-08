export type GamePhase = 'loading' | 'ready' | 'guessing' | 'revealed' | 'ended';

/** Local input mode: `carre` = QCM (4 choices), `duo` = 2 choices. */
export type InputMode = 'typing' | 'carre' | 'duo';

/** Minimal local-player identity shown in the top bar. */
export interface MyProfile {
  username: string;
  avatar: string;
  xp?: number;
}