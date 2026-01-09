import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProposalsPage from './pages/ProposalsPage';
import AdminPage from './pages/AdminPage';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <WalletProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route 
            path="/home" 
            element={
              <Layout>
                <ProposalsPage />
              </Layout>
            } 
          />
          <Route 
            path="/register" 
            element={
              <Layout>
                <RegisterPage />
              </Layout>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <Layout>
                <AdminPage />
              </Layout>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </WalletProvider>
  );
}

export default App;
