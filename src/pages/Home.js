import React, { useState , useEffect} from 'react';

import { Carousel } from "../components/carousel"
import { CountdownTimer } from "../components/countdown-timer"

import { Link } from "react-router-dom";

import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

import { useAuth } from '../contexts/authContexts/firebaseAuth';

export const Home = () => {

  const { userLoggedIn } = useAuth();

  const [registered, setRegistered] = useState(true);

  useEffect(() => {
      const checkUserRegistered = async () => {
        if (userLoggedIn && auth.currentUser) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRegistered(userData.registered2025);
          } else {
            setRegistered(false);
          }
        } else {
          // User is not logged in so don't tell them to register
          setRegistered(true);
        }
      };
    
      checkUserRegistered();
    }, [userLoggedIn]);
  
  return (
    <main className="home-page">
      {/* Hero Section with Carousel */}
      <section className="hero-section">
        <Carousel />
        <div className="hero-content">
          <h1>Watermelon Cup 2025</h1>
          <CountdownTimer targetDate="2025-07-09T18:00:00-04:00" />
          
          <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {(!userLoggedIn || !registered) ? (
              <div className="hero-cta">
                <Link to={userLoggedIn ? "/register" : "/login"} className="btn-register">
                  {userLoggedIn ? 'Register Now' : 'Login to Register'}
                </Link>
              </div>
            ) : (
              <div className="registration-badge" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#00a651', borderRadius: '50px', padding: '0.5rem 1.5rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white', marginRight: '0.75rem', strokeWidth: 3 }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>You're registered for the 2025 Watermelon Cup!</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* League Info Section */}
      <section className="league-info-section">
        <div className="container">
          <div className="section-header">
            <h2>League Information</h2>
            <p>Stay updated with the latest information about the Watermelon Cup 2025 season.</p>
          </div>

          <div className="info-cards">
            <div className="info-card">
              <div className="card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-calendar"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <h3>Key Dates</h3>
              <ul className="info-list">
                <li>
                  <span>Registration Deadline</span>
                  <span className="value">June 15, 2025</span>
                </li>
                <li>
                  <span>Season Start</span>
                  <span className="value">July 9, 2025</span>
                </li>
                <li>
                  <span>Regular Season End</span>
                  <span className="value">July 26, 2025</span>
                </li>
                <li>
                  <span>Playoffs & Championship</span>
                  <span className="value">August 6, 2025</span>
                </li>
              </ul>
            </div>

            <div className="info-card">
              <div className="card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-clock"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3>Game Times</h3>
              <ul className="info-list">
                <li>
                  <span>Weekday Games</span>
                  <span className="value">6:00 PM & 7:00 PM</span>
                </li>
                <li>
                  <span>Game Duration</span>
                  <span className="value">2 x 25 min halves</span>
                </li>
              </ul>
            </div>

            <div className="info-card">
              <div className="card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-map-pin"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <h3>Venue Information</h3>
              <ul className="info-list">
                <li>
                  <a
                    href="https://dt5602vnjxv0c.cloudfront.net/portals/50941/images/wakeman%20park_b%20and%20e%20map.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="venue-link"
                  >
                    <span>Fields</span>
                    <span className="value">Wakeman B, A, & E</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://maps.app.goo.gl/rFnpKKxGEv8cv2Fh6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="venue-link"
                  >
                    <span>Address</span>
                    <span className="value">Wakeman Farm Dr</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://dt5602vnjxv0c.cloudfront.net/portals/50941/images/wakeman%20park_b%20and%20e%20map.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="venue-link"
                  >
                    <span>Parking</span>
                    <span className="value">Baseball field & road</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
