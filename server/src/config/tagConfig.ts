// server/src/config/tagConfig.ts

export interface TagMetadata {
    id: string;          // ID unique pour le code
    label: string;       // Nom affiché au joueur
    dbValues: string[];  // Les tags EXACTS de ta base de données (résultat du script)
    color: string;       // Couleur de fond (Badge UI)
    textColor?: string;  // Couleur du texte (blanc par défaut)
    isPlaylist: boolean; // Si TRUE -> Apparaît dans le menu "Choix Playlist"
}

export const TAG_DEFINITIONS: Record<string, TagMetadata> = {
    // --- PLAYLISTS JOUABLES (Regroupements logiques) ---
    
    'action': {
        id: 'action',
        label: 'Action & Aventure',
        dbValues: ['Action', 'Adventure'],
        color: '#FF4500', // Orange Red
        isPlaylist: true
    },
    'fantasy': {
        id: 'fantasy',
        label: 'Fantasy & Magic',
        dbValues: ['Fantasy', 'Supernatural'],
        color: '#9C27B0', // Purple
        isPlaylist: true
    },
    'romance': {
        id: 'romance',
        label: 'Romance & Drama',
        dbValues: ['Romance', 'Drama'],
        color: '#E91E63', // Pink
        isPlaylist: true
    },
    'scifi': {
        id: 'scifi',
        label: 'Sci-Fi & Mecha',
        dbValues: ['Sci-Fi', 'Mecha'],
        color: '#00BCD4', // Cyan
        isPlaylist: true
    },
    'dark': {
        id: 'dark',
        label: 'Dark & Psychological',
        dbValues: ['Psychological', 'Thriller', 'Horror', 'Mystery'],
        color: '#212121', // Dark Grey
        isPlaylist: true
    },
    'chill': {
        id: 'chill',
        label: 'Chill / Slice of Life',
        dbValues: ['Slice of Life'],
        color: '#8BC34A', // Light Green
        textColor: '#000000',
        isPlaylist: true
    },
    'comedy': {
        id: 'comedy',
        label: 'Comedy',
        dbValues: ['Comedy'],
        color: '#ddeb1c', // yellow
        textColor: '#000000',
        isPlaylist: true
    },
    
    // --- TAGS DÉCORATIFS (Pour l'affichage des badges seulement) ---
    // Ces tags existent dans ta BDD mais sont trop petits pour faire une playlist seule
    // ou sont déjà inclus ailleurs, mais on veut leur propre couleur sur l'interface.
    
    'sports': {
        id: 'sports',
        label: 'Sports',
        dbValues: ['Sports'],
        color: '#FF9800', // Orange
        isPlaylist: false // Trop peu de sons (11) pour l'instant
    },
    'music': {
        id: 'music',
        label: 'Music',
        dbValues: ['Music'],
        color: '#3F51B5', // Indigo
        isPlaylist: false
    },
    'ecchi': {
        id: 'ecchi',
        label: 'Ecchi',
        dbValues: ['Ecchi'],
        color: '#FF69B4', // Hot Pink
        isPlaylist: false
    }
};

/**
 * Helper : Trouve la config UI à partir d'un tag brut (ex: "Slice of Life")
 */
export const getTagMeta = (rawTag: string): TagMetadata | undefined => {
    return Object.values(TAG_DEFINITIONS).find(t => 
        t.dbValues.some(dbValue => dbValue.toLowerCase() === rawTag.toLowerCase())
    );
};

export const getPlayablePlaylists = () => {
    return Object.values(TAG_DEFINITIONS).filter(t => t.isPlaylist);
};