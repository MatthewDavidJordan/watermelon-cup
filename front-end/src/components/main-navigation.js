import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react"
import "./main-navigation.css"

import { useAuth } from '../contexts/authContexts/firebaseAuth';

export function MainNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const { userLoggedIn } = useAuth();

  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="logo">
          <img src="/favicon.ico" alt="Watermelon Cup logo" className="logo-icon" />
          <span>Watermelon Cup</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          <Link to="/teams" className="nav-link">
            Teams
          </Link>
          <Link to="/standings" className="nav-link">
            Standings
          </Link>
          <Link to="/matches" className="nav-link">
            Matches
          </Link>
        </nav>

        <div className="desktop-cta">
          {userLoggedIn ? (
            <Link to="/settings" className="btn btn-white">
              Settings
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-white">
                Log In
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <X className="menu-icon" /> : <Menu className="menu-icon" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="mobile-nav-container">
          <nav className="mobile-nav">
            <Link to="/teams" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              Teams
            </Link>
            <Link to="/standings" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              Standings
            </Link>
            <Link to="/matches" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              Matches
            </Link>
            {userLoggedIn ? (
              <Link to="/settings" className="mobile-register-btn" onClick={() => setIsMenuOpen(false)}>
                Settings
              </Link>
            ) : (
              <>
                <Link to="/login" className="mobile-register-btn" onClick={() => setIsMenuOpen(false)}>
                  Log In
                </Link>
                <Link to="/signup" className="mobile-register-btn" onClick={() => setIsMenuOpen(false)}>
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
