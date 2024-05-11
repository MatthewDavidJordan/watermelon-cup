import React, { useState, useEffect } from "react";
import "./Login.css";
import { doSignInWithEmailAndPassword, doSignInWithGoogle } from "../firebase/auth";
import { auth } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

import { Navbar } from '../components/Navbar'

export const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();
    
    const onSubmit = async (e) => {
        e.preventDefault();
        if (!isSigningIn) {
            setIsSigningIn(true);
            try {
                await doSignInWithEmailAndPassword(email, password);
                console.log("User signed in successfully");
                navigate("/");
                setErrorMessage("");
            } catch (error) {
                // setErrorMessage(error.message);
                if (error.message === "Firebase: Error (auth/invalid-credential).") {
                    setErrorMessage("Invalid email or password or user does not exist. Please try again.");
                }
                setEmail("");
                setPassword("");
                setIsSigningIn(false);
            }
        }
    }

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            // User is signed in, navigate to the homepage
            navigate("/");
          }
        });
    
        // Clean up the observer on component unmount
        return () => unsubscribe();
      }, [navigate]);

    const onGoogleSignIn = (e) => {
        e.preventDefault();
        if (!isSigningIn) {
          setIsSigningIn(true);
          doSignInWithGoogle().catch((error) => {
            setErrorMessage(error.message);
            console.log(errorMessage + "Error signing in with Google");
            setIsSigningIn(false);
          });
        }
      };

    return (
        <div className="login-container">
            <Navbar/>
            <form className="login-form" onSubmit={onSubmit}>
                <h2>Login</h2>
                <p>{errorMessage}</p>
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
                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" onClick={onSubmit} disabled={isSigningIn}>Login</button>
                <h3>OR</h3>
                <button onClick={onGoogleSignIn} disabled={isSigningIn}>Sign in with Google</button>
            </form>
        </div>
       );
}