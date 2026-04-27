# Watermelon Cup

A React-based web application for the Watermelon Cup — a summer soccer league that gives upcoming and current Staples Soccer players a chance to play and connect with alumni.

## Author

- **Matthew David Jordan** - [MatthewDavidJordan](https://github.com/MatthewDavidJordan)

## Features

- **2-Step Registration Flow** — Account creation (Login/Signup) followed by player registration, with a visual stepper and smart redirects so users never get lost
- **Countdown Timer** — Live countdown to registration deadline on the home page
- **Team Management** — View teams, rosters, and player cards
- **Match Tracking** — Browse matches organized by week and round, with live score updates
- **Standings** — Auto-computed standings and team statistics from match results
- **Draft Engine** — Built-in draft system for team selection
- **Score Upload** — Authorized users can submit and update match scores
- **User Profiles** — Players manage their profile info, positions, and registration status
- **Image Carousel** — Rotating hero images on the home page
- **Responsive Design** — Mobile-first layout with wider 2-column forms on desktop
- **Firebase Integration** — Authentication, Firestore database, and Cloud Functions

## 2026 Season Details

- **Registration Deadline**: June 15, 2026
- **Season Start**: July 8, 2026 (Wednesdays)
- **Regular Season End**: July 29, 2026
- **Playoffs & Championship**: August 5, 2026
- **Game Times**: 6:00 PM & 7:00 PM, 2 x 27 min halves

## Registration Flow

The site uses a **2-step process** to register players:

1. **Step 1 — Create Account**: User signs up (email/password or Google) or logs in. A stepper in the hero banner and an info callout in the form card make it clear this is step 1 of 2.
2. **Step 2 — Register as Player**: After authentication, unregistered users are automatically redirected to `/register` where they fill in player details (name, position, graduation year, etc.). The stepper updates to show step 2 active with a checkmark on step 1.

Already-registered users who log in are sent straight to the home page.

## Tech Stack

- **Frontend**: React.js
- **UI Framework**: React Bootstrap, Lucide React (icons)
- **Styling**: Custom CSS with responsive breakpoints
- **State Management**: React Context API
- **Routing**: React Router DOM
- **Authentication**: Firebase Authentication (email/password + Google)
- **Database**: Firebase Firestore
- **Cloud Functions**: Firebase Functions
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase CLI (for Cloud Functions deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MatthewDavidJordan/watermelon-cup.git
cd watermelon-cup
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Firebase configuration:
```env
REACT_APP_FIREBASE_CONFIG={
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_AUTH_DOMAIN",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_STORAGE_BUCKET",
  "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "measurementId": "YOUR_MEASUREMENT_ID"
}
```

4. Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Project Structure

```
watermelon-cup/
├── public/
│   ├── WatermelonPic1.jpg
│   ├── WatermelonPic2.jpg
│   ├── WatermelonPic3.jpg
│   └── index.html
├── src/
│   ├── components/
│   │   ├── auth-stepper.js       # 2-step registration stepper
│   │   ├── carousel.js           # Hero image carousel
│   │   ├── countdown-timer.js    # Countdown to target date
│   │   ├── footer.js             # Site footer with links & socials
│   │   ├── Loading.js            # Loading spinner
│   │   ├── main-navigation.js    # Top nav bar
│   │   ├── PlayerCard.js         # FIFA-style player card
│   │   └── ToggleSwitch.js       # Toggle switch component
│   ├── pages/
│   │   ├── Home.js               # Landing page with countdown & league info
│   │   ├── Login.js              # Login (step 1 of registration flow)
│   │   ├── Signup.js             # Sign up (step 1 of registration flow)
│   │   ├── ForgotPassword.js     # Password reset
│   │   ├── Register.js           # Player registration (step 2)
│   │   ├── Settings.js           # User profile & team status
│   │   ├── UpdateProfile.js      # Edit profile & credentials
│   │   ├── Teams.js              # All teams overview
│   │   ├── TeamDetail.js         # Individual team roster & matches
│   │   ├── Matches.js            # Match schedule by week/round
│   │   ├── Standings.js          # League standings & stats
│   │   ├── UploadScores.js       # Admin score entry
│   │   └── Draft.js              # Draft engine
│   ├── hooks/
│   │   └── useLeagueStats.js     # Computes team stats from match data
│   ├── styles/
│   │   ├── auth.css              # Auth page styles (login, signup, register, settings)
│   │   ├── globals.css           # Global styles, nav, buttons
│   │   ├── Home.css              # Home page styles
│   │   ├── matches.css           # Matches page styles
│   │   ├── standings.css         # Standings page styles
│   │   ├── teams.css             # Teams & team detail styles
│   │   ├── Draft.css             # Draft engine styles
│   │   ├── PlayerCard.css        # Player card styles
│   │   └── upload-scores.css     # Score upload styles
│   ├── firebase/
│   │   ├── firebase.js           # Firebase config & initialization
│   │   └── auth.js               # Auth helper functions
│   └── contexts/
│       └── authContexts/
│           └── firebaseAuth.js   # Auth context provider
└── functions/
    └── index.js                  # Firebase Cloud Functions
```

## Firestore Data Model

- **`users/{uid}`** — Player profile, registration flags (`registered2026`, etc.)
- **`leagues/{leagueId}`** — League name, description
- **`leagues/{leagueId}/teams/{teamId}`** — Team name, color, players
- **`leagues/{leagueId}/matches/{matchId}`** — Home/away teams, scores, date, field

## Season Management

Each season uses a year-specific registration flag (e.g., `registered2026`). To prepare for a new season:

1. Add a new `registeredYYYY` flag check in `Home.js`, `Register.js`, `Login.js`, `Signup.js`, `Settings.js`, and `UpdateProfile.js`
2. Update countdown target date and key dates in `Home.js`
3. Update game info text in `Register.js`
4. Create a new league document in Firestore (e.g., "Watermelon Cup 2027")

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- React Bootstrap for UI components
- Firebase for backend services
- Lucide React for icons
- Vercel for deployment
