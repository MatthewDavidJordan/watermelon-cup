import './styles/App.css';
import { Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Teams } from './pages/Teams';
import { Standings } from './pages/Standings';
import { Matches } from './pages/Matches';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Settings } from './pages/Settings';
import { ForgotPassword } from './pages/ForgotPassword';
import { AuthProvider } from './contexts/authContexts/firebaseAuth';
import { Signup } from './pages/Signup';
import { UpdateProfile } from './pages/UpdateProfile';

function App() {
  return (
    <AuthProvider>
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
      </Routes>
    </AuthProvider>
  );
}

export default App;
