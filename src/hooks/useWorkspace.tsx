import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/format';
import type { Organization, Member, Project } from '../types';
interface Workspace {
  organizations: Organization[];
  org: Organization | null;
  members: Member[];
  projects: Project[];
  loading: boolean;
  error: string;
  select: (id: string) => void;
  reload: () => Promise<void>;
  path: (suffix: string) => string;
}
const Context = createContext<Workspace>(null!);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const requestVersion = useRef(0);
  const [organizations, setOrganizations] = useState<Organization[]>([]),
    [selected, setSelected] = useState(localStorage.getItem('opsboard-org') || ''),
    [members, setMembers] = useState<Member[]>([]),
    [projects, setProjects] = useState<Project[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    setError('');
    try {
      const orgs = await api<Organization[]>('/organizations');
      if (version !== requestVersion.current) return;
      setOrganizations(orgs);
      const id = orgs.some((o) => o.id === selected) ? selected : orgs[0]?.id || '';
      if (id !== selected) {
        setSelected(id);
        localStorage.setItem('opsboard-org', id);
      }
      if (id) {
        const [m, p] = await Promise.all([
          api<Member[]>(`/organizations/${id}/members`),
          api<Project[]>(`/organizations/${id}/projects`),
        ]);
        if (version !== requestVersion.current) return;
        setMembers(m);
        setProjects(p);
      } else {
        setMembers([]);
        setProjects([]);
      }
    } catch (e) {
      if (version === requestVersion.current) setError(errorMessage(e));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [selected]);
  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);
  const org = organizations.find((o) => o.id === selected) || null;
  return (
    <Context.Provider
      value={{
        organizations,
        org,
        members,
        projects,
        loading,
        error,
        reload,
        select: (id) => {
          if (id === selected) {
            void reload();
            return;
          }
          ++requestVersion.current;
          setLoading(true);
          setMembers([]);
          setProjects([]);
          localStorage.setItem('opsboard-org', id);
          setSelected(id);
        },
        path: (suffix) => `/organizations/${org?.id}${suffix}`,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useWorkspace = () => useContext(Context);
