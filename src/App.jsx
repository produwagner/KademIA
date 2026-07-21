import React, { useState, useEffect, useRef } from "react";
import { defaultWorkout } from "./data/defaultWorkout";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import ActiveWorkout from "./components/ActiveWorkout";
import RoutineManager from "./components/RoutineManager";
import History from "./components/History";
import Settings from "./components/Settings";
import LoginScreen from "./components/LoginScreen";
import SyncStatusIndicator from "./components/SyncStatusIndicator";
import { GOOGLE_CLIENT_ID } from "./config";
import { BarbellIcon, CalendarIcon, HistoryIcon, UserIcon, ClipboardIcon } from "./components/Icons";
import { 
  loadGoogleGIS, 
  initTokenClient,
  renewTokenSilently, 
  performFullSync, 
  appendProfile, 
  appendWorkoutSession, 
  syncRoutines,
  syncBidirectional,
  clearProfileHistorySheet,
  clearWorkoutHistorySheet
} from "./services/googleDriveService";

// Helper to deduplicate local history data (both session duplicates and set duplicates)
function deduplicateHistory(historyList) {
  if (!Array.isArray(historyList)) return [];

  const getNormalizedDateKey = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      d.setMilliseconds(0);
      return d.toISOString();
    } catch (e) {
      return dateStr;
    }
  };

  const sessionsMap = {};

  historyList.forEach(session => {
    if (!session) return;
    const key = getNormalizedDateKey(session.date);
    
    if (!sessionsMap[key]) {
      sessionsMap[key] = {
        ...session,
        exercises: Array.isArray(session.exercises) ? session.exercises.map(ex => {
          if (!ex) return ex;
          const seenSets = new Set();
          const uniqueSets = [];
          if (Array.isArray(ex.setsData)) {
            ex.setsData.forEach(set => {
              const num = parseInt(set.setNum) || 1;
              if (!seenSets.has(num)) {
                seenSets.add(num);
                uniqueSets.push(set);
              }
            });
          }
          return {
            ...ex,
            setsData: uniqueSets
          };
        }) : []
      };
    } else {
      const existingSession = sessionsMap[key];
      if (Array.isArray(session.exercises)) {
        session.exercises.forEach(ex => {
          if (!ex) return;
          let existingEx = existingSession.exercises.find(e => e.name === ex.name);
          if (!existingEx) {
            existingEx = {
              name: ex.name,
              sets: ex.sets,
              setsData: []
            };
            existingSession.exercises.push(existingEx);
          }
          if (Array.isArray(ex.setsData)) {
            ex.setsData.forEach(set => {
              const num = parseInt(set.setNum) || 1;
              const hasSet = existingEx.setsData.some(s => (parseInt(s.setNum) || 1) === num);
              if (!hasSet) {
                existingEx.setsData.push(set);
              }
            });
          }
        });
      }
    }
  });

  return Object.values(sessionsMap).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Helper to deduplicate local profile history data
function deduplicateProfileHistory(profileHistoryList) {
  if (!Array.isArray(profileHistoryList)) return [];

  const getNormalizedDateKey = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      d.setMilliseconds(0);
      return d.toISOString();
    } catch (e) {
      return dateStr;
    }
  };

  const profileMap = {};
  profileHistoryList.forEach(item => {
    if (!item) return;
    const key = getNormalizedDateKey(item.date);
    if (!profileMap[key]) {
      profileMap[key] = item;
    }
  });

  return Object.values(profileMap).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Helper to sanitize workoutData and ensure every exercise has a unique ID
function sanitizeWorkoutData(data) {
  if (!data || !Array.isArray(data.routines)) return data;
  return {
    ...data,
    routines: data.routines.map(routine => {
      if (!routine || !Array.isArray(routine.exercises)) return routine;
      return {
        ...routine,
        exercises: routine.exercises.map((ex, idx) => {
          if (!ex) return ex;
          return {
            ...ex,
            id: ex.id || `ex-${routine.id}-${idx + 1}`
          };
        })
      };
    })
  };
}

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, routines, history
  const [hasEnteredApp, setHasEnteredApp] = useState(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      return true;
    }
    return sessionStorage.getItem("kademia_session_entered") === "true" ||
           sessionStorage.getItem("gymrot_session_entered") === "true" ||
           sessionStorage.getItem("fittrack_session_entered") === "true";
  });

  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("kademia_theme") ||
                  localStorage.getItem("gymrot_theme") ||
                  localStorage.getItem("fittrack_theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // PWA Install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.deferredPrompt || null);

  // App Data State
  const [workoutData, setWorkoutData] = useState(() => {
    try {
      const saved = localStorage.getItem("kademia_workout_data") ||
                    localStorage.getItem("gymrot_workout_data") ||
                    localStorage.getItem("fittrack_workout_data");
      const parsed = saved ? JSON.parse(saved) : defaultWorkout;
      return sanitizeWorkoutData(parsed);
    } catch (e) {
      console.error("Erro ao carregar workoutData:", e);
      return defaultWorkout;
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("kademia_history") ||
                    localStorage.getItem("gymrot_history") ||
                    localStorage.getItem("fittrack_history");
      const parsed = saved ? JSON.parse(saved) : [];
      return deduplicateHistory(parsed);
    } catch (e) {
      console.error("Erro ao carregar history:", e);
      return [];
    }
  });

  // Profile State
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("kademia_profile");
      return saved ? JSON.parse(saved) : { name: "Wagner", weight: "", height: "" };
    } catch (e) {
      console.error("Erro ao carregar profile:", e);
      return { name: "Wagner", weight: "", height: "" };
    }
  });

  const [profileHistory, setProfileHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("kademia_profile_history");
      const parsed = saved ? JSON.parse(saved) : [];
      return deduplicateProfileHistory(parsed);
    } catch (e) {
      console.error("Erro ao carregar profileHistory:", e);
      return [];
    }
  });

  // Google Sync Settings State
  const [googleSyncSettings, setGoogleSyncSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("kademia_google_sync");
      return saved ? JSON.parse(saved) : {
        connected: false,
        token: "",
        tokenExpiry: 0,
        email: "",
        userName: "",
        picture: "",
        folderId: "",
        spreadsheetId: "",
        clientId: "",
        autoSync: true
      };
    } catch (e) {
      console.error("Erro ao carregar googleSyncSettings:", e);
      return {
        connected: false,
        token: "",
        tokenExpiry: 0,
        email: "",
        userName: "",
        picture: "",
        folderId: "",
        spreadsheetId: "",
        clientId: "",
        autoSync: true
      };
    }
  });

  // Active workout state (persisted to localStorage)
  const [activeWorkoutRoutine, setActiveWorkoutRoutine] = useState(() => {
    try {
      const saved = localStorage.getItem("kademia_active_routine");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Ref to hold latest state for sync events
  const latestDataRef = useRef({ profileHistory, profile, workoutData, history, googleSyncSettings });
  latestDataRef.current = { profileHistory, profile, workoutData, history, googleSyncSettings };

  // Sync Status States
  const [syncStatus, setSyncStatus] = useState(() => {
    return localStorage.getItem("kademia_sync_status") || "synced";
  });
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem("kademia_last_sync_time") || "";
  });
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  // Exit App Toast confirmation state
  const [showExitMessage, setShowExitMessage] = useState(false);

  // Apply theme class to body
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
    localStorage.setItem("kademia_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Listen to beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPrompt = e;
    };

    const handleCustomPromptEvent = (e) => {
      setDeferredPrompt(e.detail);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-available", handleCustomPromptEvent);

    // Register PWA service worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register(import.meta.env.BASE_URL + "sw.js")
          .then((registration) => {
            console.log("Service Worker registrado com sucesso:", registration.scope);
          })
          .catch((err) => {
            console.log("Falha ao registrar o Service Worker:", err);
          });
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-available", handleCustomPromptEvent);
    };
  }, []);

  // Load Google GIS & handle silent token renewal
  useEffect(() => {
    loadGoogleGIS()
      .then(() => {
        const clientId = GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || googleSyncSettings.clientId;
        if (googleSyncSettings.connected && clientId) {
          const windowGoogleInterval = setInterval(() => {
            if (window.google && window.google.accounts) {
              clearInterval(windowGoogleInterval);
              
              initTokenClient(
                clientId,
                (tokenResponse) => {
                  const token = tokenResponse.access_token;
                  const expiry = Date.now() + tokenResponse.expires_in * 1000;
                  setGoogleSyncSettings(prev => ({
                    ...prev,
                    token,
                    tokenExpiry: expiry
                  }));
                },
                (err) => console.error("Silent client init error:", err)
              );

              // Always verify the session on mount by doing a silent renewal.
              // If it fails because the user logged out of their Google Account, we log out here to show login.
              if (googleSyncSettings.email) {
                renewTokenSilently(googleSyncSettings.email)
                  .then((tokenResponse) => {
                    console.log("Google token renewed and verified silently on mount.");
                    setGoogleSyncSettings(prev => ({
                      ...prev,
                      token: tokenResponse.access_token,
                      tokenExpiry: Date.now() + tokenResponse.expires_in * 1000
                    }));
                  })
                  .catch((err) => {
                    console.warn("Silent token renewal failed on mount:", err);
                    if (err && (err.error === "interaction_required" || err.error === "login_required" || err.error === "consent_required")) {
                      console.log("Google Account session closed. Disconnecting from app to prompt re-login.");
                      setGoogleSyncSettings(prev => ({
                        ...prev,
                        connected: false,
                        token: "",
                        tokenExpiry: 0
                      }));
                    } else {
                      // Offline/network error, clear current token so it retries, but don't disconnect
                      handleTokenExpired();
                    }
                  });
              }
            }
          }, 200);
          return () => clearInterval(windowGoogleInterval);
        }
      })
      .catch((err) => console.error("Error loading Google GIS library:", err));
  }, []);

  // Get valid token (renewing silently if expired)
  const getValidToken = async () => {
    const currentSettings = latestDataRef.current.googleSyncSettings;
    const clientId = GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || currentSettings.clientId;
    if (!currentSettings.connected || !clientId) {
      throw new Error("Google Drive não está conectado.");
    }

    if (currentSettings.token && Date.now() < currentSettings.tokenExpiry - 120000) {
      return currentSettings.token;
    }

    console.log("Token expired or close to expiry. Attempting silent renewal...");
    try {
      const tokenResponse = await renewTokenSilently(currentSettings.email);
      const newToken = tokenResponse.access_token;
      const newExpiry = Date.now() + tokenResponse.expires_in * 1000;

      setGoogleSyncSettings(prev => ({
        ...prev,
        token: newToken,
        tokenExpiry: newExpiry
      }));

      return newToken;
    } catch (err) {
      console.error("Silent token renewal failed:", err);
      handleTokenExpired();
      throw new Error("Sessão do Google Drive expirou. Por favor, acesse a aba Perfil e clique em Conectar novamente.");
    }
  };

  const handleTokenExpired = () => {
    setGoogleSyncSettings(prev => ({
      ...prev,
      token: "",
      tokenExpiry: 0
    }));
  };

  // Wrapper para gerenciar status e logs das tarefas de sincronização no Google Drive
  const runSyncTask = async (taskFn, isSilent = false) => {
    const currentSettings = latestDataRef.current.googleSyncSettings;
    if (!currentSettings.connected) return;
    
    setSyncStatus("syncing");
    localStorage.setItem("kademia_sync_status", "syncing");
    
    try {
      if (!navigator.onLine) {
        throw new Error("offline");
      }
      await taskFn();
      
      setSyncStatus("synced");
      localStorage.setItem("kademia_sync_status", "synced");
      
      const timeStr = new Date().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
      setLastSyncTime(timeStr);
      localStorage.setItem("kademia_last_sync_time", timeStr);
    } catch (err) {
      console.error("Erro na sincronização:", err);
      const isNetworkError = !navigator.onLine || 
                            err.message === "offline" || 
                            err.message.includes("Failed to fetch") || 
                            err.message.includes("NetworkError");
      
      const nextStatus = isNetworkError ? "pending" : "error";
      setSyncStatus(nextStatus);
      localStorage.setItem("kademia_sync_status", nextStatus);
      
      if (!isSilent) {
        throw err;
      }
    }
  };

  // Auto-sincronização bidirecional na abertura do app (montagem) ou ao retornar para o primeiro plano (foreground)
  useEffect(() => {
    let active = true;

    const performAutoSyncOnOpen = async () => {
      const currentSettings = latestDataRef.current.googleSyncSettings;
      if (!currentSettings.connected || !currentSettings.spreadsheetId) return;
      if (currentSettings.autoSync === false) return;

      console.log("Iniciando auto-sincronização de abertura do app...");
      try {
        if (active) {
          await handleSync();
        }
      } catch (err) {
        console.error("Erro na auto-sincronização de abertura:", err);
      }
    };

    // Executa 1.5s após abrir para dar tempo da biblioteca GIS carregar
    const initialSyncTimeout = setTimeout(() => {
      performAutoSyncOnOpen();
    }, 1500);

    // Também executa ao voltar para o app (ex: desbloquear celular ou reabrir aba)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        performAutoSyncOnOpen();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      clearTimeout(initialSyncTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    googleSyncSettings.connected,
    googleSyncSettings.spreadsheetId,
    googleSyncSettings.autoSync
  ]);

  // Monitorar status online/offline e auto-sincronizar se voltar online com sync pendente
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const savedStatus = localStorage.getItem("kademia_sync_status");
      if (savedStatus === "pending" && googleSyncSettings.connected) {
        console.log("Conexão restabelecida! Sincronizando dados pendentes...");
        handleSync();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [googleSyncSettings.connected]);

  // Intercept PWA back button
  const navigationStateRef = useRef({ activeTab, activeWorkoutRoutine });
  useEffect(() => {
    navigationStateRef.current = { activeTab, activeWorkoutRoutine };
  }, [activeTab, activeWorkoutRoutine]);

  useEffect(() => {
    if (!hasEnteredApp || !googleSyncSettings.connected) {
      return;
    }

    // Push dummy state to handle back navigation control
    window.history.pushState({ noBackExits: true }, "");

    let lastBackPress = 0;
    let toastTimeout = null;

    const handlePopState = (event) => {
      const currentTab = navigationStateRef.current.activeTab;
      const isWorkoutActive = navigationStateRef.current.activeWorkoutRoutine;

      // 1. If active workout, verify cancel intent
      if (isWorkoutActive) {
        window.history.pushState({ noBackExits: true }, "");
        if (window.confirm("Deseja realmente cancelar este treino? Os dados digitados serão perdidos.")) {
          setActiveWorkoutRoutine(null);
          setActiveTab("dashboard");
        }
        return;
      }

      // 2. If not on dashboard, return to dashboard
      if (currentTab !== "dashboard") {
        window.history.pushState({ noBackExits: true }, "");
        setActiveTab("dashboard");
        return;
      }

      // 3. Double tap back button to exit
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        window.history.go(-2);
      } else {
        lastBackPress = now;
        window.history.pushState({ noBackExits: true }, "");
        
        setShowExitMessage(true);
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
          setShowExitMessage(false);
        }, 2000);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      clearTimeout(toastTimeout);
    };
  }, [hasEnteredApp, googleSyncSettings.connected]);

  // Save state changes to localStorage
  useEffect(() => {
    localStorage.setItem("kademia_workout_data", JSON.stringify(workoutData));

    // Debounced routines auto-sync to Sheets if connected
    if (googleSyncSettings.connected && googleSyncSettings.spreadsheetId) {
      const syncDebounce = setTimeout(() => {
        runSyncTask(async () => {
          const token = await getValidToken();
          await syncRoutines(token, googleSyncSettings.spreadsheetId, workoutData, handleTokenExpired);
          console.log("Rotinas sincronizadas com Google Sheets.");
        }, true);
      }, 2000);
      return () => clearTimeout(syncDebounce);
    }
  }, [workoutData, googleSyncSettings.connected, googleSyncSettings.spreadsheetId]);

  useEffect(() => {
    localStorage.setItem("kademia_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("kademia_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("kademia_profile_history", JSON.stringify(profileHistory));
  }, [profileHistory]);

  useEffect(() => {
    localStorage.setItem("kademia_google_sync", JSON.stringify(googleSyncSettings));
  }, [googleSyncSettings]);

  useEffect(() => {
    if (activeWorkoutRoutine) {
      localStorage.setItem("kademia_active_routine", JSON.stringify(activeWorkoutRoutine));
    } else {
      localStorage.removeItem("kademia_active_routine");
    }
  }, [activeWorkoutRoutine]);

  const handleUpdateProfile = async (newProfile) => {
    // Check if weight or height changed to add to history log
    const weightChanged = newProfile.weight !== profile.weight && newProfile.weight !== "";
    const heightChanged = newProfile.height !== profile.height && newProfile.height !== "";

    let updatedHistory = [...profileHistory];
    if (weightChanged || heightChanged || updatedHistory.length === 0) {
      updatedHistory.push({
        date: new Date().toISOString(),
        name: newProfile.name,
        weight: newProfile.weight,
        height: newProfile.height
      });
      setProfileHistory(updatedHistory);
    }

    setProfile(newProfile);

    // Sync profile to Google Sheets if connected
    if (googleSyncSettings.connected && googleSyncSettings.spreadsheetId) {
      runSyncTask(async () => {
        const token = await getValidToken();
        await appendProfile(token, googleSyncSettings.spreadsheetId, newProfile, handleTokenExpired);
        console.log("Medidas de perfil enviadas para o Google Sheets.");
      }, true);
    }
  };

  const handleUpdateGoogleSyncSettings = (newSettings) => {
    // If we were disconnected and are now connecting, reset deletion watermarks
    if (newSettings.connected && !googleSyncSettings.connected) {
      localStorage.removeItem("kademia_profile_history_cleared_at");
      localStorage.removeItem("kademia_workout_history_cleared_at");
    }
    setGoogleSyncSettings(newSettings);
  };

  const handleClearProfileHistory = () => {
    setProfileHistory([]);
    const clearedAt = new Date().toISOString();
    localStorage.setItem("kademia_profile_history_cleared_at", clearedAt);

    // If connected to Google Drive, clear the remote sheet immediately
    if (googleSyncSettings.connected && googleSyncSettings.spreadsheetId) {
      runSyncTask(async () => {
        const token = await getValidToken();
        await clearProfileHistorySheet(token, googleSyncSettings.spreadsheetId, handleTokenExpired);
        console.log("Histórico de Medidas limpo no Google Drive.");
      }, true);
    }
  };

  const handleImportBackup = async (importedData) => {
    localStorage.removeItem("kademia_profile_history_cleared_at");
    localStorage.removeItem("kademia_workout_history_cleared_at");

    if (importedData.kademia_workout_data) {
      setWorkoutData(importedData.kademia_workout_data);
      localStorage.setItem("kademia_workout_data", JSON.stringify(importedData.kademia_workout_data));
    }
    if (importedData.kademia_history) {
      const cleanHistory = deduplicateHistory(importedData.kademia_history);
      setHistory(cleanHistory);
      localStorage.setItem("kademia_history", JSON.stringify(cleanHistory));
    }
    if (importedData.kademia_profile) {
      setProfile(importedData.kademia_profile);
      localStorage.setItem("kademia_profile", JSON.stringify(importedData.kademia_profile));
    }
    if (importedData.kademia_profile_history) {
      const cleanProfileHistory = deduplicateProfileHistory(importedData.kademia_profile_history);
      setProfileHistory(cleanProfileHistory);
      localStorage.setItem("kademia_profile_history", JSON.stringify(cleanProfileHistory));
    }

    alert("Backup importado com sucesso!");

    if (googleSyncSettings.connected) {
      setTimeout(() => {
        handleSync();
      }, 500);
    }
  };

  const handleUpdateWorkoutData = (newDataOrFn) => {
    setWorkoutData((prev) => {
      const nextData = typeof newDataOrFn === "function" ? newDataOrFn(prev) : newDataOrFn;
      return {
        ...nextData,
        lastUpdated: new Date().toISOString()
      };
    });
  };

  const handleSync = async () => {
    await runSyncTask(async () => {
      const token = await getValidToken();
      const result = await syncBidirectional(
        token,
        googleSyncSettings.spreadsheetId,
        latestDataRef.current.profileHistory,
        latestDataRef.current.profile,
        latestDataRef.current.workoutData,
        latestDataRef.current.history,
        handleTokenExpired
      );
      if (result) {
        setHistory(result.history);
        setProfileHistory(result.profileHistory);
        setProfile(result.profile);
        const cleanWorkoutData = sanitizeWorkoutData(result.workoutData);
        setWorkoutData(cleanWorkoutData);

        localStorage.setItem("kademia_history", JSON.stringify(result.history));
        localStorage.setItem("kademia_profile_history", JSON.stringify(result.profileHistory));
        localStorage.setItem("kademia_profile", JSON.stringify(result.profile));
        localStorage.setItem("kademia_workout_data", JSON.stringify(cleanWorkoutData));
      }
    });
  };

  const handleEnterApp = () => {
    setHasEnteredApp(true);
    sessionStorage.setItem("kademia_session_entered", "true");
  };

  const handleStartWorkout = (routine) => {
    setActiveWorkoutRoutine(routine);
  };

  const handleSaveWorkout = async (sessionData) => {
    // Add new session to history
    setHistory((prev) => [sessionData, ...prev]);

    // Update loads in the workout data so they are pre-loaded next time
    const updatedRoutines = workoutData.routines.map((routine) => {
      if (routine.id !== sessionData.routineId) return routine;
      
      return {
        ...routine,
        exercises: routine.exercises.map((ex) => {
          // Find matching exercise in finished session
          const finishedEx = sessionData.exercises.find((fe) => fe.name === ex.name);
          if (finishedEx && finishedEx.setsData) {
            // Find max load or last set load
            const loads = finishedEx.setsData.map((s) => s.load).filter(Boolean);
            if (loads.length > 0) {
              return {
                ...ex,
                load: loads[loads.length - 1] // Save last set's load
              };
            }
          }
          return ex;
        })
      };
    });

    handleUpdateWorkoutData((prev) => ({
      ...prev,
      routines: updatedRoutines
    }));

    setActiveWorkoutRoutine(null);
    setActiveTab("dashboard");

    // Sync finished session to Google Drive if connected and autoSync is enabled
    if (googleSyncSettings.connected && googleSyncSettings.autoSync !== false) {
      runSyncTask(async () => {
        console.log("Iniciando auto-sincronização do treino finalizado...");
        const token = await getValidToken();
        await appendWorkoutSession(token, googleSyncSettings.spreadsheetId, sessionData, handleTokenExpired);
        console.log("Treino sincronizado com o Google Sheets!");
      }, true).catch((err) => {
        alert("Treino salvo localmente no aparelho, mas ocorreu um erro ao sincronizar com a planilha do Google: " + err.message);
      });
    }
  };

  const handleCancelWorkout = () => {
    if (window.confirm("Deseja realmente cancelar este treino? Os dados digitados serão perdidos.")) {
      setActiveWorkoutRoutine(null);
      localStorage.removeItem("kademia_active_workout_state");
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    const clearedAt = new Date().toISOString();
    localStorage.setItem("kademia_workout_history_cleared_at", clearedAt);

    // If connected to Google Drive, clear the remote sheet immediately
    if (googleSyncSettings.connected && googleSyncSettings.spreadsheetId) {
      runSyncTask(async () => {
        const token = await getValidToken();
        await clearWorkoutHistorySheet(token, googleSyncSettings.spreadsheetId, handleTokenExpired);
        console.log("Histórico de Treinos limpo no Google Drive.");
      }, true);
    }
  };

  // Render navigation tab contents
  const renderTabContent = () => {
    const syncProps = googleSyncSettings.connected ? {
      status: syncStatus,
      lastSync: lastSyncTime,
      isOnline,
      onSync: handleSync
    } : null;

    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            workoutData={workoutData}
            history={history}
            onStartWorkout={handleStartWorkout}
            onSetActiveTab={setActiveTab}
            profile={profile}
            syncProps={syncProps}
          />
        );
      case "routines":
        return (
          <RoutineManager
            workoutData={workoutData}
            onUpdateWorkoutData={handleUpdateWorkoutData}
            syncProps={syncProps}
          />
        );
      case "history":
        return (
          <History
            history={history}
            onClearHistory={handleClearHistory}
            syncProps={syncProps}
          />
        );
      case "settings":
        return (
          <Settings
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            profileHistory={profileHistory}
            onClearProfileHistory={handleClearProfileHistory}
            theme={theme}
            onToggleTheme={toggleTheme}
            googleSyncSettings={googleSyncSettings}
            onUpdateGoogleSyncSettings={handleUpdateGoogleSyncSettings}
            onSync={handleSync}
            workoutData={workoutData}
            history={history}
            onTriggerExpiredSession={handleTokenExpired}
            onImportBackup={handleImportBackup}
            onClearHistory={handleClearHistory}
            syncProps={syncProps}
          />
        );
      default:
        return (
          <Dashboard
            workoutData={workoutData}
            history={history}
            onStartWorkout={handleStartWorkout}
            onSetActiveTab={setActiveTab}
            profile={profile}
          />
        );
    }
  };

  // If they are on the landing page, show it
  if (!hasEnteredApp) {
    return (
      <LandingPage
        deferredPrompt={deferredPrompt}
        onEnterApp={handleEnterApp}
      />
    );
  }

  // If they entered the app but are not logged into Google Drive, show the Login Screen
  if (hasEnteredApp && !googleSyncSettings.connected) {
    return (
      <LoginScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        googleSyncSettings={googleSyncSettings}
        onUpdateGoogleSyncSettings={handleUpdateGoogleSyncSettings}
        onUpdateProfile={handleUpdateProfile}
        profile={profile}
      />
    );
  }

  // If in an active workout session
  if (activeWorkoutRoutine) {
    return (
      <div className="app-container">
        <ActiveWorkout
          routine={activeWorkoutRoutine}
          history={history}
          onSaveWorkout={handleSaveWorkout}
          onCancelWorkout={handleCancelWorkout}
        />
      </div>
    );
  }

  return (
    <div className="app-container animate-fade-in">
      {/* Main View Area */}
      <main className="app-main-content">
        {renderTabContent()}
      </main>

      {/* Bottom Nav Bar */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <BarbellIcon size={20} />
          <span>Treinar</span>
        </button>

        <button
          className={`nav-item ${activeTab === "routines" ? "active" : ""}`}
          onClick={() => setActiveTab("routines")}
        >
          <ClipboardIcon size={20} />
          <span>Fichas</span>
        </button>

        <button
          className={`nav-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <CalendarIcon size={20} />
          <span>Histórico</span>
        </button>

        <button
          className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <UserIcon size={20} />
          <span>Perfil</span>
        </button>
      </nav>

      {/* Floating Exit confirmation toast */}
      {showExitMessage && (
        <div className="exit-toast animate-fade-in">
          Pressione voltar novamente para sair
        </div>
      )}

      {/* Bottom Nav Scoped Styles */}
      <style>{`
        .app-main-content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 20px;
        }

        .bottom-nav {
          position: fixed;
          bottom: 16px;
          left: 16px;
          right: 16px;
          height: 66px;
          max-width: 448px; /* 480px minus padding */
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-around;
          border-radius: 24px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.08);
          z-index: 99;
          
          /* Liquidglass Effect */
          background: var(--nav-bg);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid var(--nav-border);
          transition: all 0.3s ease;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: none;
          border: none;
          color: var(--color-text-secondary);
          cursor: pointer;
          font-family: var(--font-body);
          font-size: 0.7rem;
          font-weight: 600;
          transition: all 0.2s;
          padding: 8px 10px;
          border-radius: 12px;
        }

        .nav-item:hover {
          color: var(--color-text-primary);
        }

        .nav-item.active {
          color: var(--accent-purple);
        }

        /* Exit Toast Styles */
        .exit-toast {
          position: fixed;
          bottom: 96px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(30, 30, 30, 0.9);
          color: #ffffff;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
          z-index: 1000;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          white-space: nowrap;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
