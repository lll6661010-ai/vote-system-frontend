import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../contexts/WalletContext';
import './RegisterPage.css';

function RegisterPage() {
  const { t } = useTranslation();
  const { contract, account, isInWhitelist, userNickname, setUserNickname } = useWallet();
  
  const [userApplyId, setUserApplyId] = useState(null);
  const [userApplyStatus, setUserApplyStatus] = useState(null);
  const [registerLoading, setRegisterLoading] = useState(false);

  // 检查用户申请状态
  const checkUserApplication = async () => {
    if (!contract || !account) return;
    
    try {
      const [applyId, exists] = await contract.getUserApplyId(account);
      if (exists) {
        setUserApplyId(applyId.toNumber());
        const apply = await contract.registerApplies(applyId);
        setUserApplyStatus(apply.status);
      } else {
        setUserApplyId(null);
        setUserApplyStatus(null);
      }
    } catch (error) {
      console.error("检查用户申请状态失败:", error);
    }
  };

  useEffect(() => {
    checkUserApplication();
  }, [contract, account]);

  // 提交注册申请
  const submitRegisterApply = async () => {
    if (!contract || !account) {
      alert("请先连接钱包");
      return;
    }
    
    if (registerLoading) return;
    
    if (isInWhitelist) {
      alert("您已在白名单中，无需提交注册申请");
      return;
    }
    
    if (userApplyStatus === 0) {
      alert("您已有待审核的申请，请等待管理员审核");
      return;
    }
    
    try {
      setRegisterLoading(true);
      const tx = await contract.submitRegisterApply();
      console.log("注册申请交易已发送，等待确认...", tx.hash);
      await tx.wait();
      
      alert(t('app.registerSuccess'));
      await checkUserApplication();
    } catch (error) {
      console.error("提交注册申请失败:", error);
      let errorMsg = t('app.registerFailed') + ": ";
      const errorMessage = error.message || error.toString();
      
      if (errorMessage.includes("已在白名单中")) {
        errorMsg += "您已在白名单中，无需重复申请";
      } else if (errorMessage.includes("已有待审核的申请")) {
        errorMsg += "您已有待审核的申请，请等待审核结果";
      } else if (errorMessage.includes("user rejected")) {
        errorMsg += "用户取消了交易";
      } else {
        errorMsg += errorMessage.slice(0, 150);
      }
      
      alert(errorMsg);
    } finally {
      setRegisterLoading(false);
    }
  };

  // 如果已在白名单中，显示提示
  if (isInWhitelist) {
    return (
      <div className="register-page">
        <div className="register-container">
          <div className="success-message">
            <h2>✅ 您已在白名单中</h2>
            <p>您已经拥有投票权限，可以前往提案列表参与投票。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <h2>{t('app.registerTitle')}</h2>
        <p className="register-description">{t('app.registerDescription')}</p>
        
        {/* 昵称输入 */}
        <div className="input-group">
          <label>昵称（可选，仅用于前端显示）</label>
          <input
            type="text"
            placeholder="请输入昵称"
            value={userNickname}
            onChange={(e) => {
              const newNickname = e.target.value;
              setUserNickname(newNickname);
              if (account) {
                localStorage.setItem(`voteSystem_nickname_${account}`, newNickname);
              }
            }}
            className="register-input"
          />
        </div>
        
        {/* 显示申请状态 */}
        {userApplyStatus === 2 && userApplyId !== null && (
          <div className="application-status-info rejected">
            <p>⚠️ 您之前的申请已被拒绝，可以重新提交申请</p>
          </div>
        )}
        
        {userApplyStatus === 0 && (
          <div className="application-status-info pending">
            <h3>{t('app.myApplication')}</h3>
            <p><strong>{t('app.applicationStatus')}：</strong>
              <span className="status-pending">{t('app.statusPending')}</span>
            </p>
            <p>⏳ 您的申请正在等待管理员审核，请耐心等待...</p>
          </div>
        )}
        
        {userApplyStatus === 1 && (
          <div className="application-status-info approved">
            <h3>{t('app.myApplication')}</h3>
            <p><strong>{t('app.applicationStatus')}：</strong>
              <span className="status-approved">{t('app.statusApproved')}</span>
            </p>
            <p>✅ 恭喜！您的申请已通过审核，现在可以参与投票了</p>
          </div>
        )}
        
        {/* 提交按钮 */}
        {userApplyStatus !== 0 && userApplyStatus !== 1 && (
          <button
            onClick={submitRegisterApply}
            disabled={registerLoading}
            className="submit-btn"
          >
            {registerLoading ? t('app.submitting') : t('app.submitRegister')}
          </button>
        )}
      </div>
    </div>
  );
}

export default RegisterPage;

