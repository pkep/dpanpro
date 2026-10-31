import { supabase } from '@/integrations/supabase/client';
import { sessionManager } from '@/services/session/session-manager';
import type { IAuthService } from '@/services/interfaces/auth.interface';
import type { User, UserRole, LoginCredentials, RegisterCredentials, AuthResponse, OAuthProvider } from '@/types/auth.types';
import type { OAuthFlow } from '@/services/interfaces/auth.interface';
import type { DbUser, DbUserInsert } from '@/types/database.types';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

// Service d'authentification - Gestion des utilisateurs dans le schéma public
class AuthService implements IAuthService {
  private currentUser: User | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Récupérer l'utilisateur depuis la table users du schéma public
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', credentials.email.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      if (!userData) {
        return { success: false, error: 'Email ou mot de passe incorrect' };
      }

      const dbUser = userData as unknown as DbUser;

      // Vérifier le mot de passe via une edge function
      const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-password', {
        body: { 
          password: credentials.password, 
          hash: dbUser.password_hash 
        }
      });

      if (verifyError || !verifyResult?.valid) {
        return { success: false, error: 'Email ou mot de passe incorrect' };
      }

      // Check account status (clients: email verification; staff/B2B: admin deactivation)
      const dbUserCheck = userData as unknown as DbUser;
      if (!dbUserCheck.is_active) {
        if (dbUserCheck.role === 'client') {
          return { success: false, error: 'Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception.', requiresEmailVerification: true };
        }
        return { success: false, error: 'Compte désactivé. Contactez le support.' };
      }

      if (dbUser.role === 'technician') {
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() } as never)
          .eq('id', dbUser.id);
      }

      // Créer la session
      const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        phone: dbUser.phone,
        role: dbUser.role as UserRole,
        isActive: dbUser.is_active,
        isCompany: dbUser.is_company,
        companyName: dbUser.company_name,
        companyAddress: dbUser.company_address,
        siren: dbUser.siren,
        vatNumber: dbUser.vat_number,
        avatarUrl: dbUser.avatar_url,
        companyLogoUrl: dbUser.company_logo_url,
        mustChangePassword: dbUser.must_change_password,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at,
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
        return { success: false, error: 'Cette adresse email existe déjà !' };
      }

      // Hasher le mot de passe via edge function
      const { data: hashResult, error: hashError } = await supabase.functions.invoke('hash-password', {
        body: { password: credentials.password }
      });

      if (hashError || !hashResult?.hash) {
        return { success: false, error: 'Erreur lors de la création du compte' };
      }

      const insertData: DbUserInsert = {
        email: credentials.email.toLowerCase(),
        password_hash: hashResult.hash,
        first_name: credentials.firstName,
        last_name: credentials.lastName,
        phone: credentials.phone || null,
        role: 'client',
        is_active: false, // Inactive until email verified
        is_company: credentials.isCompany || false,
        company_name: credentials.companyName || null,
        company_address: credentials.companyAddress || null,
        siren: credentials.siren || null,
        vat_number: credentials.vatNumber || null,
      };

      // Créer l'utilisateur
      const { data: newUserData, error } = await supabase
        .from('users')
        .insert(insertData as TablesInsert<'users'>)
        .select()
        .single();

      if (error) throw error;
      if (!newUserData) {
        return { success: false, error: 'Erreur lors de la création du compte' };
      }

      const newUser = newUserData as unknown as DbUser;

      const user: User = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        phone: newUser.phone,
        role: newUser.role as UserRole,
        isActive: newUser.is_active,
        isCompany: newUser.is_company,
        companyName: newUser.company_name,
        companyAddress: newUser.company_address,
        siren: newUser.siren,
        vatNumber: newUser.vat_number,
        avatarUrl: newUser.avatar_url,
        companyLogoUrl: newUser.company_logo_url,
        mustChangePassword: newUser.must_change_password,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      };

      // Don't auto-login: send verification email instead
      try {
        await supabase.functions.invoke('send-verification-email', {
          body: {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
          },
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }

      return { success: true, user, requiresEmailVerification: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Erreur lors de l\'inscription' };
    }
  }

  // ── OAuth (CUSTOMER only) — redirect flow via Supabase Auth ──
  getOAuthFlow(): OAuthFlow { return 'redirect'; }

  private oauthProvidersCache: Promise<Record<OAuthProvider, boolean>> | null = null;

  /**
   * Supabase Auth exposes its enabled external providers on the public settings endpoint
   * GET {SUPABASE_URL}/auth/v1/settings → { external: { google: true, facebook: false, ... } }.
   * Cached for the page lifetime; any failure → no provider (buttons hidden).
   */
  getOAuthProviders(): Promise<Record<OAuthProvider, boolean>> {
    if (this.oauthProvidersCache) return this.oauthProvidersCache;
    this.oauthProvidersCache = (async () => {
      const none: Record<OAuthProvider, boolean> = { google: false, facebook: false };
      const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
      if (!url || !key) return none;
      try {
        const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: key } });
        if (!res.ok) return none;
        const json = await res.json();
        const ext = json?.external ?? {};
        return { google: ext.google === true, facebook: ext.facebook === true };
      } catch {
        return none;
      }
    })();
    return this.oauthProvidersCache;
  }

  async startOAuth(provider: OAuthProvider, redirectTo?: string): Promise<void> {
    const target = redirectTo || `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: target,
        // ask Google for a refreshable, email-scoped session; FB: email is requested by default
        queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'select_account' } : undefined,
        scopes: provider === 'facebook' ? 'email,public_profile' : undefined,
      },
    });
    if (error) throw new Error(error.message);
  }

  /**
   * /auth/callback: Supabase Auth has already exchanged the code for a session.
   * We enforce the CUSTOMER-only rule and create/link public.users through the
   * SECURITY DEFINER RPC oauth_upsert_customer (see deploy-package-supabase/scripts/users-oauth-providers.sql).
   */
  async completeOAuthCallback(): Promise<AuthResponse> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) return { success: false, error: error.message };
      if (!session?.user) return { success: false, error: 'Connexion annulée ou expirée' };

      const au = session.user;
      const provider = (au.app_metadata?.provider as OAuthProvider | undefined) ?? 'google';
      if (provider !== 'google' && provider !== 'facebook') {
        await supabase.auth.signOut();
        return { success: false, error: 'Provider non supporté' };
      }
      const meta: any = au.user_metadata || {};
      const identity = (au.identities || []).find(i => i.provider === provider);
      const providerId: string = identity?.id || meta.provider_id || meta.sub || au.id;
      const email: string | undefined = au.email || meta.email;
      if (!email) {
        await supabase.auth.signOut();
        return { success: false, error: `Votre compte ${provider === 'google' ? 'Google' : 'Facebook'} ne partage pas d'adresse e-mail.` };
      }
      const fullName: string = meta.full_name || meta.name || '';
      const firstName: string = meta.given_name || meta.first_name || fullName.split(' ')[0] || '';
      const lastName: string = meta.family_name || meta.last_name || fullName.split(' ').slice(1).join(' ') || '';
      const avatarUrl: string | null = meta.avatar_url || meta.picture || null;

      const { data: row, error: rpcError } = await (supabase as any).rpc('oauth_upsert_customer', {
        p_auth_user_id: au.id,
        p_provider: provider,
        p_provider_id: providerId,
        p_email: email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_avatar_url: avatarUrl,
      });
      if (rpcError) {
        await supabase.auth.signOut();
        const msg: string = rpcError.message || '';
        if (msg.startsWith('ROLE_NOT_ALLOWED')) {
          return { success: false, error: 'Ce compte est associé à un autre rôle — veuillez vous connecter avec votre mot de passe.' };
        }
        if (msg.startsWith('PROVIDER_MISMATCH')) {
          const other = msg.includes('facebook') ? 'Facebook' : 'Google';
          return { success: false, error: `Ce compte est déjà lié à ${other}. Connectez-vous avec ${other}.` };
        }
        return { success: false, error: msg || 'Connexion OAuth impossible' };
      }

      const dbUser = row as unknown as DbUser & { oauth_provider?: string | null; password_hash?: string | null };
      const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        phone: dbUser.phone,
        role: dbUser.role as UserRole,
        isActive: dbUser.is_active,
        isCompany: dbUser.is_company,
        companyName: dbUser.company_name,
        companyAddress: dbUser.company_address,
        siren: dbUser.siren,
        vatNumber: dbUser.vat_number,
        avatarUrl: dbUser.avatar_url,
        companyLogoUrl: dbUser.company_logo_url,
        mustChangePassword: dbUser.must_change_password,
        oauthProvider: (dbUser.oauth_provider as OAuthProvider | null) ?? provider,
        hasPassword: !!dbUser.password_hash,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at,
      };

      this.currentUser = user;
      localStorage.setItem('depanpro_user', JSON.stringify(user));
      this.notifyListeners();
      return { success: true, user };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Connexion OAuth impossible' };
    }
  }

  async loginWithOAuthToken(): Promise<AuthResponse> {
    return { success: false, error: 'Mode Supabase : utilisez startOAuth() (redirection).' };
  }

  async logout(): Promise<void> {
    // 0. Supabase Auth session (OAuth) — best effort
    try { await supabase.auth.signOut(); } catch { /* ignore */ }

    // 1. Clear user data
    this.currentUser = null;

    // 2. Clear ONLY authentication data (NOT cache/preferences)
    const itemsToRemove = [
      'depanpro_user',
      'depanpro_token',
      'depanpro_refresh_token',
      // ❌ DO NOT REMOVE:
      // 'depanpro_preferences'  ← Keep for next session
      // 'depanpro_cache'        ← Keep for next session
    ];

    itemsToRemove.forEach(item => {
      localStorage.removeItem(item);
    });

    // 3. Clear sessionStorage (session-specific only)
    sessionStorage.clear();

    // 4. Stop session manager
    sessionManager.stopSession();

    // 5. Notify listeners
    this.notifyListeners();

    // NOTE: Cache and preferences are NOT cleared to improve UX
    // on next login (faster load, preserved settings)
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

  /**
   * Re-fetch the current user from the DB (source of truth) and refresh the
   * in-memory + localStorage session. Fixes stale cached data (avatar, name…)
   * after an admin/manager edited the account on another device.
   */
  async refreshUser(): Promise<User | null> {
    const current = this.getCurrentUser();
    if (!current?.id) return current;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', current.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return current;

      const user = this.mapDbUserToUser(data as unknown as DbUser, current);
      if (!user.isActive && user.role !== 'client') {
        await this.logout();
        return null;
      }
      this.currentUser = user;
      localStorage.setItem('depanpro_user', JSON.stringify(user));
      this.notifyListeners();
      return user;
    } catch (error) {
      console.warn('[auth] refreshUser failed:', error);
      return current;
    }
  }

  /** Map a `users` row to the domain `User`, preserving auth-only fields from `fallback`. */
  private mapDbUserToUser(dbUser: DbUser, fallback?: User | null): User {
    const ext = dbUser as DbUser & {
      oauth_provider?: string | null;
      photo_quality_ok?: boolean | null;
      photo_quality_checked_at?: string | null;
      photo_quality_issues?: string[] | null;
    };
    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phone: dbUser.phone,
      role: dbUser.role as UserRole,
      isActive: dbUser.is_active,
      isCompany: dbUser.is_company,
      companyName: dbUser.company_name,
      companyAddress: dbUser.company_address,
      siren: dbUser.siren,
      vatNumber: dbUser.vat_number,
      avatarUrl: dbUser.avatar_url,
      companyLogoUrl: dbUser.company_logo_url,
      mustChangePassword: dbUser.must_change_password,
      photoQualityOk: ext.photo_quality_ok ?? null,
      photoQualityCheckedAt: ext.photo_quality_checked_at ?? null,
      photoQualityIssues: ext.photo_quality_issues ?? null,
      oauthProvider: (ext.oauth_provider as OAuthProvider | null) ?? fallback?.oauthProvider ?? null,
      hasPassword: dbUser.password_hash !== undefined ? !!dbUser.password_hash : fallback?.hasPassword,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  }

  /**
   * Change the current user's password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    // Verify current password
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) throw userError;
    if (!userData) throw new Error('Utilisateur non trouvé');

    // Verify the current password
    const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-password', {
      body: {
        password: currentPassword,
        hash: userData.password_hash
      }
    });

    if (verifyError || !verifyResult?.valid) {
      throw new Error('Mot de passe actuel incorrect');
    }

    // Hash the new password
    const { data: hashResult, error: hashError } = await supabase.functions.invoke('hash-password', {
      body: { password: newPassword }
    });

    if (hashError) throw hashError;

    // Update password in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashResult.hash })
      .eq('id', user.id);

    if (updateError) throw updateError;
  }

  /**
   * Resend verification email to user
   */
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      console.log('resendVerificationEmail: ' + email);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) throw new Error('Utilisateur non trouvé');

      await supabase.functions.invoke('send-verification-email', {
        body: {
          userId: userData.id,
          email,
          firstName: userData.first_name,
        },
      });
    } catch (error) {
      console.error('Error resending verification email:', error);
      throw error;
    }
  }

  /**
   * Verify user email with token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from('email_verification_tokens')
        .select('user_id, expires_at')
        .eq('token', token)
        .maybeSingle();

      if (tokenError) throw tokenError;
      if (!tokenData) throw new Error('Token invalid or expired');

      // Check if token has expired
      if (new Date(tokenData.expires_at) < new Date()) {
        throw new Error('Token expired');
      }

      // Mark email as verified (set is_active = true)
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', tokenData.user_id);

      if (updateError) throw updateError;

      // Mark token as used
      const { error: tokenUpdateError } = await supabase
        .from('email_verification_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      if (tokenUpdateError) throw tokenUpdateError;
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('user_id, expires_at')
        .eq('token', token)
        .maybeSingle();

      if (tokenError) throw tokenError;
      if (!tokenData) {
        return { success: false };
      }

      // Check if token has expired
      if (new Date(tokenData.expires_at) < new Date()) {
        return { success: false };
      }

      // Hash the new password
      const { data: hashResult, error: hashError } = await supabase.functions.invoke('hash-password', {
        body: { password: newPassword }
      });

      if (hashError) throw hashError;

      // Update password in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashResult.hash })
        .eq('id', tokenData.user_id);

      if (updateError) throw updateError;

      // Mark token as used
      const { error: tokenUpdateError } = await supabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      if (tokenUpdateError) throw tokenUpdateError;

      return { success: true };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false };
    }
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentUser));
  }
}

export const authService = new AuthService();
