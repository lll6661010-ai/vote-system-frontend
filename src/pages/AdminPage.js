import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import './AdminPage.css';

function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { contract, account, isAdmin, provider, signer } = useWallet();
  
  const [voterAddrInput, setVoterAddrInput] = useState("");
  const [propTitleInput, setPropTitleInput] = useState("");
  const [propOptionsInput, setPropOptionsInput] = useState("");
  const [addVoterLoading, setAddVoterLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [registerApplications, setRegisterApplications] = useState([]);
  const [showApplications, setShowApplications] = useState(false);
  const [auditLoading, setAuditLoading] = useState({});

  // 如果不是管理员，重定向
  useEffect(() => {
    if (account && !isAdmin) {
      alert("非管理员账户，无法访问此页面");
      navigate('/home');
    }
  }, [account, isAdmin, navigate]);

  // 获取所有注册申请
  const fetchAllApplications = async () => {
    if (!contract || !isAdmin) return;
    
    try {
      const applyIds = await contract.getAllRegisterApplyIds();
      const ids = applyIds.map(id => id.toNumber());
      
      if (ids.length === 0) {
        setRegisterApplications([]);
        return;
      }
      
      const [applicants, applyTimes, statuses, auditTimes] = await contract.getRegisterApplies(ids);
      
      const applications = ids.map((id, idx) => ({
        id: id,
        applicant: applicants[idx],
        applyTime: applyTimes[idx].toNumber(),
        status: statuses[idx],
        auditTime: auditTimes[idx].toNumber()
      }));
      
      setRegisterApplications(applications);
    } catch (error) {
      console.error("获取注册申请列表失败:", error);
      setRegisterApplications([]);
    }
  };

  // 添加白名单
  const addVoter = async () => {
    if (!contract || !isAdmin) {
      alert(t('messages.notAdmin', { action: t('actions.addWhitelist') }));
      return;
    }
    if (addVoterLoading || !voterAddrInput.trim()) return;

    try {
      setAddVoterLoading(true);
      const tx = await contract.addVoterToWhitelist(voterAddrInput.trim());
      await tx.wait();
      alert(t('messages.addWhitelistSuccess'));
      setVoterAddrInput("");
    } catch (error) {
      console.error("添加白名单失败:", error);
      alert(t('messages.addFailed') + ": " + (error.message || error.toString()).slice(0, 100));
    } finally {
      setAddVoterLoading(false);
    }
  };

  // 创建提案
  const createProposal = async () => {
    if (!contract || !isAdmin || createLoading) return;
    
    const title = propTitleInput.trim();
    const optionsStr = propOptionsInput.trim();
    if (!title || !optionsStr) {
      alert("请填写完整信息");
      return;
    }

    try {
      setCreateLoading(true);
      const optionsArr = optionsStr.replace(/，/g, ",").split(",").map(opt => opt.trim()).filter(opt => opt);

      if (optionsArr.length < 2) {
        alert(t('messages.optionsMinCount'));
        setCreateLoading(false);
        return;
      }

      const currentBlock = await provider.getBlock("latest");
      const currentTimestamp = currentBlock.timestamp;
      const startTime = currentTimestamp + 60;
      const endTime = startTime + 3600;

      const tx = await contract.createVotingProposal(title, optionsArr, startTime, endTime);
      await tx.wait();

      alert(t('messages.proposalCreated'));
      setPropTitleInput("");
      setPropOptionsInput("");
    } catch (error) {
      console.error("创建提案失败:", error);
      alert(t('messages.createFailed') + ": " + (error.message || error.toString()).slice(0, 150));
    } finally {
      setCreateLoading(false);
    }
  };

  // 审核注册申请
  const auditRegisterApply = async (applyId, approve) => {
    if (!contract || !isAdmin || auditLoading[applyId]) return;
    
    try {
      setAuditLoading({ ...auditLoading, [applyId]: true });
      const tx = await contract.auditRegisterApply(applyId, approve);
      await tx.wait();
      alert(t('app.auditSuccess'));
      await fetchAllApplications();
    } catch (error) {
      console.error("审核申请失败:", error);
      alert(t('app.auditFailed') + ": " + (error.message || error.toString()).slice(0, 150));
    } finally {
      setAuditLoading({ ...auditLoading, [applyId]: false });
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-page">
      <h2 className="page-title">{t('app.adminPanel')}</h2>

      {/* 添加白名单 */}
      <div className="admin-section">
        <h3>添加白名单</h3>
        <div className="input-group">
          <input
            type="text"
            placeholder={t('placeholders.voterAddress')}
            value={voterAddrInput}
            onChange={(e) => setVoterAddrInput(e.target.value)}
            className="admin-input"
          />
          <button
            onClick={addVoter}
            disabled={addVoterLoading}
            className="admin-btn"
          >
            {addVoterLoading ? t('app.adding') : t('app.addWhitelist')}
          </button>
        </div>
      </div>

      {/* 创建提案 */}
      <div className="admin-section">
        <h3>{t('app.createProposal')}</h3>
        <div className="input-group">
          <input
            type="text"
            placeholder={t('placeholders.proposalTitle')}
            value={propTitleInput}
            onChange={(e) => setPropTitleInput(e.target.value)}
            className="admin-input"
          />
          <input
            type="text"
            placeholder={t('placeholders.proposalOptions')}
            value={propOptionsInput}
            onChange={(e) => setPropOptionsInput(e.target.value)}
            className="admin-input"
          />
          <button
            onClick={createProposal}
            disabled={createLoading}
            className="admin-btn"
          >
            {createLoading ? t('app.creating') : t('app.createProposal')}
          </button>
        </div>
      </div>

      {/* 注册申请管理 */}
      <div className="admin-section">
        <h3>{t('app.registerApplications')}</h3>
        <button
          onClick={async () => {
            if (!showApplications) {
              await fetchAllApplications();
            }
            setShowApplications(!showApplications);
          }}
          className="admin-btn"
          style={{ marginBottom: '15px' }}
        >
          {showApplications ? t('app.hideApplications') : t('app.viewAllApplications')}
        </button>
        
        {showApplications && (
          <div className="applications-list">
            {registerApplications.length === 0 ? (
              <p>{t('app.noApplications')}</p>
            ) : (
              registerApplications.map((app) => {
                const statusText = app.status === 0 ? t('app.statusPending') : 
                                 app.status === 1 ? t('app.statusApproved') : 
                                 t('app.statusRejected');
                const statusColor = app.status === 0 ? '#ff9800' : 
                                  app.status === 1 ? '#4caf50' : 
                                  '#f44336';
                
                return (
                  <div key={app.id} className="application-card">
                    <div className="application-info">
                      <div><strong>{t('app.applicationId')}：</strong> {app.id}</div>
                      <div><strong>{t('app.applicantAddress')}：</strong> {app.applicant}</div>
                      <div><strong>{t('app.applicationStatus')}：</strong>
                        <span style={{ color: statusColor, fontWeight: 'bold', marginLeft: '8px' }}>
                          {statusText}
                        </span>
                      </div>
                      <div><strong>{t('app.applyTime')}：</strong>
                        {new Date(app.applyTime * 1000).toLocaleString('zh-CN')}
                      </div>
                      {app.auditTime > 0 && (
                        <div><strong>{t('app.auditTime')}：</strong>
                          {new Date(app.auditTime * 1000).toLocaleString('zh-CN')}
                        </div>
                      )}
                    </div>
                    
                    {app.status === 0 && (
                      <div className="application-actions">
                        <button
                          onClick={() => auditRegisterApply(app.id, true)}
                          disabled={auditLoading[app.id]}
                          className="admin-btn approve-btn"
                        >
                          {auditLoading[app.id] ? t('app.approving') : t('app.approve')}
                        </button>
                        <button
                          onClick={() => auditRegisterApply(app.id, false)}
                          disabled={auditLoading[app.id]}
                          className="admin-btn reject-btn"
                        >
                          {auditLoading[app.id] ? t('app.approving') : t('app.reject')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;

