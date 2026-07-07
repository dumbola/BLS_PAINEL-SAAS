import {
  Activity,
  BarChart3,
  MessageSquare,
  Settings,
  Users,
  Lock,
  Loader,
  Film,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Save,
  Cpu,
  FileText,
  ScrollText,
  Trash2,
  Download
} from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://147.93.177.202:4000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Automation State
  const LOCAL_API = 'http://localhost:4001/api/automation';
  const [automationStatus, setAutomationStatus] = useState<any>({
    gagaoolala: { scraper: { running: false, logs: [] }, discovery: { running: false, logs: [] } },
    iqiyi: { scraper: { running: false, logs: [] }, discovery: { running: false, logs: [] } }
  });
  const [globalList, setGlobalList] = useState('');
  const [isSavingList, setIsSavingList] = useState(false);
  const [listMessage, setListMessage] = useState('');
  const [selectedLogSystem, setSelectedLogSystem] = useState('iqiyi');
  const [selectedLogType, setSelectedLogType] = useState('discovery');
  const [fullLogContent, setFullLogContent] = useState('');
  const [isLoadingFullLog, setIsLoadingFullLog] = useState(false);
  
  // Analytics State
  const [analytics, setAnalytics] = useState({
    broadcasts: 0,
    joins: 0,
    leaves: 0,
    activeLeads: 0,
    isMTProtoConnected: false
  });

  // Series State
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [totalSeries, setTotalSeries] = useState(0);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);

  // Backup State
  const [backupConfig, setBackupConfig] = useState({ active: false, chatId: '' });
  const [isSavingBackup, setIsSavingBackup] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('saas_auth_token');
    if (token) setIsAuthenticated(true);
  }, []);

  const fetchAnalytics = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await axios.get(`${API_BASE}/analytics`);
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    }
  };

  const fetchSeries = async () => {
    if (!isAuthenticated) return;
    setIsLoadingSeries(true);
    try {
      const res = await axios.get(`${API_BASE}/series`);
      if (res.data.success) {
        setSeriesData(res.data.series);
        setTotalSeries(res.data.totalSeries);
      }
    } catch (err) {
      console.error('Failed to fetch series', err);
    } finally {
      setIsLoadingSeries(false);
    }
  };

  const fetchBackupConfig = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await axios.get(`${API_BASE}/backup/config`);
      if (res.data.success) {
        setBackupConfig({ active: res.data.active, chatId: res.data.chatId });
      }
    } catch (err) {
      console.error('Failed to fetch backup config', err);
    }
  };

  const saveBackupConfig = async () => {
    setIsSavingBackup(true);
    setBackupMsg('');
    try {
      await axios.post(`${API_BASE}/backup/config`, backupConfig);
      setBackupMsg('Configurações de Backup salvas com sucesso!');
      setTimeout(() => setBackupMsg(''), 3000);
    } catch (err) {
      console.error('Failed to save backup config', err);
      setBackupMsg('Erro ao salvar. Verifique o console.');
    } finally {
      setIsSavingBackup(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000); // Atualiza a cada 10s
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === 'series') {
      fetchSeries();
    } else if (activeTab === 'backup') {
      fetchBackupConfig();
    }
  }, [activeTab]);

  const fetchAutomation = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await axios.get(`${LOCAL_API}/status`);
      setAutomationStatus(res.data);
    } catch (err) {}
  };

  const fetchGlobalList = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await axios.get(`${LOCAL_API}/list`);
      if (res.data.success) setGlobalList(res.data.content);
    } catch (err) {}
  };

  const saveGlobalList = async () => {
    setIsSavingList(true);
    setListMessage('');
    try {
      await axios.post(`${LOCAL_API}/list`, { content: globalList });
      setListMessage('Lista sincronizada com sucesso nos 2 robôs!');
      setTimeout(() => setListMessage(''), 3000);
    } catch (err) {
      setListMessage('Erro ao salvar a lista.');
    } finally {
      setIsSavingList(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'automation') {
      fetchAutomation();
      fetchGlobalList();
      const interval = setInterval(fetchAutomation, 2000);
      return () => clearInterval(interval);
    }
  }, [activeTab, isAuthenticated]);

  const fetchFullLog = async () => {
    setIsLoadingFullLog(true);
    try {
      const res = await axios.get(`${LOCAL_API}/logs/${selectedLogSystem}/${selectedLogType}`);
      setFullLogContent(res.data.content);
    } catch (err) {
      setFullLogContent('Erro ao buscar o log. A Local API está rodando?');
    } finally {
      setIsLoadingFullLog(false);
    }
  };

  const clearFullLog = async () => {
    if (!window.confirm('Tem certeza que deseja apagar o histórico de log selecionado?')) return;
    try {
      await axios.delete(`${LOCAL_API}/logs/${selectedLogSystem}/${selectedLogType}`);
      fetchFullLog();
    } catch (err) {
      alert('Erro ao limpar os logs.');
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchFullLog();
    }
  }, [activeTab, selectedLogSystem, selectedLogType]);

  const downloadFullLog = () => {
    const blob = new Blob([fullLogContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLogSystem}_${selectedLogType}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleAutomation = async (system: string, type: string, isRunning: boolean) => {
    try {
      const endpoint = isRunning ? 'stop' : 'start';
      await axios.post(`${LOCAL_API}/${endpoint}/${system}/${type}`);
      fetchAutomation();
    } catch (err) {
      console.error(`Failed to toggle ${system} ${type}`, err);
      alert(`Erro ao ${isRunning ? 'parar' : 'iniciar'} ${system} ${type}.`);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { password });
      if (res.data.success) {
        localStorage.setItem('saas_auth_token', res.data.token);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Senha incorreta');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div className="glass-panel login-box" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center' }}>
          <div className="login-header" style={{ marginBottom: '2rem' }}>
            <Lock size={48} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
            <h2>SaaS Privado</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Área restrita de Analytics e Telemetria</p>
          </div>
          
          <form onSubmit={handleLogin} className="auth-step active">
            <div className="input-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <input
                type="password"
                placeholder="Senha de Acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                style={{ width: '100%' }}
              />
            </div>
            {loginError && <div className="error-message" style={{ marginBottom: '1rem' }}>{loginError}</div>}
            <button type="submit" className="primary-btn" disabled={isLoggingIn} style={{ width: '100%' }}>
              {isLoggingIn ? <Loader className="spin" size={20} /> : 'Acessar Painel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="brand">
          <div className="logo-glow"></div>
          <h2>Mega Brain</h2>
        </div>
        
        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'series' ? 'active' : ''}`}
            onClick={() => setActiveTab('series')}
          >
            <Film size={20} />
            <span>Séries & Catálogo</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'automation' ? 'active' : ''}`}
            onClick={() => setActiveTab('automation')}
          >
            <Cpu size={20} />
            <span>Automação Local</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <ScrollText size={20} />
            <span>Central de Logs</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            <Shield size={20} />
            <span>Segurança (Clone)</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            <span>Configurações</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <h1>
            {activeTab === 'dashboard' && 'Visão Geral do Sistema'}
            {activeTab === 'series' && 'Gerenciamento de Séries'}
            {activeTab === 'automation' && 'Automação (Scrapers)'}
            {activeTab === 'backup' && 'Espelhamento e Segurança'}
            {activeTab === 'settings' && 'Configurações'}
          </h1>
          <div className="user-profile">
            <div className="avatar">AD</div>
            <button 
              className="logout-btn" 
              onClick={() => {
                localStorage.removeItem('saas_auth_token');
                setIsAuthenticated(false);
              }}
              style={{ background: 'transparent', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '0.25rem 1rem', borderRadius: '4px', cursor: 'pointer', marginLeft: '1rem' }}
            >
              Sair
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="dashboard-content animate-fade-in">
            <div className="metrics-grid">
              <div className="glass-panel metric-card">
                <div className="metric-header">
                  <span>Notícias / Lançamentos</span>
                  <MessageSquare size={20} color="var(--accent-color)" />
                </div>
                <div className="metric-value">{analytics.broadcasts}</div>
                <div style={{ color: 'var(--success-color)', fontSize: '14px', fontWeight: 500 }}>Enviados pelo Sistema</div>
              </div>

              <div className="glass-panel metric-card">
                <div className="metric-header">
                  <span>Leads (Novos Membros)</span>
                  <Users size={20} color="#a78bfa" />
                </div>
                <div className="metric-value">{analytics.joins}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  <span style={{color: 'var(--danger-color)'}}>{analytics.leaves} saídas</span>
                </div>
              </div>

              <div className="glass-panel metric-card">
                <div className="metric-header">
                  <span>Crescimento Real</span>
                  <Activity size={20} color="#34d399" />
                </div>
                <div className="metric-value">{analytics.activeLeads}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Retenção no Grupo</div>
              </div>
            </div>

            <div className="dashboard-panels" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '32px' }}>
              <div className="glass-panel chart-panel" style={{ padding: '32px' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Status da Infraestrutura</h3>
                <div className="status-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="status-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <span className="status-label">Bot Oficial (Lançamentos)</span>
                    <span className="status-badge" style={{ color: 'var(--success-color)', background: 'rgba(16,185,129,0.1)', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' }}>Online</span>
                  </div>
                  <div className="status-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <span className="status-label">Motor MTProto (Telemetria)</span>
                    <span className="status-badge" style={{ color: analytics.isMTProtoConnected ? 'var(--success-color)' : 'var(--danger-color)', background: analytics.isMTProtoConnected ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' }}>
                      {analytics.isMTProtoConnected ? 'Online (Conectado)' : 'Offline (Aguardando Script CLI)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'series' && (
          <div className="series-content animate-fade-in">
            <div className="metrics-grid" style={{ marginBottom: '32px' }}>
              <div className="glass-panel metric-card">
                <div className="metric-header">
                  <span>Total de Séries</span>
                  <Film size={20} color="var(--accent-color)" />
                </div>
                <div className="metric-value">{totalSeries}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Cadastradas no Banco</div>
              </div>
              <div className="glass-panel metric-card">
                <div className="metric-header">
                  <span>Séries Pendentes</span>
                  <AlertCircle size={20} color="var(--warning-color)" />
                </div>
                <div className="metric-value">
                  {seriesData.filter(s => s.status === 'missing_upload').length}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Aguardando Upload de Episódio</div>
              </div>
              <div className="glass-panel metric-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button className="primary-btn" onClick={fetchSeries} disabled={isLoadingSeries} style={{ width: '100%' }}>
                  {isLoadingSeries ? <Loader className="spin" size={20} /> : 'Atualizar Dados'}
                </button>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '16px 8px' }}>Nome da Série</th>
                    <th style={{ padding: '16px 8px' }}>Total Eps</th>
                    <th style={{ padding: '16px 8px' }}>Origem</th>
                    <th style={{ padding: '16px 8px' }}>Status da Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {seriesData.map(series => (
                    <tr key={series.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px 8px', fontWeight: 500 }}>{series.name}</td>
                      <td style={{ padding: '16px 8px', color: 'var(--text-secondary)' }}>{series.totalEpisodes}</td>
                      <td style={{ padding: '16px 8px' }}>
                        <a 
                          href={series.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent-color)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                        >
                          TMDB <ExternalLink size={14} />
                        </a>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        {series.status === 'missing_upload' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--warning-color)', background: 'rgba(234, 179, 8, 0.1)', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 500 }}>
                            <AlertCircle size={14} /> Falta Upload ({series.pendingEpisodes} eps)
                          </span>
                        )}
                        {series.status === 'updated' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--success-color)', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 500 }}>
                            <CheckCircle2 size={14} /> Atualizada
                          </span>
                        )}
                        {series.status === 'no_episodes' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 500 }}>
                            Sem Episódios
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  
                  {seriesData.length === 0 && !isLoadingSeries && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                        Nenhuma série encontrada no banco de dados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="backup-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: backupConfig.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', borderRadius: '16px', color: backupConfig.active ? 'var(--success-color)' : 'var(--danger-color)' }}>
                  {backupConfig.active ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: '0 0 8px 0' }}>Sistema de Clone 24/7</h2>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Espelhamento automático e sem perda de qualidade para proteção anti-ban.</p>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div className="input-group">
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>ID do Canal/Grupo de Backup</label>
                  <input
                    type="text"
                    placeholder="Ex: -100123456789"
                    value={backupConfig.chatId}
                    onChange={(e) => setBackupConfig({...backupConfig, chatId: e.target.value})}
                    style={{ width: '100%', maxWidth: '400px', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: '#fff' }}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>O Bot Oficial <b>PRECISA</b> estar como Administrador nesse grupo.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button 
                    onClick={() => setBackupConfig({...backupConfig, active: !backupConfig.active})}
                    style={{ 
                      padding: '12px 24px', 
                      borderRadius: '8px', 
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: backupConfig.active ? 'var(--danger-color)' : 'var(--success-color)',
                      color: '#fff',
                      transition: 'all 0.2s'
                    }}
                  >
                    {backupConfig.active ? 'Desativar Espelhamento' : 'Ativar Espelhamento 24/7'}
                  </button>

                  <button 
                    onClick={saveBackupConfig}
                    disabled={isSavingBackup}
                    style={{ 
                      padding: '12px 24px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--accent-color)',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--accent-color)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isSavingBackup ? <Loader className="spin" size={18} /> : <Save size={18} />}
                    Salvar Configurações
                  </button>
                </div>

                {backupMsg && (
                  <div style={{ color: backupMsg.includes('Erro') ? 'var(--danger-color)' : 'var(--success-color)', fontSize: '14px', fontWeight: 500 }}>
                    {backupMsg}
                  </div>
                )}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="var(--accent-color)" /> Como o Clone funciona?
              </h3>
              <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', margin: 0, paddingLeft: '24px' }}>
                <li>O MTProto escuta silenciosamente o seu Canal Principal.</li>
                <li>Qualquer mídia ou texto postado no canal é interceptado instantaneamente.</li>
                <li>O sistema <b>ignora mensagens</b> enviadas no chat geral (grupo de discussão).</li>
                <li>O Bot realiza a injeção nativa (<code>copyMessage</code>) para o Backup.</li>
                <li>Não fica com marca d'água de "Encaminhado de".</li>
                <li>Garante preservação de 100% da qualidade original do vídeo.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'automation' && (
          <div className="automation-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Bloco de Gerenciamento de Lista (Discovery) */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '16px', color: 'var(--success-color)' }}>
                  <FileText size={32} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: '0 0 8px 0' }}>Lista de Séries (Discovery)</h2>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Cole os nomes das séries aqui (um por linha) para os robôs procurarem automaticamente.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <textarea 
                  value={globalList}
                  onChange={(e) => setGlobalList(e.target.value)}
                  placeholder="Exemplo:
KinnPorsche
Cutie Pie
..."
                  style={{ width: '100%', height: '150px', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: '#cbd5e1', fontFamily: 'monospace', resize: 'vertical' }}
                />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button 
                    className="primary-btn"
                    onClick={saveGlobalList}
                    disabled={isSavingList}
                    style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--success-color)' }}
                  >
                    {isSavingList ? <Loader className="spin" size={18} /> : <Save size={18} />}
                    Salvar Sincronizado
                  </button>
                  {listMessage && <span style={{ color: listMessage.includes('Erro') ? 'var(--danger-color)' : 'var(--success-color)' }}>{listMessage}</span>}
                </div>
              </div>
            </div>

            {/* Bloco de Controle dos Scrapers */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '16px', color: '#38bdf8' }}>
                  <Cpu size={32} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: '0 0 8px 0' }}>Controle de Robôs Automáticos</h2>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Gerencie as operações de Discovery (Busca) e Download (Scraper).</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* iQIYI Card */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>iQIYI System</h3>
                  
                  {/* iQIYI Discovery */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: '#cbd5e1' }}>1. Motor de Descoberta (Busca)</strong>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '8px', background: automationStatus.iqiyi.discovery.running ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.1)', color: automationStatus.iqiyi.discovery.running ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                        {automationStatus.iqiyi.discovery.running ? 'Buscando...' : 'Parado'}
                      </span>
                    </div>
                    <div style={{ background: '#0f172a', borderRadius: '8px', padding: '8px', border: '1px solid #1e293b', height: '120px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column-reverse', marginBottom: '8px' }}>
                      <div>
                        {automationStatus.iqiyi.discovery.logs.length === 0 ? <span style={{ color: 'var(--text-secondary)' }}>Sem logs...</span> :
                          automationStatus.iqiyi.discovery.logs.map((log: string, i: number) => <div key={i} style={{ color: log.includes('ERROR') ? '#f43f5e' : log.includes('INFO') ? '#38bdf8' : '#cbd5e1' }}>{log}</div>)}
                      </div>
                    </div>
                    <button onClick={() => toggleAutomation('iqiyi', 'discovery', automationStatus.iqiyi.discovery.running)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: automationStatus.iqiyi.discovery.running ? 'var(--danger-color)' : 'var(--accent-color)', color: '#fff' }}>
                      {automationStatus.iqiyi.discovery.running ? 'Parar Discovery' : 'Iniciar Discovery iQIYI'}
                    </button>
                  </div>

                  {/* iQIYI Scraper */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: '#cbd5e1' }}>2. Motor de Download (Scraper)</strong>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '8px', background: automationStatus.iqiyi.scraper.running ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.1)', color: automationStatus.iqiyi.scraper.running ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                        {automationStatus.iqiyi.scraper.running ? 'Baixando...' : 'Parado'}
                      </span>
                    </div>
                    <div style={{ background: '#0f172a', borderRadius: '8px', padding: '8px', border: '1px solid #1e293b', height: '120px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column-reverse', marginBottom: '8px' }}>
                      <div>
                        {automationStatus.iqiyi.scraper.logs.length === 0 ? <span style={{ color: 'var(--text-secondary)' }}>Sem logs...</span> :
                          automationStatus.iqiyi.scraper.logs.map((log: string, i: number) => <div key={i} style={{ color: log.includes('ERROR') ? '#f43f5e' : log.includes('INFO') ? '#38bdf8' : '#cbd5e1' }}>{log}</div>)}
                      </div>
                    </div>
                    <button onClick={() => toggleAutomation('iqiyi', 'scraper', automationStatus.iqiyi.scraper.running)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: automationStatus.iqiyi.scraper.running ? 'var(--danger-color)' : 'var(--success-color)', color: '#fff' }}>
                      {automationStatus.iqiyi.scraper.running ? 'Parar Scraper' : 'Iniciar Scraper iQIYI'}
                    </button>
                  </div>
                </div>

                {/* Gagaoolala Card */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Gagaoolala System</h3>
                  
                  {/* Gagaoolala Discovery */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: '#cbd5e1' }}>1. Motor de Descoberta (Busca)</strong>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '8px', background: automationStatus.gagaoolala.discovery.running ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.1)', color: automationStatus.gagaoolala.discovery.running ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                        {automationStatus.gagaoolala.discovery.running ? 'Buscando...' : 'Parado'}
                      </span>
                    </div>
                    <div style={{ background: '#0f172a', borderRadius: '8px', padding: '8px', border: '1px solid #1e293b', height: '120px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column-reverse', marginBottom: '8px' }}>
                      <div>
                        {automationStatus.gagaoolala.discovery.logs.length === 0 ? <span style={{ color: 'var(--text-secondary)' }}>Sem logs...</span> :
                          automationStatus.gagaoolala.discovery.logs.map((log: string, i: number) => <div key={i} style={{ color: log.includes('ERROR') ? '#f43f5e' : log.includes('INFO') ? '#38bdf8' : '#cbd5e1' }}>{log}</div>)}
                      </div>
                    </div>
                    <button onClick={() => toggleAutomation('gagaoolala', 'discovery', automationStatus.gagaoolala.discovery.running)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: automationStatus.gagaoolala.discovery.running ? 'var(--danger-color)' : 'var(--accent-color)', color: '#fff' }}>
                      {automationStatus.gagaoolala.discovery.running ? 'Parar Discovery' : 'Iniciar Discovery Gagaoolala'}
                    </button>
                  </div>

                  {/* Gagaoolala Scraper */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: '#cbd5e1' }}>2. Motor de Download (Scraper)</strong>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '8px', background: automationStatus.gagaoolala.scraper.running ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.1)', color: automationStatus.gagaoolala.scraper.running ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                        {automationStatus.gagaoolala.scraper.running ? 'Baixando...' : 'Parado'}
                      </span>
                    </div>
                    <div style={{ background: '#0f172a', borderRadius: '8px', padding: '8px', border: '1px solid #1e293b', height: '120px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column-reverse', marginBottom: '8px' }}>
                      <div>
                        {automationStatus.gagaoolala.scraper.logs.length === 0 ? <span style={{ color: 'var(--text-secondary)' }}>Sem logs...</span> :
                          automationStatus.gagaoolala.scraper.logs.map((log: string, i: number) => <div key={i} style={{ color: log.includes('ERROR') ? '#f43f5e' : log.includes('INFO') ? '#38bdf8' : '#cbd5e1' }}>{log}</div>)}
                      </div>
                    </div>
                    <button onClick={() => toggleAutomation('gagaoolala', 'scraper', automationStatus.gagaoolala.scraper.running)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: automationStatus.gagaoolala.scraper.running ? 'var(--danger-color)' : 'var(--success-color)', color: '#fff' }}>
                      {automationStatus.gagaoolala.scraper.running ? 'Parar Scraper' : 'Iniciar Scraper Gagaoolala'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="logs-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '16px', color: 'var(--warning-color)' }}>
                  <ScrollText size={32} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: '0 0 8px 0' }}>Central de Logs (Arquivos)</h2>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Visualize e baixe o histórico completo das automações que rodaram na máquina.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <select 
                  value={selectedLogSystem} 
                  onChange={(e) => setSelectedLogSystem(e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: '#fff' }}
                >
                  <option value="iqiyi">Sistema: iQIYI</option>
                  <option value="gagaoolala">Sistema: Gagaoolala</option>
                </select>
                <select 
                  value={selectedLogType} 
                  onChange={(e) => setSelectedLogType(e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', color: '#fff' }}
                >
                  <option value="discovery">Tipo: Motor de Descoberta (Busca)</option>
                  <option value="scraper">Tipo: Motor de Download (Scraper)</option>
                </select>
                <button 
                  className="primary-btn" 
                  onClick={fetchFullLog}
                  style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}
                >
                  {isLoadingFullLog ? <Loader className="spin" size={18} /> : 'Atualizar Log'}
                </button>
                <button 
                  onClick={downloadFullLog}
                  style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={18} /> Baixar .txt
                </button>
                <button 
                  onClick={clearFullLog}
                  style={{ padding: '12px 16px', borderRadius: '8px', background: 'var(--danger-color)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Trash2 size={18} /> Limpar
                </button>
              </div>

              <div style={{ background: '#0f172a', borderRadius: '8px', padding: '16px', border: '1px solid #1e293b', height: '500px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {fullLogContent}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-content animate-fade-in">
            <div className="glass-panel settings-card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Configuração do MTProto</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                Como o SaaS é privado, o login do Telegram (MTProto) foi movido para os bastidores.<br/>
                Para conectar sua conta para telemetria, rode o script na sua VPS:
              </p>
              <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <code style={{ color: '#38bdf8', fontSize: '14px' }}>cd /root/fast-fansub-bot && npx ts-node src/scripts/generate-session.ts</code>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginTop: '1.5rem', fontSize: '14px' }}>
                O script pedirá seu número e o código SMS. A sessão será criptografada e salva no banco de dados. 
                Depois disso, basta reiniciar o servidor (<code>pm2 restart fansub-bot</code>).
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
