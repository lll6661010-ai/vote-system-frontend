import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import './LoginPage.css';

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { connectWallet, isConnecting } = useWallet();
  const [showSecurityTipLocal, setShowSecurityTipLocal] = useState(true);

  const handleConnect = async () => {
    await connectWallet(false);
    // 连接成功后导航到主页
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        navigate('/home');
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1 className="login-title">{t('app.title')}</h1>
        <p className="login-subtitle">基于区块链的去中心化投票系统</p>
        
        <button 
          onClick={handleConnect} 
          className="connect-btn-large"
          disabled={isConnecting}
        >
          {isConnecting ? t('app.connecting') : t('app.connectWallet')}
        </button>

        {showSecurityTipLocal && (
          <div className="security-tip">
            <div className="security-tip-header">
              <h4>{t('app.walletSecurity')}</h4>
              <button 
                className="close-tip-btn"
                onClick={() => setShowSecurityTipLocal(false)}
              >
                ×
              </button>
            </div>
            <p>{t('app.walletSecurityTip')}</p>
          </div>
        )}

        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">🔐</span>
            <h3>安全可靠</h3>
            <p>基于区块链技术，数据不可篡改</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🗳️</span>
            <h3>透明公正</h3>
            <p>所有投票记录公开可查</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <h3>快速便捷</h3>
            <p>一键连接钱包，轻松参与投票</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

