import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Register.css";
import { doCreateUserWithEmailAndPassword, doSignInWithGoogle } from "../firebase/auth";
import { useAuth } from "../contexts/authContexts/firebaseAuth";
import GoogleIcon from '@mui/icons-material/Google';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

import { Navbar } from '../components/Navbar';





export const Register = () => {
    const [onFirstPage, setOnFirstPage] = useState(true);
    const { userLoggedIn, currentUser } = useAuth();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [nickname, setNickname] = useState("");
    const [graduationYear, setGraduationYear] = useState("");
    const [footPref, setFootPref] = useState("");
    const [position, setPosition] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const navigate = useNavigate();

    const register = async (e) => {
        e.preventDefault();
        const passwordMatch = (password === confirmPassword);
        console.log("User has submitted the form");
        if (!isRegistering) {
            setIsRegistering(true);
            if (passwordMatch){
                try {
                    console.log("Creating user with email and password");
                    await doCreateUserWithEmailAndPassword(email, password);
                    console.log("User created successfully");
                    setErrorMessage("");
                } catch (error) {
                    setErrorMessage(error.message);
                    console.log(errorMessage + "Error creating user");
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                    setIsRegistering(false);
                }
            } else {
                setErrorMessage("Passwords do not match");
                console.log(errorMessage + "Passwords do not match");
                setPassword("");
                setConfirmPassword("");
                setIsRegistering(false);
            }
        }
    }

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user) {
            // Check if the user is already registered
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists() && userDoc.data().registered) {
              // User is already registered, navigate to the homepage
              setErrorMessage('User is already registered');
              navigate("/");
            } else {
              // User is not registered, proceed with the registration process
            }
          }
        });
      
        // Clean up the observer on component unmount
        return () => unsubscribe();
    }, [navigate]);

    const onGoogleSignIn = (e) => {
        e.preventDefault();
        if (!isRegistering){
            setIsRegistering(true);
            doSignInWithGoogle().catch((error) => {
                setErrorMessage("Error signing in with Google. Please refresh the page and try again.");
                setIsRegistering(false);
                console.log(errorMessage + "Error signing in with Google");
                return;
            });
        } 
    };

    const addUserInfoToFirestore = async (e) => {
        e.preventDefault();
        if (userLoggedIn) {
          try {
            // Add user info to Firestore
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
              firstName,
              lastName,
              nickname,
              graduationYear,
              footPref,
              position,
              registered: true,
            });
            console.log("User info added to Firestore");
            navigate("/");
          } catch (error) {
            setErrorMessage(error.message);
            console.log(errorMessage + "Error adding user info to Firestore");
          }
        }
      };

    return (
        <div className="registration-container">
            <Navbar />
            { onFirstPage ?
              (<form className="registration-form" onSubmit={register}>
                  { userLoggedIn ?
                  (
                    <>
                    <h1>Logged In</h1>
                    <p className="full-width"> Email: {currentUser.email} </p>
                    </> 
                  ) : (<>
                    <h1>Create Your Account</h1>
                    <div className="full-width">
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="full-width">
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                placeholder="Enter your password (at least 6 characters)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="full-width">
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <p className="full-width"> {errorMessage} </p>
                    <button id="register-button" onSubmit={register} disabled={isRegistering}>
                        Register Account
                    </button>

                    <p className="full-width" id="or-divider">OR</p>

                    <div className="full-width">
                        <button id="google-auth-button"onClick={onGoogleSignIn} disabled={isRegistering}>
                            <GoogleIcon /> <p> Register with Google </p>
                        </button>
                    </div>
                  </>)}

                  <hr className="full-width" />

                  <div id="continue-button-div" className="full-width">
                      <button id="continue-button" onClick={() => setOnFirstPage(false)} disabled={ !userLoggedIn }>
                          Continue to Player Registration
                      </button>
                      <p>Already have an account that's registered? <a href="/login">Login</a></p>
                  </div>
              </form> 
              ) : (
              <form className="registration-form" onSubmit={addUserInfoToFirestore}>
                <h1>Register for Watermelon Cup 2024</h1>
                <div className="full-width">
                    <div className="form-group">
                        <label>First Name</label>
                        <input
                            type="text"
                            placeholder="Enter your first name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="full-width">
                    <div className="form-group">
                        <label>Last Name</label>
                        <input
                            type="text"
                            placeholder="Enter your last name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="full-width">
                    <div className="form-group">
                        <label>Nickname (Optional)</label>
                        <input
                            type="text"
                            placeholder="Enter your nickname (optional)"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                        />
                    </div>
                </div>
                <div className="full-width">
                    <div className="form-group">
                        <label>Staples Graduation Class</label>
                        <select value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} required>
                            <option value="">Select Year</option>
                            <option value="before2000">Before 2000</option>
                            {/* Add options for each year from 2000 to 2028 */}
                            {Array.from({ length: 29 }, (_, i) => (
                            <option key={i + 2000} value={i + 2000}>
                                {i + 2000}
                            </option>
                            ))}
                            <option value="after2028">After 2028</option>
                        </select>
                    </div>
                </div>
                <hr className="full-width" />
                <div className="full-width">
                    <div className="form-group">
                        <label>Are you right or left footed?</label>
                        <select value={footPref} onChange={(e) => setFootPref(e.target.value)} required>
                            <option value="">Select Option</option>
                            <option value="right">Right</option>
                            <option value="left">Left</option>
                            <option value="both">Both</option>
                        </select>
                    </div>
                </div>
                <div className="full-width">
                    <div className="form-group">
                        <label>Pick your preferred position</label>
                        <select value={position} onChange={(e) => setPosition(e.target.value)} required>
                            <option value="">Select Position</option>
                            <option value="goalkeeper">Goalkeeper</option>
                            <option value="offense">Offense</option>
                            <option value="defense">Defense</option>
                            <option value="anywhere">Anywhere</option>
                        </select>
                    </div>
                </div>
                <button id="register-button" onSubmit={addUserInfoToFirestore}>Register</button>
              </form>)
            }
        </div>
    );                
}