import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useLeagueStats from '../hooks/useLeagueStats';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { ArrowLeft, Trophy, Calendar, Users } from 'lucide-react';
import '../styles/teams.css';
import { useAuth } from '../contexts/authContexts/firebaseAuth';

export default function TeamDetail() {
  const { teamId, leagueId } = useParams();
  const { statsByTeam, loading: statsLoading, error: statsError } = useLeagueStats(leagueId);
  const [team, setTeam] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teamNames, setTeamNames] = useState({});
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();
  
  // Check if user is logged in
  useEffect(() => {
    if (!userLoggedIn || !currentUser) {
      navigate('/');
    }
  }, [currentUser, userLoggedIn, navigate]);

  useEffect(() => {
    if (!leagueId || !teamId) return;
    async function fetchData() {
      try {
        // Fetch team details
        const teamDoc = await getDoc(doc(db, 'leagues', leagueId, 'teams', teamId));
        if (teamDoc.exists()) setTeam({ id: teamDoc.id, ...teamDoc.data() });
        else throw new Error('Team not found');
        
        // Fetch all teams to get names
        const teamsSnap = await getDocs(collection(db, 'leagues', leagueId, 'teams'));
        const teamNamesMap = {};
        teamsSnap.docs.forEach(doc => {
          teamNamesMap[doc.id] = doc.data().name;
        });
        setTeamNames(teamNamesMap);
        
        // Fetch matches
        const snap = await getDocs(collection(db, 'leagues', leagueId, 'matches'));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const played = all
          .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId)
            && m.homeScore != null && m.awayScore != null)
          .sort((a, b) => {
            const da = a.dateTime?.toDate() || new Date(0);
            const db2 = b.dateTime?.toDate() || new Date(0);
            return db2 - da;
          });
        setMatches(played);
        
        // Fetch player details for this team
        const teamData = teamDoc.data();
        if (teamData.players && Array.isArray(teamData.players)) {
          const playerEmails = teamData.players;
          const playerDetails = [];
          
          // Query users collection to get player details
          for (const email of playerEmails) {
            const usersCollection = collection(db, 'users');
            const q = query(usersCollection, where('email', '==', email));
            const userSnapshot = await getDocs(q);
            
            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              playerDetails.push({ 
                email: email, 
                firstName: userData.firstName || '', 
                lastName: userData.lastName || '',
                nickname: userData.nickname || '',
                position: userData.position || 'Player'
              });
            } else {
              playerDetails.push({ email: email, firstName: '', lastName: '', nickname: 'Unknown' });
            }
          }
          
          setPlayers(playerDetails);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [leagueId, teamId]);

  if (loading || statsLoading) return <div className="detail-page"><p className="p-4">Loading…</p></div>;
  if (error || statsError) return <div className="detail-page"><p className="p-4">Error: {(error || statsError).message}</p></div>;

  const teamStats = statsByTeam[teamId] || { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  const cleanSheets = matches.filter(m => (m.homeTeamId === teamId ? m.awayScore : m.homeScore) === 0).length;
  const totalGames = teamStats.wins + teamStats.draws + teamStats.losses;
  const winRate = totalGames ? Math.round((teamStats.wins / totalGames) * 100) : 0;
  
  // Get team color from the team data
  const getTeamColor = () => {
    if (team && team.color) {
      return `#${team.color}`;
    }
    return '#22c55e'; // Default color if no color is specified
  };
  
  const getMatchResult = (match) => {
    if (!match) return { result: 'Unknown', score: '0-0' };
    
    const isHomeTeam = match.homeTeamId === teamId;
    const teamScore = isHomeTeam ? match.homeScore : match.awayScore;
    const opponentScore = isHomeTeam ? match.awayScore : match.homeScore;
    
    let result;
    if (teamScore > opponentScore) result = 'Win';
    else if (teamScore < opponentScore) result = 'Loss';
    else result = 'Draw';
    
    return { 
      result, 
      score: isHomeTeam ? `${match.homeScore}-${match.awayScore}` : `${match.awayScore}-${match.homeScore}`,
      opponentId: isHomeTeam ? match.awayTeamId : match.homeTeamId
    };
  };

  return (
    <div className="detail-page">
      {/* Team header */}
      <div className="detail-header">
        <div className="detail-header-container">
          <Link to="/teams" className="detail-back-link">
            <ArrowLeft size={16} style={{marginRight: '8px'}} />
            Back to all teams
          </Link>

          <div className="detail-header-content">
            <div className="detail-logo">
              {team?.logo ? (
                <img 
                  src={team.logo} 
                  alt={`${team.name} logo`} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
            <div>
              <h1 className="detail-title">{team?.name}</h1>
              <p className="detail-description">{team?.description || `${team?.name} is competing in the Watermelon Cup 2024.`}</p>
            </div>
          </div>
        </div>

        {/* Color bar */}
        <div className="detail-color-bar" style={{ backgroundColor: getTeamColor() }}></div>
      </div>

      <div className="detail-content">
        {/* Stats cards */}
        <div className="detail-stats-cards">
          <div className="detail-stat-card">
            <div className="detail-stat-value wins">{teamStats.wins}</div>
            <div className="detail-stat-label">Wins</div>
          </div>
          <div className="detail-stat-card">
            <div className="detail-stat-value draws">{teamStats.draws}</div>
            <div className="detail-stat-label">Draws</div>
          </div>
          <div className="detail-stat-card">
            <div className="detail-stat-value losses">{teamStats.losses}</div>
            <div className="detail-stat-label">Losses</div>
          </div>
          <div className="detail-stat-card">
            <div className="detail-stat-value goals">{teamStats.goalsFor}</div>
            <div className="detail-stat-label">Goals Scored</div>
          </div>
        </div>

        <div className="detail-content-grid">
          {/* Squad section */}
          <div>
            <div className="detail-card">
              <div className="detail-card-header">
                <Users size={20} className="detail-card-icon" />
                <h2 className="detail-card-title">Squad</h2>
              </div>
              <div className="detail-card-body">
                {team?.coach && (
                  <div className="detail-coach-info">
                    <div className="detail-coach-label">Coach</div>
                    <div className="detail-coach-name">{team.coach}</div>
                  </div>
                )}

                <div style={{overflowX: 'auto'}}>
                  <table className="detail-squad-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Position(s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.length > 0 ? (
                        players.map((player, index) => (
                          <tr key={index}>
                            <td className="detail-player-name">{player.firstName} {player.lastName}</td>
                            <td className="detail-player-position">{player.position || 'Player'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="2" style={{textAlign: 'center', padding: '1rem'}}>No players found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div>
            {/* Matches section */}
            <div className="detail-card">
              <div className="detail-card-header">
                <Calendar size={20} className="detail-card-icon" />
                <h2 className="detail-card-title">Recent Matches</h2>
              </div>
              <div>
                {matches.length > 0 ? (
                  matches.slice(0, 5).map(match => {
                    const { result, score, opponentId } = getMatchResult(match);
                    const opponentName = teamNames[opponentId] || opponentId;
                    
                    return (
                      <div key={match.id} className="detail-match-item">
                        <div className="detail-match-header">
                          <span className={`detail-match-result detail-result-${result.toLowerCase()}`}>
                            {result}
                          </span>
                        </div>
                        <div className="detail-match-details">
                          <div className="detail-match-opponent">vs {opponentName}</div>
                          <div className="detail-match-score">{score}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4">No matches played yet</div>
                )}
              </div>
              <div className="detail-card-footer">
                <Link to="/matches" className="detail-view-all-link">
                  View all matches →
                </Link>
              </div>
            </div>

            {/* Team stats card */}
            <div className="detail-card" style={{marginTop: '2rem'}}>
              <div className="detail-card-header">
                <Trophy size={20} className="detail-card-icon" />
                <h2 className="detail-card-title">Team Stats</h2>
              </div>
              <div className="detail-card-body">
                <div className="detail-stats-list">
                  <div className="detail-stat-item">
                    <span className="detail-stat-item-label">Goals Scored</span>
                    <span className="detail-stat-item-value">{teamStats.goalsFor}</span>
                  </div>
                  <div className="detail-stat-item">
                    <span className="detail-stat-item-label">Goals Conceded</span>
                    <span className="detail-stat-item-value">{teamStats.goalsAgainst}</span>
                  </div>
                  <div className="detail-stat-item">
                    <span className="detail-stat-item-label">Goal Difference</span>
                    <span className="detail-stat-item-value">{teamStats.goalsFor - teamStats.goalsAgainst}</span>
                  </div>
                  <div className="detail-stat-item">
                    <span className="detail-stat-item-label">Clean Sheets</span>
                    <span className="detail-stat-item-value">{cleanSheets}</span>
                  </div>
                  <div className="detail-stat-item">
                    <span className="detail-stat-item-label">Win Rate</span>
                    <span className="detail-stat-item-value">{winRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
