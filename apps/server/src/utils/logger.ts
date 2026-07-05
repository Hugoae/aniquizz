import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file'; // Assure-toi d'avoir fait: npm install winston-daily-rotate-file
import path from 'path';
import fs from 'fs';

// --- CONFIGURATION ---

// Création automatique du dossier logs s'il n'existe pas
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Définition des niveaux de logs personnalisés
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Couleurs pour la console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// --- UTILITAIRES DE FORMATAGE ---

// Helper pour récupérer l'icône selon le contexte
const getContextIcon = (context?: string): string => {
  switch (context) {
    case 'Database': return '🗄️ ';
    case 'Socket': return '🔌';
    case 'Server': return '🚀';
    case 'Game': return '🎮';
    case 'GameLoop': return '🔄'; // Nouveau : Boucle de jeu
    case 'Phase': return '⏱️ '; // Nouveau : Changement de phase
    case 'Vote': return '🗳️ '; // Nouveau : Votes (Skip/Pause)
    case 'Chat': return '💬';
    case 'Anilist': return '🌸'; // Nouveau : API AniList
    case 'Scoring': return '🏆'; // Nouveau : Points et Victoire
    case 'Lobby': return '🏠';   // Nouveau : Gestion des salons
    case 'Service': return '⚙️ '; // Nouveau : Logique métier
    default: return '';
  }
};

// Helper pour sécuriser le stringify des objets (évite crash sur références circulaires)
const safeStringify = (obj: any): string => {
  if (!obj || Object.keys(obj).length === 0) return '';
  try {
    return `\n${JSON.stringify(obj, null, 2)}`;
  } catch (e) {
    return ' [Données circulaires ou non sérialisables]';
  }
};

// --- FORMATS ---

// 1. Format Console (Coloré + Icônes)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, context, ...meta } = info;
    const icon = getContextIcon(context as string);
    const contextTag = context ? `[${context}] ` : '';
    return `[${timestamp}] ${level}: ${icon}${contextTag}${message}${safeStringify(meta)}`;
  })
);

// 2. Format Fichier (Brut, sans couleurs ANSI, Timestamp complet)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, context, ...meta } = info;
    const contextTag = context ? `[${context}] ` : '';
    return `${timestamp} [${level.toUpperCase()}] ${contextTag}${message}${safeStringify(meta)}`;
  })
);

// --- INSTANCE WINSTON ---

const winstonInstance = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  transports: [
    // 1. Sortie Console
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // 2. Fichier Erreurs (Uniquement les logs error) - Rotation Journalière
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d', // Garde les erreurs 2 semaines
      level: 'error',
      format: fileFormat,
    }),

    // 3. Fichier Combiné (Tout ce qui se passe) - Rotation Journalière
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d', // Garde tout l'historique sur 7 jours glissants
      format: fileFormat,
    }),
  ],
});

// --- EXPORT ---

// Wrapper pour simplifier l'utilisation avec le contexte
export const logger = {
  error: (message: string, context?: string, meta?: any) => 
    winstonInstance.error(message, { context, ...meta }),
  
  warn: (message: string, context?: string, meta?: any) => 
    winstonInstance.warn(message, { context, ...meta }),
  
  info: (message: string, context?: string, meta?: any) => 
    winstonInstance.info(message, { context, ...meta }),
  
  http: (message: string, context?: string, meta?: any) => 
    winstonInstance.http(message, { context, ...meta }),
  
  debug: (message: string, context?: string, meta?: any) => 
    winstonInstance.debug(message, { context, ...meta }),
};