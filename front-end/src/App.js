import './App.css';
import { Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Teams } from './pages/Teams';
import { Standings } from './pages/Standings';
import { Matches } from './pages/Matches';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Settings } from './pages/Settings';
import { AuthProvider } from './contexts/authContexts/firebaseAuth';

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
      </Routes>
    </AuthProvider>
  );
}

export default App;
