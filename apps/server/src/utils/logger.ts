import winston from 'winston';

// Définition des niveaux de logs personnalisés et couleurs
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// On dit à Winston d'utiliser nos couleurs
winston.addColors(colors);

// Formatage personnalisé du message
const format = winston.format.combine(
  // Ajoute le timestamp (ex: 2024-01-26 14:00:00)
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  
  // Active les couleurs
  winston.format.colorize({ all: true }),
  
  // Notre template d'affichage sécurisé
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, context, ...meta } = info;
      
      // Choix d'un icône selon le contexte
      let icon = '';
      if (context === 'Database') icon = '🗄️ ';
      if (context === 'Socket') icon = '🔌';
      if (context === 'Server') icon = '🚀';
      if (context === 'Game') icon = '🎮';
      if (context === 'Chat') icon = '💬';

      // ✅ FIX CRITIQUE : Sécurisation du stringify pour éviter le crash du serveur
      // si l'objet 'meta' (souvent une erreur Prisma) contient des références circulaires.
      let metaString = '';
      if (Object.keys(meta).length) {
          try {
              metaString = JSON.stringify(meta, null, 2);
          } catch (e) {
              metaString = `[Données non sérialisables]`;
          }
      }

      return `[${timestamp}] ${level}: ${icon}${context ? `[${context}] ` : ''}${message} ${metaString}`;
    }
  )
);

// Création de l'instance du logger
const winstonInstance = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  transports: [
    new winston.transports.Console(),
  ],
});

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