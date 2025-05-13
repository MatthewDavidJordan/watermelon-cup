import React, { useRef, useState, useEffect } from "react";
import { Form } from "react-bootstrap";
import { doPasswordReset } from "../firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authContexts/firebaseAuth";
import { tailspin } from 'ldrs';
import "../styles/auth.css";

tailspin.register();

export const ForgotPassword = () => {
  const { userLoggedIn } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (userLoggedIn) navigate("/");
  }, [userLoggedIn, navigate]);

  const emailRef = useRef();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setMessage("");
      setError("");
      setLoading(true);
      await doPasswordReset(emailRef.current.value);
      setMessage("Check your inbox for further instructions");
    } catch {
      setError("Failed to reset password");
    }

    setLoading(false);
  }

  return (
    <div className="auth-page">
      {/* Hero section */}
      <div className="auth-hero">
        <div className="auth-hero-container">
          <h1 className="auth-hero-title">Reset Your Password</h1>
          <p className="auth-hero-description">
            Enter your email to receive password reset instructions
          </p>
        </div>
      </div>

      {/* Auth container */}
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-card-content">
            <h2 className="auth-form-title">Password Reset</h2>
            
            {error && <div className="auth-alert">{error}</div>}
            {message && (
              <div className="auth-alert" style={{ backgroundColor: "#dcfce7", color: "#166534", borderColor: "#bbf7d0" }}>
                {message}
              </div>
            )}
            
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
              
              <button 
                type="submit" 
                className="auth-btn" 
                disabled={loading}
              >
                {loading ? (
                  <l-tailspin size="25" stroke="5" speed="0.9" color="white"></l-tailspin>
                ) : (
                  "Reset Password"
                )}
              </button>
              
              <div className="auth-links">
                <Link to="/login" className="auth-link">Back to Login</Link>
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
