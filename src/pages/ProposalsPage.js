import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../contexts/WalletContext';
import ReactEcharts from 'echarts-for-react';
import './ProposalsPage.css';

function ProposalsPage() {
  const { t } = useTranslation();
  const { contract, account, isInWhitelist, blockTimestamp } = useWallet();
  
  const [proposals, setProposals] = useState([]);
  const [voteLoading, setVoteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ongoing'); // 默认显示进行中的提案

  // 获取所有提案
  const fetchProposals = useCallback(async (contractInstance) => {
    if (!contractInstance) return;

    try {
      const count = await contractInstance.proposalCount();
      const countNum = typeof count.toNumber === 'function' ? count.toNumber() : Number(count);

      if (countNum === 0) {
        setProposals([]);
        return;
      }

      const proposalsList = [];
      for (let i = 0; i < countNum; i++) {
        try {
          const proposal = await contractInstance.proposals(i);
          let options = [];
          try {
            options = await contractInstance.getProposalOptions(i);
          } catch (optionsError) {
            console.error(`获取提案 ${i} 选项失败:`, optionsError);
            continue;
          }
          
          if (!options || options.length === 0) {
            continue;
          }
          
          const voteCounts = [];
          for (let j = 0; j < options.length; j++) {
            try {
              const voteCount = await contractInstance.getOptionVoteCount(i, j);
              const voteCountNum = typeof voteCount.toNumber === 'function' 
                ? voteCount.toNumber() 
                : Number(voteCount);
              voteCounts.push(voteCountNum);
            } catch (voteError) {
              voteCounts.push(0);
            }
          }
          
          let startTime, endTime;
          try {
            startTime = typeof proposal.startTime.toNumber === 'function' 
              ? proposal.startTime.toNumber() 
              : Number(proposal.startTime);
            endTime = typeof proposal.endTime.toNumber === 'function' 
              ? proposal.endTime.toNumber() 
              : Number(proposal.endTime);
          } catch (timeError) {
            startTime = Math.floor(Date.now() / 1000);
            endTime = startTime + 3600;
          }
          
          proposalsList.push({
            id: i,
            title: proposal.title || `提案 ${i}`,
            options: options,
            startTime: startTime,
            endTime: endTime,
            voteCounts: voteCounts
          });
        } catch (proposalError) {
          console.error(`获取提案 ${i} 失败:`, proposalError);
        }
      }

      setProposals(proposalsList);
    } catch (error) {
      console.error("获取提案失败:", error);
    }
  }, []);

  useEffect(() => {
    if (contract) {
      fetchProposals(contract);
    }
  }, [contract, fetchProposals]);

  // 获取提案状态
  const getProposalStatus = (proposal) => {
    // 优先使用区块时间，如果没有则使用系统时间
    const now = blockTimestamp !== null ? blockTimestamp : Math.floor(Date.now() / 1000);
    
    // 调试信息
    if (proposal.id === 0) { // 只打印第一个提案的调试信息，避免日志过多
      console.log("提案状态判断:", {
        proposalId: proposal.id,
        startTime: proposal.startTime,
        endTime: proposal.endTime,
        startTimeDate: new Date(proposal.startTime * 1000).toLocaleString('zh-CN'),
        endTimeDate: new Date(proposal.endTime * 1000).toLocaleString('zh-CN'),
        currentBlockTime: blockTimestamp,
        currentBlockTimeDate: blockTimestamp ? new Date(blockTimestamp * 1000).toLocaleString('zh-CN') : '未获取',
        currentSystemTime: Math.floor(Date.now() / 1000),
        currentSystemTimeDate: new Date().toLocaleString('zh-CN'),
        now: now,
        nowDate: new Date(now * 1000).toLocaleString('zh-CN'),
        timeDiff: proposal.startTime - now
      });
    }
    
    if (now < proposal.startTime) {
      return 'notStarted';
    } else if (now >= proposal.startTime && now <= proposal.endTime) {
      return 'ongoing';
    } else {
      return 'ended';
    }
  };

  // 按状态分类提案
  const categorizeProposals = (proposalsList) => {
    const categorized = {
      notStarted: [],
      ongoing: [],
      ended: []
    };
    
    proposalsList.forEach(proposal => {
      const status = getProposalStatus(proposal);
      categorized[status].push(proposal);
    });
    
    return categorized;
  };

  // 投票
  const castVote = async (proposalId, optionId) => {
    if (!contract || voteLoading) return;

    try {
      setVoteLoading(true);
      const tx = await contract.castVote(proposalId, optionId);
      console.log("投票交易已发送，等待确认...", tx.hash);
      await tx.wait();
      alert(t('messages.voteSuccess'));
      await fetchProposals(contract);
    } catch (error) {
      console.error("投票失败:", error);
      alert(t('messages.voteFailed') + ": " + (error.message || error.toString()).slice(0, 150));
    } finally {
      setVoteLoading(false);
    }
  };

  // 生成图表配置
  const getChartOption = (voteCounts, options) => {
    const votesText = t('app.votes');
    return {
      title: { 
        text: t('app.voteResult'), 
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#ffffff'
        }
      },
      tooltip: { trigger: 'item', formatter: `{b}: {c}${votesText} ({d}%)` },
      grid: {
        top: '90px',
        bottom: '40px',
        left: '15%',
        right: '15%'
      },
      series: [
        {
          name: t('app.voteCount'),
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['50%', '58%'],
          data: options.map((opt, idx) => ({ value: voteCounts[idx], name: opt })),
          label: { 
            show: true, 
            formatter: (params) => `${params.name}: ${params.value}${votesText}`,
            position: 'outside',
            distance: 30,
            fontSize: 12,
            color: '#999'
          },
          labelLine: {
            show: true,
            length: 20,
            length2: 10
          }
        }
      ]
    };
  };

  const categorized = categorizeProposals(proposals);
  const statusConfig = [
    { key: 'notStarted', label: t('app.statusNotStarted'), color: '#ff9800', icon: '⏰' },
    { key: 'ongoing', label: t('app.statusOngoing'), color: '#4caf50', icon: '🟢' },
    { key: 'ended', label: t('app.statusEnded'), color: '#9e9e9e', icon: '🔒' }
  ];

  // 获取当前标签页的提案
  const getCurrentProposals = () => {
    return categorized[activeTab] || [];
  };

  const currentProposals = getCurrentProposals();
  const currentStatus = statusConfig.find(s => s.key === activeTab);

  return (
    <div className="proposals-page">
      <h2 className="page-title">{t('app.proposalList')}</h2>
      
      {/* 标签页导航 */}
      <div className="proposals-tabs">
        {statusConfig.map(status => {
          const count = categorized[status.key]?.length || 0;
          return (
            <button
              key={status.key}
              className={`tab-button ${activeTab === status.key ? 'active' : ''}`}
              onClick={() => setActiveTab(status.key)}
              style={{
                borderColor: status.color,
                color: activeTab === status.key ? status.color : '#666',
                backgroundColor: activeTab === status.key ? `${status.color}15` : 'transparent'
              }}
            >
              <span className="tab-icon">{status.icon}</span>
              <span className="tab-label">{status.label}</span>
              <span className="tab-count">({count})</span>
            </button>
          );
        })}
      </div>
      
      {/* 提案列表内容 */}
      {proposals.length === 0 ? (
        <div className="no-proposals">
          <p>{t('app.noProposal')}</p>
        </div>
      ) : currentProposals.length === 0 ? (
        <div className="no-proposals-in-tab">
          <p>{t('app.noProposalsInCategory')}</p>
        </div>
      ) : (
        <div className="proposals-content">
          {currentProposals.map(prop => {
            const now = blockTimestamp !== null ? blockTimestamp : Math.floor(Date.now() / 1000);
            const isVotingPeriod = now >= prop.startTime && now <= prop.endTime;
            const canVote = isInWhitelist && isVotingPeriod && !voteLoading;
            
            // 计算剩余时间提示
            let timeHint = "";
            if (!isVotingPeriod) {
              if (now < prop.startTime) {
                const waitSeconds = prop.startTime - now;
                const waitMinutes = Math.ceil(waitSeconds / 60);
                const waitHours = Math.floor(waitMinutes / 60);
                if (waitHours > 0) {
                  timeHint = `投票将在 ${waitHours} 小时 ${waitMinutes % 60} 分钟后开始`;
                } else {
                  timeHint = `投票将在 ${waitMinutes} 分钟后开始`;
                }
              } else {
                timeHint = "投票已结束";
              }
            }
            
            return (
              <div key={prop.id} className="proposal-card">
                <div className="proposal-header">
                  <h4 className="proposal-title">{prop.title}</h4>
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: currentStatus.color, color: '#ffffff' }}
                  >
                    {currentStatus.label}
                  </span>
                </div>
                      
                      <div className="proposal-time-info">
                        <div className="time-item">
                          <span className="time-label">{t('app.startTime')}：</span>
                          <span className="time-value">{new Date(prop.startTime * 1000).toLocaleString('zh-CN')}</span>
                        </div>
                        <div className="time-item">
                          <span className="time-label">{t('app.endTime')}：</span>
                          <span className="time-value">{new Date(prop.endTime * 1000).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>
                      
                      <div className="options-section">
                        <h5 className="options-title">{t('app.proposalOptions')}：</h5>
                        <div className="options">
                          {prop.options.map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={() => castVote(prop.id, idx)}
                              disabled={!canVote}
                              className="vote-btn"
                              style={{
                                opacity: canVote ? 1 : 0.6,
                                cursor: canVote ? 'pointer' : 'not-allowed',
                                backgroundColor: canVote ? '#61dafb' : '#cccccc',
                                borderColor: canVote ? '#61dafb' : '#999999'
                              }}
                              title={
                                !isInWhitelist 
                                  ? "你不在白名单中，无法投票" 
                                  : !isVotingPeriod 
                                    ? timeHint
                                    : ""
                              }
                            >
                              <span className="option-name">{opt}</span>
                              <span className="option-votes">
                                {prop.voteCounts ? prop.voteCounts[idx] : 0} {t('app.votes')}
                              </span>
                            </button>
                          ))}
                        </div>
                        
                        {/* 显示时间提示 */}
                        {!isVotingPeriod && (
                          <div className="time-hint" style={{
                            marginTop: '15px',
                            padding: '15px',
                            backgroundColor: activeTab === 'notStarted' ? '#fff3cd' : '#f5f5f5',
                            borderRadius: '8px',
                            textAlign: 'left',
                            color: activeTab === 'notStarted' ? '#856404' : '#666',
                            border: `2px solid ${activeTab === 'notStarted' ? '#ffc107' : '#9e9e9e'}`
                          }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                              {timeHint || (activeTab === 'notStarted' ? '⏰ 投票尚未开始' : '🔒 投票已结束')}
                            </div>
                            {activeTab === 'notStarted' && blockTimestamp && (
                              <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                                <div><strong>当前区块时间：</strong>{new Date(blockTimestamp * 1000).toLocaleString('zh-CN')}</div>
                                <div><strong>开始时间：</strong>{new Date(prop.startTime * 1000).toLocaleString('zh-CN')}</div>
                                <div><strong>还需等待：</strong>{Math.ceil((prop.startTime - blockTimestamp) / 60)} 分钟</div>
                                <div style={{ marginTop: '10px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '4px' }}>
                                  <strong>💡 提示：</strong>在 Truffle Develop 中，区块时间不会自动推进。
                                  <br />
                                  如需立即开始投票，请在 Truffle Develop 控制台运行：
                                  <br />
                                  <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '3px' }}>
                                    evm_increaseTime {prop.startTime - blockTimestamp}
                                  </code>
                                  <br />
                                  然后运行：
                                  <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '3px' }}>
                                    evm_mine
                                  </code>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!isInWhitelist && getProposalStatus(prop) === 'ongoing' && (
                          <div className="whitelist-notice">
                            <p>⚠️ 你不在投票白名单中，无法参与投票。请联系管理员将你添加到白名单。</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="proposal-divider"></div>
                      
                      <div className="chart-container">
                        <ReactEcharts
                          option={getChartOption(prop.voteCounts, prop.options)}
                          style={{ height: '350px', width: '100%' }}
                        />
                      </div>
                    </div>
                  );
                })}
        </div>
      )}
    </div>
  );
}

export default ProposalsPage;

