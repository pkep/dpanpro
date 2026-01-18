import { supabase } from '@/integrations/supabase/client';
import type { User, UserRole, LoginCredentials, RegisterCredentials, AuthResponse } from '@/types/auth.types';

// Service d'authentification - Gestion des utilisateurs dans le schéma public
class AuthService {
  private currentUser: User | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Récupérer l'utilisateur depuis la table users du schéma public
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', credentials.email.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      if (!users) {
        return { success: false, error: 'Email ou mot de passe incorrect' };
      }

      // Vérifier le mot de passe via une edge function
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-password', {
        body: { 
          password: credentials.password, 
          hash: users.password_hash 
        }
      });

      if (verifyError || !verifyResult?.valid) {
        return { success: false, error: 'Email ou mot de passe incorrect' };
      }

      // Créer la session
      const user: User = {
        id: users.id,
        email: users.email,
        firstName: users.first_name,
        lastName: users.last_name,
        phone: users.phone,
        role: users.role as UserRole,
        isActive: users.is_active,
        createdAt: users.created_at,
        updatedAt: users.updated_at,
      };

      this.currentUser = user;
      this.notifyListeners();
      
      // Stocker la session
      localStorage.setItem('depanpro_user', JSON.stringify(user));
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      // Vérifier si l'email existe déjà
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', credentials.email.toLowerCase())
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'Cet email est déjà utilisé' };
      }

      // Hasher le mot de passe via edge function
      const { data: hashResult, error: hashError } = await supabase.functions.invoke('hash-password', {
        body: { password: credentials.password }
      });

      if (hashError || !hashResult?.hash) {
        return { success: false, error: 'Erreur lors de la création du compte' };
      }

      // Créer l'utilisateur
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email: credentials.email.toLowerCase(),
          password_hash: hashResult.hash,
          first_name: credentials.firstName,
          last_name: credentials.lastName,
          phone: credentials.phone || null,
          role: 'client',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      const user: User = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        phone: newUser.phone,
        role: newUser.role as UserRole,
        isActive: newUser.is_active,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      };

      this.currentUser = user;
      this.notifyListeners();
      localStorage.setItem('depanpro_user', JSON.stringify(user));

      return { success: true, user };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Erreur lors de l\'inscription' };
    }
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem('depanpro_user');
    this.notifyListeners();
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;
    
    const stored = localStorage.getItem('depanpro_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      } catch {
        localStorage.removeItem('depanpro_user');
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  subscribe(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentUser));
  }
}

export const authService = new AuthService();
