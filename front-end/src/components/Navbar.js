import { Link, useLocation } from 'react-router-dom';
import { React } from 'react';
import '../styles/Navbar.css';

import { useAuth } from '../contexts/authContexts/firebaseAuth';

export const Navbar = () => {

    const { userLoggedIn } = useAuth();
    const location = useLocation();

    const isHomePage = location.pathname === '/';

    return (
    <div className={`navbar-container ${isHomePage ? 'transparent' : 'black'}`}>
        <nav>
            {userLoggedIn ?
            <ul className='nav-list'>
                <li className='nav-item'>
                    <Link to="/">Watermelon Cup</Link>
                </li>
                <li className='nav-item'>
                    <Link to="/teams">Teams</Link>
                </li>
                <li className='nav-item'>
                    <Link to="/standings">Standings</Link>
                </li>
                <li className='nav-item'>
                    <Link to="/matches">Matches</Link>
                </li>
                <li className='nav-item'>
                    <Link to="/settings"><button className='primary-button'>Settings</button></Link>
                </li>
            </ul>
            :
            <ul className='nav-list'>
                <li className='nav-item'>
                    <Link to="/">Watermelon Cup</Link>
                </li>
                <li className='nav-item'>
                    <Link to="/login"><button className='primary-button'>Log In</button></Link>
                </li>
                <li className='nav-item'>
                    <Link to="/signup"><button className='primary-button'>Sign Up</button></Link>
                </li>
            </ul>
            }
        </nav>
    </div>
    )
}