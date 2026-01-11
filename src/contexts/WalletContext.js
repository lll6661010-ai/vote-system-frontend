import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import VoteSystemABI from '../contracts/VoteSystem.json';

// 合约地址和网络配置
// 根据环境变量或当前网络自动选择合约地址
const getContractAddress = (chainId) => {
  // 从环境变量读取
  const sepoliaAddress = process.env.REACT_APP_SEPOLIA_CONTRACT_ADDRESS;
  const localAddress = process.env.REACT_APP_LOCAL_CONTRACT_ADDRESS || "0x9468e7fA82D4e4e4fd39f980645E5eE623ef2868";
  
  // Sepolia 测试网 - 必须配置环境变量
  if (chainId === 11155111) {
    if (!sepoliaAddress || sepoliaAddress.trim() === '') {
      return null; // 返回 null 表示未配置
    }
    return sepoliaAddress;
  }
  // 本地开发网络
  if (chainId === 1337) {
    return localAddress;
  }
  // 默认返回本地地址（用于未知网络）
  return localAddress;
};

// 支持的链 ID
const SUPPORTED_CHAINS = {
  LOCAL: 1337,
  SEPOLIA: 11155111
};

const getChainName = (chainId) => {
  switch (chainId) {
    case SUPPORTED_CHAINS.SEPOLIA:
      return "Sepolia 测试网";
    case SUPPORTED_CHAINS.LOCAL:
      return "本地开发网络";
    default:
      return `未知网络 (${chainId})`;
  }
};

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInWhitelist, setIsInWhitelist] = useState(false);
  const [blockTimestamp, setBlockTimestamp] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userNickname, setUserNickname] = useState("");

  // 连接钱包
  const connectWallet = useCallback(async (isAutoLogin = false) => {
    if (!window.ethereum) {
      if (!isAutoLogin) {
        alert('请安装MetaMask钱包后再操作！');
      }
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const tempAccount = accounts[0];

      const tempProvider = new ethers.providers.Web3Provider(window.ethereum);
      const tempSigner = tempProvider.getSigner();
      
      const network = await tempProvider.getNetwork();
      const chainId = network.chainId;
      
      // 检查是否支持当前网络
      const supportedChainIds = Object.values(SUPPORTED_CHAINS);
      if (!supportedChainIds.includes(Number(chainId))) {
        const chainName = getChainName(Number(chainId));
        alert(`当前网络不支持！\n当前网络：${chainName}\n请切换到支持的网络：\n- 本地开发网络 (链ID: ${SUPPORTED_CHAINS.LOCAL})\n- Sepolia 测试网 (链ID: ${SUPPORTED_CHAINS.SEPOLIA})`);
        return;
      }
      
      // 根据链ID获取合约地址
      const contractAddress = getContractAddress(Number(chainId));
      
      // 检查 Sepolia 网络是否配置了合约地址
      if (!contractAddress) {
        alert('Sepolia 测试网合约地址未配置！\n\n请在 Vercel 项目设置中配置环境变量：\nREACT_APP_SEPOLIA_CONTRACT_ADDRESS=您的合约地址\n\n配置后需要重新部署项目。');
        return;
      }
      
      const tempContract = new ethers.Contract(contractAddress, VoteSystemABI.abi, tempSigner);

      setProvider(tempProvider);
      setSigner(tempSigner);
      setContract(tempContract);
      setAccount(tempAccount);

      // 验证合约
      try {
        await tempContract.proposalCount();
      } catch (error) {
        console.error("合约验证失败：", error);
        alert(`合约地址无效或合约未部署！\n\n合约地址：${contractAddress}\n网络：${getChainName(Number(chainId))}\n\n请检查：\n1. 合约是否已部署到当前网络\n2. 合约地址是否正确\n3. MetaMask 是否连接到正确的网络`);
        return;
      }

      // 验证管理员身份
      const admin = await tempContract.admin();
      const adminMatch = admin.toLowerCase() === tempAccount.toLowerCase();
      setIsAdmin(adminMatch);

      // 检查白名单状态
      let inWhitelist = false;
      try {
        inWhitelist = await tempContract.voterWhitelist(tempAccount);
        setIsInWhitelist(inWhitelist);
      } catch (error) {
        console.error("检查白名单状态失败:", error);
        setIsInWhitelist(false);
      }

      // 更新区块时间
      const updateBlockTime = async () => {
        try {
          const block = await tempProvider.getBlock("latest");
          setBlockTimestamp(block.timestamp);
        } catch (error) {
          console.error("更新区块时间失败:", error);
        }
      };
      await updateBlockTime();
      const timeInterval = setInterval(updateBlockTime, 5000);
      window.blockTimeInterval = timeInterval;

      // 保存登录状态
      localStorage.setItem('voteSystem_account', tempAccount);
      localStorage.setItem('voteSystem_isAdmin', adminMatch.toString());
      localStorage.setItem('voteSystem_isInWhitelist', inWhitelist.toString());

      // 加载昵称
      const savedNickname = localStorage.getItem(`voteSystem_nickname_${tempAccount}`);
      if (savedNickname) {
        setUserNickname(savedNickname);
      }

      if (!isAutoLogin) {
        alert('钱包连接成功！');
      }
    } catch (error) {
      console.error("钱包连接失败:", error);
      localStorage.removeItem('voteSystem_account');
      localStorage.removeItem('voteSystem_isAdmin');
      localStorage.removeItem('voteSystem_isInWhitelist');
      if (!isAutoLogin) {
        alert('连接钱包失败: ' + error.message.slice(0, 100));
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // 退出登录
  const logout = useCallback(() => {
    localStorage.removeItem('voteSystem_account');
    localStorage.removeItem('voteSystem_isAdmin');
    localStorage.removeItem('voteSystem_isInWhitelist');
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount("");
    setIsAdmin(false);
    setIsInWhitelist(false);
    setBlockTimestamp(null);
    setUserNickname("");
    if (window.blockTimeInterval) {
      clearInterval(window.blockTimeInterval);
      window.blockTimeInterval = null;
    }
    alert('已退出登录');
  }, []);

  // 自动登录
  useEffect(() => {
    const autoLogin = async () => {
      if (!window.ethereum) return;
      const savedAccount = localStorage.getItem('voteSystem_account');
      if (!savedAccount) return;

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0 || accounts[0].toLowerCase() !== savedAccount.toLowerCase()) {
          localStorage.removeItem('voteSystem_account');
          return;
        }
        await connectWallet(true);
      } catch (error) {
        console.error("自动登录失败:", error);
      }
    };
    const timer = setTimeout(autoLogin, 500);
    return () => clearTimeout(timer);
  }, [connectWallet]);

  // 监听账户切换和网络切换
  useEffect(() => {
    if (!window.ethereum) return;
    
    const handleAccountChange = async (newAccounts) => {
      if (newAccounts.length === 0) {
        logout();
      } else {
        await connectWallet();
      }
    };
    
    const handleChainChange = () => {
      logout();
      alert('网络已切换，请重新连接钱包！');
    };
    
    window.ethereum.on('accountsChanged', handleAccountChange);
    window.ethereum.on('chainChanged', handleChainChange);
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
        window.ethereum.removeListener('chainChanged', handleChainChange);
      }
    };
  }, [connectWallet, logout]);

  const value = {
    provider,
    signer,
    contract,
    account,
    isAdmin,
    isInWhitelist,
    blockTimestamp,
    isConnecting,
    userNickname,
    setUserNickname,
    connectWallet,
    logout,
    SUPPORTED_CHAINS,
    getChainName
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

