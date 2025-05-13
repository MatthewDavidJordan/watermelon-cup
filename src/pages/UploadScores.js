import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Loading } from '../components/Loading';
import { useAuth } from '../contexts/authContexts/firebaseAuth';
import { useNavigate } from 'react-router-dom';
import '../styles/matches.css';
import '../styles/upload-scores.css';

// List of authorized emails
const AUTHORIZED_EMAILS = ['mdj82@georgetown.edu', 'mj1001571@gmail.com'];

export function UploadScores() {
  const [activeWeek, setActiveWeek] = useState(1);
  const [matchesData, setMatchesData] = useState({});
  const [teamData, setTeamData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leagueId, setLeagueId] = useState(null);
  const [editedMatches, setEditedMatches] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();
  
  // Check if user is authorized
  useEffect(() => {
    // First check if user is logged in
    if (!userLoggedIn || !currentUser) {
      navigate('/');
      return;
    }
    
    // Then check if user is authorized when user data is available
    if (currentUser && !AUTHORIZED_EMAILS.includes(currentUser.email)) {
      navigate('/');
    }
  }, [currentUser, userLoggedIn, navigate]);

  useEffect(() => {
    // Fetch the league with name "Watermelon Cup 2024"
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
        matchesSnapshot.docs.forEach((doc, index) => {
          const match = doc.data();
          
          // Determine week and round
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
            score: {
              home: match.homeScore !== null ? match.homeScore : '',
              away: match.awayScore !== null ? match.awayScore : ''
            },
            status: status,
            originalHomeScore: match.homeScore,
            originalAwayScore: match.awayScore
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

  // Handle score input change
  const handleScoreChange = (weekNum, roundNum, matchIndex, team, value) => {
    // Create a copy of the matches data
    const updatedMatchesData = { ...matchesData };
    const week = `week${weekNum}`;
    const round = `round${roundNum}`;
    const match = updatedMatchesData[week][round][matchIndex];
    
    // Update the score
    if (team === 'home') {
      match.score.home = value === '' ? '' : parseInt(value, 10);
    } else {
      match.score.away = value === '' ? '' : parseInt(value, 10);
    }
    
    // Update the match status
    if (match.score.home !== '' && match.score.away !== '') {
      match.status = 'completed';
    } else {
      match.status = 'upcoming';
    }
    
    // Track edited matches
    const matchId = match.id;
    setEditedMatches(prev => ({
      ...prev,
      [matchId]: {
        id: matchId,
        homeScore: match.score.home === '' ? null : match.score.home,
        awayScore: match.score.away === '' ? null : match.score.away
      }
    }));
    
    setMatchesData(updatedMatchesData);
  };

  // Save changes to Firebase
  const saveChanges = async () => {
    if (Object.keys(editedMatches).length === 0) return;
    
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      const updatePromises = Object.values(editedMatches).map(match => {
        const matchRef = doc(db, 'leagues', leagueId, 'matches', match.id);
        return updateDoc(matchRef, {
          homeScore: match.homeScore,
          awayScore: match.awayScore
        });
      });
      
      await Promise.all(updatePromises);
      setEditedMatches({});
      setSaveSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating matches:', err);
      setError('Failed to save changes: ' + err.message);
    } finally {
      setSaving(false);
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
          />
        ) : (
          <div 
            style={{
              width: '60px',
              height: '60px',
              backgroundColor: team.color || '#f3f4f6',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#fff'
            }}
          >
            {team.name ? team.name.charAt(0) : '?'}
          </div>
        )}
      </div>
    );
  };

  // Render score input fields
  const renderScoreInputs = (match, weekNum, roundNum, matchIndex) => {
    return (
      <div className="score-input-container">
        <input
          type="number"
          min="0"
          value={match.score.home}
          onChange={(e) => handleScoreChange(weekNum, roundNum, matchIndex, 'home', e.target.value)}
          className="score-input"
        />
        <span className="score-separator">-</span>
        <input
          type="number"
          min="0"
          value={match.score.away}
          onChange={(e) => handleScoreChange(weekNum, roundNum, matchIndex, 'away', e.target.value)}
          className="score-input"
        />
      </div>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="matches-page">
      {/* Hero section */}
      <div className="matches-hero">
        <div className="matches-hero-container">
          <h1 className="matches-hero-title">Upload Scores</h1>
          <p className="matches-hero-description">
            Update match scores for the Watermelon Cup 2024 tournament.
          </p>
        </div>
      </div>
      
      {/* Matches content */}
      <div className="matches-container">
        {saveSuccess && (
          <div className="save-success">
            Scores saved successfully!
          </div>
        )}
        
        <div className="save-button-container">
          <button 
            className="save-button"
            onClick={saveChanges}
            disabled={Object.keys(editedMatches).length === 0 || saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        
        {/* Week tabs */}
        <div className="week-tabs">
          <div 
            className={`week-tab ${activeWeek === 1 ? 'active' : ''}`}
            onClick={() => setActiveWeek(1)}
          >
            Week 1
          </div>
          <div 
            className={`week-tab ${activeWeek === 2 ? 'active' : ''}`}
            onClick={() => setActiveWeek(2)}
          >
            Week 2
          </div>
          <div 
            className={`week-tab ${activeWeek === 3 ? 'active' : ''}`}
            onClick={() => setActiveWeek(3)}
          >
            Week 3
          </div>
          <div 
            className={`week-tab ${activeWeek === 4 ? 'active' : ''}`}
            onClick={() => setActiveWeek(4)}
          >
            Week 4
          </div>
        </div>
      
      <div className="matches-week">
        <h2 className="round-title">Round 1 - 6:00 PM</h2>
        {matchesData[`week${activeWeek}`].round1 && matchesData[`week${activeWeek}`].round1.length > 0 ? (
          <div className="matches-list">
            {matchesData[`week${activeWeek}`].round1.map((match, index) => (
              <div key={match.id} className={`match-card ${match.status}`}>
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
                    {renderScoreInputs(match, activeWeek, 1, index)}
                    <div className="team-container" style={{ textAlign: 'center' }}>
                      {renderTeamLogo(match.awayTeam)}
                      <div className="team-name" style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.awayTeam.name}</div>
                    </div>
                  </div>
                  {match.originalHomeScore !== null && match.originalAwayScore !== null && (
                    <div className="original-score" style={{ textAlign: 'center', marginTop: '10px' }}>
                      Original Score: {match.originalHomeScore} - {match.originalAwayScore}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-matches-message">
            <p>No match data found for this round</p>
          </div>
        )}
        
        <h2 className="round-title">Round 2 - 7:00 PM</h2>
        {matchesData[`week${activeWeek}`].round2 && matchesData[`week${activeWeek}`].round2.length > 0 ? (
          <div className="matches-list">
            {matchesData[`week${activeWeek}`].round2.map((match, index) => (
              <div key={match.id} className={`match-card ${match.status}`}>
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
                    {renderScoreInputs(match, activeWeek, 2, index)}
                    <div className="team-container" style={{ textAlign: 'center' }}>
                      {renderTeamLogo(match.awayTeam)}
                      <div className="team-name" style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.awayTeam.name}</div>
                    </div>
                  </div>
                  {match.originalHomeScore !== null && match.originalAwayScore !== null && (
                    <div className="original-score" style={{ textAlign: 'center', marginTop: '10px' }}>
                      Original Score: {match.originalHomeScore} - {match.originalAwayScore}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-matches-message">
            <p>No match data found for this round</p>
          </div>
        )}
      </div>
      
      <div className="save-button-container">
        <button 
          className="save-button"
          onClick={saveChanges}
          disabled={Object.keys(editedMatches).length === 0 || saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
    </div>
  );
}
