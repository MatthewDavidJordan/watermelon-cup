import React, { useRef, useState, useEffect } from "react";
import { Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authContexts/firebaseAuth";
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from "../firebase/firebase";
import { tailspin } from 'ldrs';
import "../styles/auth.css";

tailspin.register();

export const Register = () => {
  const firstNameRef = useRef();
  const lastNameRef = useRef();
  const nicknameRef = useRef();
  const emailRef = useRef();
  const phoneRef = useRef();
  const gradYearRef = useRef();
  const clubTeamRef = useRef();
  const footRef = useRef();
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [positionError, setPositionError] = useState("");
  const navigate = useNavigate();

  const { currentUser, userLoggedIn } = useAuth();
  const [userData, setUserData] = useState({});

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Check if the user is already registered for the 2025 season
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().registered2025) {
          // User is already registered for the 2025 season, navigate to the homepage
          navigate("/");
        } else {
          // User is not registered, proceed with the registration process
        }
      }
    });
  
    // Clean up the observer on component unmount
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (currentUser) {
      const fetchUserData = async () => {
        const ref = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setUserData(snap.data());
      };
      fetchUserData();
    }
  }, [currentUser]);

  // Position mapping for abbreviations
  const positionMap = {
    "Goalkeeper": "GK",
    "Center Back": "CB",
    "Right Back": "RB",
    "Left Back": "LB",
    "Defensive Mid": "DM",
    "Center Mid": "CM",
    "Attacking Mid": "AM",
    "Right Wing": "RW",
    "Left Wing": "LW",
    "Striker": "ST"
  };

  // Reverse position mapping can be created if needed in the future
  // Currently not used but kept for reference
  // const reversePositionMap = Object.entries(positionMap).reduce((acc, [key, value]) => {
  //   acc[value] = key;
  //   return acc;
  // }, {});

  // Sync userData into refs for autofill
  useEffect(() => {
    if (currentUser && userData && firstNameRef.current) {
      const {
        firstName, lastName, nickname, email, phone,
        graduationYear, clubTeam, footPref, position
      } = userData;
      firstNameRef.current.value = firstName || '';
      lastNameRef.current.value = lastName || '';
      nicknameRef.current.value = nickname || currentUser?.displayName || '';
      emailRef.current.value = email || currentUser?.email || '';
      phoneRef.current.value = phone || '';
      gradYearRef.current.value = graduationYear || '';
      clubTeamRef.current.value = clubTeam || '';
      footRef.current.value = footPref || '';
      
      // Only autofill positions if the existing data is already an array
      if (position && Array.isArray(position)) {
        setSelectedPositions(position);
      }
    }
  }, [userData, currentUser]);

  async function handleSubmit(e) {
    e.preventDefault();

    // Validate positions (required and max 3)
    if (selectedPositions.length === 0) {
      setPositionError("Please select at least one position");
      return;
    }
    
    if (selectedPositions.length > 3) {
      setPositionError("You can select a maximum of 3 positions");
      return;
    }

    try {
      setError("");
      setPositionError("");
      setLoading(true);
      await addUserInfoToFirestore(e);
    } catch (error) {
      setError(error + "Failed to register account");
    }
    setLoading(false);
  }

  const addUserInfoToFirestore = async (e) => {
    e.preventDefault();
    if (userLoggedIn) {
      try {
        // Add user info to Firestore
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          firstName: firstNameRef.current.value,
          lastName: lastNameRef.current.value,
          nickname: nicknameRef.current.value,
          email: emailRef.current.value,
          phone: phoneRef.current.value,
          graduationYear: gradYearRef.current.value,
          clubTeam: clubTeamRef.current.value,
          footPref: footRef.current.value,
          position: selectedPositions, // This is already storing the abbreviations
          registered2025: true,
          registeredFor2025SeasonAt: serverTimestamp(),
        });
        navigate("/");
      } catch (error) {
        setError("Error registering user");
      }
    }
  };

  return (
    <div className="auth-page">
      {/* Hero section */}
      <div className="auth-hero">
        <div className="auth-hero-container">
          <h1 className="auth-hero-title">Register for 2025 Watermelon Cup</h1>
          <p className="auth-hero-description">
            Games run every Wednesday from 6pm - 8pm. Dates: July 9 - August 6.
          </p>
        </div>
      </div>

      {/* Auth container */}
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-card-content">
            <h2 className="auth-form-title">Player Registration</h2>
            
            {error && <div className="auth-alert">{error}</div>}
            
            <Form onSubmit={handleSubmit}>
              <div className="auth-form-group">
                <label className="auth-form-label">First Name</label>
                <input 
                  type="text" 
                  className="auth-form-control" 
                  ref={firstNameRef} 
                  defaultValue={userData.firstName || ""} 
                  placeholder="Enter your first name" 
                  required 
                />
              </div>
              
              <div className="auth-form-group">
                <label className="auth-form-label">Last Name</label>
                <input 
                  type="text" 
                  className="auth-form-control" 
                  ref={lastNameRef} 
                  defaultValue={userData.lastName || ""} 
                  placeholder="Enter your last name" 
                  required 
                />
              </div>
              
              <div className="auth-form-group">
                <label className="auth-form-label">Nickname</label>
                <input 
                  type="text" 
                  className="auth-form-control" 
                  ref={nicknameRef} 
                  defaultValue={userData.nickname || currentUser?.displayName || ""} 
                  placeholder="Enter your nickname" 
                  required 
                />
              </div>
              
              <div className="auth-form-group">
                <label className="auth-form-label">Email</label>
                <input 
                  type="email" 
                  className="auth-form-control" 
                  ref={emailRef} 
                  defaultValue={userData.email || currentUser?.email || ""} 
                  placeholder="Enter your email" 
                  required 
                />
              </div>
              
              <div className="auth-form-group">
                <label className="auth-form-label">Phone Number</label>
                <input 
                  type="tel" 
                  className="auth-form-control" 
                  ref={phoneRef} 
                  defaultValue={userData.phone || ""} 
                  placeholder="Enter your phone number" 
                  required 
                />
              </div>
              
              <div className="auth-form-group">
                <label className="auth-form-label">Staples Graduation Class</label>
                <select 
                  className="auth-form-control" 
                  ref={gradYearRef} 
                  defaultValue={userData.graduationYear || ""} 
                  required
                >
                  <option value="">Select Year</option>
                  <option value="before2000">Before 2000</option>
                  {Array.from({ length: 30 }, (_, i) => (
                  <option key={i + 2000} value={i + 2000}>
                      {i + 2000}
                  </option>))}
                  <option value="after2029">After 2029</option>
                </select>
              </div>
              
              <div className="auth-form-group">
                <label className="auth-form-label">Club Team (if none leave blank)</label>
                <input 
                  type="text" 
                  className="auth-form-control" 
                  ref={clubTeamRef} 
                  defaultValue={userData.clubTeam || ""} 
                  placeholder="Leave blank if none" 
                />
              </div>
              
              <div className="auth-form-group">
                <label className="auth-form-label">Preferred Foot</label>
                <select 
                  className="auth-form-control" 
                  ref={footRef} 
                  defaultValue={userData.footPref || ""} 
                  required
                >
                  <option value="">Select Option</option>
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                  <option value="both">Both</option>
                </select>
              </div>
              
              <div className="auth-form-group">
                <label className="auth-form-label">Preferred Position(s) (select up to 3)</label>
                <div className="position-selection">
                  {[
                    "Goalkeeper", "Center Back", "Right Back", "Left Back", 
                    "Defensive Mid", "Center Mid", "Attacking Mid", 
                    "Right Wing", "Left Wing", "Striker"
                  ].map((position) => {
                    const positionId = position.replace(/\s+/g, '');
                    const abbreviation = positionMap[position];
                    const isSelected = selectedPositions.includes(abbreviation);
                    
                    return (
                      <div 
                        key={position} 
                        className="position-option"
                        onClick={() => {
                          if (isSelected) {
                            // Always allow deselecting
                            setSelectedPositions(prev => prev.filter(pos => pos !== abbreviation));
                            setPositionError("");
                          } else {
                            // Only allow selecting if less than 3 positions are already selected
                            if (selectedPositions.length < 3) {
                              setSelectedPositions(prev => [...prev, abbreviation]);
                              setPositionError("");
                            } else {
                              setPositionError("Maximum of 3 positions");
                            }
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          id={positionId}
                          checked={isSelected}
                          onChange={() => {}} // Handled by parent div onClick
                          onClick={(e) => e.stopPropagation()} // Prevent double-triggering
                        />
                        <label htmlFor={positionId}>{position}</label>
                      </div>
                    );
                  })}
                </div>
                {positionError && <div className="auth-alert">{positionError}</div>}
              </div>
              
              <button 
                type="submit" 
                className="auth-btn" 
                disabled={loading}
              >
                {loading ? (
                  <l-tailspin size="25" stroke="5" speed="0.9" color="white"></l-tailspin>
                ) : (
                  "Register"
                )}
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}