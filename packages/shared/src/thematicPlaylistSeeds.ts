// Staff-curated packs. Names/descriptions are French (user-facing, isolated).
import type { PlaylistCategory, PlaylistRecipe } from './playlist';

export interface StaffThematicPlaylistSeed {
  slug: string;
  name: string;
  description: string;
  category: PlaylistCategory;
  sortOrder: number;
  recipe: PlaylistRecipe;
}

/** Former staff slugs to delete on the next seed so they leave the public picker. */
export const RETIRED_STAFF_PLAYLIST_SLUGS = ['movies', 'easy-hits'] as const;

export const STAFF_THEMATIC_PLAYLISTS: StaffThematicPlaylistSeed[] = [
  {
    slug: 'shonen',
    name: 'Shonen',
    description: 'Naruto, One Piece, Dragon Ball…',
    category: 'tag',
    sortOrder: 10,
    recipe: { tags: ['Shounen'] },
  },
  {
    slug: 'seinen',
    name: 'Seinen',
    description: 'Berserk, Vinland Saga, Monster…',
    category: 'tag',
    sortOrder: 20,
    recipe: { tags: ['Seinen'] },
  },
  {
    slug: 'slice-of-life',
    name: 'Tranches de vie',
    description: 'K-On!, Clannad, Yuru Camp…',
    category: 'genre',
    sortOrder: 60,
    recipe: { genres: ['Slice of Life'] },
  },
  {
    slug: 'mecha',
    name: 'Mecha',
    description: 'Gundam, Evangelion, Code Geass…',
    category: 'genre',
    sortOrder: 90,
    recipe: { genres: ['Mecha'] },
  },
  {
    slug: 'fantasy',
    name: 'Fantasy',
    description: 'Frieren, Sword Art Online, Fairy Tail…',
    category: 'genre',
    sortOrder: 30,
    recipe: { genres: ['Fantasy'] },
  },
  {
    slug: 'romance',
    name: 'Romance',
    description: 'Toradora, Horimiya, Kaguya-sama…',
    category: 'genre',
    sortOrder: 40,
    recipe: { genres: ['Romance'] },
  },
  {
    slug: 'supernatural',
    name: 'Surnaturel',
    description: 'Jujutsu Kaisen, Demon Slayer, Bleach…',
    category: 'genre',
    sortOrder: 80,
    recipe: { genres: ['Supernatural'] },
  },
  {
    slug: 'sci-fi',
    name: 'Science-fiction',
    description: 'Steins;Gate, Cowboy Bebop, Psycho-Pass…',
    category: 'genre',
    sortOrder: 100,
    recipe: { genres: ['Sci-Fi'] },
  },
  {
    slug: 'sports',
    name: 'Sports',
    description: 'Haikyuu!!, Kuroko no Basket, Slam Dunk…',
    category: 'genre',
    sortOrder: 50,
    recipe: { genres: ['Sports'] },
  },
  {
    slug: 'isekai',
    name: 'Isekai',
    description: 'Re:Zero, Konosuba, Mushoku Tensei…',
    category: 'tag',
    sortOrder: 70,
    recipe: { tags: ['Isekai'] },
  },
  {
    slug: '1990s',
    name: 'Années 1990',
    description:
      'Saisons / films sortis entre 1990 et 1999 (année de l’entrée, pas de la franchise). Pack vintage, plus petit.',
    category: 'decade',
    sortOrder: 110,
    recipe: { yearMin: 1990, yearMax: 1999 },
  },
  {
    slug: '2000s',
    name: 'Années 2000',
    description: 'Saisons / films sortis entre 2000 et 2009.',
    category: 'decade',
    sortOrder: 120,
    recipe: { yearMin: 2000, yearMax: 2009 },
  },
  {
    slug: '2010s',
    name: 'Années 2010',
    description: 'Saisons / films sortis entre 2010 et 2019.',
    category: 'decade',
    sortOrder: 130,
    recipe: { yearMin: 2010, yearMax: 2019 },
  },
  {
    slug: '2020s',
    name: 'Années 2020',
    description: 'Saisons / films sortis depuis 2020.',
    category: 'decade',
    sortOrder: 140,
    recipe: { yearMin: 2020, yearMax: 2029 },
  },
];
