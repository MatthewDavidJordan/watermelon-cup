import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const SeasonContext = createContext();

export function useSeason() {
  const context = useContext(SeasonContext);
  if (!context) {
    throw new Error('useSeason must be used within a SeasonProvider');
  }
  return context;
}

export function SeasonProvider({ children }) {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const leaguesSnapshot = await getDocs(collection(db, 'leagues'));
        const leaguesList = leaguesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort by name descending so newest season is first
        // Assumes consistent naming like "Watermelon Cup 2025", "Watermelon Cup 2026"
        leaguesList.sort((a, b) => b.name.localeCompare(a.name));

        setLeagues(leaguesList);

        // Default to the most recent season
        if (leaguesList.length > 0) {
          setSelectedLeagueId(leaguesList[0].id);
        }
      } catch (error) {
        console.error('Error fetching leagues:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeagues();
  }, []);

  const selectedLeague = leagues.find(l => l.id === selectedLeagueId) || null;

  const value = {
    leagues,
    selectedLeagueId,
    setSelectedLeagueId,
    selectedLeague,
    loading,
  };

  return (
    <SeasonContext.Provider value={value}>
      {children}
    </SeasonContext.Provider>
  );
}
