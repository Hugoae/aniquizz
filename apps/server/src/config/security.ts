import { CorsOptions } from 'cors';

// Liste des sites autorisés à se connecter à ton API
const ALLOWED_ORIGINS = [
  "http://localhost:5173", // Ton Client Vite (Dev)
  "http://localhost:3000"  // Autre éventuel client
];

export const securityConfig: CorsOptions = {
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST"],
  credentials: true // Autorise les cookies/sessions si besoin
};