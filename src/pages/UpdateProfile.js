import React, { useRef, useState, useEffect } from "react";
import { Form } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { updatePass, updateEmailAddress } from "../firebase/auth";
import { useAuth } from "../contexts/authContexts/firebaseAuth";
import { tailspin } from 'ldrs';
import "../styles/auth.css";

tailspin.register();

export const UpdateProfile = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const passwordConfirmRef = useRef();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { currentUser, userLoggedIn } = useAuth();

  useEffect(() => {
    if (!userLoggedIn) navigate("/login");
  }, [userLoggedIn, navigate]);

  function handleSubmit(e) {
    e.preventDefault();
    if (passwordRef.current.value !== passwordConfirmRef.current.value) {
      return setError("Passwords do not match");
    }

    const promises = [];
    setLoading(true);
    setError("");

    if (emailRef.current.value !== currentUser.email) {
      promises.push(updateEmailAddress(emailRef.current.value));
    }
    if (passwordRef.current.value) {
      promises.push(updatePass(passwordRef.current.value));
    }

    Promise.all(promises)
      .then(() => {
        navigate("/");
      })
      .catch(() => {
        setError("Failed to update account");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div className="auth-page">
      {/* Hero section */}
      <div className="auth-hero">
        <div className="auth-hero-container">
          <h1 className="auth-hero-title">Update Your Profile</h1>
          <p className="auth-hero-description">
            Manage your account settings and credentials
          </p>
        </div>
      </div>

      {/* Auth container */}
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-card-content">
            <h2 className="auth-form-title">Update Profile</h2>
            
            {error && <div className="auth-alert">{error}</div>}
            
            <Form onSubmit={handleSubmit}>
              <div className="auth-form-group">
                <label className="auth-form-label">Email</label>
                <input 
                  type="email" 
                  className="auth-form-control" 
                  ref={emailRef} 
                  defaultValue={currentUser.email}
                  required 
                />
              </div>
              
              <div className="auth-form-group">
                <label className="auth-form-label">Password</label>
                <input 
                  type="password" 
                  className="auth-form-control" 
                  ref={passwordRef} 
                  placeholder="Leave blank to keep the same" 
                />
              </div>
              
              <div className="auth-form-group">
                <label className="auth-form-label">Confirm Password</label>
                <input 
                  type="password" 
                  className="auth-form-control" 
                  ref={passwordConfirmRef} 
                  placeholder="Leave blank to keep the same" 
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
                  "Update Profile"
                )}
              </button>
              
              <div className="auth-links">
                <Link to="/" className="auth-link">Cancel and return to home</Link>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}