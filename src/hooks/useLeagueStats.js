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
    console.log('useLeagueStats effect triggered, leagueId =', leagueId);
    if (!leagueId) return;
    let mounted = true;

    async function fetchStats() {
      setLoading(true);
      setError(null);
      console.log('useLeagueStats fetchStats start for league', leagueId);
      try {
        const snap = await getDocs(collection(db, 'leagues', leagueId, 'matches'));
        console.log('useLeagueStats fetched matches count:', snap.size);
        const stats = {};
        snap.docs.forEach(doc => {
          console.log('useLeagueStats processing match', doc.id, doc.data());
          const m = doc.data();
          const rawStatus = m.status;
          // only skip when a status exists and isn’t exactly 'completed' (case-insensitive)
          if (rawStatus && String(rawStatus).toLowerCase() !== 'completed') {
            console.log(' skipped (status =', rawStatus, ')');
            return;
          }
          // parse scores as numbers
          const homeScore = Number(m.homeScore);
          const awayScore = Number(m.awayScore);
          // guard against missing team IDs
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
            console.log('useLeagueStats updated stats', id, stats[id]);
          });
        });
        if (mounted) {
          console.log('useLeagueStats statsByTeam:', stats);
          Object.entries(stats).forEach(([teamId, s]) => {
            console.log(
              `Team ${teamId} -> wins: ${s.wins}, draws: ${s.draws}, losses: ${s.losses}, GF: ${s.goalsFor}, GA: ${s.goalsAgainst}`
            );
          });
          setStatsByTeam(stats);
        }
      } catch (err) {
        console.error('useLeagueStats error:', err);
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