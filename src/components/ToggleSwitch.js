import React from 'react';
import '../styles/ToggleSwitch.css';

const ToggleSwitch = ({ isOn, handleToggle, label, disabled = false }) => {
  return (
    <div className="toggle-switch-container">
      <span className="toggle-switch-label">{label}</span>
      <div className={`toggle-switch ${disabled ? 'disabled' : ''}`}>
        <input
          type="checkbox"
          className="toggle-switch-checkbox"
          id={`toggle-switch-${label.replace(/\s+/g, '-').toLowerCase()}`}
          checked={isOn}
          onChange={handleToggle}
          disabled={disabled}
        />
        <label 
          className="toggle-switch-label-ui" 
          htmlFor={`toggle-switch-${label.replace(/\s+/g, '-').toLowerCase()}`}
        >
          <span className="toggle-switch-inner"></span>
          <span className="toggle-switch-switch"></span>
        </label>
      </div>
    </div>
  );
};

export default ToggleSwitch;
