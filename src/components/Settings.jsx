import React, { useState, useEffect } from "react";
import { 
  UserIcon, 
  SyncIcon, 
  HelpCircleIcon, 
  CheckCircleIcon, 
  SunIcon, 
  MoonIcon,
  InfoIcon,
  PaletteIcon,
  CheckIcon
} from "./Icons";
import SyncStatusIndicator from "./SyncStatusIndicator";
import { 
  requestAccessToken, 
  initTokenClient, 
  fetchGoogleUserInfo,
  getOrCreateFolder,
  getOrCreateSpreadsheet,
  performFullSync
} from "../services/googleDriveService";
import { GOOGLE_CLIENT_ID } from "../config";

const PRESET_COLORS = [
  { hex: "#00F0FF", name: "Ciano Neon" },
  { hex: "#A855F7", name: "Roxo Elétrico" },
  { hex: "#10B981", name: "Verde Esmeralda" },
  { hex: "#FF6B00", name: "Laranja Vibrante" },
  { hex: "#FF2E93", name: "Rosa Neon" },
  { hex: "#3B82F6", name: "Azul Cobalto" },
  { hex: "#F59E0B", name: "Âmbar Dourado" },
  { hex: "#EF4444", name: "Vermelho Carmim" }
];

export default function Settings({
  profile,
  onUpdateProfile,
  profileHistory,
  onClearProfileHistory,
  theme,
  onToggleTheme,
  googleSyncSettings,
  onUpdateGoogleSyncSettings,
  onSync,
  workoutData,
  history,
  onTriggerExpiredSession,
  onImportBackup,
  onClearHistory,
  syncProps
}) {
  const defaultGreen = theme === "dark" ? "#ADFF2F" : "#008A47";

  // Local profile inputs
  const [name, setName] = useState(profile.name || "");
  const [weight, setWeight] = useState(profile.weight || "");
  const [height, setHeight] = useState(profile.height || "");
  const [secondaryColor, setSecondaryColor] = useState(
    profile.secondaryColor || defaultGreen
  );
  
  // UI states
  const [showHelp, setShowHelp] = useState(false);
  const [customClientId, setCustomClientId] = useState(googleSyncSettings.clientId || "");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncSuccess, setSyncSuccess] = useState(false);
  
  const envClientId = GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const activeClientId = envClientId || customClientId;

  // Track profile prop changes
  useEffect(() => {
    setName(profile.name || "");
    setWeight(profile.weight || "");
    setHeight(profile.height || "");
    setSecondaryColor(profile.secondaryColor || defaultGreen);
  }, [profile, defaultGreen]);

  const handleSelectColor = (hex) => {
    setSecondaryColor(hex);
    // Apply live feedback immediately
    document.documentElement.style.setProperty("--accent-purple", hex);
    document.documentElement.style.setProperty("--accent-lime", hex);
    document.documentElement.style.setProperty("--border-focus", hex);
    document.documentElement.style.setProperty("--status-success", hex);
    document.documentElement.style.setProperty("--clay-bg-primary", hex);
    document.documentElement.style.setProperty("--accent-secondary", hex);

    const cleanHex = hex.replace("#", "");
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);

      document.documentElement.style.setProperty("--accent-purple-glow", `rgba(${r}, ${g}, ${b}, 0.12)`);
      document.documentElement.style.setProperty("--accent-lime-glow", `rgba(${r}, ${g}, ${b}, 0.18)`);
      document.documentElement.style.setProperty("--accent-secondary-glow", `rgba(${r}, ${g}, ${b}, 0.18)`);
      document.documentElement.style.setProperty("--border-hover", `rgba(${r}, ${g}, ${b}, 0.25)`);
      document.documentElement.style.setProperty("--accent-active", `rgba(${r}, ${g}, ${b}, 0.2)`);
      document.documentElement.style.setProperty("--glass-border-hover", `rgba(${r}, ${g}, ${b}, 0.35)`);
      document.documentElement.style.setProperty("--pulsing-shadow", `rgba(${r}, ${g}, ${b}, 0.4)`);

      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      document.documentElement.style.setProperty(
        "--color-on-accent",
        luminance > 0.55 ? "#071200" : "#ffffff"
      );
    }
  };

  const handleResetColor = () => {
    handleSelectColor(defaultGreen);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    onUpdateProfile({ 
      name, 
      weight: weight ? parseFloat(weight) : "", 
      height: height ? parseFloat(height) : "",
      secondaryColor
    });
    alert("Perfil atualizado com sucesso!");
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        kademia_workout_data: workoutData,
        kademia_history: history,
        kademia_profile: profile,
        kademia_profile_history: profileHistory,
        exportedAt: new Date().toISOString(),
        version: "1.1.0"
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("download", `kademia_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("Erro ao exportar backup: " + err.message);
    }
  };

  const handleImportBackupFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        // Validação básica de chaves
        if (!importedData.kademia_workout_data && !importedData.kademia_history) {
          alert("Arquivo inválido! O arquivo JSON não parece ser um backup válido do KademIA.");
          return;
        }

        const confirmMsg = "Atenção: A importação irá substituir TODOS os seus dados locais de fichas, treinos e histórico por este backup. Deseja continuar?";
        if (window.confirm(confirmMsg)) {
          onImportBackup(importedData);
        }
      } catch (err) {
        alert("Erro ao ler o arquivo JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleConnectGoogle = async () => {
    if (!activeClientId) {
      alert("Por favor, configure o Google Client ID primeiro.");
      return;
    }

    setIsConnecting(true);
    setSyncError("");
    setSyncSuccess(false);

    try {
      initTokenClient(
        activeClientId,
        async (tokenResponse) => {
          try {
            const token = tokenResponse.access_token;
            const expiryTime = Date.now() + tokenResponse.expires_in * 1000;
            
            // 1. Fetch user details from Google
            const userInfo = await fetchGoogleUserInfo(token);
            
            // 2. Setup Folder and Sheets
            const folderId = await getOrCreateFolder(token, onTriggerExpiredSession);
            const spreadsheetId = await getOrCreateSpreadsheet(token, folderId, onTriggerExpiredSession);

            // 3. Save sync settings
            onUpdateGoogleSyncSettings({
              connected: true,
              token,
              tokenExpiry: expiryTime,
              email: userInfo.email,
              userName: userInfo.name,
              picture: userInfo.picture,
              folderId,
              spreadsheetId,
              clientId: envClientId ? "" : customClientId // Save only if custom
            });

            // 4. Auto fill name from Google if profile name is empty or Wagner
            if (userInfo.given_name && (!profile.name || profile.name === "Wagner")) {
              onUpdateProfile({
                ...profile,
                name: userInfo.given_name
              });
            }

            setIsConnecting(false);
            setSyncSuccess(true);
          } catch (err) {
            console.error("Connection setup error:", err);
            setSyncError("Falha ao configurar planilha no Drive: " + err.message);
            setIsConnecting(false);
          }
        },
        (error) => {
          console.error("GIS Auth Error:", error);
          setSyncError("Erro de autenticação com o Google: " + error.message);
          setIsConnecting(false);
        }
      );

      // Open Google OAuth popup
      requestAccessToken();
    } catch (err) {
      setSyncError("Erro ao inicializar cliente do Google: " + err.message);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm("Deseja realmente desconectar sua conta do Google Drive? Os dados locais continuarão salvos no aparelho.")) {
      onUpdateGoogleSyncSettings({
        connected: false,
        token: "",
        tokenExpiry: 0,
        email: "",
        userName: "",
        picture: "",
        spreadsheetId: "",
        folderId: ""
      });
      setSyncSuccess(false);
    }
  };

  const handleSyncClick = async () => {
    if (!googleSyncSettings.connected || !googleSyncSettings.token) return;
    
    setIsSyncingAll(true);
    setSyncError("");
    setSyncSuccess(false);

    try {
      await onSync();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
      alert("Sucesso! Os seus dados foram sincronizados de forma inteligente com o Google Drive.");
    } catch (err) {
      setSyncError("Erro na sincronização: " + err.message);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleAutoSyncChange = (e) => {
    onUpdateGoogleSyncSettings({
      ...googleSyncSettings,
      autoSync: e.target.checked
    });
  };

  // Render Weight History Chart using a responsive SVG
  const renderWeightChart = () => {
    // Filter history entries with weight
    const weightHistory = profileHistory
      .filter(h => h.weight)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (weightHistory.length < 2) {
      return (
        <div className="chart-empty-state">
          Registros insuficientes para exibir o gráfico. Adicione novas pesagens ao longo do tempo!
        </div>
      );
    }

    const weights = weightHistory.map(h => h.weight);
    const minW = Math.min(...weights) - 1;
    const maxW = Math.max(...weights) + 1;
    const diffW = maxW - minW || 1;

    // SVG parameters
    const width = 340;
    const height = 120;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Calculate coordinates for points
    const points = weightHistory.map((item, idx) => {
      const x = padding + (idx / (weightHistory.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((item.weight - minW) / diffW) * chartHeight;
      return { x, y, weight: item.weight, date: new Date(item.date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) };
    });

    // Create polyline path
    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <div className="svg-chart-container">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          {/* Horizontal Gridlines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border-color)" strokeDasharray="3,3" />
          <line x1={padding} y1={padding + chartHeight / 2} x2={width - padding} y2={padding + chartHeight / 2} stroke="var(--border-color)" strokeDasharray="3,3" />
          <line x1={padding} y1={padding + chartHeight} x2={width - padding} y2={padding + chartHeight} stroke="var(--border-color)" strokeDasharray="3,3" />

          {/* Gridline Labels */}
          <text x={padding - 5} y={padding + 4} fontSize="9" fill="var(--color-text-muted)" textAnchor="end">{maxW.toFixed(0)}</text>
          <text x={padding - 5} y={padding + chartHeight / 2 + 3} fontSize="9" fill="var(--color-text-muted)" textAnchor="end">{((maxW + minW) / 2).toFixed(0)}</text>
          <text x={padding - 5} y={padding + chartHeight + 3} fontSize="9" fill="var(--color-text-muted)" textAnchor="end">{minW.toFixed(0)}</text>

          {/* Trend Line */}
          <path d={pathD} fill="none" stroke="var(--accent-purple)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Circles and Date Labels */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="5" fill="var(--accent-purple)" stroke="var(--bg-secondary)" strokeWidth="2" />
              {/* Only show text for first, middle, last to avoid crowding */}
              {(idx === 0 || idx === points.length - 1 || (points.length > 4 && idx === Math.floor(points.length / 2))) && (
                <>
                  <text x={p.x} y={p.y - 8} fontSize="9" fontWeight="bold" fill="var(--color-text-primary)" textAnchor="middle">
                    {p.weight}kg
                  </text>
                  <text x={p.x} y={height - 2} fontSize="8" fill="var(--color-text-muted)" textAnchor="middle">
                    {p.date}
                  </text>
                </>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="settings-container animate-fade-in">
      <header className="settings-header">
        <h2 className="settings-title">Perfil & Ajustes</h2>
        {syncProps && (
          <SyncStatusIndicator
            status={syncProps.status}
            lastSync={syncProps.lastSync}
            isOnline={syncProps.isOnline}
            onSync={syncProps.onSync}
          />
        )}
      </header>

      {/* Profile Form Card */}
      <section className="settings-section glass">
        <h3 className="section-title">Seu Perfil</h3>
        <form onSubmit={handleSaveProfile} className="profile-form">
          <div className="input-group">
            <label htmlFor="p-name">Nome</label>
            <input 
              id="p-name"
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Digite seu nome"
              required
            />
          </div>
          
          <div className="form-row">
            <div className="input-group">
              <label htmlFor="p-weight">Peso Atual (kg)</label>
              <input 
                id="p-weight"
                type="number" 
                step="0.1" 
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
                placeholder="Ex: 78.5"
              />
            </div>
            <div className="input-group">
              <label htmlFor="p-height">Altura Atual (cm)</label>
              <input 
                id="p-height"
                type="number" 
                value={height} 
                onChange={(e) => setHeight(e.target.value)} 
                placeholder="Ex: 180"
              />
            </div>
          </div>

          {/* Minimalist Secondary Color Picker */}
          <div className="secondary-color-section">
            <div className="color-picker-header">
              <div className="color-picker-title-group">
                <PaletteIcon size={18} className="text-secondary-accent" />
                <span className="color-picker-title">Cor Secundária do App</span>
              </div>
              <div className="color-header-actions">
                <span className="color-value-badge">
                  <span className="color-preview-dot" style={{ backgroundColor: secondaryColor }} />
                  {secondaryColor.toUpperCase()}
                </span>
                {secondaryColor.toLowerCase() !== defaultColor.toLowerCase() && (
                  <button 
                    type="button" 
                    className="btn-reset-color"
                    onClick={handleResetColor}
                    title="Restaurar cor padrão"
                  >
                    Restaurar Padrão
                  </button>
                )}
              </div>
            </div>
            
            <p className="sync-info-text" style={{ marginBottom: "10px", fontSize: "0.85rem" }}>
              Escolha uma cor de destaque secundária para personalizar badges, realces e detalhes do aplicativo.
            </p>

            <div className="color-swatches-grid">
              {/* 1ª Bolinha: Verde Luminoso (Padrão) */}
              <button
                type="button"
                className={`color-swatch-btn ${secondaryColor.toLowerCase() === defaultGreen.toLowerCase() ? "active" : ""}`}
                style={{ 
                  backgroundColor: defaultGreen,
                  "--swatch-glow": `${defaultGreen}66`
                }}
                onClick={() => handleSelectColor(defaultGreen)}
                title="Verde Luminoso (Padrão)"
              >
                {secondaryColor.toLowerCase() === defaultGreen.toLowerCase() && (
                  <CheckIcon size={16} className="color-swatch-check" />
                )}
              </button>

              {/* 2ª Bolinha: Cor Personalizada (Com anel degradê arco-íris) */}
              <div 
                className={`custom-color-wrapper ${
                  secondaryColor.toLowerCase() !== defaultGreen.toLowerCase() &&
                  !PRESET_COLORS.some(p => p.hex.toLowerCase() === secondaryColor.toLowerCase())
                    ? "active"
                    : ""
                }`}
                title="Escolher cor personalizada..."
              >
                <div 
                  className="custom-color-inner" 
                  style={{ 
                    backgroundColor: secondaryColor.toLowerCase() !== defaultGreen.toLowerCase() &&
                    !PRESET_COLORS.some(p => p.hex.toLowerCase() === secondaryColor.toLowerCase())
                      ? secondaryColor
                      : "transparent" 
                  }}
                >
                  {secondaryColor.toLowerCase() !== defaultGreen.toLowerCase() &&
                   !PRESET_COLORS.some(p => p.hex.toLowerCase() === secondaryColor.toLowerCase()) && (
                    <CheckIcon size={16} className="color-swatch-check" />
                  )}
                </div>
                <input 
                  type="color" 
                  value={secondaryColor || defaultGreen} 
                  onChange={(e) => handleSelectColor(e.target.value)}
                  className="custom-color-input"
                />
              </div>

              {/* Demais Bolinhas: Cores Predefinidas */}
              {PRESET_COLORS.map((preset) => {
                const isActive = secondaryColor.toLowerCase() === preset.hex.toLowerCase() && secondaryColor.toLowerCase() !== defaultGreen.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    className={`color-swatch-btn ${isActive ? "active" : ""}`}
                    style={{ 
                      backgroundColor: preset.hex,
                      "--swatch-glow": `${preset.hex}66`
                    }}
                    onClick={() => handleSelectColor(preset.hex)}
                    title={preset.name}
                  >
                    {isActive && (
                      <CheckIcon size={16} className="color-swatch-check" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Live Interactive Preview Box */}
            <div className="color-preview-demo-box">
              <span className="preview-label" style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                Pré-visualização do destaque:
              </span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span className="preview-badge-secondary">
                  <PaletteIcon size={14} /> Tag Secundária
                </span>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                  onClick={(e) => e.preventDefault()}
                >
                  Botão Secundário
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-lime submit-profile-btn" style={{ marginTop: "20px" }}>
            <UserIcon size={18} /> Salvar Alterações
          </button>
        </form>

        {/* Evolution Graph */}
        {profileHistory.filter(h => h.weight).length > 0 && (
          <div className="evolution-chart-box">
            <h4 className="sub-section-title">Evolução de Peso</h4>
            {renderWeightChart()}
            
            {/* History Table */}
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {[...profileHistory]
                    .filter(item => item.weight)
                    .reverse()
                    .slice(0, 5)
                    .map((item, i) => (
                      <tr key={i}>
                        <td>{new Date(item.date).toLocaleDateString("pt-BR")}</td>
                        <td>{item.weight} kg</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {profileHistory.filter(item => item.weight).length > 5 && (
                <div className="table-more-info">Exibindo as últimas 5 pesagens</div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Google Drive Sync Card */}
      <section className="settings-section glass">
        <div className="section-header-row">
          <h3 className="section-title">Sincronização no Google Drive</h3>
          {googleSyncSettings.connected ? (
            <span className="badge-status connected">
              <span className="status-dot pulsing"></span> Conectado
            </span>
          ) : (
            <span className="badge-status disconnected">
              Desconectado
            </span>
          )}
        </div>

        {syncError && <div className="sync-banner error">{syncError}</div>}
        {syncSuccess && <div className="sync-banner success">Sincronização concluída com sucesso!</div>}

        {!googleSyncSettings.connected ? (
          <div className="sync-connect-flow">
            <p className="sync-info-text">
              Conecte sua conta do Google para sincronizar automaticamente seu perfil, fichas e histórico de treinos em uma planilha do Google Sheets criada no seu Drive.
            </p>

            {/* Client ID Entry */}
            <div className="input-group" style={{ marginTop: "12px" }}>
              <div className="label-with-help">
                <label>Google Client ID</label>
                <button 
                  type="button" 
                  className="btn-help-icon" 
                  onClick={() => setShowHelp(!showHelp)}
                  title="Como obter credenciais do Google"
                >
                  <HelpCircleIcon size={18} />
                </button>
              </div>

              {envClientId ? (
                <input 
                  type="text" 
                  value="Configurado via arquivo .env" 
                  disabled 
                  className="input-disabled"
                />
              ) : (
                <input 
                  type="text" 
                  value={customClientId} 
                  onChange={(e) => setCustomClientId(e.target.value)} 
                  placeholder="Cole seu Client ID aqui"
                />
              )}
            </div>

            {/* Help Block */}
            {showHelp && (
              <div className="help-box glass animate-slide-up">
                <h4>Como criar o seu Client ID no Google:</h4>
                <ol>
                  <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Google Cloud Console</a> e crie um projeto gratuito.</li>
                  <li>Acesse <strong>"Tela de consentimento OAuth"</strong>, selecione o tipo "Externo", preencha as informações básicas e adicione os escopos:
                    <ul>
                      <li><code>.../auth/drive.file</code></li>
                      <li><code>.../auth/spreadsheets</code></li>
                    </ul>
                  </li>
                  <li>Acesse <strong>"Credenciais"</strong>, clique em <strong>"+ Criar Credenciais"</strong> e escolha <strong>"ID do cliente OAuth"</strong>.</li>
                  <li>Selecione <strong>"Aplicativo da Web"</strong>.</li>
                  <li>Em <strong>"Origens JavaScript autorizadas"</strong>, clique em "+ Adicionar URI" e insira a URL onde você acessa este app (Ex: <code>http://localhost:5173</code> se estiver testando localmente).</li>
                  <li>Copie o <strong>ID do cliente</strong> gerado e cole no campo acima!</li>
                </ol>
              </div>
            )}

            <button 
              type="button" 
              className="btn btn-primary start-sync-btn"
              onClick={handleConnectGoogle}
              disabled={isConnecting || (!envClientId && !customClientId)}
            >
              <SyncIcon size={18} className={isConnecting ? "spinner-animation" : ""} />
              {isConnecting ? "Conectando..." : "Conectar com Google Drive"}
            </button>
          </div>
        ) : (
          <div className="sync-connected-flow">
            {/* User Info Row */}
            <div className="user-profile-sync">
              {googleSyncSettings.picture ? (
                <img src={googleSyncSettings.picture} alt="Avatar" className="user-sync-avatar" />
              ) : (
                <div className="user-sync-avatar-fallback"><UserIcon size={24} /></div>
              )}
              <div className="user-sync-details">
                <span className="user-sync-name">{googleSyncSettings.userName}</span>
                <span className="user-sync-email">{googleSyncSettings.email}</span>
              </div>
            </div>

            {/* Sheet Link */}
            <div className="sync-actions-grid">
              <a 
                href={`https://docs.google.com/spreadsheets/d/${googleSyncSettings.spreadsheetId}/edit`} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-secondary open-sheet-btn"
              >
                <CheckCircleIcon size={18} /> Abrir Planilha no Google Sheets
              </a>

              {/* Auto Sync Toggle */}
              <div className="toggle-sync-option">
                <label className="switch-label">
                  <span>Sincronizar treinos automaticamente</span>
                  <input 
                    type="checkbox" 
                    checked={googleSyncSettings.autoSync !== false} 
                    onChange={handleAutoSyncChange}
                  />
                </label>
              </div>

              {/* Unified Bidirectional Sync Button */}
              <button 
                type="button" 
                className="btn btn-lime full-sync-btn"
                onClick={handleSyncClick}
                disabled={isSyncingAll}
              >
                <SyncIcon size={18} className={isSyncingAll ? "spinner-animation" : ""} />
                {isSyncingAll ? "Sincronizando..." : "Sincronizar com o Google Drive"}
              </button>

              <button 
                type="button" 
                className="btn btn-danger disconnect-btn"
                onClick={handleDisconnect}
              >
                Desconectar Conta Google
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Theme Settings Card */}
      <section className="settings-section glass">
        <h3 className="section-title">Tema do Aplicativo</h3>
        <div className="theme-toggle-row">
          <span>Modo {theme === "dark" ? "Escuro" : "Claro"} Ativo</span>
          <button type="button" className="btn btn-secondary theme-toggle-pill" onClick={onToggleTheme}>
            {theme === "dark" ? (
              <>
                <MoonIcon size={18} /> Escuro
              </>
            ) : (
              <>
                <SunIcon size={18} /> Claro
              </>
            )}
          </button>
        </div>
      </section>


      {/* Danger Zone Card */}
      <section className="settings-section glass danger-zone-card">
        <h3 className="section-title text-danger">Zona de Perigo</h3>
        <p className="sync-info-text" style={{ marginBottom: "14px", marginTop: "6px" }}>
          Ações irreversíveis sobre os seus dados locais salvos no aparelho.
        </p>
        <div className="danger-actions-row">
          <button 
            type="button" 
            className="btn btn-danger-filled danger-btn" 
            onClick={() => {
              if (window.confirm("Deseja realmente apagar todo o histórico local de evolução de peso/altura? Esta ação não pode ser desfeita.")) {
                onClearProfileHistory();
              }
            }}
          >
            Apagar Histórico de Medidas
          </button>
          
          <button 
            type="button" 
            className="btn btn-danger-filled danger-btn" 
            onClick={() => {
              if (window.confirm("Deseja realmente apagar todo o histórico de treinos do aparelho? Esta ação é irreversível e apagará tudo localmente!")) {
                onClearHistory();
              }
            }}
          >
            Limpar Histórico de Treinos
          </button>
        </div>
      </section>

      {/* Version Card */}
      <div className="version-info">
        <InfoIcon size={14} />
        <span>KademIA PWA v1.1.0 • Salva seus dados localmente e na Nuvem</span>
      </div>

      <style>{`
        .settings-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px 16px;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }

        .settings-title {
          font-size: 1.8rem;
          color: var(--color-text-primary);
        }

        .settings-section {
          padding: 20px 16px;
        }

        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 1.15rem;
          color: var(--color-text-primary);
        }

        .sub-section-title {
          font-size: 0.95rem;
          color: var(--color-text-primary);
          margin-bottom: 12px;
          font-weight: 600;
        }

        /* Profile Form styles */
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-row {
          display: flex;
          gap: 12px;
        }

        .form-row .input-group {
          flex: 1;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          font-weight: 600;
        }

        .label-with-help {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-help-icon {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color 0.2s;
        }

        .btn-help-icon:hover {
          color: var(--accent-purple);
        }

        .input-group input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background-color: var(--bg-primary);
          color: var(--color-text-primary);
          font-family: var(--font-body);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .input-group input:focus {
          border-color: var(--border-focus);
        }

        .input-disabled {
          background-color: var(--bg-card-hover) !important;
          color: var(--color-text-muted) !important;
          cursor: not-allowed;
        }

        .submit-profile-btn {
          margin-top: 8px;
          padding: 12px;
        }

        /* Evolution Box */
        .evolution-chart-box {
          margin-top: 24px;
          border-top: 1px dashed var(--border-color);
          padding-top: 20px;
        }

        .svg-chart-container {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 16px;
        }

        .chart-empty-state {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          text-align: center;
          padding: 24px 12px;
          background: var(--bg-primary);
          border-radius: 12px;
          border: 1px dashed var(--border-color);
        }

        .history-table-wrapper {
          margin-bottom: 12px;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          overflow: hidden;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          text-align: left;
        }

        .history-table th {
          background-color: var(--bg-card-hover);
          color: var(--color-text-secondary);
          font-weight: 600;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
        }

        .history-table td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
          color: var(--color-text-primary);
        }

        .history-table tr:last-child td {
          border-bottom: none;
        }

        .table-more-info {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-align: center;
          margin-top: 4px;
        }

        .btn-clear-history-text {
          background: none;
          border: none;
          color: var(--status-error);
          font-size: 0.8rem;
          cursor: pointer;
          margin-top: 8px;
          font-weight: 500;
        }

        .btn-clear-history-text:hover {
          text-decoration: underline;
        }

        /* Google Sync Card styles */
        .badge-status {
          font-size: 0.8rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 99px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .badge-status.connected {
          background-color: var(--accent-purple-glow);
          color: var(--accent-lime);
          border: 1px solid var(--accent-lime-glow);
        }

        .badge-status.disconnected {
          background-color: var(--bg-card-hover);
          color: var(--color-text-secondary);
          border: 1px solid var(--border-color);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .badge-status.connected .status-dot {
          background-color: var(--accent-lime);
        }

        .pulsing {
          box-shadow: 0 0 0 0 var(--pulsing-shadow);
          animation: pulse 1.6s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 var(--pulsing-shadow-start);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px var(--pulsing-shadow-end);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 var(--pulsing-shadow-end);
          }
        }

        .sync-banner {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 0.82rem;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .sync-banner.error {
          background-color: var(--status-error-glow);
          color: var(--status-error);
          border: 1px solid var(--status-error-glow);
        }

        .sync-banner.success {
          background-color: var(--accent-purple-glow);
          color: var(--status-success);
          border: 1px solid var(--accent-lime-glow);
        }

        .sync-info-text {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          line-height: 1.4;
        }

        .start-sync-btn {
          width: 100%;
          margin-top: 16px;
        }

        .help-box {
          margin-top: 14px;
          padding: 14px;
          background-color: var(--bg-card-hover);
          font-size: 0.8rem;
          text-align: left;
        }

        .help-box h4 {
          margin-bottom: 6px;
          font-weight: 600;
        }

        .help-box ol {
          padding-left: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .help-box ul {
          padding-left: 14px;
          margin-top: 4px;
          color: var(--color-text-secondary);
        }

        .help-box code {
          background: rgba(0,0,0,0.05);
          padding: 1px 4px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.75rem;
        }

        body.dark-theme .help-box code {
          background: rgba(255,255,255,0.08);
        }

        /* Connected User details */
        .user-profile-sync {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--bg-primary);
          border-radius: 12px;
          border: 1px solid var(--border-color);
          margin-bottom: 16px;
        }

        .user-sync-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
        }

        .user-sync-avatar-fallback {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: var(--bg-card-hover);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          border: 1px solid var(--border-color);
        }

        .user-sync-details {
          display: flex;
          flex-direction: column;
        }

        .user-sync-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .user-sync-email {
          font-size: 0.78rem;
          color: var(--color-text-secondary);
        }

        .sync-actions-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .open-sheet-btn {
          width: 100%;
          text-decoration: none;
          text-align: center;
        }

        .toggle-sync-option {
          padding: 10px 0;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 4px;
        }

        .switch-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          color: var(--color-text-primary);
          cursor: pointer;
        }

        .switch-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--accent-lime);
        }

        .full-sync-btn {
          width: 100%;
        }

        .disconnect-btn {
          width: 100%;
          font-size: 0.85rem;
          padding: 10px;
        }

        /* Theme Row styles */
        .theme-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
        }

        .theme-toggle-pill {
          padding: 8px 16px;
        }

        /* Backup Settings Card Styles */
        .backup-actions-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .backup-btn {
          flex: 1;
          min-width: 150px;
          font-size: 0.85rem;
          padding: 10px 16px;
        }

        .backup-import-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* Danger Zone Card Styles */
        .text-danger {
          color: var(--status-error) !important;
        }

        .danger-zone-card {
          border-color: var(--status-error-glow) !important;
          background-color: var(--status-error-glow) !important;
        }

        .danger-actions-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .danger-btn {
          flex: 1;
          min-width: 150px;
          font-size: 0.85rem;
          padding: 10px 16px;
        }

        .btn-danger-filled {
          background-color: var(--status-error);
          color: #ffffff;
          border: none;
          font-weight: 500;
          cursor: pointer;
          border-radius: 100px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, box-shadow 0.2s;
        }

        .btn-danger-filled:hover {
          background-color: #a81c19;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        body.dark-theme .btn-danger-filled {
          color: #000000;
        }

        body.dark-theme .btn-danger-filled:hover {
          background-color: #e57373;
        }

        /* Version Card */
        .version-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.72rem;
          color: var(--color-text-muted);
          text-align: center;
          margin-top: 10px;
          margin-bottom: 40px;
        }
      `}</style>
    </div>
  );
}
