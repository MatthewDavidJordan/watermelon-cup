# Watermelon Cup

A React-based web application for managing and displaying information about the Watermelon Cup soccer tournament.

## Author

- **Matthew David Jordan** - [MatthewDavidJordan](https://github.com/MatthewDavidJordan)

## Features

- User Authentication (Sign up/Login)
- Team Management
- Venue Information
- Registration System
- Responsive Design
- Firebase Integration for User Data

## Tech Stack

- **Frontend**: React.js with TypeScript
- **UI Framework**: React Bootstrap
- **State Management**: React Context API
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Hosting**: Firebase Hosting
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase CLI (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MatthewDavidJordan/watermelon-cup.git
cd watermelon-cup
```

2. Install dependencies:
```bash
npm install
# or
yarn install
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
# or
yarn start
```

The app will be available at `http://localhost:3000`

## Project Structure

```
watermelon-cup/
├── public/
│   ├── WatermelonPic1.jpg
│   ├── WatermelonPic2.jpg
│   └── index.html
├── src/
│   ├── components/
│   │   ├── carousel.js
│   │   ├── countdown-timer.js
│   │   ├── footer.js
│   │   └── main-navigation.js
│   ├── pages/
│   │   ├── Home.js
│   │   ├── Login.js
│   │   ├── Register.js
│   │   ├── Teams.js
│   │   └── UpdateProfile.js
│   ├── styles/
│   │   └── globals.css
│   ├── firebase/
│   │   └── firebase.js
│   └── contexts/
│       └── authContexts/
│           └── firebaseAuth.js
└── functions/
    └── index.js
```

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
- Vercel for deployment
- All contributors who have helped improve this project
