# Watermelon Cup

A React-based web application for the Watermelon Cup — a summer soccer league that gives upcoming and current Staples Soccer players a chance to play and connect with alumni.

## Author

- **Matthew David Jordan** - [MatthewDavidJordan](https://github.com/MatthewDavidJordan)

## Features

- **2-Step Registration Flow** — Account creation (Signup) followed by player registration, with a visual stepper and smart redirects
- **Season Selector** — Switch between past and current seasons to view historical teams, matches, and standings
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

## Auth & Registration Flow

### New Users
1. **Signup** (`/signup`) — Create an account via email/password or Google sign-in. A stepper and info callout indicate this is step 1 of 2.
2. **Register** (`/register`) — After signup, users are automatically redirected here to fill in player details (name, positions, graduation year, etc.). The stepper shows step 2 active. On submit, a Firestore user document is created (or merged) with `registered2026: true`.

### Returning Users (not yet registered for current season)
1. **Login** (`/login`) — Sign in with email/password or Google. No stepper is shown since returning users are familiar with the site.
2. **Register** (`/register`) — Automatically redirected here. The form autofills from their prior season data. On submit, the existing Firestore doc is updated with the new season's registration flag.

### Returning Users (already registered)
1. **Login** (`/login`) — After sign-in, the `onAuthStateChanged` listener checks the user's Firestore doc. If `registered2026` is `true`, they are sent straight to the home page.

### Cloud Function Auth Trigger
A Firebase Cloud Function (`newUserSignup`) fires on every new Auth account creation. It creates a Firestore document at `users/{uid}` with the user's email and all registration flags set to `false`. This ensures a Firestore doc exists before the client-side registration form submits. The client uses `setDoc` with `{ merge: true }` as a fallback in case the function hasn't fired yet.

### Error Handling
- **Signup** — Specific messages for duplicate emails ("account already exists"), weak passwords, and invalid emails.
- **Login** — Specific messages for wrong password, user not found, too many attempts, and invalid email.
- **Register** — Validates all required fields are filled and at least 1 (max 3) positions are selected before submitting.

## Tech Stack

- **Frontend**: React.js
- **UI Framework**: React Bootstrap, Lucide React (icons)
- **Styling**: Custom CSS with responsive breakpoints
- **State Management**: React Context API (Auth context, Season context)
- **Routing**: React Router DOM
- **Authentication**: Firebase Authentication (email/password + Google)
- **Database**: Firebase Firestore
- **Cloud Functions**: Firebase Functions (auth triggers for user creation/deletion)
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

### Deploying Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

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
│   │   ├── auth-stepper.js       # 2-step registration stepper (used on Signup & Register)
│   │   ├── carousel.js           # Hero image carousel
│   │   ├── countdown-timer.js    # Countdown to target date
│   │   ├── footer.js             # Site footer with links & socials
│   │   ├── Loading.js            # Loading spinner
│   │   ├── main-navigation.js    # Top nav bar
│   │   ├── PlayerCard.js         # FIFA-style player card
│   │   ├── SeasonSelector.js     # Dropdown to switch between seasons/leagues
│   │   └── ToggleSwitch.js       # Toggle switch component
│   ├── pages/
│   │   ├── Home.js               # Landing page with countdown & league info
│   │   ├── Login.js              # Returning user login
│   │   ├── Signup.js             # New user signup (step 1 of registration)
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
│   ├── styles/                   # CSS files for components and pages
│   ├── firebase/
│   │   ├── firebase.js           # Firebase config & initialization
│   │   └── auth.js               # Auth helper functions
│   └── contexts/
│       ├── SeasonContext.js       # Season/league selection context
│       └── authContexts/
│           └── firebaseAuth.js   # Auth context provider
└── functions/
    └── index.js                  # Cloud Functions (auth triggers)
```

## Firestore Data Model

- **`users/{uid}`** — Player profile (name, email, phone, positions, foot preference, graduation year, club team), registration flags (`registered2024`, `registered2025`, `registered2026`), and timestamps
- **`leagues/{leagueId}`** — League name, description
- **`leagues/{leagueId}/teams/{teamId}`** — Team name, color, players
- **`leagues/{leagueId}/matches/{matchId}`** — Home/away team IDs, scores, dateTime, field location

## Season Management

Each season uses a year-specific registration flag (e.g., `registered2026`). To prepare for a new season:

1. Add a new `registeredYYYY: false` flag in `functions/index.js` (Cloud Function auth trigger) and redeploy
2. Update the `registeredYYYY` checks in `Register.js`, `Login.js`, `Signup.js`, `Settings.js`, and `UpdateProfile.js`
3. Update countdown target date and key dates in `Home.js`
4. Update game info text in `Register.js`
5. Create a new league document in Firestore (e.g., "Watermelon Cup 2027")

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
