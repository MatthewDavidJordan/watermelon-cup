import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Loading } from '../components/Loading';
import '../styles/matches.css';
import { useAuth } from '../contexts/authContexts/firebaseAuth';
import { useNavigate } from 'react-router-dom';

export function Matches() {
  const [activeWeek, setActiveWeek] = useState(1);
  const [matchesData, setMatchesData] = useState({});
  const [teamData, setTeamData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leagueId, setLeagueId] = useState(null);
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();
  
  // Check if user is logged in
  useEffect(() => {
    if (!userLoggedIn || !currentUser) {
      navigate('/');
    }
  }, [currentUser, userLoggedIn, navigate]);

  useEffect(() => {
    // Fetch the league with name "Watermelon Cup 2024"
    const fetchLeagueId = async () => {
      try {
        const leaguesQuery = query(
          collection(db, 'leagues'),
          where('name', '==', 'Watermelon Cup 2024'),
          limit(1)
        );
        
        const leaguesSnapshot = await getDocs(leaguesQuery);
        
        if (!leaguesSnapshot.empty) {
          setLeagueId(leaguesSnapshot.docs[0].id);
        } else {
          throw new Error('Watermelon Cup 2024 league not found');
        }
      } catch (err) {
        console.error('Error fetching league:', err);
        setError('Failed to load league data: ' + err.message);
      }
    };

    fetchLeagueId();
  }, []);

  useEffect(() => {
    if (!leagueId) return;

    const fetchTeams = async () => {
      try {
        const teamsSnapshot = await getDocs(collection(db, 'leagues', leagueId, 'teams'));
        const teamsMap = {};
        
        teamsSnapshot.docs.forEach(doc => {
          const teamData = doc.data();
          teamsMap[doc.id] = {
            id: doc.id,
            name: teamData.name,
            logo: teamData.logo || null,
            color: teamData.color || null
          };
        });
        
        setTeamData(teamsMap);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load team data');
      }
    };

    fetchTeams();
  }, [leagueId]);

  useEffect(() => {
    if (!leagueId || Object.keys(teamData).length === 0) return;

    const fetchMatches = async () => {
      try {
        const matchesSnapshot = await getDocs(collection(db, 'leagues', leagueId, 'matches'));
        
        // Create a predefined structure for weeks and rounds
        const groupedMatches = {
          week1: { round1: [], round2: [] },
          week2: { round1: [], round2: [] },
          week3: { round1: [], round2: [] },
          week4: { round1: [], round2: [] }
        };
        
        // Assign each match to a week and round based on its week and round fields
        // or distribute them evenly if those fields don't exist
        matchesSnapshot.docs.forEach((doc, index) => {
          const match = doc.data();
          
          // Determine week and round
          // If match has week and round fields, use those
          // Otherwise, distribute evenly (2 matches per round, 4 per week)
          const week = match.week || Math.floor(index / 6) + 1;
          const roundNum = match.round || (index % 6 < 3 ? 1 : 2);
          
          // Make sure week is between 1-4
          const validWeek = Math.min(Math.max(week, 1), 4);
          const round = `round${roundNum}`;
          
          // Determine match status based on scores
          let status = 'upcoming';
          if (match.homeScore !== null && match.awayScore !== null) {
            status = 'completed';
          }
          
          // Add match to the appropriate group
          groupedMatches[`week${validWeek}`][round].push({
            id: doc.id,
            date: `Week ${validWeek}`,
            time: roundNum === 1 ? '6:00 PM' : '7:00 PM',
            venue: match.fieldLocation || 'Main Field',
            homeTeam: teamData[match.homeTeamId] || {
              id: match.homeTeamId,
              name: 'Unknown Team',
              logo: null
            },
            awayTeam: teamData[match.awayTeamId] || {
              id: match.awayTeamId,
              name: 'Unknown Team',
              logo: null
            },
            score: match.homeScore !== null && match.awayScore !== null ? {
              home: match.homeScore,
              away: match.awayScore
            } : null,
            status: status
          });
        });
        
        setMatchesData(groupedMatches);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError('Failed to load match data');
        setLoading(false);
      }
    };

    fetchMatches();
  }, [leagueId, teamData]);

  // Helper function to render match status
  const renderMatchStatus = (status) => {
    if (status === 'upcoming') {
      return (
        <div className="match-status">
          <span className="status-indicator status-upcoming">Upcoming</span>
        </div>
      );
    } else if (status === 'live') {
      return (
        <div className="match-status">
          <span className="status-indicator status-live">Live</span>
        </div>
      );
    } else if (status === 'completed') {
      return (
        <div className="match-status">
          <span className="status-indicator status-completed">Completed</span>
        </div>
      );
    }
    return null;
  };

  // Helper function to render match score
  const renderMatchScore = (score, status) => {
    if (status === 'upcoming') {
      return (
        <div className="score-display">
          <span>vs</span>
        </div>
      );
    } else {
      return (
        <div className="score-display">
          <span>{score.home}</span>
          <span className="score-separator">-</span>
          <span>{score.away}</span>
        </div>
      );
    }
  };

  // Helper function to render team logo
  const renderTeamLogo = (team) => {
    return (
      <div className="team-flag-container" style={{ 
        border: '1px solid #e5e7eb',
        margin: '0 auto 0.5rem auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {team.logo ? (
          <img 
            src={team.logo} 
            alt={`${team.name} logo`} 
            style={{
              width: '60px',
              height: '60px',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.parentNode.style.backgroundColor = 'white';
            }}
          />
        ) : (
          <div
            style={{
              width: '60px',
              height: '60px',
              backgroundColor: 'white'
            }}
          ></div>
        )}
      </div>
    );
  };

  if (loading) return <Loading />;
  if (error) return <div className="error-container">{error}</div>;

  return (
    <div className="matches-page">
      {/* Hero section */}
      <div className="matches-hero">
        <div className="matches-hero-container">
          <h1 className="matches-hero-title">Watermelon Cup 2024 Matches</h1>
          <p className="matches-hero-description">
            View all matches organized by week and round throughout the tournament.
          </p>
        </div>
      </div>

      {/* Matches content */}
      <div className="matches-container">
        {/* Week tabs */}
        <div className="week-tabs">
          <div className={`week-tab ${activeWeek === 1 ? "active" : ""}`} onClick={() => setActiveWeek(1)}>
            Week 1
          </div>
          <div className={`week-tab ${activeWeek === 2 ? "active" : ""}`} onClick={() => setActiveWeek(2)}>
            Week 2
          </div>
          <div className={`week-tab ${activeWeek === 3 ? "active" : ""}`} onClick={() => setActiveWeek(3)}>
            Week 3
          </div>
          <div className={`week-tab ${activeWeek === 4 ? "active" : ""}`} onClick={() => setActiveWeek(4)}>
            Week 4
          </div>
        </div>

        {/* Week content */}
        {[1, 2, 3, 4].map(week => (
          <div key={`week-${week}`} className={`week-content ${activeWeek === week ? "active" : ""}`}>
            {/* Only render if we have data for this week */}
            {matchesData[`week${week}`] && (
              <>
                {/* Round 1 */}
                {matchesData[`week${week}`].round1 && matchesData[`week${week}`].round1.length > 0 ? (
                  <div className="round-section">
                    <h2 className="round-title">Round 1</h2>
                    <div className="matches-list">
                      {matchesData[`week${week}`].round1.map((match) => (
                        <div key={match.id} className="match-card">
                          <div className="match-header">
                            <div className="match-date">
                              {match.date} • {match.time}
                            </div>
                            <div className="match-venue">{match.venue}</div>
                          </div>
                          <div className="match-content">
                            <div className="match-teams">
                              <div className="team-container" style={{ textAlign: 'center' }}>
                                {renderTeamLogo(match.homeTeam)}
                                <div className="team-name" style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.homeTeam.name}</div>
                              </div>
                              <div className="match-score">{renderMatchScore(match.score, match.status)}</div>
                              <div className="team-container" style={{ textAlign: 'center' }}>
                                {renderTeamLogo(match.awayTeam)}
                                <div className="team-name" style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.awayTeam.name}</div>
                              </div>
                            </div>
                            {renderMatchStatus(match.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="round-section">
                    <h2 className="round-title">Round 1</h2>
                    <div className="no-matches-message">
                      <p>No match data found for this round</p>
                    </div>
                  </div>
                )}

                {/* Round 2 */}
                {matchesData[`week${week}`].round2 && matchesData[`week${week}`].round2.length > 0 ? (
                  <div className="round-section">
                    <h2 className="round-title">Round 2</h2>
                    <div className="matches-list">
                      {matchesData[`week${week}`].round2.map((match) => (
                        <div key={match.id} className="match-card">
                          <div className="match-header">
                            <div className="match-date">
                              {match.date} • {match.time}
                            </div>
                            <div className="match-venue">{match.venue}</div>
                          </div>
                          <div className="match-content">
                            <div className="match-teams">
                              <div className="team-container" style={{ textAlign: 'center' }}>
                                {renderTeamLogo(match.homeTeam)}
                                <div className="team-name" style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.homeTeam.name}</div>
                              </div>
                              <div className="match-score">{renderMatchScore(match.score, match.status)}</div>
                              <div className="team-container" style={{ textAlign: 'center' }}>
                                {renderTeamLogo(match.awayTeam)}
                                <div className="team-name" style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.awayTeam.name}</div>
                              </div>
                            </div>
                            {renderMatchStatus(match.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="round-section">
                    <h2 className="round-title">Round 2</h2>
                    <div className="no-matches-message">
                      <p>No match data found for this round</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
