import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Semester from './pages/Semester';
import About from './pages/About';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/semester/:id" element={<Semester />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
