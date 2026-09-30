import { createContext, useContext, useEffect, useState } from 'react';
import type { Person } from '../types';
import { api, json, ApiError } from '../lib/api';
const Context = createContext<{
  user: Person | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}>({ user: null, loading: true, error: '', refresh: async () => {}, logout: async () => {} });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Person | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  async function refresh() {
    setError('');
    try {
      setUser(await api<Person>('/auth/me'));
    } catch (e) {
      setUser(null);
      if (!(e instanceof ApiError && e.status === 401))
        setError('Could not reach OpsBoard. Check the API and retry.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener('opsboard:session-expired', expired);
    void refresh();
    return () => window.removeEventListener('opsboard:session-expired', expired);
  }, []);
  async function logout() {
    await api('/auth/logout', json('POST'));
    setUser(null);
  }
  return (
    <Context.Provider value={{ user, loading, error, refresh, logout }}>
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
