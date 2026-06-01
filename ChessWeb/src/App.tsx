/*
 * ASTRA - Chess Engine by arpitsingh2492
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { GamePage } from './pages/GamePage';
import './styles/index.css';

export const App: React.FC = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/play" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
