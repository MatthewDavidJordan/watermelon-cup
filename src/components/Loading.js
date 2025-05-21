import React from 'react';
import { Ring2 } from 'ldrs/react';
import 'ldrs/react/Ring2.css';
import '../styles/loading.css';

export function Loading() {
  return (
    <div className="loading-container">
      <div className="loading-content">
        <Ring2
          size="40"
          stroke="5"
          strokeLength="0.25"
          bgOpacity="0.1"
          speed="0.8"
          color="#22c55e" // Using the green theme color
        />
        <p className="loading-text">Loading</p>
      </div>
    </div>
  );
}

export default Loading;
