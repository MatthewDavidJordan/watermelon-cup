import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Custom hook to fetch all matches in a league and compute per-team stats.
 * @param {string} leagueId - Firestore ID of the league document
 * @returns {{ statsByTeam: Record<string, {wins:number, draws:number, losses:number, goalsFor:number, goalsAgainst:number}>, loading: boolean, error: Error|null }}
 */
export default function useLeagueStats(leagueId) {
  const [statsByTeam, setStatsByTeam] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!leagueId) return;
    let mounted = true;

    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const snap = await getDocs(collection(db, 'leagues', leagueId, 'matches'));
        const stats = {};
        snap.docs.forEach(doc => {
          const m = doc.data();
          const rawStatus = m.status;
          
          // Skip matches that aren't completed or have null scores
          if (rawStatus && String(rawStatus).toLowerCase() !== 'completed') {
            return;
          }
          
          // Skip matches with null scores to prevent them from being counted as draws
          if (m.homeScore === null || m.awayScore === null) {
            return;
          }
          
          const homeScore = Number(m.homeScore);
          const awayScore = Number(m.awayScore);
          const teamsToCount = [
            { id: m.homeTeamId, gf: homeScore, ga: awayScore },
            { id: m.awayTeamId, gf: awayScore, ga: homeScore }
          ].filter(t => t.id);
          
          teamsToCount.forEach(({ id, gf, ga }) => {
            if (!stats[id]) {
              stats[id] = { wins:0, draws:0, losses:0, goalsFor:0, goalsAgainst:0 };
            }
            stats[id].goalsFor += gf;
            stats[id].goalsAgainst += ga;
            if (gf > ga) stats[id].wins++;
            else if (gf < ga) stats[id].losses++;
            else stats[id].draws++;
          });
        });
        if (mounted) {
          setStatsByTeam(stats);
        }
      } catch (err) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchStats();
    return () => { mounted = false; };
  }, [leagueId]);

  return { statsByTeam, loading, error };
}