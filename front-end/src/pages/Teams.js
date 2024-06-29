import React, { useState, useEffect } from "react";
import { Container, Card, CardGroup, ListGroup } from "react-bootstrap";
import { Navbar } from '../components/Navbar';
import { db } from "../firebase/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";

export function Teams() {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        // Query the leagues collection to find the league with name "Watermelon Cup 2024"
        const leaguesCollection = collection(db, 'leagues');
        const leaguesSnapshot = await getDocs(leaguesCollection);
        const watermelonCupLeague = leaguesSnapshot.docs.find(doc => doc.data().name === "Watermelon Cup 2024");

        if (watermelonCupLeague) {
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

  return (
    <Container
      className="d-flex flex-row flex-wrap justify-content-center align-items-flex-start"
      style={{ minHeight: "100vh", maxWidth: "100%", padding: 0 }}
    >
      <Navbar />
      <div className="w-100" style={{ maxWidth: "1000px" }}>
        <h2>Watermelon Cup 2024 Teams</h2>
        <CardGroup>
          {teams.map(team => (
            <Card key={team.id} style={{ marginBottom: "20px" }}>
              <Card.Header>{team.name}</Card.Header>
              <ListGroup variant="flush">
                {team.players && team.players.map((player, index) => (
                  <ListGroup.Item key={index}>{player.firstName + " " + player.lastName}</ListGroup.Item>
                ))}
              </ListGroup>
            </Card>
          ))}
        </CardGroup>
      </div>
    </Container>
  );
}
