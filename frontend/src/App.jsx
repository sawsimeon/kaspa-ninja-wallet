import React, { useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';

// Canister configuration - ICP Ninja uses CANISTER_ID_BACKEND (uppercase)
  const CANISTER_ID =
    process.env.CANISTER_ID_BACKEND ||
    process.env.CANISTER_ID_backend ||
    import.meta.env.VITE_CANISTER_ID_backend ||
    import.meta.env.CANISTER_ID_backend ||
    import.meta.env.CANISTER_ID_BACKEND;

  // Internet Identity canister ID - dynamic detection
  const INTERNET_IDENTITY_CANISTER_ID =
    process.env.CANISTER_ID_INTERNET_IDENTITY ||
    process.env.CANISTER_ID_internet_identity ||
    import.meta.env.VITE_CANISTER_ID_internet_identity ||
    import.meta.env.CANISTER_ID_internet_identity ||
    import.meta.env.CANISTER_ID_INTERNET_IDENTITY ||
    'rdmx6-jaaaa-aaaaa-aaadq-cai'; // Fallback to IC mainnet ID

  // Detect network based on environment or URL
  const detectNetwork = () => {
    // Check DFX_NETWORK environment variable first
    if (process.env.DFX_NETWORK) {
      return process.env.DFX_NETWORK;
    }

    // If deployed on IC, the hostname won't be localhost
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return 'ic';
    }

    // Default to local for development
    return 'local';
  };

  const NETWORK = detectNetwork();

  const IDENTITY_PROVIDER = NETWORK === 'ic'
    ? 'https://identity.ic0.app'
    : `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:4943`;

  const HOST = NETWORK === 'ic'
    ? 'https://ic0.app'
    : 'http://127.0.0.1:4943';

  // Debug logging
  console.log('Canister ID found:', CANISTER_ID);
  console.log('Network detected:', NETWORK);



// IDL for our backend canister
const idlFactory = ({ IDL }) => {
  const AddressInfo = IDL.Record({
    addr_type: IDL.Nat,
    address: IDL.Text,
    derivation_path: IDL.Text,
    public_key: IDL.Vec(IDL.Nat8),
    script_public_key: IDL.Text
  });

  const Balance = IDL.Record({
    confirmed: IDL.Nat64,
    unconfirmed: IDL.Nat64,
    immature: IDL.Nat64,
    total: IDL.Nat64
  });

  const TransactionResult = IDL.Record({
    transaction_id: IDL.Text,
    fee_paid: IDL.Nat64
  });

  const BuildResult = IDL.Record({
    serialized_tx: IDL.Text,
    fee_paid: IDL.Nat64
  });

  return IDL.Service({
    generateAddress: IDL.Func([], [IDL.Variant({ ok: AddressInfo, err: IDL.Text })], []),
    getBalance: IDL.Func([IDL.Text], [IDL.Variant({ ok: Balance, err: IDL.Text })], []),
    sendTransaction: IDL.Func([IDL.Text, IDL.Text, IDL.Nat64], [IDL.Variant({ ok: TransactionResult, err: IDL.Text })], []),
    buildTransaction: IDL.Func([IDL.Text, IDL.Text, IDL.Nat64], [IDL.Variant({ ok: BuildResult, err: IDL.Text })], []),
    broadcastTransaction: IDL.Func([IDL.Text], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
    whoami: IDL.Func([], [IDL.Text], ['query']),
    health: IDL.Func([], [IDL.Text], ['query'])
  });
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Wallet state
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState(null);

  // Transaction state
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [lastTransaction, setLastTransaction] = useState(null);

  // UI state
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('receive');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const showStatus = (message, type = 'info') => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 5000);
  };

  const initAuth = async () => {
    try {
      const client = await AuthClient.create();
      setAuthClient(client);

      const authenticated = await client.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        await createActor(client);
      }
    } catch (error) {
      showStatus(`Init error: ${error.message}`, 'error');
    }
  };

  const createActor = async (client) => {
    const identity = client.getIdentity();
    const agent = new HttpAgent({ host: HOST, identity });

    if (NETWORK !== 'ic') {
      await agent.fetchRootKey();
    }

    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: CANISTER_ID,
    });

    setActor(actor);

    // Automatically generate address and get balance after connecting
    await initializeWallet(actor);

    return actor;
  };

  const initializeWallet = async (actorToUse = actor) => {
    if (!actorToUse) return;

    try {
      showStatus('Setting up your wallet...', 'info');

      // Generate address
      const addressResult = await actorToUse.generateAddress();
      if (addressResult.ok) {
        setAddress(addressResult.ok.address);

        // Automatically get balance for the generated address
        const balanceResult = await actorToUse.getBalance(addressResult.ok.address);
        if (balanceResult.ok) {
          setBalance(balanceResult.ok);
        }

        showStatus('Wallet ready!', 'success');
      } else {
        showStatus(`Error setting up wallet: ${addressResult.err}`, 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    }
  };

  const login = async () => {
    try {
      setLoading(true);
      showStatus('Connecting to Internet Identity...', 'info');

      await authClient.login({
        identityProvider: IDENTITY_PROVIDER,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
        onSuccess: async () => {
          setIsAuthenticated(true);
          await createActor(authClient);
          showStatus('Successfully logged in!', 'success');
        },
        onError: (error) => {
          showStatus(`Login failed: ${error}`, 'error');
        }
      });
    } catch (error) {
      showStatus(`Login error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authClient.logout();
      setIsAuthenticated(false);
      setActor(null);

      // Clear state
      setAddress('');
      setBalance(null);
      setToAddress('');
      setAmount('');
      setLastTransaction(null);
      setCopied(false);
      setActiveTab('receive');

      showStatus('Logged out successfully', 'info');
    } catch (error) {
      showStatus(`Logout error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (!actor || !address) return;

    try {
      setLoading(true);
      showStatus('Refreshing balance...', 'info');

      const result = await actor.getBalance(address);
      if (result.ok) {
        setBalance(result.ok);
        showStatus('Balance updated!', 'success');
      } else {
        showStatus(`Error: ${result.err}`, 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendTransaction = async () => {
    if (!actor || !address || !toAddress.trim() || !amount.trim()) {
      showStatus('Please fill in all fields', 'error');
      return;
    }

    try {
      setLoading(true);
      showStatus('Sending Kaspa transaction...', 'info');

      // Convert KAS to sompi (1 KAS = 100,000,000 sompi)
      const amountInSompi = BigInt(Math.floor(parseFloat(amount) * 100000000));

      const result = await actor.sendTransaction(
        address,
        toAddress.trim(),
        amountInSompi
      );

      if (result.ok) {
        setLastTransaction(result.ok);
        showStatus('Transaction sent successfully!', 'success');
        setToAddress('');
        setAmount('');

        // Automatically refresh balance after successful transaction
        setTimeout(() => refreshBalance(), 2000);
      } else {
        showStatus(`Transaction failed: ${result.err}`, 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (value, decimals = 8) => {
    const kas = Number(value) / 100000000;
    return kas.toFixed(decimals);
  };


  const formatTxId = (txId) => {
    if (txId.length <= 16) return txId;
    return `${txId.slice(0, 8)}...${txId.slice(-8)}`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showStatus('Address copied to clipboard!', 'success');

      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        showStatus('Address copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        showStatus('Failed to copy address', 'error');
      }
      document.body.removeChild(textArea);
    }
  };

  const openTransactionInExplorer = (txId) => {
    const explorerUrl = `https://explorer.kaspa.org/txs/${txId}`;
    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
    showStatus('Opening transaction in Kaspa Explorer...', 'info');
  };

  if (!isAuthenticated) {
    return (
      <div className={`container login-mode ${loading ? 'loading' : ''}`}>
        <div className="login-container">
          <div className="card">
            <div className="gloss-effect"></div>
            <div className="header login-header">
              <h1>🥷 kaspa ninja wallet</h1>
              <p>secure kaspa transactions on the internet computer</p>
              <button onClick={login} className="btn login-btn" disabled={loading}>
                {loading ? <><span className="spinner"></span>connecting...</> : 'connect with internet.id'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${loading ? 'loading' : ''}`}>
      <div className="card">
        <div className="gloss-effect"></div>
        <div className="header">
          <div className="header-content">
            <div className="title-section">
              <h1>🥷 kaspa ninja wallet</h1>
              <p>send and receive kaspa directly on the internet computer</p>
            </div>
            <div className="menu-container">
              <button
                className="menu-button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menu"
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="dropdown-menu">
                  <button onClick={logout} className="menu-item" disabled={loading}>
                    logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isAuthenticated && (
          <>
            {address ? (
              <>
                {balance && (
                  <div className="balance-display">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h3>
                          {formatBalance(balance.total, 8)} KAS
                        </h3>
                        <small style={{ opacity: 0.6, color: '#9ca3af', marginTop: '8px', display: 'block' }}>available balance</small>
                      </div>
                      <button onClick={refreshBalance} className="refresh-icon" disabled={loading} title="Refresh balance">
                        {loading ? '⏳' : '🔄'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="tabs-container">
                  <div className={`tabs ${activeTab === 'send' ? 'send-active' : ''}`}>
                    <button
                      className={`tab ${activeTab === 'receive' ? 'active' : ''}`}
                      onClick={() => setActiveTab('receive')}
                    >
                      receive
                    </button>
                    <button
                      className={`tab ${activeTab === 'send' ? 'active' : ''}`}
                      onClick={() => setActiveTab('send')}
                    >
                      send
                    </button>
                  </div>

                  <div className="tab-content">
                    {activeTab === 'receive' && (
                      <div className="tab-panel">
                        <div
                          className="address-display clickable"
                          onClick={() => copyToClipboard(address)}
                          title="Click to copy address"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <strong>your address:</strong>
                            <span className="copy-indicator">
                              {copied ? '✅ copied!' : 'click to copy'}
                            </span>
                          </div>
                          {address}
                        </div>
                        <small style={{ color: '#a0a0a0', display: 'block', textAlign: 'center', marginTop: '12px' }}>
                          share this address to receive kas
                        </small>
                      </div>
                    )}

                    {activeTab === 'send' && (
                      <div className="tab-panel">
                        <div className="form-group">
                          <label>recipient address</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="kaspa:..."
                            value={toAddress}
                            onChange={(e) => setToAddress(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>amount (kas)</label>
                          <input
                            type="number"
                            className="input"
                            placeholder="0.00000001"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            step="0.00000001"
                            min="0"
                          />
                        </div>
                        <button
                          onClick={sendTransaction}
                          className="btn send-btn"
                          disabled={loading || !address || !toAddress.trim() || !amount.trim()}
                        >
                          {loading ? 'sending...' : 'send kas'}
                        </button>

                        <small style={{ color: '#a0a0a0', display: 'block', textAlign: 'center', marginTop: '12px' }}>
                          💡 make sure you have sufficient balance for the transaction + fees
                        </small>

                        {lastTransaction && (
                          <div className="tx-result">
                            <h4>✅ Transaction Sent!</h4>
                            <div className="tx-id-container">
                              <strong>Transaction ID:</strong>
                              <div
                                className="tx-id-link"
                                onClick={() => openTransactionInExplorer(lastTransaction.transaction_id)}
                                title="Click to view in Kaspa Explorer"
                              >
                                {formatTxId(lastTransaction.transaction_id)}
                                <span className="external-link-icon">🔗</span>
                              </div>
                            </div>
                            <p><strong>Fee Paid:</strong> {formatBalance(lastTransaction.fee_paid)} KAS</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#a0a0a0', padding: '20px' }}>
                Setting up your wallet...
              </div>
            )}
          </>
        )}

        {status && (
          <div className={`status ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;