import React, { useState } from "react";
import { 
  SyncIcon, 
  HelpCircleIcon, 
  SunIcon, 
  MoonIcon,
  BarbellIcon,
  UserIcon
} from "./Icons";
import { 
  requestAccessToken, 
  initTokenClient, 
  fetchGoogleUserInfo,
  getOrCreateFolder,
  getOrCreateSpreadsheet
} from "../services/googleDriveService";
import { GOOGLE_CLIENT_ID } from "../config";

export default function LoginScreen({
  theme,
  onToggleTheme,
  googleSyncSettings,
  onUpdateGoogleSyncSettings,
  onUpdateProfile,
  profile
}) {
  const [customClientId, setCustomClientId] = useState(googleSyncSettings.clientId || "");
  const [showHelp, setShowHelp] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const envClientId = GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const activeClientId = envClientId || customClientId;

  const handleConnectGoogle = () => {
    if (!activeClientId) {
      setErrorMsg("Por favor, insira o Google Client ID para continuar.");
      return;
    }

    setIsConnecting(true);
    setLoadingMessage("Aguardando autorização no Google...");
    setErrorMsg("");

    try {
      initTokenClient(
        activeClientId,
        async (tokenResponse) => {
          try {
            setLoadingMessage("Obtendo informações da sua conta...");
            const token = tokenResponse.access_token;
            const expiryTime = Date.now() + tokenResponse.expires_in * 1000;
            
            // 1. Fetch user info
            const userInfo = await fetchGoogleUserInfo(token);
            
            // 2. Setup Folder and Sheets
            setLoadingMessage("Buscando pasta do KademIA no Google Drive...");
            const folderId = await getOrCreateFolder(token);
            
            setLoadingMessage("Preparando planilhas de treino...");
            const spreadsheetId = await getOrCreateSpreadsheet(token, folderId);

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
              clientId: envClientId ? "" : customClientId
            });

            // 4. Update profile name if it was default
            if (userInfo.given_name && (!profile.name || profile.name === "Wagner")) {
              onUpdateProfile({
                ...profile,
                name: userInfo.given_name
              });
            }
          } catch (err) {
            console.error("Setup error during login:", err);
            setErrorMsg("Falha ao configurar planilha no Drive: " + err.message);
            setIsConnecting(false);
            setLoadingMessage("");
          }
        },
        (error) => {
          console.error("GIS Auth Error:", error);
          setErrorMsg("Erro de autenticação com o Google: " + error.message);
          setIsConnecting(false);
          setLoadingMessage("");
        }
      );

      requestAccessToken();
    } catch (err) {
      setErrorMsg("Erro ao inicializar cliente do Google: " + err.message);
      setIsConnecting(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="login-screen-container animate-fade-in">
      {/* Dynamic step-by-step loading overlay */}
      {isConnecting && loadingMessage && (
        <div className="login-loading-overlay animate-fade-in">
          <div className="login-loading-card glass animate-slide-up">
            <div className="loader-ring">
              <div></div><div></div><div></div><div></div>
            </div>
            <p className="loading-step-text">{loadingMessage}</p>
            <span className="loading-subtext">Por favor, mantenha o app aberto e não feche esta janela.</span>
          </div>
        </div>
      )}

      {/* Floating Theme Button */}
      <button type="button" className="theme-toggle-btn" onClick={onToggleTheme}>
        {theme === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
      </button>

      <div className="login-card glass animate-slide-up">
        {/* App Logo */}
        <div className="login-logo-wrapper">
          <div className="login-logo-circle">
            <BarbellIcon size={36} className="login-logo-icon" />
          </div>
          <h1 className="login-title">Gym<span>Wag</span></h1>
          <p className="login-subtitle">Treino & Sincronização em Nuvem</p>
        </div>

        <p className="login-description">
          Para acessar o KademIA e salvar automaticamente suas fichas, peso, altura e histórico de treinos no seu Google Drive, conecte-se com sua conta Google.
        </p>

        {errorMsg && <div className="login-error-banner">{errorMsg}</div>}

        <div className="login-form-area">
          {/* Client ID Entry if not in env */}
          {!envClientId && (
            <div className="input-group login-client-group">
              <div className="label-with-help">
                <label>Google Client ID</label>
                <button 
                  type="button" 
                  className="btn-help-icon" 
                  onClick={() => setShowHelp(!showHelp)}
                  title="Ajuda para configurar credencial"
                >
                  <HelpCircleIcon size={18} />
                </button>
              </div>
              <input 
                type="text" 
                value={customClientId} 
                onChange={(e) => setCustomClientId(e.target.value)} 
                placeholder="Cole seu Client ID aqui"
              />
            </div>
          )}

          {/* Help Block */}
          {showHelp && !envClientId && (
            <div className="help-box glass animate-slide-up">
              <h4>Como criar seu Client ID no Google:</h4>
              <ol>
                <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Google Cloud Console</a>.</li>
                <li>Crie um projeto e configure a "Tela de consentimento OAuth" com os escopos de <code>drive.file</code> e <code>spreadsheets</code>.</li>
                <li>Crie uma credencial de <strong>"ID do cliente OAuth"</strong> para <strong>"Aplicativo da Web"</strong>.</li>
                <li>Em "Origens JavaScript autorizadas", adicione o endereço em que você abre o app (Ex: <code>http://localhost:5173</code>).</li>
                <li>Copie o ID gerado e cole no campo acima.</li>
              </ol>
            </div>
          )}

          {/* Connect Button */}
          <button 
            type="button" 
            className="btn btn-primary login-connect-btn"
            onClick={handleConnectGoogle}
            disabled={isConnecting || (!envClientId && !customClientId)}
          >
            {isConnecting ? (
              <>
                <SyncIcon size={18} className="spinner-animation" />
                Conectando...
              </>
            ) : (
              <>
                {/* Classic Google 'G' logo inside SVG */}
                <svg className="google-logo-svg" width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Entrar com o Google
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .login-screen-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background-color: var(--bg-primary);
          position: relative;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 40px 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 28px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        .login-logo-wrapper {
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .login-logo-circle {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background-color: var(--accent-purple);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .login-logo-icon {
          color: white;
        }

        .login-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1;
        }

        .login-title span {
          color: var(--accent-purple);
        }

        .login-subtitle {
          font-size: 0.88rem;
          color: var(--color-text-secondary);
          margin-top: 4px;
          font-weight: 500;
        }

        .login-description {
          font-size: 0.88rem;
          color: var(--color-text-secondary);
          line-height: 1.45;
          margin-bottom: 24px;
        }

        .login-error-banner {
          width: 100%;
          padding: 10px 12px;
          background-color: rgba(197, 34, 31, 0.08);
          color: var(--status-error);
          border: 1px solid rgba(197, 34, 31, 0.15);
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          margin-bottom: 20px;
          text-align: left;
        }

        .login-form-area {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-client-group {
          text-align: left;
        }

        .label-with-help {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .label-with-help label {
          font-size: 0.78rem;
          color: var(--color-text-secondary);
          font-weight: 600;
        }

        .btn-help-icon {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }

        .login-client-group input {
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background-color: var(--bg-primary);
          color: var(--color-text-primary);
          font-family: var(--font-body);
          font-size: 0.88rem;
          outline: none;
          width: 100%;
        }

        .login-client-group input:focus {
          border-color: var(--border-focus);
        }

        .help-box {
          padding: 12px;
          background-color: var(--bg-card-hover);
          font-size: 0.75rem;
          text-align: left;
        }

        .help-box h4 {
          margin-bottom: 4px;
          font-weight: 600;
        }

        .help-box ol {
          padding-left: 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .help-box a {
          color: var(--accent-purple);
          text-decoration: underline;
        }

        .login-connect-btn {
          width: 100%;
          padding: 14px;
          font-size: 0.95rem;
          border-radius: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .google-logo-svg {
          background: white;
          border-radius: 50%;
          padding: 2px;
        }

        @keyframes spinFast {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .spinner-animation {
          animation: spinFast 1s linear infinite;
        }

        /* Loading Overlay Styles */
        .login-loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 10, 10, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .login-loading-card {
          width: 100%;
          max-width: 320px;
          padding: 35px 25px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 28px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .loader-ring {
          display: inline-block;
          position: relative;
          width: 64px;
          height: 64px;
          margin-bottom: 20px;
        }

        .loader-ring div {
          box-sizing: border-box;
          display: block;
          position: absolute;
          width: 48px;
          height: 48px;
          margin: 8px;
          border: 4px solid var(--accent-purple);
          border-radius: 50%;
          animation: loader-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
          border-color: var(--accent-purple) transparent transparent transparent;
        }

        .loader-ring div:nth-child(1) {
          animation-delay: -0.45s;
        }

        .loader-ring div:nth-child(2) {
          animation-delay: -0.3s;
        }

        .loader-ring div:nth-child(3) {
          animation-delay: -0.15s;
        }

        @keyframes loader-ring {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-step-text {
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: 8px;
          min-height: 24px;
        }

        .loading-subtext {
          font-size: 0.72rem;
          color: var(--color-text-secondary);
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
