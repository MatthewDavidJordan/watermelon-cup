import React, { useState , useEffect} from 'react';
import { Navbar } from '../components/Navbar'
import '../styles/Home.css';
import { Ticker } from '../components/Countdown/Ticker';

import { Fade } from "react-awesome-reveal";

import { Link } from 'react-router-dom';

import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

import { useAuth } from '../contexts/authContexts/firebaseAuth';


export const Home = () => {

    // Event date in UTC (July 10th, 2024, 10 PM UTC is equivalent to 6 PM EDT)
    const futureDate = new Date(Date.UTC(2024, 6, 10, 22, 0, 0)); // Month is 0-indexed

    const { userLoggedIn } = useAuth();

    const [registered, setRegistered] = useState(true);

    useEffect(() => {
        const checkUserRegistered = async () => {
          if (userLoggedIn && auth.currentUser) {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setRegistered(userData.registered);
            } else {
              setRegistered(false);
            }
          } else {
            // User is not logged in so don't tell them to register
            setRegistered(true);
          }
        };
      
        checkUserRegistered();
      }, [userLoggedIn]);

    

    return (
        <div className='home-layout'>
            { !registered && (
                <div className='need-to-register-container'>
                    <p>You are not registered. <Link to="/register">Register for 2024 Watermelon Cup</Link></p>
                </div>
            
            )}
            <Navbar/>
            <Fade direction="up" duration={1500}>
                <Ticker futureDate={futureDate}/>
            </Fade>
        </div>
    )
}