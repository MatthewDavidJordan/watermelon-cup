import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { Loading } from '../components/Loading';
import '../styles/standings.css';
import useLeagueStats from '../hooks/useLeagueStats';
import { useAuth } from '../contexts/authContexts/firebaseAuth';
import { useNavigate } from 'react-router-dom';

export function Standings() {
  const [leagueId, setLeagueId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { statsByTeam, loading: statsLoading, error: statsError } = useLeagueStats(leagueId);
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();
  
  // Check if user is logged in
  useEffect(() => {
    if (!userLoggedIn || !currentUser) {
      navigate('/login');
    }
  }, [currentUser, userLoggedIn, navigate]);

  // Fetch the league ID for "Watermelon Cup 2025"
  useEffect(() => {
    const fetchLeagueId = async () => {
      try {
        const leaguesQuery = query(
          collection(db, 'leagues'),
          where('name', '==', 'Watermelon Cup 2025'),
          limit(1)
        );
        
        const leaguesSnapshot = await getDocs(leaguesQuery);
        
        if (!leaguesSnapshot.empty) {
          setLeagueId(leaguesSnapshot.docs[0].id);
        } else {
          throw new Error('Watermelon Cup 2025 league not found');
        }
      } catch (err) {
        console.error('Error fetching league:', err);
        setError('Failed to load league data: ' + err.message);
      }
    };

    fetchLeagueId();
  }, []);

  // Fetch teams once we have the league ID
  useEffect(() => {
    if (!leagueId) return;

    const fetchTeams = async () => {
      try {
        const teamsCollection = collection(db, 'leagues', leagueId, 'teams');
        const teamsSnapshot = await getDocs(teamsCollection);
        
        const teamsList = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          logo: doc.data().logo || null,
          color: doc.data().color || null
        }));
        
        setTeams(teamsList);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load team data: ' + err.message);
        setLoading(false);
      }
    };

    fetchTeams();
  }, [leagueId]);

  // Helper function to calculate standings from statsByTeam
  const calculateStandings = () => {
    if (!teams.length || !Object.keys(statsByTeam).length) return [];

    const standings = teams.map(team => {
      const stats = statsByTeam[team.id] || { 
        wins: 0, 
        draws: 0, 
        losses: 0, 
        goalsFor: 0, 
        goalsAgainst: 0 
      };
      
      // Calculate points (3 for win, 1 for draw)
      const points = (stats.wins * 3) + stats.draws;
      
      // Calculate goal difference
      const goalDifference = stats.goalsFor - stats.goalsAgainst;
      
      // Calculate total games played
      const played = stats.wins + stats.draws + stats.losses;
      
      return {
        id: team.id,
        name: team.name,
        logo: team.logo,
        color: team.color,
        played,
        won: stats.wins,
        drawn: stats.draws,
        lost: stats.losses,
        goalsFor: stats.goalsFor,
        goalsAgainst: stats.goalsAgainst,
        goalDifference,
        points
      };
    });

    // Sort by points (desc), then goal difference (desc), then goals scored (desc)
    return standings.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  };

  // Form indicators functionality removed as it's not currently being used

  // Calculate top scoring teams
  const getTopScoringTeams = (standings, limit = 5) => {
    return [...standings]
      .sort((a, b) => b.goalsFor - a.goalsFor)
      .slice(0, limit)
      .map(team => ({
        team: { name: team.name, logo: team.logo },
        value: team.goalsFor
      }));
  };

  // Calculate best defense teams
  const getBestDefenseTeams = (standings, limit = 5) => {
    return [...standings]
      .filter(team => team.played > 0) // Only include teams that have played matches
      .sort((a, b) => a.goalsAgainst - b.goalsAgainst)
      .slice(0, limit)
      .map(team => ({
        team: { name: team.name, logo: team.logo },
        value: team.goalsAgainst
      }));
  };

  // Calculate teams with most wins
  const getMostWinsTeams = (standings, limit = 5) => {
    return [...standings]
      .sort((a, b) => b.won - a.won)
      .slice(0, limit)
      .map(team => ({
        team: { name: team.name, logo: team.logo },
        value: team.won
      }));
  };

  if (loading || statsLoading) return <Loading />;
  if (error || statsError) return <div className="error-container">{error || statsError.message}</div>;

  const standings = calculateStandings();
  const topScorers = getTopScoringTeams(standings);
  const bestDefense = getBestDefenseTeams(standings);
  const mostWins = getMostWinsTeams(standings);

  return (
    <div className="standings-page">
      {/* Hero section */}
      <div className="standings-hero">
        <div className="standings-hero-container">
          <h1 className="standings-hero-title">Watermelon Cup 2025 Standings</h1>
          <p className="standings-hero-description">
            View the current league table and team statistics for the tournament.
          </p>
        </div>
      </div>

      {/* Standings content */}
      <div className="standings-container">
        {/* League table */}
        <div className="league-table-container">
          <div className="league-table-header">
            <h2 className="league-table-title">League Table</h2>
            <p className="league-table-subtitle">Updated after latest matches</p>
          </div>
          <div className="table-wrapper">
            <table className="league-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GF</th>
                  <th>GA</th>
                  <th>GD</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, index) => (
                  <tr key={team.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="team-cell">
                        <div className="team-flag-container">
                          {team.logo ? (
                            <img
                              src={team.logo}
                              alt={`${team.name} logo`}
                              className="team-flag"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentNode.style.backgroundColor = 'white';
                              }}
                            />
                          ) : (
                            <div></div>
                          )}
                        </div>
                        <a href={`/teams/${team.id}/${leagueId}`} className="team-name">
                          {team.name}
                        </a>
                      </div>
                    </td>
                    <td>{team.played}</td>
                    <td>{team.won}</td>
                    <td>{team.drawn}</td>
                    <td>{team.lost}</td>
                    <td>{team.goalsFor}</td>
                    <td>{team.goalsAgainst}</td>
                    <td>{team.goalDifference}</td>
                    <td className="points-cell">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats section */}
        <div className="stats-section">
          <h2 className="stats-title">Team Statistics</h2>
          <div className="stats-grid">
            {/* Top Scorers */}
            <div className="stats-card">
              <h3 className="stats-card-title">Top Scoring Teams</h3>
              <div className="stats-list">
                {topScorers.map((item, index) => (
                  <div key={index} className="stats-item">
                    <div className="stats-team">
                      <div className="stats-team-flag">
                        {item.team.logo ? (
                          <img
                            src={item.team.logo}
                            alt={`${item.team.name} logo`}
                            className="team-flag"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.style.backgroundColor = 'white';
                            }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', backgroundColor: 'white' }}></div>
                        )}
                      </div>
                      <span className="stats-team-name">{item.team.name}</span>
                    </div>
                    <span className="stats-value">{item.value} goals</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Defense */}
            <div className="stats-card">
              <h3 className="stats-card-title">Best Defense</h3>
              <div className="stats-list">
                {bestDefense.map((item, index) => (
                  <div key={index} className="stats-item">
                    <div className="stats-team">
                      <div className="stats-team-flag">
                        {item.team.logo ? (
                          <img
                            src={item.team.logo}
                            alt={`${item.team.name} logo`}
                            className="team-flag"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.style.backgroundColor = 'white';
                            }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', backgroundColor: 'white' }}></div>
                        )}
                      </div>
                      <span className="stats-team-name">{item.team.name}</span>
                    </div>
                    <span className="stats-value">{item.value} conceded</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Wins */}
            <div className="stats-card">
              <h3 className="stats-card-title">Most Wins</h3>
              <div className="stats-list">
                {mostWins.map((item, index) => (
                  <div key={index} className="stats-item">
                    <div className="stats-team">
                      <div className="stats-team-flag">
                        {item.team.logo ? (
                          <img
                            src={item.team.logo}
                            alt={`${item.team.name} logo`}
                            className="team-flag"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.style.backgroundColor = 'white';
                            }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', backgroundColor: 'white' }}></div>
                        )}
                      </div>
                      <span className="stats-team-name">{item.team.name}</span>
                    </div>
                    <span className="stats-value">{item.value} wins</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}