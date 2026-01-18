import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { authService } from '@/services/auth/auth.service';
import type { User, AuthState, LoginCredentials, RegisterCredentials, AuthResponse } from '@/types/auth.types';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Initialize auth state
    const user = authService.getCurrentUser();
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated: !!user,
    });

    // Subscribe to auth changes
    const unsubscribe = authService.subscribe((user) => {
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: !!user,
      });
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    return response;
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const response = await authService.register(credentials);
    return response;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
