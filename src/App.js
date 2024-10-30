// src/App.js

import React from 'react';
import SnoopChat from './components/SnoopChat';
import './index.css'; // Ensure Tailwind CSS is imported

function App() {
  return (
    <div className="min-h-screen bg-gray-200 p-4">
      <SnoopChat />
    </div>
  );
}

export default App;