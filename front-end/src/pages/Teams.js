import React, { useState, useEffect } from "react";
import { Container, Card, CardGroup, ListGroup } from "react-bootstrap";
import { Navbar } from '../components/Navbar';
import { db } from "../firebase/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export function Teams() {
    const [teams, setTeams] = useState([]);
  
    useEffect(() => {
      const fetchTeams = async () => {
        const leaguesCollection = collection(db, 'leagues');
        const leaguesSnapshot = await getDocs(leaguesCollection);
  
        // Find the league with the name "Watermelon Cup 2024"
        const watermelonCupLeague = leaguesSnapshot.docs.find(doc => doc.data().name === "Watermelon Cup 2024");
  
        if (watermelonCupLeague) {
          const teamsCollection = collection(db, 'leagues', watermelonCupLeague.id, 'teams');
          const teamsSnapshot = await getDocs(teamsCollection);
          const teamsList = await Promise.all(teamsSnapshot.docs.map(async (teamDoc) => {
            const teamData = teamDoc.data();
            const playerDetails = teamData.players ? await fetchPlayerDetails(teamData.players) : [];
            return { id: teamDoc.id, ...teamData, players: playerDetails };
          }));
          setTeams(teamsList);
        } else {
          // Handle case when the league is not found
          console.log("Watermelon Cup 2024 league not found");
        }
      };
  
      const fetchPlayerDetails = async (playerIds) => {
        const players = await Promise.all(playerIds.map(async (playerId) => {
          try {
            const playerRef = doc(db, 'users', playerId);
            const playerDoc = await getDoc(playerRef);
            if (playerDoc.exists()) {
              return { id: playerId, nickname: playerDoc.data().nickname };
            } else {
              return { id: playerId, nickname: "Unknown" }; // Player not found
            }
          } catch (error) {
            console.error("Error fetching player details:", error);
            return { id: playerId, nickname: "Error" }; // Handle error fetching player details
          }
        }));
        return players;
      };
  
      fetchTeams();
    }, []);
  
    return (
      <Container
        className="d-flex flex-row flex-wrap justify-content-center align-items-flex-start"
        style={{ minHeight: "100vh", maxWidth: "100%", padding: 0 }}
      >
        <Navbar />
        <div className="w-100" style={{ maxWidth: "1000px" }}>
          <h2>Watermelon Cup 2024</h2>
          <CardGroup>
            {teams.map(team => (
                <Card key={team.id} style={{ marginBottom: "20px" }}>
                <Card.Header>{team.name}</Card.Header>
                <ListGroup variant="flush">
                    {team.players && team.players.map((player, index) => (
                    <ListGroup.Item key={index}>{player.nickname}</ListGroup.Item>
                    ))}
                </ListGroup>
                </Card>
            ))}
          </CardGroup>
        </div>
      </Container>
    );
  }