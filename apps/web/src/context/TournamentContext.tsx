import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { TournamentSummary } from '@cric/types';
import { apiGet } from '../api/client';

const TOURNAMENT_STORAGE_KEY = 'cric_selected_tournament_id';

interface TournamentContextType {
  tournaments: TournamentSummary[];
  selectedTournamentId: string | null;
  selectedTournament: TournamentSummary | null;
  setSelectedTournamentId: (id: string) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const TournamentContext = createContext<TournamentContextType | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTournamentId, setSelectedTournamentIdState] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTournamentId = urlParams.get('tournament');
      if (urlTournamentId) return urlTournamentId;
      return localStorage.getItem(TOURNAMENT_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiGet<TournamentSummary[]>('/public/tournaments');
      setTournaments(list);

      // Select default tournament if none selected or if previously selected id is invalid
      if (list && list.length > 0) {
        setSelectedTournamentIdState((prev) => {
          if (prev && list.some((t) => t.id === prev)) {
            return prev;
          }
          const defaultId = list[0].id;
          try {
            localStorage.setItem(TOURNAMENT_STORAGE_KEY, defaultId);
          } catch {
            // Ignore storage errors
          }
          return defaultId;
        });
      }
    } catch {
      // Ignore network errors, fallback to empty list
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  const setSelectedTournamentId = useCallback((id: string) => {
    setSelectedTournamentIdState(id);
    try {
      localStorage.setItem(TOURNAMENT_STORAGE_KEY, id);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const selectedTournament = useMemo(() => {
    if (!selectedTournamentId || tournaments.length === 0) return null;
    return tournaments.find((t) => t.id === selectedTournamentId) ?? tournaments[0] ?? null;
  }, [tournaments, selectedTournamentId]);

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        selectedTournamentId,
        selectedTournament,
        setSelectedTournamentId,
        loading,
        refetch: fetchTournaments,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
