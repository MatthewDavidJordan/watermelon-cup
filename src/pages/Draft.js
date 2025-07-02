"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/authContexts/firebaseAuth';
import { useNavigate } from 'react-router-dom';

import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import PlayerCard from '../components/PlayerCard';
import ToggleSwitch from '../components/ToggleSwitch';
import '../styles/Draft.css';

const POSITION_MAP = {
  "Goalkeeper": "GK",
  "Center Back": "CB",
  "Right Back": "RB",
  "Left Back": "LB",
  "Defensive Mid": "DM",
  "Center Mid": "CM",
  "Attacking Mid": "AM",
  "Right Wing": "RW",
  "Left Wing": "LW",
  "Striker": "ST"
};

const POSITION_DISPLAY_OPTIONS = Object.keys(POSITION_MAP);

const RARITY_SORT_MAP = {
  "Bronze": 1,
  "Silver": 2,
  "Gold": 3
};

// Helper function to determine player rarity string based on graduation year
const getPlayerRarityByGradYear = (graduationYear) => {
  if (!graduationYear) return "Bronze"; // Default for missing grad year, or handle as needed
  const currentYear = new Date().getFullYear();
  const yearsUntilGraduation = graduationYear - currentYear;

  if (yearsUntilGraduation >= 2) {
    return "Bronze"; // Younger players (e.g., Freshmen/Sophomores if current year is 2025, grad 2027+)
  } else if (yearsUntilGraduation === 1) {
    return "Silver"; // Next year's graduates (e.g., Juniors if current year is 2025, grad 2026)
  } else {
    return "Gold";   // Current year graduates or older (e.g., Seniors if current year is 2025, grad 2025 or earlier)
  }
};

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
  const [activeTeamTab, setActiveTeamTab] = useState(0); // For team tabs
  const [selectedPlayer, setSelectedPlayer] = useState(null); // For player selection
  const [makingPick, setMakingPick] = useState(false); // For pick in progress
  const [autoDraftEnabled, setAutoDraftEnabled] = useState(false); // For autodraft toggle - off by default

  // Filters State
  const [filterOptions, setFilterOptions] = useState({ positions: POSITION_DISPLAY_OPTIONS, feet: [] });
  const [selectedFilters, setSelectedFilters] = useState({
    positions: new Set(), // Stores abbreviations (e.g., 'GK', 'CB')
    feet: new Set()
  });
  const [raritySortOrder, setRaritySortOrder] = useState('none'); // 'none', 'descending', 'ascending'
  const [filteredAvailablePlayers, setFilteredAvailablePlayers] = useState([]);
  const [showPositionFilterDropdown, setShowPositionFilterDropdown] = useState(false);
  const [showFootFilterDropdown, setShowFootFilterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const positionFilterDropdownContainerRef = useRef(null);
  const footFilterDropdownContainerRef = useRef(null);

  
  // We'll get available players and teams from the server via WebSocket
  
  const stompClient = useRef(null);
  const timerRef = useRef(null);

  // Define addMessage function first since other functions depend on it
  const addMessage = React.useCallback((message) => {
    setMessages((prevMessages) => [
      `${new Date().toLocaleTimeString()}: ${message}`,
      ...prevMessages
    ]);
  }, []);

  // Effect to extract dynamic filter options (foot preference)
  useEffect(() => {
    if (draftState && draftState.availablePool) {
      const allFeet = new Set();
      draftState.availablePool.forEach(player => {
        const footPref = player.foot || player.footPref;
        if (footPref) {
          allFeet.add(footPref);
        }
      });
      // Keep existing positions, only update feet
      setFilterOptions(prevOptions => ({
        ...prevOptions,
        feet: Array.from(allFeet).sort()
      }));
    }
  }, [draftState, draftState?.availablePool]);

  // Effect to check if user is a captain and handle autodraft preferences
  React.useEffect(() => {
    if (draftState && draftState.captains && currentUser) {
      // Check if the current user is one of the captains
      const userIsCaptain = draftState.captains.some(captain => captain.userId === currentUser.uid);
      setIsCaptain(userIsCaptain);
      
      // If user is a captain, check for autodraft preference in server state
      if (userIsCaptain && draftState.autoDraftPreferences) {
        const serverAutoDraftSetting = draftState.autoDraftPreferences[currentUser.uid];
        if (serverAutoDraftSetting !== undefined) {
          setAutoDraftEnabled(serverAutoDraftSetting);
        }
      }
    }
  }, [draftState, currentUser]);

  // Effect to apply filters, search, and sorting
  useEffect(() => {
    let players = draftState?.availablePool ? [...draftState.availablePool] : []; // Create a shallow copy to sort safely

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      players = players.filter(p => {
        const firstName = (p.firstName || '').toLowerCase();
        const lastName = (p.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        const nickname = (p.nickname || '').toLowerCase();
        
        return firstName.includes(query) || 
               lastName.includes(query) || 
               fullName.includes(query) || 
               nickname.includes(query);
      });
    }

    // Apply position filters (uses abbreviations)
    if (selectedFilters.positions.size > 0) {
      players = players.filter(p => {
        const playerPositionsAbbr = (p.positions || (p.position ? [p.position] : [])).map(posFull => POSITION_MAP[posFull] || posFull);
        return playerPositionsAbbr.some(abbr => selectedFilters.positions.has(abbr));
      });
    }

    // Apply foot preference filters
    if (selectedFilters.feet.size > 0) {
      players = players.filter(p => {
        const footPref = p.foot || p.footPref; // Assuming 'footPref' as a fallback, adjust if only 'foot'
        return footPref && selectedFilters.feet.has(footPref);
      });
    }

    // Apply rarity sort order
    if (raritySortOrder === "descending") {
      players.sort((a, b) => {
        const rarityA = getPlayerRarityByGradYear(a.graduationYear);
        const rarityB = getPlayerRarityByGradYear(b.graduationYear);
        return (RARITY_SORT_MAP[rarityB] || 0) - (RARITY_SORT_MAP[rarityA] || 0);
      });
    } else if (raritySortOrder === "ascending") {
      players.sort((a, b) => {
        const rarityA = getPlayerRarityByGradYear(a.graduationYear);
        const rarityB = getPlayerRarityByGradYear(b.graduationYear);
        return (RARITY_SORT_MAP[rarityA] || 0) - (RARITY_SORT_MAP[rarityB] || 0);
      });
    }
    // If raritySortOrder is 'none', players remain in the order they were after filtering (or original order if no prior sort).

    console.log('[Draft] Sorting Effect - Rarity Sort Order:', raritySortOrder);
    if (draftState?.availablePool && draftState.availablePool.length > 0) {
      console.log('[Draft] Sorting Effect - First 3 players from availablePool (raw):', draftState.availablePool.slice(0, 3).map(p => ({ id: p.id, gradYear: p.graduationYear, name: p.firstName })));
    }

    let playersToLog = players.slice(0, 5).map(p => ({ id: p.id, gradYear: p.graduationYear, calculatedRarity: getPlayerRarityByGradYear(p.graduationYear), name: p.firstName }));
    console.log('[Draft] Sorting Effect - Players before rarity sort (first 5):', playersToLog);

    // Apply rarity sort order
    if (raritySortOrder === "descending") {
      players.sort((a, b) => (RARITY_SORT_MAP[b.rarity] || 0) - (RARITY_SORT_MAP[a.rarity] || 0));
    } else if (raritySortOrder === "ascending") {
      players.sort((a, b) => (RARITY_SORT_MAP[a.rarity] || 0) - (RARITY_SORT_MAP[b.rarity] || 0));
    }

    let sortedPlayersToLog = players.slice(0, 5).map(p => ({ id: p.id, gradYear: p.graduationYear, calculatedRarity: getPlayerRarityByGradYear(p.graduationYear), name: p.firstName }));
    console.log('[Draft] Sorting Effect - Players after rarity sort (first 5):', sortedPlayersToLog);

    setFilteredAvailablePlayers(players);
  }, [draftState?.availablePool, selectedFilters, raritySortOrder, searchQuery]);
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Effect to handle clicks outside of dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        positionFilterDropdownContainerRef.current &&
        !positionFilterDropdownContainerRef.current.contains(event.target)
      ) {
        setShowPositionFilterDropdown(false);
      }
      if (
        footFilterDropdownContainerRef.current &&
        !footFilterDropdownContainerRef.current.contains(event.target)
      ) {
        setShowFootFilterDropdown(false);
      }
    };

    if (showPositionFilterDropdown || showFootFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPositionFilterDropdown, showFootFilterDropdown]);

  // Handlers for filter changes
  const handlePositionFilterChange = (positionDisplayName) => {
    const positionAbbr = POSITION_MAP[positionDisplayName];
    setSelectedFilters(prev => {
      const newSet = new Set(prev.positions);
      if (newSet.has(positionAbbr)) {
        newSet.delete(positionAbbr);
      } else {
        newSet.add(positionAbbr);
      }
      return { ...prev, positions: newSet };
    });
  };

  const handleFootFilterChange = (footValue) => {
    setSelectedFilters(prev => {
      const newSet = new Set(prev.feet);
      if (newSet.has(footValue)) {
        newSet.delete(footValue);
      } else {
        newSet.add(footValue);
      }
      return { ...prev, feet: newSet };
    });
  };

  const handleRaritySortChange = (e) => {
    const newSortOrder = e.target.value;
    console.log('[Draft] Rarity sort changed to:', newSortOrder);
    setRaritySortOrder(newSortOrder);
  };

  const togglePositionFilterDropdown = () => setShowPositionFilterDropdown(!showPositionFilterDropdown);
  const toggleFootFilterDropdown = () => setShowFootFilterDropdown(!showFootFilterDropdown);

  const handleClearFilters = () => {
    setSelectedFilters({ positions: new Set(), feet: new Set() });
    setRaritySortOrder('none');
    setSearchQuery('');
    // Optionally close dropdowns if they are open
    setShowPositionFilterDropdown(false);
    setShowFootFilterDropdown(false);
  };

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
        addMessage('Verifying your registration for the 2025 season...');
        
        // Use auth.currentUser.uid as the document ID
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          // User document doesn't exist, redirect to registration page
          addMessage('User profile not found. Please complete your registration for the 2025 season.');
          setTimeout(() => navigate('/register'), 3000);
          return;
        }
        
        const userData = userDoc.data();
        const registered2025 = userData.registered2025 === true;
        setIsRegisteredFor2025(registered2025);
        
        if (!registered2025) {
          // User is not registered for 2025, show message and redirect
          addMessage('You need to register for the 2025 season to access the draft.');
          addMessage('Redirecting to registration page...');
          setTimeout(() => navigate('/register'), 3000);
        } else {
          addMessage('✅ Registration verified for 2025 season');
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
        addMessage('❌ Error checking registration status. Please try again later.');
        // Don't redirect on error, let the user see the error message
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
      webSocketFactory: () => new SockJS('https://draftengine.watermeloncup.com/draft-ws'),
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
        
        // Check if we're a captain and update autodraft status from server
        if (currentUser && payload.autoDraftPreferences) {
          const serverAutoDraftSetting = payload.autoDraftPreferences[currentUser.uid];
          if (serverAutoDraftSetting !== undefined) {
            setAutoDraftEnabled(serverAutoDraftSetting);
          } else {
            // Autodraft preference is now managed by the server
          }
        }
        
        addMessage('Received draft state update with ' + 
          (payload.availablePool ? payload.availablePool.length : 0) + ' available players');
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
      
      // Send a heartbeat to get initial state including available players
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


  
  // Function to become a captain
  const becomeCaptain = React.useCallback(() => {
    if (stompClient.current && stompClient.current.connected && currentUser) {
      setBecomingCaptain(true);
      addMessage('Sending request to become a captain...');
      
      // Send only the essential user identification information
      // The backend will handle retrieving the proper name from Firebase
      stompClient.current.publish({
        destination: '/app/become-captain',
        body: JSON.stringify({
          email: currentUser.email,
          uid: currentUser.uid
          // No need to send firstName/lastName as the backend will retrieve them from Firebase
        }),
      });
    } else {
      addMessage('Not connected to server or not logged in');
    }
  }, [addMessage, currentUser]);
  
  // Toggle autodraft functionality
  const toggleAutoDraft = React.useCallback(() => {
    if (stompClient.current && stompClient.current.connected && currentUser) {
      const newState = !autoDraftEnabled;
      // Send autodraft preference to server
      stompClient.current.publish({
        destination: '/app/set-autodraft',
        body: JSON.stringify({
          captainId: currentUser.uid,
          autoDraftEnabled: newState
        }),
      });
      addMessage(`Autodraft ${newState ? 'enabled' : 'disabled'}`);
    }
  }, [addMessage, currentUser, autoDraftEnabled]);

  // Function to make a draft pick
  const makePick = React.useCallback(() => {
    if (!selectedPlayer) {
      addMessage('Please select a player first');
      return;
    }
    
    if (!draftState || !draftState.draftStarted) {
      addMessage('Draft has not started yet');
      return;
    }
    
    if (!currentUser) {
      addMessage('You must be logged in to make a pick');
      return;
    }
    
    // Check if it's this user's turn
    if (currentUser.uid !== draftState.currentCaptainId) {
      addMessage(`It's not your turn to pick. Current captain is ${draftState.currentCaptain}`);
      return;
    }
    
    if (stompClient.current && stompClient.current.connected) {
      setMakingPick(true);
      addMessage(`Sending pick: ${selectedPlayer.firstName} ${selectedPlayer.lastName}`);
      
      stompClient.current.publish({
        destination: '/app/make-pick',
        body: JSON.stringify({
          captainId: currentUser.uid,
          playerId: selectedPlayer.id
        }),
      });
      
      // Clear selection after pick is made
      setTimeout(() => {
        setSelectedPlayer(null);
        setMakingPick(false);
      }, 1000);
    } else {
      addMessage('Not connected to server');
      setMakingPick(false);
    }
  }, [addMessage, currentUser, draftState, selectedPlayer]);
  
  // Function to handle player selection
  const handlePlayerSelect = React.useCallback((player) => {
    // Toggle selection if clicking the same player
    if (selectedPlayer && selectedPlayer.id === player.id) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(player);
      addMessage(`Selected player: ${player.firstName} ${player.lastName}`);
    }
  }, [selectedPlayer, addMessage]);

  // Helper function to get initials from full name string
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
                  <span className="state-value captain-highlight">
                    {draftState.captains && draftState.currentCaptainId ? 
                      (() => {
                        const captain = draftState.captains.find(c => c.userId === draftState.currentCaptainId);
                        return captain ? `${captain.firstName} ${captain.lastName}` : draftState.currentCaptainId;
                      })() : 
                      draftState.currentCaptain}
                  </span>
                </div>
                <div className="state-item">
                  <span className="state-label">Next Captain:</span>
                  <span className="state-value">
                    {draftState.captains && draftState.nextCaptainId ? 
                      (() => {
                        const captain = draftState.captains.find(c => c.userId === draftState.nextCaptainId);
                        return captain ? `${captain.firstName} ${captain.lastName}` : draftState.nextCaptainId;
                      })() : 
                      draftState.nextCaptain}
                  </span>
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
            <h2 className="section-title header-title-custom">
              Available Players
              <span className="section-count header-count-custom">
                {filteredAvailablePlayers ? filteredAvailablePlayers.length : 0}
              </span>
            </h2>
            <div className="filter-controls-inline">
              {/* Search Bar */}
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search by name or nickname..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="search-input"
                />
                {searchQuery && (
                  <button 
                    className="search-clear-button" 
                    onClick={() => setSearchQuery('')}
                  >
                    ×
                  </button>
                )}
              </div>
              
              {/* Position Filter Dropdown */}
              <div className="filter-dropdown-container" ref={positionFilterDropdownContainerRef}>
                <button onClick={togglePositionFilterDropdown} className="control-button filter-button position-toggle has-dropdown-arrow">
                  Positions
                </button>
                {showPositionFilterDropdown && (
                  <div className="filter-dropdown-content position-dropdown-content">
                    {filterOptions.positions.map(posName => (
                      <label key={posName} className="filter-dropdown-label">
                        <input
                          type="checkbox"
                          className="filter-dropdown-checkbox"
                          checked={selectedFilters.positions.has(POSITION_MAP[posName])}
                          onChange={(e) => {
                            e.stopPropagation(); // Prevent dropdown from closing
                            handlePositionFilterChange(posName);
                          }}
                        />
                        <span>{posName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Foot Preference Filter Dropdown */}
              {filterOptions.feet.length > 0 && (
                <div className="filter-dropdown-container" ref={footFilterDropdownContainerRef}>
                  <button onClick={toggleFootFilterDropdown} className="control-button filter-button foot-toggle has-dropdown-arrow">
                    Foot
                  </button>
                  {showFootFilterDropdown && (
                    <div className="filter-dropdown-content foot-dropdown-content">
                      {filterOptions.feet.map(foot => (
                        <label key={foot} className="filter-dropdown-label">
                          <input
                            type="checkbox"
                            className="filter-dropdown-checkbox"
                            checked={selectedFilters.feet.has(foot)}
                            onChange={(e) => {
                              e.stopPropagation(); // Add stopPropagation for consistency
                              handleFootFilterChange(foot);
                            }}
                          /> 
                          <span>{foot}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Rarity Sort Dropdown */}
              <select value={raritySortOrder} onChange={handleRaritySortChange} className="control-button filter-select-custom has-dropdown-arrow">
                <option value="none">Sort by Rarity</option>
                <option value="descending">Descending</option>
                <option value="ascending">Ascending</option>
              </select>
              <button onClick={handleClearFilters} className="control-button clear-filters-button-custom">
                Clear Filters
              </button>
            </div>
          </div>
          {draftState && draftState.draftStarted && (
            <div className="draft-action-bar">
              <div className="draft-action-bar-content">
                <div className="draft-action-status">
                  {currentUser && draftState.currentCaptainId === currentUser.uid ? (
                    <div className="pick-status your-turn">It's your turn to pick!</div>
                  ) : (
                    <div className="pick-status waiting">{`Waiting for ${draftState.currentCaptain} to pick`}</div>
                  )}
                </div>
                
                <div className="draft-action-controls">
                  <button 
                    className={`make-pick-button ${currentUser && draftState.currentCaptainId === currentUser.uid ? 'active' : 'disabled'}`}
                    onClick={makePick}
                    disabled={!currentUser || draftState.currentCaptainId !== currentUser.uid || makingPick || !selectedPlayer}
                  >
                    {makingPick ? (
                      <>
                        <div className="button-spinner"></div>
                        Making Pick...
                      </>
                    ) : (
                      <>
                        {selectedPlayer ? `Draft ${selectedPlayer.firstName} ${selectedPlayer.lastName}` : 'Select a Player'}
                      </>
                    )}
                  </button>
                  
                  {currentUser && isCaptain && (
                    <div className="autodraft-toggle-container">
                      <ToggleSwitch 
                        isOn={autoDraftEnabled}
                        handleToggle={toggleAutoDraft}
                        label="Auto Draft"
                        disabled={makingPick}
                      />
                      <div className={`autodraft-status ${autoDraftEnabled ? 'enabled' : 'disabled'}`}>
                        {autoDraftEnabled ? 'Autodraft is ON' : 'Autodraft is OFF'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="section-content section-content-large-padding">
            
            {draftState && draftState.availablePool && draftState.availablePool.length > 0 ? (
              filteredAvailablePlayers.length > 0 ? (
                <div className="players-grid">
                  {filteredAvailablePlayers.map(player => (
                    <PlayerCard 
                      key={player.id} 
                      player={player}
                      isSelected={selectedPlayer && selectedPlayer.id === player.id}
                      onSelect={handlePlayerSelect}
                    />
                  ))}
                </div>
              ) : (
                <div className="no-players-message">
                  No players match your current filters.
                </div>
              )
            ) : connected ? (
              <p>Waiting for player data from server...</p>
            ) : (
              <p>Connect to the server to see available players</p>
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
              <>
                {/* Team tabs */}
                <div className="team-tabs">
                  {Object.entries(draftState.teams)
                    .slice(0, maxCaptains) // Limit to maximum number of captains (6)
                    .map(([captainId, players], index) => {
                      // Find the captain name from the captains list
                      const captain = draftState.captains ? draftState.captains.find(c => c.userId === captainId) : null;
                      const captainFirstName = captain ? captain.firstName : `Team ${index + 1}`;
                      
                      return (
                        <div 
                          key={captainId} 
                          className={`team-tab ${activeTeamTab === index ? "active" : ""}`}
                          onClick={() => setActiveTeamTab(index)}
                        >
                          {captainFirstName}'s Team
                        </div>
                      );
                  })}
                </div>
                
                {/* Team content */}
                {Object.entries(draftState.teams)
                  .slice(0, maxCaptains) // Limit to maximum number of captains (6)
                  .map(([captainId, players], index) => {
                    // Find the captain name from the captains list
                    const captain = draftState.captains ? draftState.captains.find(c => c.userId === captainId) : null;
                    const teamName = captain ? captain.teamName : `Team ${captainId}`;
                    
                    return (
                      <div key={captainId} className={`team-content ${activeTeamTab === index ? "active" : ""}`}>
                        <div className="team-header">
                          <h3 className="team-name">{teamName}</h3>
                          <span className="team-count">{players.length} players</span>
                        </div>
                        <div className="players-grid">
                          {players.map(player => (
                            <PlayerCard key={player.id} player={player} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </>
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
