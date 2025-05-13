import React, { useRef, useState, useEffect } from "react";
import { Form } from "react-bootstrap";
import { doSignInWithEmailAndPassword, doSignInWithGoogle } from "../firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authContexts/firebaseAuth";
import { auth } from "../firebase/firebase";
import { tailspin } from 'ldrs';
import "../styles/auth.css";

tailspin.register();

export const Login = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { userLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userLoggedIn) navigate("/");
  }, [userLoggedIn, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);
      await doSignInWithEmailAndPassword(emailRef.current.value, passwordRef.current.value);
      navigate("/");
    } catch {
      setError("Failed to log in");
    }

    setLoading(false);
  }

  const onGoogleSignIn = (e) => {
    e.preventDefault();
    if (!loading) {
      setLoading(true);
      doSignInWithGoogle().catch((error) => {
        console.log(error.message);
        setError("Failed to sign in with Google");
        setLoading(false);
      });
    }
  };

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

  return (
    <div className="auth-page">
      {/* Hero section */}
      <div className="auth-hero">
        <div className="auth-hero-container">
          <h1 className="auth-hero-title">Welcome to Watermelon Cup</h1>
          <p className="auth-hero-description">
            Sign in to access your account and league pages
          </p>
        </div>
      </div>

      {/* Auth container */}
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-card-content">
            <h2 className="auth-form-title">Log In</h2>
            
            {error && <div className="auth-alert">{error}</div>}
            
            <Form onSubmit={handleSubmit}>
              <div className="auth-form-group">
                <label className="auth-form-label">Email</label>
                <input 
                  type="email" 
                  className="auth-form-control" 
                  ref={emailRef} 
                  placeholder="Enter your email" 
                  required 
                />
              </div>
              
              <div className="auth-form-group">
                <label className="auth-form-label">Password</label>
                <input 
                  type="password" 
                  className="auth-form-control" 
                  ref={passwordRef} 
                  placeholder="Enter your password" 
                  required 
                />
              </div>
              
              <button 
                type="submit" 
                className="auth-btn" 
                disabled={loading}
              >
                {loading ? (
                  <l-tailspin size="25" stroke="5" speed="0.9" color="white"></l-tailspin>
                ) : (
                  "Log In"
                )}
              </button>
              
              <div className="auth-divider">or</div>
              
              <button 
                type="button" 
                className="auth-google-btn" 
                onClick={onGoogleSignIn} 
                disabled={loading}
              >
                {loading ? (
                  <l-tailspin size="25" stroke="5" speed="0.9" color="black"></l-tailspin>
                ) : (
                  <>
                    <svg className="auth-google-icon" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>
              
              <div className="auth-links">
                <Link to="/forgot-password" className="auth-link">Forgot Password?</Link>
                <div className="mt-3">
                  Need an account? <Link to="/signup" className="auth-link">Sign Up</Link>
                </div>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}