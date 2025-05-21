import React from 'react';
import '../styles/PlayerCard.css';

const PlayerCard = ({ player }) => {
  // Helper function to get initials from first and last name
  const getPlayerInitials = (firstName, lastName) => {
    return `${firstName[0]}${lastName[0]}`;
  };

  // Helper function to determine card type based on graduation year
  const getCardType = (graduationYear) => {
    const currentYear = new Date().getFullYear();
    if (graduationYear - currentYear >= 2) {
      return "fifa-card-bronze"; // Younger players (freshmen/sophomores)
    } else if (graduationYear - currentYear === 1) {
      return "fifa-card-silver"; // Juniors
    } else {
      return "fifa-card-gold"; // Seniors or alumni (older players)
    }
  };

  // Helper function to truncate team name if too long
  const truncateTeam = (team) => {
    if (!team) return null;

    // For very small screens, be more aggressive with truncation
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const maxLength = isMobile ? 4 : 6;

    return team.length > maxLength ? `${team.substring(0, maxLength)}...` : team;
  };

  // Handle different player data structures (from backend vs mock data)
  let positions = [];
  
  // Handle position data which might be a string or an array
  if (player.positions) {
    // If positions is already provided as an array, use it
    positions = player.positions;
  } else if (Array.isArray(player.position)) {
    // If position is an array (new format), use it directly
    positions = player.position;
  } else if (typeof player.position === 'string' && player.position.trim() !== '') {
    // If position is a string (legacy format), it might contain commas
    // Split by comma and trim each position
    positions = player.position.split(',').map(pos => pos.trim());
  }
  
  // Filter out any falsy values
  positions = positions.filter(Boolean);
  
  // Process each position to ensure no commas
  positions = positions.map(pos => {
    // If a position itself contains commas, split it
    if (typeof pos === 'string' && pos.includes(',')) {
      return pos.split(',')[0].trim(); // Take only the first part
    }
    return pos;
  });
  
  // Ensure we have at least one position
  if (positions.length === 0) {
    positions = ['N/A'];
  }
  
  // Limit to 3 positions max
  positions = positions.slice(0, 3);
  
  const foot = player.foot || (player.footPref === 'left' ? 'Left' : 'Right');
  const team = player.team || player.clubTeam;
  const gradYear = player.graduationYear || new Date().getFullYear() + 1; // Default to next year if not provided
  
  return (
    <div className={`fifa-card ${getCardType(gradYear)}`}>
      <div className="fifa-card-pattern"></div>
      <div className="fifa-card-content">
        <div className="fifa-card-top">
          <div className="fifa-card-positions">
            <div className="fifa-card-position">{positions[0]}</div>
            {positions.length > 1 && (
              <div className="fifa-card-alt-positions">
                {positions.slice(1, 3).map((pos, index) => (
                  <div key={index} className="fifa-card-alt-position">{pos}</div>
                ))}
              </div>
            )}
          </div>
          <div className="fifa-card-year">{gradYear}</div>
        </div>

        <div className="fifa-card-photo">{getPlayerInitials(player.firstName, player.lastName)}</div>

        <div className="fifa-card-info">
          <div className="fifa-card-name">{player.lastName}</div>
          {player.nickname && player.nickname !== `${player.firstName} ${player.lastName}` && (
            <div className="fifa-card-nickname">"{player.nickname}"</div>
          )}
        </div>

        <div className="fifa-card-details">
          <div className="fifa-card-info-container">
            <div className="fifa-card-foot">
              <img
                src="/running-shoes.svg"
                alt="Running shoes"
                className="fifa-card-foot-icon"
                width="16"
                height="16"
                style={{ filter: 'brightness(0)', color: 'black' }}
              />
              <span className="fifa-card-foot-text">{foot}</span>
            </div>
            {team && <div className="fifa-card-team" title={team}>{truncateTeam(team)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
