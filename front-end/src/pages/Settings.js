import React, { useState, useEffect } from "react"
import { Container, Card, Button, Alert } from "react-bootstrap"
import { useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"
import { Navbar } from '../components/Navbar'
import { auth, db } from "../firebase/firebase"
import { doSignOut } from "../firebase/auth";
import { useAuth } from "../contexts/authContexts/firebaseAuth";
import { doc, getDoc } from 'firebase/firestore';

export const Settings = () => {
  const [error, setError] = useState("");
  const [team, setTeam] = useState(null);
  const { currentUser, userLoggedIn } = useAuth();

  const navigate = useNavigate();

  async function handleLogout() {
    setError("");

    try {
      await doSignOut();
    } catch {
      setError("Failed to log out");
    }
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        // User is signed in, navigate to the homepage
        navigate("/");
      }
    });

    // Clean up the observer on component unmount
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchUserTeam = async () => {
      if (userLoggedIn && auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setTeam(userData.currentTeam || null);
        } else {
          setTeam(null);
        }
      } else {
        setTeam(null);
      }
    };

    fetchUserTeam();
  }, [userLoggedIn]);

  return (
    <Container
      className="d-flex flex-row flex-wrap justify-content-center align-items-flex-start"
      style={{ minHeight: "100vh", maxWidth: "100%", padding: 0}}
    >
      <Navbar/>
      <div className="w-100" style={{ maxWidth: "400px" }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Profile</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Card.Text>
              <strong>Email: </strong> 
              {currentUser.email}
            </Card.Text>
            <Card.Text>
            {team ? (
              <>
                <strong>Team:</strong> {team}
              </>
            ) : (
              <p>You're currently not on a Watermelon Cup Team for the summer of 2024. If you haven't registered please register from the home page.</p>
            )}
            </Card.Text>
            <Link to="/update-profile" className="btn btn-primary w-100 mt-3">
              Update Profile
            </Link>
          </Card.Body>
        </Card>
        <div className="w-100 text-center mt-2">
          <Button variant="link" onClick={handleLogout}>
            Log Out
          </Button>
        </div>
      </div>
    </Container>
  )
}