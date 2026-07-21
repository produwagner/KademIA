import React, { useState, useEffect, useRef } from "react";
import { CloudIcon, SyncIcon } from "./Icons";

export default function SyncStatusIndicator({ status, lastSync, isOnline, onSync }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusDetails = () => {
    if (!isOnline) {
      return {
        label: "Sem Internet",
        iconClass: "cloud-offline",
        desc: "O app salvará tudo localmente até a conexão voltar."
      };
    }
    switch (status) {
      case "syncing":
        return {
          label: "Sincronizando...",
          iconClass: "cloud-syncing",
          desc: "Atualizando dados com o Google Drive."
        };
      case "pending":
        return {
          label: "Envio Pendente",
          iconClass: "cloud-pending",
          desc: "Dados salvos localmente. Aguardando conexão ou próxima sincronização."
        };
      case "error":
        return {
          label: "Erro no Sync",
          iconClass: "cloud-error",
          desc: "Falha na conexão com o Drive. Clique em sincronizar para tentar novamente."
        };
      case "synced":
      default:
        return {
          label: "Nuvem Atualizada",
          iconClass: "cloud-synced",
          desc: "Todos os seus dados estão salvos no Google Drive."
        };
    }
  };

  const details = getStatusDetails();

  return (
    <div className="sync-indicator-container" ref={containerRef}>
      <button 
        type="button" 
        className={`sync-indicator-pill ${status} ${!isOnline ? "offline" : ""}`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Status de Sincronização"
      >
        <CloudIcon size={18} className={details.iconClass} />
      </button>

      {isOpen && (
        <div className="sync-tooltip-box glass animate-slide-up">
          <div className="tooltip-header">
            <h4>Sincronização</h4>
            <span className="network-status-badge" style={{ 
              backgroundColor: isOnline ? "rgba(19, 115, 51, 0.08)" : "rgba(197, 34, 31, 0.08)",
              color: isOnline ? "var(--status-success)" : "var(--status-error)"
            }}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          <p className="tooltip-status-desc">
            <strong>{details.label}:</strong> {details.desc}
          </p>

          {lastSync && (
            <div className="tooltip-time">
              Último sync: {lastSync}
            </div>
          )}

          <button 
            type="button" 
            className="btn btn-lime sync-now-btn"
            onClick={async () => {
              if (status === "syncing") return;
              try {
                await onSync();
              } catch (e) {
                // error is handled inside App.jsx and updates status prop
              }
            }}
            disabled={status === "syncing" || !isOnline}
          >
            <SyncIcon size={14} className={status === "syncing" ? "spinner-animation" : ""} />
            {status === "syncing" ? "Sincronizando..." : "Sincronizar Agora"}
          </button>
        </div>
      )}

      <style>{`
        .sync-indicator-container {
          position: relative;
          display: inline-flex;
          z-index: 100;
        }

        .sync-indicator-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          padding: 0;
        }

        .sync-indicator-pill:hover {
          background: var(--bg-card-hover);
          transform: translateY(-1px);
        }

        .sync-indicator-pill svg {
          transition: color 0.4s ease, opacity 0.4s ease;
        }

        .sync-tooltip-box {
          position: absolute;
          top: 44px;
          right: 0;
          width: 240px;
          padding: 14px;
          border-radius: 16px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 101;
        }

        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 6px;
        }

        .tooltip-header h4 {
          font-size: 0.9rem;
          font-weight: 600;
          margin: 0;
          color: var(--color-text-primary);
        }

        .network-status-badge {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .tooltip-status-desc {
          font-size: 0.78rem;
          color: var(--color-text-secondary);
          line-height: 1.35;
          margin: 0;
        }

        .tooltip-time {
          font-size: 0.72rem;
          color: var(--color-text-muted);
        }

        .sync-now-btn {
          width: 100%;
          font-size: 0.8rem;
          padding: 8px 12px;
          margin-top: 4px;
          height: auto;
          min-height: 0;
        }

        /* SVG icon styles and colors changing smoothly */
        .spinner-animation {
          animation: spin 1.5s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .cloud-offline {
          color: var(--color-text-muted);
          opacity: 0.6;
        }
        
        .cloud-error {
          color: var(--status-error);
        }

        .cloud-pending {
          color: var(--status-warning);
        }

        .cloud-synced {
          color: var(--status-success);
        }

        .cloud-syncing {
          color: #4285f4; /* Google Blue */
          animation: pulse-opacity 1.2s infinite alternate ease-in-out;
        }

        @keyframes pulse-opacity {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
