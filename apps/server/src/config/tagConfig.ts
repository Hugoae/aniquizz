// Mapping des playlists du GameHub vers les tags de la Base de Données
// Utilisé par gameService.ts pour filtrer les sons

export const TAG_DEFINITIONS: Record<string, { dbValues: string[] }> = {
  action: { 
      dbValues: ['Action', 'Adventure'] 
  },
  fantasy: { 
      dbValues: ['Fantasy', 'Magic', 'Mahou Shoujo', 'Supernatural', 'Isekai'] 
  },
  romance: { 
      dbValues: ['Romance', 'Drama', 'Shoujo'] 
  },
  scifi: { 
      dbValues: ['Sci-Fi', 'Mecha', 'Space', 'Cyberpunk'] 
  },
  dark: { 
      dbValues: ['Horror', 'Psychological', 'Thriller', 'Mystery', 'Dark Fantasy'] 
  },
  chill: { 
      dbValues: ['Slice of Life', 'Iyashikei', 'Josei'] 
  },
  comedy: { 
      dbValues: ['Comedy', 'Parody', 'Gag Humor'] 
  }
};