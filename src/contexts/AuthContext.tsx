import React, { createContext, useContext, useState } from 'react';
import { User } from '../types';
import { mockUser } from '../lib/mock-data';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // For demo purposes, we'll start with a logged-in user
  const [user, setUser] = useState<User | null>(mockUser);

  const login = async (email: string, password: string) => {
    // Mock login - in real app, this would call your backend API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
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
