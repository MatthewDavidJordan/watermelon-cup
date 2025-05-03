import "./footer.css"

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-column">
            <h3>Watermelon Cup</h3>
            <p>
              Watermelon Cup is a summer soccer league that gives upcoming and current Staples Soccer players a chance to play and connect with alumni. 
            </p>
            <p className="footer-contact">
              Comments, questions, or suggestions?<br />
              <a href="mailto:mdj82@georgetown.edu">Email us</a>
            </p>
            <div className="social-links">
              <a href="https://www.instagram.com/staplesbsocc/?hl=en" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a href="https://twitter.com/StaplesSoccer1" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              <a href="https://www.facebook.com/staplessoccer/" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Facebook">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-column">
            <h3>Resources</h3>
            <ul className="footer-links">
              <li>
                <a href="https://staplessoccer.com" target="_blank" rel="noopener noreferrer">Staples Soccer</a>
              </li>
              <li>
                <a href="https://06880danwoog.com" target="_blank" rel="noopener noreferrer">06880</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Watermelon Cup. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
