import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from 'react-router-dom';
import "../styles/teams.css";
import useLeagueStats from "../hooks/useLeagueStats";

export function Teams() {
  const [teams, setTeams] = useState([]);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [leagueId, setLeagueId] = useState(null);
  const { statsByTeam, loading: statsLoading, error: statsError } = useLeagueStats(leagueId);

  useEffect(() => {
    if (!statsLoading && !statsError) {
      console.log('statsByTeam (after fetch):', statsByTeam);
    }
  }, [statsByTeam, statsLoading, statsError]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        // Query the leagues collection to find the league with name "Watermelon Cup 2024"
        const leaguesCollection = collection(db, 'leagues');
        const leaguesSnapshot = await getDocs(leaguesCollection);
        const watermelonCupLeague = leaguesSnapshot.docs.find(doc => doc.data().name === "Watermelon Cup 2024");

        if (watermelonCupLeague) {
          setLeagueId(watermelonCupLeague.id);
          // Query the teams collection within the found league document
          const teamsCollection = collection(db, 'leagues', watermelonCupLeague.id, 'teams');
          const teamsSnapshot = await getDocs(teamsCollection);

          // Fetch details for each team
          const teamsList = await Promise.all(teamsSnapshot.docs.map(async (teamDoc) => {
            const teamData = teamDoc.data();

            // Fetch player nicknames based on player emails
            const playerDetails = teamData.players ? await fetchPlayerDetails(teamData.players) : [];

            return { id: teamDoc.id, ...teamData, players: playerDetails };
          }));

          setTeams(teamsList);
        } else {
          console.log("Watermelon Cup 2024 league not found");
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    const fetchPlayerDetails = async (playerEmails) => {
      const players = await Promise.all(playerEmails.map(async (email) => {
        try {
          const usersCollection = collection(db, 'users');
          const q = query(usersCollection, where('email', '==', email));
          const userSnapshot = await getDocs(q);
    
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            return { email: email, firstName: userData.firstName, nickname: userData.nickname, lastName: userData.lastName};
          } else {
            return { email: email, nickname: "Unknown" };
          }
        } catch (error) {
          console.error("Error fetching player details:", error);
          return { email: email, nickname: "Error" };
        }
      }));
      return players;
    };
    
    

    fetchTeams();
  }, []);

  if (statsLoading) return <p>Loading…</p>;
  if (statsError) return <p>Error: {statsError.message}</p>;

  return (
    <div className="teams-page">
      {/* Hero section */}
      <div className="teams-hero">
        <div className="teams-hero-container">
          <h1 className="teams-hero-title">Watermelon Cup 2024 Teams</h1>
          <p className="teams-hero-description">
            Explore the teams competing in this year's tournament and discover their players.
          </p>
        </div>
      </div>

      {/* Teams grid */}
      <div className="teams-container">
        <div className="teams-grid">
          {teams.map((team) => (
            <div key={team.id} className="team-card">
              <div className="team-color-bar" style={{ backgroundColor: team.name === "Brazil" ? "#FFDF00" : 
                                                                       team.name === "North Macedonia" ? "#D20000" :
                                                                       team.name === "USA" ? "#3C3B6E" :
                                                                       team.name === "Nigeria" ? "#008751" :
                                                                       team.name === "Ireland" ? "#169B62" :
                                                                       team.name === "Israel" ? "#0038B8" : "#22c55e" }} />
              <div className="team-card-content">
                <div className="team-header">
                  <div className="team-flag-container" style={{ backgroundColor: "white" }}>
                    {/* Blank white square instead of image */}
                  </div>
                  <h2 className="team-name">{team.name}</h2>
                </div>

                <div className="team-stats">
                  <div className="stat-item">
                    <span className="stat-value">{statsByTeam[team.id]?.wins || 0}</span>
                    <span className="stat-label">Wins</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{statsByTeam[team.id]?.draws || 0}</span>
                    <span className="stat-label">Draws</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{statsByTeam[team.id]?.losses || 0}</span>
                    <span className="stat-label">Losses</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{statsByTeam[team.id]?.goalsFor || 0}</span>
                    <span className="stat-label">GF</span>
                  </div>
                </div>

                <div className="players-section">
                  <h3 className="players-title">Players</h3>
                  <div className="players-container">
                    {team.players && team.players.slice(0, 5).map((player, index) => (
                      <span key={index} className="player-tag">
                        {player.firstName} {player.lastName}
                      </span>
                    ))}
                    {team.players && team.players.length > 5 && !expandedTeams[team.id] && (
                      <span 
                        className="player-tag" 
                        onClick={() => setExpandedTeams({...expandedTeams, [team.id]: true})}
                        style={{ cursor: 'pointer', backgroundColor: '#e2f5ea', color: '#16a34a' }}
                      >
                        Show +{team.players.length - 5} players
                      </span>
                    )}
                    {team.players && expandedTeams[team.id] && team.players.slice(5).map((player, index) => (
                      <span key={`extended-${index}`} className="player-tag">
                        {player.firstName} {player.lastName}
                      </span>
                    ))}
                    {team.players && expandedTeams[team.id] && (
                      <span 
                        className="player-tag" 
                        onClick={() => setExpandedTeams({...expandedTeams, [team.id]: false})}
                        style={{ cursor: 'pointer', backgroundColor: '#fee2e2', color: '#dc2626' }}
                      >
                        Show less
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  to={`/teams/${team.id}/${leagueId}`}
                  className="view-details-button"
                  style={{ cursor: 'pointer' }}
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
