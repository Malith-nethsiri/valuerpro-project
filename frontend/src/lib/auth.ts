import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, LoginResponse } from '@/types';
import { authAPI } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
  }) => Promise<User>;
  updateProfile: (userData: {
    email?: string;
    full_name?: string;
    role?: string;
  }) => Promise<User>;
  createValuerProfile: (profileData: {
    titles?: string;
    qualifications?: string[];
    panels?: string[];
    registration_no?: string;
    address?: string;
    phones?: string[];
    email?: string;
  }) => Promise<User>;
  updateValuerProfile: (profileData: {
    titles?: string;
    qualifications?: string[];
    panels?: string[];
    registration_no?: string;
    address?: string;
    phones?: string[];
    email?: string;
  }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authAPI.getMe();
      setUser(userData);
    } catch (error) {
      // Token is invalid, remove it and clear user
      localStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response: LoginResponse = await authAPI.login(email, password);
      localStorage.setItem('access_token', response.access_token);
      await loadUser();
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    window.location.href = '/auth/login';
  };

  const register = async (userData: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
  }) => {
    const newUser = await authAPI.register(userData);
    return newUser;
  };

  const updateProfile = async (userData: {
    email?: string;
    full_name?: string;
    role?: string;
  }) => {
    const updatedUser = await authAPI.updateProfile(userData);
    setUser(updatedUser);
    return updatedUser;
  };

  const createValuerProfile = async (profileData: {
    titles?: string;
    qualifications?: string[];
    panels?: string[];
    registration_no?: string;
    address?: string;
    phones?: string[];
    email?: string;
  }) => {
    const updatedUser = await authAPI.createValuerProfile(profileData);
    setUser(updatedUser);
    return updatedUser;
  };

  const updateValuerProfile = async (profileData: {
    titles?: string;
    qualifications?: string[];
    panels?: string[];
    registration_no?: string;
    address?: string;
    phones?: string[];
    email?: string;
  }) => {
    const updatedUser = await authAPI.updateValuerProfile(profileData);
    setUser(updatedUser);
    return updatedUser;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    updateProfile,
    createValuerProfile,
    updateValuerProfile,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

// Auth route protection helper
export const requireAuth = (user: User | null, loading: boolean) => {
  if (loading) return { redirect: false, loading: true };
  if (!user) return { redirect: '/auth/login', loading: false };
  return { redirect: false, loading: false };
};

// Token management utilities
export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', token);
  }
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
  }
};