import './styles/App.css';
import { Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Teams } from './pages/Teams';
import { Standings } from './pages/Standings';
import { Matches } from './pages/Matches';
import { UploadScores } from './pages/UploadScores';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Settings } from './pages/Settings';
import { ForgotPassword } from './pages/ForgotPassword';
import { AuthProvider } from './contexts/authContexts/firebaseAuth';
import { Signup } from './pages/Signup';
import { UpdateProfile } from './pages/UpdateProfile';
import { MainNavigation } from './components/main-navigation';
import { Footer } from './components/footer';
import TeamDetail from './pages/TeamDetail';
import { Draft } from './pages/Draft';


function App() {
  return (
    <AuthProvider>
      <MainNavigation/>
      <Routes>
        <Route path="/" element={ <Home/> } />
        <Route path="/teams" element={ <Teams/> } />
        <Route path="/standings" element={<Standings/>} />
        <Route path="/matches" element={<Matches/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/settings" element={<Settings/>} />
        <Route path="/forgot-password" element={<ForgotPassword/>} />
        <Route path="/signup" element={<Signup/>} />
        <Route path="/update-profile" element={<UpdateProfile/>} />
        <Route path="/teams/:teamId/:leagueId" element={<TeamDetail/>} />
        <Route path="/upload_scores" element={<UploadScores/>} />
        <Route path="/draft" element={<Draft/>} />
      </Routes>
      <Footer/>
    </AuthProvider>
  );
}

export default App;
