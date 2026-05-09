import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import HomePage from './pages/HomePage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          {/* You can add more routes here like <Route path="/login" element={<LoginPage />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
