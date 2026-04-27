import React from 'react';
import { useSeason } from '../contexts/SeasonContext';
import './season-selector.css';

export function SeasonSelector() {
  const { leagues, selectedLeagueId, setSelectedLeagueId, loading } = useSeason();

  if (loading || leagues.length <= 1) return null;

  return (
    <div className="season-selector">
      <label className="season-selector-label" htmlFor="season-select">Season</label>
      <select
        id="season-select"
        className="season-selector-dropdown"
        value={selectedLeagueId || ''}
        onChange={(e) => setSelectedLeagueId(e.target.value)}
      >
        {leagues.map((league) => (
          <option key={league.id} value={league.id}>
            {league.name}
          </option>
        ))}
      </select>
    </div>
  );
}
