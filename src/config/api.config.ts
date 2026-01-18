// Configuration des URLs API - Permet de changer facilement de backend
export const API_CONFIG = {
  // URL de base du backend (Supabase par défaut, mais configurable)
  baseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  
  // Clé publique API
  anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  
  // Endpoints personnalisables
  endpoints: {
    auth: '/auth/v1',
    rest: '/rest/v1',
    storage: '/storage/v1',
    functions: '/functions/v1',
  },
  
  // Configuration des timeouts
  timeout: 30000,
  
  // Retry configuration
  retries: 3,
};

// Types pour la configuration
export type ApiConfig = typeof API_CONFIG;
