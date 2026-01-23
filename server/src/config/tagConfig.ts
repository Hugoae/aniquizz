// server/src/config/tagConfig.ts
import { TAG_COLORS } from './constants'; // Importe les couleurs d'à côté

export interface TagMetadata {
    id: string;
    label: string;
    dbValues: string[];
    color: string;
    textColor?: string;
    isPlaylist: boolean;
}

export const TAG_DEFINITIONS: Record<string, TagMetadata> = {
    'action': {
        id: 'action',
        label: 'Action & Aventure',
        dbValues: ['Action', 'Adventure'],
        color: TAG_COLORS['action'],
        isPlaylist: true
    },
    'fantasy': {
        id: 'fantasy',
        label: 'Fantasy & Magic',
        dbValues: ['Fantasy', 'Supernatural'],
        color: TAG_COLORS['fantasy'],
        isPlaylist: true
    },
    'romance': {
        id: 'romance',
        label: 'Romance & Drama',
        dbValues: ['Romance', 'Drama'],
        color: TAG_COLORS['romance'],
        isPlaylist: true
    },
    'scifi': {
        id: 'scifi',
        label: 'Sci-Fi & Mecha',
        dbValues: ['Sci-Fi', 'Mecha'],
        color: TAG_COLORS['scifi'],
        isPlaylist: true
    },
    'dark': {
        id: 'dark',
        label: 'Dark & Psychological',
        dbValues: ['Psychological', 'Thriller', 'Horror', 'Mystery'],
        color: TAG_COLORS['dark'],
        isPlaylist: true
    },
    'chill': {
        id: 'chill',
        label: 'Chill / Slice of Life',
        dbValues: ['Slice of Life'],
        color: TAG_COLORS['chill'],
        textColor: '#000000',
        isPlaylist: true
    },
    'comedy': {
        id: 'comedy',
        label: 'Comedy',
        dbValues: ['Comedy'],
        color: TAG_COLORS['comedy'],
        textColor: '#000000',
        isPlaylist: true
    },
    
    // TAGS DÉCORATIFS
    'sports': {
        id: 'sports',
        label: 'Sports',
        dbValues: ['Sports'],
        color: TAG_COLORS['sports'],
        isPlaylist: false
    },
    'music': {
        id: 'music',
        label: 'Music',
        dbValues: ['Music'],
        color: TAG_COLORS['music'],
        isPlaylist: false
    },
    'ecchi': {
        id: 'ecchi',
        label: 'Ecchi',
        dbValues: ['Ecchi'],
        color: TAG_COLORS['ecchi'],
        isPlaylist: false
    }
};

export const getTagMeta = (rawTag: string): TagMetadata | undefined => {
    return Object.values(TAG_DEFINITIONS).find(t => 
        t.dbValues.some(dbValue => dbValue.toLowerCase() === rawTag.toLowerCase())
    );
};

export const getPlayablePlaylists = () => {
    return Object.values(TAG_DEFINITIONS).filter(t => t.isPlaylist);
};