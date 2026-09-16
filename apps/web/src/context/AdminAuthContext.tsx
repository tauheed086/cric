import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AdminRole } from '@cric/types';
import {
  clearAdminAuth,
  getAdminName,
  getAdminRole,
  getAdminUserId,
  isAdminAuthenticated,
  apiAdminLogin,
} from '../api/client';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  adminName: string;
  role: AdminRole;
  isSuperAdmin: boolean;
  userId: string | null;
  login: (tokenOrPassword: string, adminNameOrUsername?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isAdminAuthenticated);
  const [adminName, setAdminNameState] = useState<string>(getAdminName);
  const [role, setRoleState] = useState<AdminRole>(getAdminRole);
  const [userId, setUserIdState] = useState<string | null>(getAdminUserId);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    function handleUnauthorized() {
      setIsAuthenticated(false);
      clearAdminAuth();
    }
    window.addEventListener('cric_admin_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('cric_admin_unauthorized', handleUnauthorized);
  }, []);

  async function login(tokenOrPassword: string, nameOrUsername?: string) {
    setIsLoading(true);
    try {
      const data = await apiAdminLogin(tokenOrPassword, nameOrUsername);
      setIsAuthenticated(true);
      setAdminNameState(data.adminName);
      setRoleState(data.role);
      setUserIdState(data.userId ?? null);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    clearAdminAuth();
    setIsAuthenticated(false);
    setAdminNameState('Scorer');
    setRoleState(AdminRole.SUPER_ADMIN);
    setUserIdState(null);
  }

  const isSuperAdmin = role === AdminRole.SUPER_ADMIN;

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        adminName,
        role,
        isSuperAdmin,
        userId,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return ctx;
}
