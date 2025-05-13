import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { doSignOut } from "../firebase/auth";
import { useAuth } from "../contexts/authContexts/firebaseAuth";
import { doc, getDoc } from 'firebase/firestore';
import "../styles/auth.css";

export const Settings = () => {
  const [error, setError] = useState("");
  const [team, setTeam] = useState(null);
  const { currentUser, userLoggedIn } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    if (!userLoggedIn) navigate("/login");
  }, [userLoggedIn, navigate]);

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
    <div className="auth-page">
      {/* Hero section */}
      <div className="auth-hero">
        <div className="auth-hero-container">
          <h1 className="auth-hero-title">Account Settings</h1>
          <p className="auth-hero-description">
            Manage your profile and account preferences
          </p>
        </div>
      </div>

      {/* Auth container */}
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-card-content">
            <h2 className="auth-form-title">Your Profile</h2>
            
            {error && <div className="auth-alert">{error}</div>}
            
            <div className="profile-info">
              <div className="profile-item">
                <div className="profile-label">Email</div>
                <div className="profile-value">{currentUser.email}</div>
              </div>
              
              <div className="profile-item">
                <div className="profile-label">Team Status</div>
                <div className="profile-value">
                  {team ? (
                    <span className="team-badge">{team}</span>
                  ) : (
                    <span className="no-team-message">
                      You're currently not on a Watermelon Cup Team for the summer of 2025. 
                      If you haven't registered please register from the home page.
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="profile-actions">
              <Link to="/update-profile" className="auth-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
                Update Profile
              </Link>
              
              <button onClick={handleLogout} className="auth-btn auth-btn-secondary" style={{ marginTop: '1rem' }}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}