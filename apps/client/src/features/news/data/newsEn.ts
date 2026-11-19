/** English news bodies. French in newsData.ts stays the source. */
export interface NewsEnEntry {
  title: string;
  description: string;
  content: string;
}

export const NEWS_EN: Record<number, NewsEnEntry> = {
  12: {
    title: 'Update v26.9 — Achievements and English',
    description:
      'An achievement collection on your profile, rewarded in XP, and the player site available in French and English.',
    content:
      '**Achievements**\n' +
      '• An achievement grid appears on your profile, under the history.\n' +
      '• Each card shows the goal, the XP, and a progress bar.\n' +
      '• Three filters: All, To do, Earned. A locked achievement stays visible.\n' +
      '• Five groups: Matches, Daily quiz, Modes, Collection, Profile.\n' +
      '• Opening the profile grants the ones you already meet. The XP is given once.\n' +
      '• A finished match, a daily quiz, a friend, a favorite, a photo, or a linked list can unlock an achievement right away, with a message.\n\n' +
      '**English**\n' +
      '• The site reads in French or English.\n' +
      '• The button is in the header and at the top of settings: a flag, then FR or EN.\n' +
      '• Until you choose, the browser language is followed.\n' +
      '• A choice saved on the account wins over the device.\n\n' +
      '**Daily quiz**\n' +
      '• The last Next reaches the end screen sooner.\n\n' +
      'Happy hunting!',
  },
  11: {
    title: 'Update v26.8 — Evolving, history, medals, and home',
    description:
      'New Evolving mode in solo, medals under your card, a rebuilt history, and clearer cues in a match and on the home page.',
    content:
      '**Evolving**\n' +
      '• New mode, solo and typing. The clip restarts from the same point and grows: 0.25 s, 0.5 s, 1 s, 3 s, 10 s, then 15 s.\n' +
      '• The earlier you find it, the more the song is worth: 6, 5, 4, 3, 2, then 1 point.\n' +
      '• A wrong answer or Skip lengthens the clip. Giving up ends the song at 0.\n' +
      '• Replay, under General: Unlimited, or Limited with a set number of restarts. In a match, the counter sits under “Listen carefully…”.\n' +
      '• No clock to answer, and no Pause button. The center button restarts the clip.\n\n' +
      '**Setup path**\n' +
      '• A new match is prepared in three steps: General, Source, then Advanced. Start only appears at the end.\n' +
      '• In Settings, under In a match, **Setup path** is on by default. Turning it off opens everything at once.\n\n' +
      '**Medals**\n' +
      '• In solo, Bronze, Silver, Gold, and Platinum show under your card.\n' +
      '• The number is the score that unlocks the medal. It stays gray, then takes its color once the threshold is reached.\n' +
      '• Only the next tier shows its score. The ones after stay a “?” until they are in reach.\n' +
      '• The end screen shows those four tiers. The bar was removed.\n\n' +
      '**History**\n' +
      '• Profile history was rebuilt: the last five matches, more detail, and an easier read.\n' +
      '• **Play again** starts a solo match with the same rules.\n\n' +
      '**Mode colors**\n' +
      '• Standard in purple, Time Attack in cyan, Evolving in green, Daily quiz in gold.\n\n' +
      '**In a match**\n' +
      '• The mode is shown at the bottom right, easier to read, with the difficulty in color, Openings or Endings, the source, and the precision.\n' +
      '• The volume percentage appears when you hover the bar.\n\n' +
      '**Home**\n' +
      '• The background is dotted with white points that blink.\n' +
      '• On open, the logo pulses in the center, then the site appears.\n\n' +
      'A large update with a new mode and plenty of additions. I hope you enjoy it!',
  },
  10: {
    title: 'Update v26.7.1 — Streak bonus',
    description:
      'In Time Attack, a streak of found songs can give time back. The clip starts at random, and podium ties sit on one line.',
    content:
      '**Streak bonus**\n' +
      '• New Time Attack option, solo and multiplayer. Off by default.\n' +
      '• Under General, next to Punishing skip. You set the streak (3 to 10, 5 by default) and the time given back (+3 to +10 s, +5 by default).\n' +
      '• Every N songs found in a row, the clock gains that time.\n' +
      '• Skip, or letting the clip end without a find, resets the streak. A wrong answer on the current song still removes 3 s and does not break the streak.\n' +
      '• The clock never goes past the chosen duration. At 2:58 in a 3 min match, a +5 s bonus only adds +2 s, and the animation shows +2 s. In total, a match cannot receive more than one full budget in bonuses.\n' +
      '• When the bonus lands, “+N s” shows on your stage, with a sound. That round keeps it in the history.\n' +
      '• The room reminds you of the bonus while it is on.\n\n' +
      '**Clip start**\n' +
      '• In Time Attack, the clip now starts at random. The beginning is still available in the advanced options.\n\n' +
      '**Ranking**\n' +
      '• On the podium, a tie lines the portraits up, slightly overlapping, as on the end screen. The step no longer stretches.\n\n' +
      '**Comfort**\n' +
      '• In solo, Back from the ready screen returns to setup. A second Back leaves for mode select.\n\n' +
      'Have a good match!',
  },
  9: {
    title: 'Update v26.7 — Time Attack, Speed, and match feedback',
    description:
      'A race against the clock in solo and multiplayer, a speed bonus in Standard, and clearer feedback on every answer.',
    content:
      '**Time Attack**\n' +
      '• New mode, solo or with others (2 to 8). The goal: find the most songs before time runs out.\n' +
      '• Points are gone: found songs, and songs heard. In solo, medals follow that pace.\n' +
      '• With others, everyone plays their own round on the same list. The ranking keeps the most found, then the fewest heard. Two identical results stay tied.\n' +
      '• The streak shows from 3. No pause, and no vote to skip: everyone skips for themselves, and it costs time.\n' +
      '• The clip starts at the beginning. A random start is still possible in the advanced options.\n' +
      '• Watched mode is not offered with others: everyone plays the same songs.\n' +
      '**Speed**\n' +
      '• The old Sprint mode becomes a Standard option, multiplayer and typing only.\n' +
      '• Among correct answers, the fastest get a bonus, up to +3 for first.\n' +
      '**Match feedback**\n' +
      '• In Standard, a correct answer, a wrong answer, and a timeout share the jingle and animation from Time Attack.\n' +
      '• In Time Attack, the time penalty stays on screen when there is one.\n' +
      '• New setting **Correct and wrong answer sounds**, on by default. Global mute cuts them too.\n\n' +
      '**Reveal right away**\n' +
      '• The option left the general settings. It is set in the advanced setup of a solo Standard match, and it is off by default.\n' +
      '• Multiplayer, Time Attack, and the daily quiz do not use it.\n\n' +
      '**Feedback & bugs**\n' +
      '• The **Ideas** section is now **Feedback & bugs**, on the home page and on the page. Same address: feedback, a bug, a missing song, or an idea.\n\n' +
      '**Mode select**\n' +
      '• The Solo card names both matches: Standard (points and medals) and Time Attack.\n' +
      '• Competitive is not playable yet. A line says ranked is on the way.\n\n' +
      'Have a good race!',
  },
  8: {
    title: 'Update v26.6 — Daily quiz, Settings, Artist precision, and Support',
    description:
      'A daily challenge, player settings, Artist precision, a Support button, and a catalogue pass.',
    content:
      '**Daily quiz**\n' +
      '• Five identical multiple-choice questions for everyone, **Anime** precision, account required.\n' +
      '• One official attempt: leaving, refreshing, or closing the tab forfeits the remaining questions. No resume in the middle.\n' +
      '• 15 seconds to guess, 15 seconds of reveal per round. Reset at midnight **Paris time**. #1 is September 15, 2026.\n' +
      '• Score out of 5, daily ranking (found, then time), a daily streak even at 0/5, a little XP.\n' +
      '• A win from 3 found, a bonus at 5/5.\n' +
      '• The daily ranking is visible. At the reveal, you can like the song as in solo / multi.\n' +
      '• Profile history now mixes these runs (Daily quiz badge).\n\n' +
      '**Player settings**\n' +
      '• The panel is no longer a placeholder: **General**, **Social**, and **Account** tabs.\n' +
      '• Volume and mute apply everywhere (match, library, profile, admin previews, notification sounds).\n' +
      '• Animations Auto / Reduced / Full, autofocus, Enter, solo reveal, shortcut reminder.\n' +
      '• In-app notifications (toasts, optionally a small sound — off by default). No browser push.\n' +
      '• Privacy: who sees your status, your history, who can invite you. Blocked accounts list.\n' +
      '• AniList and MyAnimeList can stay linked at the same time; one active source for Watched mode.\n\n' +
      '**Artist precision**\n' +
      '• Besides Franchise and Anime, you can play with **Artist** precision.\n' +
      '• In typing, one credited artist or group is enough. In multiple choice, the right answer is the first billed name.\n' +
      '**Support**\n' +
      '• New **Support** button in the header (to Ko-fi). Optional, with no in-game perk. The site stays free and without ads, and if you want to support the work and help pay for the infrastructure, it is welcome.\n' +
      '**Catalogue**\n' +
      '• AniList studios are finally filled in on the cards (they were never stored).\n' +
      '• Missing titles and credits were filled in where it was safe.\n' +
      '• Search understands queries like **bleach ED5** better (library, admin, suggestions).\n\n' +
      'Good luck on the quiz, and see you tomorrow for the next one!',
  },
  7: {
    title: 'Update v26.5 — Endings & Playlists',
    description: 'More than 1,800 endings added, themed playlists (shonen, seinen, decades…)',
    content:
      'A large AniQuizz update: the catalogue doubles in size, and a new music source arrives in matches.\n\n' +
      '**More than 1,800 endings**\n' +
      '• The catalogue now has **more than 1,800 playable endings**, next to the openings already there.\n' +
      '• In total: **3,000 songs** — openings and endings together.\n' +
      '**Openings, endings, or both**\n' +
      '• In match setup, the **Openings / Endings** filter is on.\n' +
      '• Play only openings, only endings, or mix both.\n' +
      '• The lobby rules summary follows your choice.\n\n' +
      '**Themed playlists**\n' +
      '• New **Playlists** tab — fixed packs, not a new game mode.\n' +
      '• Packs: **Shonen**, **Seinen**, **Slice of life**, **Mecha**, **Fantasy**, **Romance**, **Supernatural**, **Science fiction**, **Sports**, **Isekai**.\n' +
      '• **Decade** overlay (1990s to 2020s), combinable with another pack, for example Shonen and the 2010s.\n' +
      '• **Limit to anime you have seen**: the intersection of the playlist and your AniList / MyAnimeList lists.\n' +
      '• A pack that is too small for the round count blocks the start (no fill from outside the pack).\n\n' +
      '**Artists fixed**\n' +
      '• **Unknown artist** credits were reviewed one by one (titles and spellings already in the catalogue).\n' +
      '• Duplicates of the same group written two ways were merged.\n' +
      '• Reveal cards and the Library finally show the right name, almost everywhere.\n\n' +
      'Next step announced: I need to work on the **Daily quiz**.\n\n' +
      'Have fun with the endings!',
  },
  6: {
    title: 'Update v26.4 — Leaderboard, favorite songs, suggestions, and Library update',
    description:
      'Five lifetime leaderboards, favorite songs, a community idea board, and a Library in three views.',
    content:
      '**Global leaderboard**\n' +
      '• Five lifetime tabs, every mode and every finished match: **XP**, **Wins**, **Games**, **Music Pokédex**, and **Accuracy**.\n' +
      '• The podium shows ranks 1 to 3. The list then continues to the **top 25**. Sign in to see **your row**, even outside the top.\n' +
      '• Ties share the rank (1, 2, 2, 4). At equal wins, the **success rate** breaks the tie.\n' +
      '• The Pokédex counts **different songs** heard. Replaying a song does not raise the score.\n' +
      '• Accuracy opens after **50 rounds**. A round with no answer counts as a miss.\n' +
      '• Click a player to open their profile. Without an account, a sign-in is offered.\n\n' +
      '**Favorite songs**\n' +
      '• A **heart** appears on the song card **at the reveal**. One click and the song joins your favorites.\n' +
      '• Find them in the **Library** with the **My favorites** filter, and like from the list or the detail card.\n' +
      '• If you remove a favorite by mistake, the confirmation offers **undo** for a few seconds.\n' +
      '• The favorites counter is shown at the top of the Library.\n\n' +
      '**A showcase on your profile**\n' +
      '• New **Favorite songs** section: play a clip without leaving the page, with the cover and the song type.\n' +
      '• The **Choose my favorites** dialog lets you **pin up to 5 songs** and **reorder** them. Otherwise, your most recent likes are shown.\n' +
      '• You decide whether this section is **visible on your public profile** or kept to yourself.\n\n' +
      '**Library, three ways to browse**\n' +
      '• **Franchise** view (tree, default), **Anime** view (expandable list), and **Songs** view (flat grid).\n' +
      '• Sort by **like popularity** or by **your most recent likes**, with the like count on each song.\n' +
      '• Filters and the view stay in the URL: a shared link reopens the same selection.\n\n' +
      '**The idea box**\n' +
      '• New **Ideas** button on the home page: a public board to suggest an **improvement**, a **wanted song**, a **catalogue fix**, or **something else**.\n' +
      '• Sign in to **support** an idea (one vote per person). The most backed stay on top while they are **In progress**.\n' +
      '• Search for an existing idea before posting one (maximum **5 per 24 hours**) and filter by category or status.\n' +
      '• Follow progress (**In progress**, **Planned**, **Done**, **Declined**) and read the team’s **official replies**.\n' +
      '• For a correction, search the song (title, anime, OP/ED, artist), then name the field. Difficulty is Easy, Medium, or Hard.\n\n' +
      '**Fixes**\n' +
      '• Admin: catalogue search is reliable, with **alternate titles**, without stale results, and much faster.\n' +
      '• Lobby: returning to room settings works again after a reconnect.\n\n' +
      'Have a good match, and thanks in advance for your ideas!',
  },
  5: {
    title: 'Update v26.3 — Sprint, full-screen setup, and polish',
    description:
      'New multiplayer Sprint mode (a speed race), full-screen match setup, a solo lobby recap, unified setting chips, and smoother typing autocomplete.',
    content:
      '**Sprint mode (multiplayer)**\n' +
      '• New **Sprint** mode: typing only, **2 players minimum** — the speed race!\n' +
      '• Each correct answer is worth **5 pts** plus a **podium bonus** based on your rank among the correct answers (up to **+3 pts** for the fastest).\n' +
      '• You can **change your answer** until the clock ends; the speed ranking only appears at the **reveal**.\n' +
      '• **Up to +8 pts** badge during the round · top 3 panel plus your row · detailed match history (time, rank, point breakdown).\n' +
      '• Sprint matches are saved in profile history with their own badge.\n\n' +
      '**Match setup — full screen**\n' +
      '• The cramped modal is gone.\n' +
      '• Mode selector at the top: **Standard** or **Sprint** · navigation **General** · **Source** · **Advanced** (video + clip start).\n' +
      '• Room settings (name, private, password, max players) grouped in the multi sidebar.\n\n' +
      '**Lobby & settings**\n' +
      '• Solo recap before start: a readable summary (Match, Answer, Music, Video) with a live mode badge.\n' +
      '• Unified setting chips everywhere (lobby, room list, Rules modal, game over, in-game) — difficulty in a semantic gradient, consistent icons.\n' +
      '• **STD** / **SPR** badges on rooms and history.\n\n' +
      '**Smoother typing**\n' +
      '• Autocomplete is split from the rest of the screen: less lag on each keystroke, adaptive debounce, local index.\n' +
      '• The answer bar **stays active** after you send — change your mind without leaving the keyboard (solo, multi, and Sprint).\n\n' +
      '**Under the hood**\n' +
      '• **MatchEngine** unit tests (Standard + Sprint scoring, anti-cheat, multi timer) to keep the next modes safe.\n' +
      '• Match snapshots stored in the database (`answer mode`, `precision`, `solo medal`) — groundwork for future profile stats.\n\n' +
      'Next step announced: **stat charts on the profile**, then **themed Playlists** (see the Roadmap).\n\n' +
      'Thanks for playing and for sending feedback!',
  },
  4: {
    title: 'Fix v26.2.1 — Gameplay, interface, and comfort',
    description:
      'Multiplayer timer fixed, video and typing polish, faster autocomplete, a more consistent solo layout, and a rebuilt solo lobby back button.',
    content:
      'A cumulative fix patch after v26.2 — gameplay, interface, and small daily annoyances:\n\n' +
      '**Multiplayer — guess timer**\n' +
      '• The round no longer cuts as soon as everyone has answered: the full clock runs, as in solo.\n' +
      '• You keep time to change your mind until the timer ends.\n\n' +
      '**Game interface**\n' +
      '• Video player set to **42vh**; at the reveal, **object-cover** avoids black bars on the sides.\n' +
      '• **Pause** badge moved onto the player — visible the whole round.\n' +
      '• Layout overflow fixed on the match screen.\n\n' +
      '**Typing mode**\n' +
      '• No more ghost suggestion menu after a keyboard confirm.\n' +
      '• Snappier autocomplete: menu from 2 characters, “Searching…” state, immediate request, and a warmed server cache.\n' +
      '• In pure solo Typing, the answer bar lines up with Mix mode (same spacing under the player).\n\n' +
      '**Solo lobby**\n' +
      '• **Back to game modes** button with a full clickable area, consistent with the rest of the app.\n\n' +
      'Thanks for the feedback — keep telling us what gets stuck in a match!',
  },
  3: {
    title: 'Update v26.2 — Library, MyAnimeList, and match polish',
    description:
      'Browse the whole catalogue, link MyAnimeList for Watched mode, smoother matches, and a solo guess phase aligned with multiplayer.',
    content:
      'v26.2 opens AniQuizz to catalogue discovery and a second source of watched-anime lists. Here is the detail:\n\n' +
      '**Music library**\n' +
      '• New **Library** page: browse the catalogue by franchise, filter by song type (OP/ED), difficulty, or text search.\n' +
      '• Paginated tree view plus a detail card per song (video preview, anime, season, difficulty).\n' +
      '• Only downloaded, playable songs appear — no more Coming Soon.\n\n' +
      '**MyAnimeList (Watched mode)**\n' +
      '• Link your MAL username from the profile — an alternative to AniList for Watched mode.\n' +
      '• Lists covered: Watching, Completed, and On hold — synced with our catalogue.\n' +
      '• One provider per profile (AniList **or** MAL); in multiplayer, union or intersection across providers between players.\n' +
      '• Same guards as AniList: a pool that is too small blocks the start, or you explicitly opt in to fill with random songs.\n\n' +
      '**Solo gameplay**\n' +
      '• The round no longer reveals instantly on the first answer — the full clock applies, as in multiplayer.\n' +
      '• You can change your answer until the timer ends.\n' +
      '• New **Reveal** button (after at least one answer) to move to the reveal when you are ready.\n\n' +
      '**Smoothness & loading**\n' +
      '• A snappier home page: HTML shell aligned with the real page, less flash on first load.\n' +
      '• In a match: isolated timer, pure-CSS audio visualizer, GPU blur removed from overlays — fewer stutters on modest machines.\n' +
      '• Blurred video: masking slightly stronger (+5%) during the guess.\n\n' +
      '**Playlist & polish**\n' +
      '• Fairer round order: a uniform shuffle after the franchise-diverse selection.\n' +
      '• Admin: linked-list stats (AniList / MAL) and the MAL username visible in rooms.\n\n' +
      'Next step announced: stat charts on the profile, then **Speed mode** and **themed Playlists** (see the Roadmap).\n\n' +
      'Thanks for playing and for sending feedback!',
  },
  2: {
    title: 'Update v26.1 — Account, lobby, and game modes',
    description:
      'Account deletion, lobby rules, video modes, a chosen clip start, clearer AniList, and dozens of blind-test fixes.',
    content:
      'v26.1 refines the Standard experience before the larger additions (Library, stats, MyAnimeList). Here is what changes:\n\n' +
      '**Account & privacy**\n' +
      '• Self-serve account deletion from your profile (⋮ menu), in line with the right to erasure.\n' +
      '• Confirmation by username and password before any permanent deletion.\n\n' +
      '**AniList (Watched mode)**\n' +
      '• No more silent fill: if your list is too small, the start is blocked or you explicitly choose to fill with random songs.\n' +
      '• Live banner in the lobby: pool large enough or not, Union or Shared mode, visible opt-in.\n' +
      '• In multiple choice, wrong answers stay inside your AniList pool — no more distractors from anime you have never seen.\n\n' +
      '**Lobby — Rules & settings**\n' +
      '• **Rules** button: a readable panel that explains scoring, music source, solo/multi victory, and pause/skip votes for the current setup.\n' +
      '• **Advanced** tab in the settings: video display (Audio only, Blurred, Window) and clip start (Random or At the start).\n' +
      '• In the same room, songs from previous matches are avoided when the catalogue allows it.\n\n' +
      '**Video display modes**\n' +
      '• **Audio only** (default): hidden background, circular timer — as before, cleaner.\n' +
      '• **Blurred video**: the video plays under a blur, progress bar at the bottom.\n' +
      '• **Random window**: a small clear square in a different spot each round, purple frame, the rest hidden.\n' +
      '• The reveal always shows the full video; points do not change.\n\n' +
      '**Clip start**\n' +
      '• **Random** (default): each round starts at a different point in the clip.\n' +
      '• **At the start**: the OP/ED intro is always audible — ideal if you want the opening.\n' +
      '• More reliable playback: the client waits for the right start point before playing audio.\n\n' +
      '**Fixes & polish**\n' +
      '• Solo medals: Bronze → Platinum thresholds finally match the mastery bar.\n' +
      '• Solo restart: a new playlist after returning to the lobby, no more replay of the old match.\n' +
      '• Moderation: banned players blocked on /play, ejected from matches in progress, one toast.\n' +
      '• Admin: clicking a user opens their full profile, with a way back to the admin panel.\n' +
      '• Staff: **ADMIN** hosts can add bots in the lobby on the live server (tests & demos).\n\n' +
      'Next step announced: **v26.2** — Library, stat charts on the profile, and a MyAnimeList link.\n\n' +
      'Thanks for playing and for sending feedback!',
  },
  1: {
    title: 'Update v26.0 — AniQuizz is live',
    description:
      'The next-generation anime blind test: solo or multiplayer, AniList, friends, XP, medals, and hundreds of openings to guess.',
    content:
      'AniQuizz is available! Whether you recognize an opening in two notes or still mix up two shonen, it is time to test your anime knowledge.\n\n' +
      'On the program:\n\n' +
      '**Anime blind test — Solo & Multiplayer**\n' +
      '• Solo matches to practice at your pace, or private rooms to challenge your friends in real time.\n' +
      '• Hundreds of openings and endings to guess, with difficulty filters (Easy, Medium, Hard).\n' +
      '• Answer modes: Typing (keyboard), multiple choice, Duo, or Mix.\n' +
      '• Anime or Franchise precision, depending on the challenge you want.\n' +
      '• Solo medals (Bronze → Platinum): your score is judged against the maximum possible, not an arbitrary percentage.\n' +
      '• Smart autocomplete in Typing so you can go fast without giving up precision.\n\n' +
      '**AniList integration**\n' +
      '• Link your AniList account from your profile to sync the anime you have seen.\n' +
      '• Play only songs from your watchlist — so you do not land on an anime you have never seen.\n' +
      '• In multiplayer, two merge modes: Union (every list mixed) or Shared (only anime seen by everyone).\n\n' +
      '**Friends & social**\n' +
      '• Add friends by username, accept requests, see who is online or in a match.\n' +
      '• Invite a friend into your lobby or join theirs in one click.\n' +
      '• Add someone from the end screen or the player list — no need to hunt for their username.\n' +
      '• A recent-players list to find yesterday’s opponents again.\n\n' +
      '**Progress & profile**\n' +
      '• Earn XP every match, level up, and show your badge in the header.\n' +
      '• Detailed stats: wins, accuracy, games played, win streaks.\n' +
      '• Music Pokédex: track how many unique songs you have already met in the catalogue.\n' +
      '• Custom avatar: upload your image, crop it, and wear it in game.\n\n' +
      '**Match experience**\n' +
      '• Circular timer, reveal with an anime card (season, score, cover…), lobby chat.\n' +
      '• Pause / skip votes in multiplayer, confirmation before leaving a match in progress.\n' +
      '• A modern dark interface, built for desktop and mobile.\n\n' +
      'And this is only the start — see the Roadmap on the News page for what comes next (Library, Leaderboard, Daily, Competitive…).\n\n' +
      'Thanks for playing AniQuizz — and good luck on Platinum!',
  },
};
