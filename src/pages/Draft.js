"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/authContexts/firebaseAuth';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import '../styles/Draft.css';

export function Draft() {
  // Get current user from auth context
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draftState, setDraftState] = useState(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [isRegisteredFor2025, setIsRegisteredFor2025] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [captains, setCaptains] = useState([]);
  const [captainCount, setCaptainCount] = useState(0);
  const [maxCaptains, setMaxCaptains] = useState(6);
  const [canBecomeCaptain, setCanBecomeCaptain] = useState(true);
  const [isCaptain, setIsCaptain] = useState(false);
  const [becomingCaptain, setBecomingCaptain] = useState(false);
  const stompClient = useRef(null);
  const timerRef = useRef(null);

  // Define addMessage function first since other functions depend on it
  const addMessage = React.useCallback((message) => {
    setMessages((prevMessages) => [
      `${new Date().toLocaleTimeString()}: ${message}`,
      ...prevMessages
    ]);
  }, []);

  // Check if user is logged in and registered for 2025
  useEffect(() => {
    if (!userLoggedIn || !currentUser) {
      navigate('/login');
      return;
    }

    // Check if user is registered for 2025
    const checkRegistrationStatus = async () => {
      try {
        setIsCheckingRegistration(true);
        // Use auth.currentUser.uid as the document ID, matching the homepage approach
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Check registered2025 field, matching how the homepage does it
          const registered2025 = userData.registered2025 === true;
          setIsRegisteredFor2025(registered2025);
          
          if (!registered2025) {
            // User is not registered for 2025, redirect to homepage
            addMessage('You are not registered for the 2025 season. Redirecting to registration page...');
            setTimeout(() => navigate('/register'), 3000); // Redirect to registration page after 3 seconds
          } else {
            addMessage('Registration verified for 2025 season');
          }
        } else {
          // User document doesn't exist, redirect to registration page
          addMessage('User profile not found. Redirecting to registration page...');
          setTimeout(() => navigate('/register'), 3000);
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
        addMessage('Error checking registration status. Please try again later.');
      } finally {
        setIsCheckingRegistration(false);
      }
    };

    checkRegistrationStatus();
  }, [currentUser, userLoggedIn, navigate, addMessage]);
  
  // Define disconnectWebSocket before connectWebSocket since connectWebSocket depends on it
  const disconnectWebSocket = React.useCallback(() => {
    if (stompClient.current && stompClient.current.connected) {
      stompClient.current.deactivate();
      setConnected(false);
      setConnectedUsers([]); // Clear connected users list when disconnected
      addMessage('Disconnected from WebSocket server');
    }
    setShowDisconnectConfirm(false);
  }, [addMessage]);
  
  // Define connectWebSocket after its dependencies
  const connectWebSocket = React.useCallback(() => {
    // If already connected, don't create a new connection
    if (stompClient.current && stompClient.current.connected) {
      addMessage('Already connected to WebSocket server');
      return;
    }
    
    // If there's a client that's disconnected or in the process of connecting, deactivate it
    if (stompClient.current) {
      try {
        stompClient.current.deactivate();
      } catch (e) {
        console.error('Error deactivating existing client:', e);
      }
      stompClient.current = null;
    }
    
    // Add a log message
    addMessage('Connecting to WebSocket server...');

    // Create a new STOMP client
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/draft-ws'),
      debug: str => {
        // Only log important messages to reduce console noise
        if (str.includes('Connected') || str.includes('Error') || str.includes('Lost')) {
          console.log(str);
        }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    // Set up connect callback
    client.onConnect = (frame) => {
      setConnected(true);
      addMessage('Connected to WebSocket server!');

      // Subscribe to draft updates
      client.subscribe('/topic/draft', (message) => {
        const payload = JSON.parse(message.body);
        setDraftState(payload);
        addMessage('Received draft state update');
      });
      
      // Subscribe to connected users updates
      client.subscribe('/topic/connected-users', (message) => {
        const payload = JSON.parse(message.body);
        // Filter out any duplicate users before setting state
        const uniqueUsers = Array.from(new Set(payload.users || []));
        setConnectedUsers(uniqueUsers);
        addMessage(`Connected users updated: ${payload.count} users online`);
      });
      
      // Subscribe to authentication response
      client.subscribe('/topic/auth-response', (message) => {
        const userInfo = JSON.parse(message.body);
        addMessage(`Received user info: ${userInfo.firstName} ${userInfo.lastName}`);
      });
      
      // Subscribe to captain updates
      client.subscribe('/topic/captains', (message) => {
        const payload = JSON.parse(message.body);
        setCaptains(payload.captains || []);
        setCaptainCount(payload.count || 0);
        setMaxCaptains(payload.maxCaptains || 6);
        setCanBecomeCaptain(payload.canBecomeCaptain || false);
        
        // Check if current user is a captain
        if (currentUser && payload.captains) {
          const isUserCaptain = payload.captains.some(captain => 
            captain.userId === currentUser.uid
          );
          setIsCaptain(isUserCaptain);
        }
        
        addMessage(`Captain update: ${payload.count}/${payload.maxCaptains} captains registered`);
      });
      
      // Subscribe to captain response
      client.subscribe('/topic/captain-response', (message) => {
        const response = JSON.parse(message.body);
        setBecomingCaptain(false);
        
        if (response.success) {
          setIsCaptain(true);
          addMessage(`Captain registration successful: ${response.message}`);
        } else {
          addMessage(`Captain registration failed: ${response.message}`);
        }
      });

      // Send user authentication information to the server
      if (currentUser) {
        // Store the current user's email in a session variable
        // This will be used to identify the current user in the connected users list
        window.sessionStorage.setItem('currentUserEmail', currentUser.email);
        
        client.publish({
          destination: '/app/auth',
          body: JSON.stringify({
            email: currentUser.email,
            uid: currentUser.uid,
            firstName: currentUser.displayName ? currentUser.displayName.split(' ')[0] : '',
            lastName: currentUser.displayName ? currentUser.displayName.split(' ').slice(1).join(' ') : ''
          }),
        });
        addMessage(`Sent authentication info for ${currentUser.email}`);
      }
      
      // Send a heartbeat to get initial state
      client.publish({
        destination: '/app/heartbeat',
        body: JSON.stringify({}),
      });
      
      // Request captain status
      client.publish({
        destination: '/app/captain-status',
        body: JSON.stringify({}),
      });
    };

    // Set up error callback
    client.onStompError = (frame) => {
      addMessage(`Error: ${frame.headers['message']}`);
      setConnected(false);
    };

    // Set up WebSocket closed callback
    client.onWebSocketClose = () => {
      addMessage('WebSocket connection closed');
      setConnected(false);
      setConnectedUsers([]); // Clear connected users list when connection is closed
    };

    // Activate the client
    client.activate();
    stompClient.current = client;
  }, [addMessage, setConnected, setDraftState, currentUser]);
  
  // Now we can use the useEffect 
  useEffect(() => {
    // Connect to WebSocket server when component mounts
    // Only if the user is registered for 2025 and not checking registration
    if (!isCheckingRegistration && isRegisteredFor2025) {
      connectWebSocket();
    }

    // Cleanup on unmount
    return () => {
      if (stompClient.current) {
        try {
          stompClient.current.deactivate();
          addMessage('WebSocket connection closed due to component unmount');
        } catch (e) {
          console.error('Error during cleanup:', e);
        }
        stompClient.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [connectWebSocket, isCheckingRegistration, isRegisteredFor2025, addMessage]); 
  
  // Function to update the time left - using useCallback to memoize the function
  const updateTimeLeft = React.useCallback(() => {
    if (!draftState || !draftState.pickExpiresAt) {
      setTimeLeft(null);
      return;
    }
    
    const expiryTime = new Date(draftState.pickExpiresAt).getTime();
    const now = new Date().getTime();
    const difference = expiryTime - now;
    
    if (difference <= 0) {
      setTimeLeft('Expired');
      // Clear the interval if time has expired
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } else {
      // Format the time left as MM:SS
      const seconds = Math.floor((difference / 1000) % 60);
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }
  }, [draftState, timerRef]); // Add dependencies for the callback
  
  // Effect to update the countdown timer
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // If we have a draft state with an expiration time, start the countdown
    if (draftState && draftState.pickExpiresAt) {
      // Update the timer immediately
      updateTimeLeft();
      
      // Then update it every second
      timerRef.current = setInterval(updateTimeLeft, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [draftState, updateTimeLeft]); // Add updateTimeLeft to dependency array

  const sendHeartbeat = React.useCallback(() => {
    if (stompClient.current && stompClient.current.connected) {
      stompClient.current.publish({
        destination: '/app/heartbeat',
        body: JSON.stringify({}),
      });
      addMessage('Sent heartbeat request');
    } else {
      addMessage('Not connected to server');
    }
  }, [addMessage]);
  
  // Function to become a captain
  const becomeCaptain = React.useCallback(() => {
    if (stompClient.current && stompClient.current.connected && currentUser) {
      setBecomingCaptain(true);
      addMessage('Sending request to become a captain...');
      
      stompClient.current.publish({
        destination: '/app/become-captain',
        body: JSON.stringify({
          email: currentUser.email,
          uid: currentUser.uid,
          firstName: currentUser.displayName ? currentUser.displayName.split(' ')[0] : '',
          lastName: currentUser.displayName ? currentUser.displayName.split(' ').slice(1).join(' ') : ''
        }),
      });
    } else {
      addMessage('Not connected to server or not logged in');
    }
  }, [addMessage, currentUser]);

  // Helper function to get initials from name
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  // If checking registration status, show loading UI
  if (isCheckingRegistration) {
    return (
      <div className="draft-page">
        <div className="draft-container">
          <div className="draft-header">
            <h1 className="draft-title">Watermelon Cup Draft</h1>
          </div>
          <div className="draft-section">
            <div className="section-header">
              <h2 className="section-title">Checking Registration</h2>
            </div>
            <div className="section-content">
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Checking registration status...</p>
              </div>
            </div>
          </div>
          <div className="draft-section">
            <div className="section-header">
              <h2 className="section-title">Connection Log</h2>
            </div>
            <div className="section-content">
              <div className="log-container">
                {messages.map((msg, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-message">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // If not registered for 2025, show a message
  if (!isRegisteredFor2025) {
    return (
      <div className="draft-page">
        <div className="draft-container">
          <div className="draft-header">
            <h1 className="draft-title">Watermelon Cup Draft</h1>
          </div>
          <div className="draft-section">
            <div className="section-header">
              <h2 className="section-title">Not Registered</h2>
            </div>
            <div className="section-content">
              <div className="not-registered">
                <h3>Not Registered for 2025</h3>
                <p>You need to be registered for the 2025 season to access the draft.</p>
                <p>Redirecting to homepage...</p>
              </div>
            </div>
          </div>
          <div className="draft-section">
            <div className="section-header">
              <h2 className="section-title">Connection Log</h2>
            </div>
            <div className="section-content">
              <div className="log-container">
                {messages.map((msg, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-message">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If registered for 2025, show the draft UI
  return (
    <div className="draft-page">
      <div className="draft-container">
        {/* Page header */}
        <div className="draft-header">
          <h1 className="draft-title">Watermelon Cup Draft</h1>
          <div className="status-indicator">
            <span className="status-label">Status:</span>
            <span className={`status-value ${connected ? 'connected' : 'disconnected'}`}>
              <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></span>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Connected users section */}
        <div className="draft-section">
          <div className="section-header">
            <h2 className="section-title">
              Connected Users
              <span className="section-count">{connected ? connectedUsers.length : 0}</span>
            </h2>
          </div>
          <div className="section-content">
            <div className="connected-users">
              {connected && connectedUsers.length > 0 ? (
                // Use a Set to ensure we only render each unique user once
                [...new Set(connectedUsers)].map((user, index) => {
                  // Skip displaying if the user is anonymous
                  if (user === 'anonymous') return null;
                  
                  // Get the current user's email from session storage
                  const currentUserEmail = window.sessionStorage.getItem('currentUserEmail');
                  
                  // Check if this user is the current user
                  const isCurrentUser = 
                    currentUserEmail && (
                      user.includes(currentUserEmail) || 
                      (currentUserEmail.includes('@') && user.includes(currentUserEmail.split('@')[0]))
                    );
                  
                  return (
                    <div key={index} className="user-pill">
                      <div className="user-avatar">{getInitials(user)}</div>
                      <span>{user} {isCurrentUser && '(You)'}</span>
                    </div>
                  );
                })
              ) : (
                <div className="no-users">{connected ? 'No other users connected' : 'Not connected to server'}</div>
              )}
            </div>
            <div className="connection-controls">
              <button 
                className="control-button button-connect"
                onClick={connectWebSocket} 
                disabled={connected}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14"></path>
                  <path d="M12 5v14"></path>
                </svg>
                Connect
              </button>
              <button 
                className="control-button button-heartbeat"
                onClick={sendHeartbeat} 
                disabled={!connected}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                </svg>
                Send Heartbeat
              </button>
              <button 
                className="control-button button-disconnect"
                onClick={() => setShowDisconnectConfirm(true)} 
                disabled={!connected}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
                Disconnect
              </button>
            </div>
          </div>
        </div>
        
        {/* Team captains section */}
        <div className="draft-section">
          <div className="section-header">
            <h2 className="section-title">
              Team Captains
              <span className="section-count">{captainCount}/{maxCaptains}</span>
            </h2>
          </div>
          <div className="section-content">
            {connected ? (
              <>
                <div className="captains-grid">
                  {captains.length > 0 ? (
                    captains.map((captain, index) => (
                      <div key={index} className={`captain-card ${captain.active ? 'captain-active' : 'captain-inactive'}`}>
                        <div className="captain-avatar">{getInitials(`${captain.firstName} ${captain.lastName}`)}</div>
                        <div className="captain-info">
                          <div className="captain-name">{captain.firstName} {captain.lastName}</div>
                          <div className="team-name">{captain.teamName}</div>
                          <div className="captain-status-indicator">
                            {captain.active ? (
                              <span className="status-badge status-online">Online</span>
                            ) : (
                              <span className="status-badge status-offline">Offline</span>
                            )}
                          </div>
                        </div>
                        {currentUser && captain.userId === currentUser.uid && (
                          <div className="captain-badge">You</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="no-captains">No captains registered yet</div>
                  )}
                </div>
                
                <div className="captain-controls">
                  <button 
                    className="control-button button-captain"
                    onClick={becomeCaptain} 
                    disabled={!connected || isCaptain || !canBecomeCaptain || becomingCaptain || captainCount >= maxCaptains}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"></path>
                    </svg>
                    {becomingCaptain ? 'Registering...' : isCaptain ? 'You are a Captain' : 'Be a Captain'}
                  </button>
                  
                  <div className="captain-status">
                    {isCaptain ? (
                      <span className="status-badge status-captain">You are a team captain</span>
                    ) : captainCount >= maxCaptains ? (
                      <span className="status-badge status-full">All captain spots filled</span>
                    ) : (
                      <span className="status-badge status-available">{maxCaptains - captainCount} captain spots available</span>
                    )}
                  </div>
                </div>
                
                {captainCount < maxCaptains && (
                  <div className="waiting-message">
                    <p>Waiting for {maxCaptains - captainCount} more captains to join before the draft can start.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="not-connected">Connect to the server to see team captains</div>
            )}
          </div>
        </div>

        {/* Draft state section */}
        <div className="draft-section">
          <div className="section-header">
            <h2 className="section-title">Draft State</h2>
          </div>
          <div className="section-content">
            {draftState && draftState.draftStarted ? (
              <div className="draft-state-grid">
                <div className="state-item">
                  <span className="state-label">Current Captain:</span>
                  <span className="state-value captain-highlight">{draftState.currentCaptain}</span>
                </div>
                <div className="state-item">
                  <span className="state-label">Next Captain:</span>
                  <span className="state-value">{draftState.nextCaptain}</span>
                </div>
                <div className="state-item">
                  <span className="state-label">Pick Expires At:</span>
                  <span className="state-value timer-value">
                    {new Date(draftState.pickExpiresAt).toLocaleTimeString()}
                    {timeLeft && (
                      <span className={`timer-countdown ${timeLeft === 'Expired' ? 'expired' : ''}`}>
                        {timeLeft === 'Expired' ? '(Expired)' : `(${timeLeft} remaining)`}
                      </span>
                    )}
                  </span>
                </div>
                <div className="state-item">
                  <span className="state-label">Last Pick:</span>
                  <span className="state-value">
                    {draftState.lastPick ? `${draftState.lastPick.firstName} ${draftState.lastPick.lastName}` : 'None'}
                  </span>
                </div>
              </div>
            ) : draftState ? (
              <div className="draft-not-started">
                <h3>Draft Not Started Yet</h3>
                <p>The draft will start once all {maxCaptains} team captains have joined.</p>
                <p>Current status: {captainCount}/{maxCaptains} captains registered</p>
              </div>
            ) : (
              <p>No draft state received yet</p>
            )}
          </div>
        </div>

        {/* Available players section */}
        <div className="draft-section">
          <div className="section-header">
            <h2 className="section-title">
              Available Players
              <span className="section-count">
                {draftState && draftState.availablePool ? draftState.availablePool.length : 0}
              </span>
            </h2>
          </div>
          <div className="section-content">
            {draftState && draftState.draftStarted && draftState.availablePool && draftState.availablePool.length > 0 ? (
              <div className="players-grid">
                {draftState.availablePool.map(player => (
                  <div key={player.id} className="player-card">
                    <div className="player-header">
                      <div className="player-name">{player.firstName} {player.lastName}</div>
                      <div className="player-nickname">"{player.nickname || player.firstName}"</div>
                    </div>
                    <div className="player-attributes">
                      {player.position && (
                        <span className="attribute-tag tag-position">{player.position}</span>
                      )}
                      {player.clubTeam && (
                        <span className="attribute-tag tag-team">{player.clubTeam}</span>
                      )}
                      {player.footPref && (
                        <span className="attribute-tag tag-foot">
                          {player.footPref === 'left' ? 'Left-footed' : 'Right-footed'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : draftState && draftState.draftStarted ? (
              <p>No available players</p>
            ) : (
              <p>Players will be available when the draft starts</p>
            )}
          </div>
        </div>

        {/* Teams section */}
        <div className="draft-section">
          <div className="section-header">
            <h2 className="section-title">Teams</h2>
          </div>
          <div className="section-content">
            {draftState && draftState.draftStarted && draftState.teams ? (
              Object.entries(draftState.teams).map(([captainId, players]) => {
                // Find the captain name from the captains list
                const captain = draftState.captains ? draftState.captains.find(c => c.userId === captainId) : null;
                const teamName = captain ? captain.teamName : `Team ${captainId}`;
                
                return (
                <div key={captainId} className="team-container">
                  <div className="team-header">
                    <h3 className="team-name">{teamName}</h3>
                    <span className="team-count">{players.length} players</span>
                  </div>
                  <div className="players-grid">
                    {players.map(player => (
                      <div key={player.id} className="player-card">
                        <div className="player-header">
                          <div className="player-name">{player.firstName} {player.lastName}</div>
                          <div className="player-nickname">"{player.nickname || player.firstName}"</div>
                        </div>
                        <div className="player-attributes">
                          {player.position && (
                            <span className="attribute-tag tag-position">{player.position}</span>
                          )}
                          {player.clubTeam && (
                            <span className="attribute-tag tag-team">{player.clubTeam}</span>
                          )}
                          {player.footPref && (
                            <span className="attribute-tag tag-foot">
                              {player.footPref === 'left' ? 'Left-footed' : 'Right-footed'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
              })
            ) : draftState && draftState.draftStarted ? (
              <p>No teams available</p>
            ) : (
              <p>Teams will be created when the draft starts</p>
            )}
          </div>
        </div>

        {/* Connection log toggle button */}
        <button 
          className="toggle-log-button" 
          onClick={() => setShowLogs(!showLogs)}
        >
          {showLogs ? "Hide Connection Log" : "Show Connection Log"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {showLogs ? <path d="m18 15-6-6-6 6" /> : <path d="m6 9 6 6 6-6" />}
          </svg>
        </button>
        
        {/* Connection log section - toggleable */}
        {showLogs && (
          <div className="draft-section">
            <div className="section-header">
              <h2 className="section-title">Connection Log</h2>
            </div>
            <div className="section-content">
              <div className="log-container">
                {messages.map((msg, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-message">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Popup for Disconnect Confirmation */}
        {showDisconnectConfirm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Confirm Disconnection</h3>
              <p>Are you sure you want to disconnect from the draft server?</p>
              <div className="modal-actions">
                <button onClick={disconnectWebSocket} className="confirm-yes">Yes, Disconnect</button>
                <button onClick={() => setShowDisconnectConfirm(false)} className="confirm-no">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Draft;
