import React from 'react';
import { Navigate } from 'react-router-dom';
import Navigation from './Navigation';
import { useWallet } from '../contexts/WalletContext';
import './Layout.css';

function Layout({ children }) {
  const { account } = useWallet();

  if (!account) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="layout">
      <Navigation />
      <main className="layout-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;

