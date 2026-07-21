import React, { useState, useEffect } from "react";
import { BarbellIcon, CheckIcon } from "./Icons";

export default function LandingPage({ deferredPrompt, onEnterApp }) {
  const [showModal, setShowModal] = useState(false);
  const [appName, setAppName] = useState("KademIA");
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallingPWA, setIsInstallingPWA] = useState(false);
  const [isInstalledSuccessfully, setIsInstalledSuccessfully] = useState(false);

  useEffect(() => {
    const handleAppInstalled = () => {
      console.log("PWA instalado com sucesso! Preparando tela de conclusão...");
      // Delay of 3.5 seconds to align with actual OS shortcut creation
      setTimeout(() => {
        setIsInstallingPWA(false);
        setIsInstalledSuccessfully(true);
      }, 3500);
    };

    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleCloseTab = () => {
    window.close();
    onEnterApp();
  };

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    // Detect iOS
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Detect if mobile (Android, etc.)
    const mobile = /android|webos|blackberry|iemobile|opera mini/i.test(userAgent);
    setIsMobile(mobile);

    // Detect if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      setIsInstalled(true);
      onEnterApp(); // Auto-enter if already standalone
    }
  }, [onEnterApp]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("Usuário aceitou a instalação");
          setIsInstallingPWA(true);
        } else {
          console.log("Usuário recusou a instalação");
        }
      });
    } else {
      setShowModal(true);
    }
  };

  if (isInstalled) return null;

  return (
    <div className="landing-container animate-fade-in">
      <div className="landing-content glass">
        {isInstalledSuccessfully ? (
          <>
            <div className="landing-logo-wrapper">
              <div className="landing-logo-circle" style={{ backgroundColor: "var(--accent-lime)" }}>
                <CheckIcon size={36} className="landing-logo-icon" />
              </div>
              <h1 className="landing-title">Instalado!</h1>
              <p className="landing-subtitle" style={{ color: "var(--accent-lime)" }}>O KademIA está pronto.</p>
            </div>

            <p className="landing-description" style={{ marginBottom: "30px", fontSize: "0.95rem" }}>
              O aplicativo foi instalado com sucesso no seu dispositivo.
              <br /><br />
              Você já pode fechar esta aba do navegador. Abra o KademIA diretamente pelo ícone criado na tela inicial do seu aparelho para começar a treinar!
            </p>

            <div className="landing-actions">
              <button className="btn btn-primary btn-large" onClick={handleCloseTab}>
                Fechar Página
              </button>
            </div>
          </>
        ) : isInstallingPWA ? (
          <>
            <div className="landing-logo-wrapper">
              <div className="landing-logo-circle">
                <BarbellIcon size={36} className="landing-logo-icon" />
              </div>
              <h1 className="landing-title">Instalando...</h1>
              <p className="landing-subtitle">O KademIA está chegando!</p>
            </div>

            <p className="landing-description" style={{ marginBottom: "30px", fontSize: "0.95rem" }}>
              O aplicativo está sendo adicionado ao seu dispositivo.
              <br /><br />
              Um atalho estará disponível na sua tela principal em instantes. Aguarde a conclusão da instalação...
            </p>

            <div className="landing-actions">
              <button className="btn btn-secondary btn-large" onClick={() => setIsInstallingPWA(false)}>
                Voltar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="landing-logo-wrapper">
              <div className="landing-logo-circle">
                <BarbellIcon size={36} className="landing-logo-icon" />
              </div>
              <h1 className="landing-title">Gym<span>Wag</span></h1>
              <p className="landing-subtitle">Seu treino, no seu ritmo.</p>
            </div>

            <p className="landing-description">
              Gerencie suas rotinas ABCD, registre cargas em tempo real e utilize o timer de descanso inteligente offline de forma simples e rápida.
            </p>

            <div className="landing-actions">
              {/* Always show the Install button on landing page */}
              <button className="btn btn-primary btn-large" onClick={handleInstallClick}>
                Instalar Aplicativo
              </button>

              <button className="btn btn-secondary btn-large" onClick={onEnterApp}>
                Acessar no Navegador
              </button>
            </div>

            <div className="landing-footer">
              Ficha ABCD Inteligente • Funciona Offline
            </div>
          </>
        )}
      </div>

      {/* Modal - Name Choice or iOS/Android/Desktop Instructions */}
      {showModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="modal-content glass animate-slide-up" onClick={(e) => e.stopPropagation()}>
            {isIOS ? (
              <>
                <h3 className="modal-title">Como Instalar no iPhone</h3>
                <p className="modal-text">
                  Como a Apple não permite a instalação direta pelo navegador, siga os passos abaixo:
                </p>
                <ol className="ios-instructions-list">
                  <li>Toque no ícone de <strong>Compartilhar</strong> <span className="ios-icon">⎋</span> (na barra inferior).</li>
                  <li>Role a lista e selecione <strong>Adicionar à Tela de Início</strong>.</li>
                  <li>Escolha o nome desejado para o seu app e toque em <strong>Adicionar</strong>.</li>
                </ol>
                <div className="modal-actions">
                  <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => { setShowModal(false); onEnterApp(); }}>
                    Entendi, Acessar Treino
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="modal-title">
                  {isMobile ? "Instalar no Android" : "Instalar no Computador"}
                </h3>
                <p className="modal-text">
                  Para instalar este aplicativo no seu dispositivo, siga os passos no seu navegador:
                </p>
                <ol className="ios-instructions-list">
                  {isMobile ? (
                    <>
                      <li>Toque no ícone de <strong>menu (três pontos <span className="ios-icon">⋮</span>)</strong> no canto superior direito do navegador.</li>
                      <li>Selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
                      <li>Confirme para ter o atalho na sua tela de início.</li>
                    </>
                  ) : (
                    <>
                      <li>Procure o ícone de <strong>Instalação</strong> (um monitor com seta para baixo ou símbolo de <span className="ios-icon">+</span>) no lado direito da barra de endereços do seu navegador.</li>
                      <li>Ou clique no menu do navegador (três pontos <span className="ios-icon">⋮</span>) e selecione <strong>Instalar KademIA...</strong> ou <strong>Instalar página como aplicativo</strong>.</li>
                    </>
                  )}
                </ol>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Fechar
                  </button>
                  <button className="btn btn-primary" onClick={() => { setShowModal(false); onEnterApp(); }}>
                    Acessar no Navegador
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Landing Page Scoped Styles */}
      <style>{`
        .landing-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background-color: var(--bg-primary);
          position: relative;
          overflow: hidden;
        }

        .landing-content {
          width: 100%;
          max-width: 400px;
          padding: 40px 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 28px; /* Google-like rounded container */
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        .landing-logo-wrapper {
          margin-bottom: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .landing-logo-circle {
          width: 72px;
          height: 72px;
          border-radius: 24px; /* Soft square Google style */
          background-color: var(--accent-purple);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(11, 87, 208, 0.2);
        }

        .landing-logo-icon {
          color: white;
        }

        .landing-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1;
        }

        .landing-title span {
          color: var(--accent-purple);
        }

        .landing-subtitle {
          font-size: 0.95rem;
          color: var(--color-text-secondary);
          margin-top: 6px;
          font-weight: 500;
        }

        .landing-description {
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin-bottom: 35px;
        }

        .landing-actions {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 30px;
        }

        .btn-large {
          width: 100%;
          padding: 14px;
          font-size: 1rem;
          border-radius: 100px;
        }

        .landing-footer {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(31, 31, 31, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .modal-content {
          width: 100%;
          max-width: 380px;
          padding: 28px 24px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 28px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          position: relative;
        }

        .modal-title {
          font-size: 1.25rem;
          color: var(--color-text-primary);
          margin-bottom: 12px;
          text-align: left;
          font-weight: 700;
        }

        .modal-text {
          font-size: 0.88rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin-bottom: 20px;
          text-align: left;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .modal-actions button {
          flex: 1;
        }

        /* iOS Instructions */
        .ios-instructions-list {
          text-align: left;
          color: var(--color-text-secondary);
          font-size: 0.88rem;
          padding-left: 20px;
          margin-bottom: 24px;
        }

        .ios-instructions-list li {
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .ios-icon {
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid var(--border-color);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 1rem;
          color: var(--color-text-primary);
        }

        @keyframes spinFast {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .spinner-animation {
          animation: spinFast 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
