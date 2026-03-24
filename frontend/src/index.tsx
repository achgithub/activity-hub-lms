import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// NOTE: Shared Activity Hub CSS is auto-loaded by activity-hub-sdk
// LMS Manager uses only shared CSS, no game-specific board CSS needed

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
