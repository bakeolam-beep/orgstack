import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';
import { AUTH_API } from '../config/api';

interface User {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (businessName: string, adminEmail: string, adminPassword: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const decodeJWT = (token: string): User | null => {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      userId: decoded.sub || decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
      email: decoded.email,
    };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    let response: any;
    try {
      response = await api.post(`${AUTH_API}/login`, { email, password });
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.message || 'Invalid email or password';
      throw new Error(message);
    }
    const data = response?.data ?? {};
    const token = data.access_token || data.accessToken || data.token;
    const tenantId = data.tenantId || data.user?.tenantId;
    if (!token) {
      throw new Error('Login failed: Server did not return a valid authentication token.');
    }
    const userData = decodeJWT(token);
    if (!userData) throw new Error('Invalid token');
    if (tenantId) userData.tenantId = tenantId;
    localStorage.setItem('token', token);
    localStorage.setItem('tenantId', tenantId || '');
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
  };

  const register = async (businessName: string, adminEmail: string, adminPassword: string) => {
    let response: any;
    try {
      response = await api.post(`${AUTH_API}/register`, { businessName, adminEmail, adminPassword });
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.message || 'Registration failed';
      throw new Error(message);
    }
    const data = response?.data ?? {};
    const token = data.access_token || data.accessToken || data.token;
    const tenantId = data.tenantId || data.user?.tenantId;
    if (token) {
      const userData = decodeJWT(token);
      if (userData) {
        if (tenantId) userData.tenantId = tenantId;
        localStorage.setItem('token', token);
        localStorage.setItem('tenantId', tenantId || '');
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(token);
        setUser(userData);
      }
    }
    await login(adminEmail, adminPassword);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};