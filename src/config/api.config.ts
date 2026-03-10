// Configuration des URLs API - Permet de changer facilement de backend
export const API_CONFIG = {
  // Mode API: 'supabase' (défaut) ou 'spring'
  mode: (import.meta.env.VITE_API_MODE || 'supabase') as 'supabase' | 'spring',

  // URL de base du backend Supabase
  baseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  
  // URL de base du backend Spring
  springBaseUrl: import.meta.env.VITE_SPRING_API_URL || 'http://localhost:8080/api',
  
  // Clé publique API (Supabase)
  anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  
  // Endpoints Supabase
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

export const isSpringMode = (): boolean => API_CONFIG.mode === 'spring';

// Types pour la configuration
export type ApiConfig = typeof API_CONFIG;
