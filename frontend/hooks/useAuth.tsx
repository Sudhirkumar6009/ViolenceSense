"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authService, User } from "@/services/authService";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const initAuth = async () => {
      const storedUser = authService.getUser();
      const token = authService.getToken();

      if (storedUser && token) {
        setUser(storedUser);
        // Validate token with server
        const response = await authService.getCurrentUser();
        if (!response.success) {
          // Token invalid, clear auth
          authService.clearAuth();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    if (response.success && response.data) {
      setUser(response.data.user);
    }
    return { success: response.success, error: response.error };
  };

  const register = async (
    username: string,
    email: string,
    password: string,
  ) => {
    const response = await authService.register({ username, email, password });
    if (response.success && response.data) {
      setUser(response.data.user);
    }
    return { success: response.success, error: response.error };
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const response = await authService.getCurrentUser();
    if (response.success && response.data) {
      setUser(response.data.user);
    } else {
      setUser(null);
      authService.clearAuth();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
