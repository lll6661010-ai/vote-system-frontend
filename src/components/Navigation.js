import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../contexts/WalletContext';
import './Navigation.css';

function Navigation() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { account, isAdmin, isInWhitelist, userNickname, logout } = useWallet();

  if (!account) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/home">{t('app.title')}</Link>
        </div>
        
        <div className="nav-user-info">
          {userNickname && (
            <span className="nav-nickname">👤 {userNickname}</span>
          )}
          <span className="nav-account">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
          <span className={`nav-role ${isAdmin ? 'admin' : isInWhitelist ? 'voter' : 'guest'}`}>
            {isAdmin ? t('app.roleAdmin') : isInWhitelist ? t('app.roleVoter') : t('app.roleGuest')}
          </span>
        </div>

        <div className="nav-links">
          <Link 
            to="/home" 
            className={location.pathname === '/home' ? 'active' : ''}
          >
            {t('app.proposalList')}
          </Link>
          
          {!isInWhitelist && (
            <Link 
              to="/register" 
              className={location.pathname === '/register' ? 'active' : ''}
            >
              {t('app.registerTitle')}
            </Link>
          )}
          
          {isAdmin && (
            <Link 
              to="/admin" 
              className={location.pathname === '/admin' ? 'active' : ''}
            >
              {t('app.adminPanel')}
            </Link>
          )}
          
          <button onClick={handleLogout} className="nav-logout-btn">
            {t('app.logout')}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;

