import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { services } from '@/services/factory';
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
    const user = services.auth.getCurrentUser();
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated: !!user,
    });

    const unsubscribe = services.auth.subscribe((user) => {
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: !!user,
      });
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await services.auth.login(credentials);
    return response;
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const response = await services.auth.register(credentials);
    return response;
  }, []);

  const logout = useCallback(async () => {
    await services.auth.logout();
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
