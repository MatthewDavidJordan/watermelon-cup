import React from 'react'
import { doSignOut } from "../firebase/auth";
import { useNavigate } from 'react-router-dom';


export function Settings() { 

  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    console.log("User is logging out");
    try {
      console.log("Signing out user");
      await doSignOut();
      console.log("User signed out successfully");
      navigate("/");
    } catch (error) {
      console.log("Error signing out user");
    }
}



  return (
    <button onClick={onSubmit}>Sign Out</button>
  )
}