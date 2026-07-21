/**
 * Google Drive & Sheets API Integration Service for KademIA
 * Handles OAuth2 client-side implicit flow, silent token renewal,
 * folder/file creation, and read/write operations for Google Sheets.
 */

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "profile",
  "email"
];

let tokenClient = null;

/**
 * Dynamically loads the Google Identity Services (GIS) client script.
 */
export function loadGoogleGIS() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("Google Identity Services script loaded successfully.");
      resolve();
    };
    script.onerror = (err) => {
      console.error("Failed to load Google Identity Services script:", err);
      reject(err);
    };
    document.body.appendChild(script);
  });
}

/**
 * Initializes the OAuth2 token client.
 * @param {string} clientId - The Google OAuth Client ID
 * @param {function} onTokenReceived - Callback when token is obtained
 * @param {function} onError - Callback on error
 */
export function initTokenClient(clientId, onTokenReceived, onError) {
  if (!window.google || !window.google.accounts) {
    if (onError) onError(new Error("GIS client not loaded yet."));
    return;
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES.join(" "),
    callback: (tokenResponse) => {
      if (tokenResponse.error_description) {
        console.error("GIS Error:", tokenResponse.error_description);
        if (onError) onError(new Error(tokenResponse.error_description));
        return;
      }
      if (tokenResponse.access_token) {
        onTokenReceived(tokenResponse);
      }
    },
  });
}

/**
 * Requests an access token interactively (opens popup).
 */
export function requestAccessToken() {
  if (!tokenClient) {
    throw new Error("Token client not initialized. Call initTokenClient first.");
  }
  tokenClient.requestAccessToken();
}

/**
 * Renews the access token silently in the background (no popup).
 * Only works if the user has already consented and is logged into Google.
 * @param {string} emailHint - The user's Google email address to improve reliability.
 */
export function renewTokenSilently(emailHint) {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error("Token client not initialized."));
      return;
    }

    // Set callback temporarily for silent request
    const originalCallback = tokenClient.callback;
    tokenClient.callback = (tokenResponse) => {
      // Restore original callback
      tokenClient.callback = originalCallback;
      
      if (tokenResponse.error) {
        console.warn("Silent token renewal failed:", tokenResponse.error);
        reject(tokenResponse);
        return;
      }
      if (tokenResponse.access_token) {
        resolve(tokenResponse);
      } else {
        reject(new Error("No access token returned."));
      }
    };

    tokenClient.requestAccessToken({
      prompt: "none",
      login_hint: emailHint || ""
    });
  });
}

/**
 * Fetches the user profile details from Google UserInfo endpoint.
 * @param {string} token - OAuth2 access token
 */
export async function fetchGoogleUserInfo(token) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error("Failed to fetch user info");
  }
  return await res.json();
}

/**
 * Helper to execute authorized Google API requests, auto-retrying on 401 if a renewal is possible.
 */
async function apiFetch(url, options = {}, token, onTokenExpired) {
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    console.warn("Google API returned 401 Unauthorized.");
    if (onTokenExpired) {
      // Trigger token expiration callback so the app knows it needs reconnection
      onTokenExpired();
    }
    throw new Error("Sessão expirada. Por favor, conecte novamente com o Google Drive.");
  }
  if (!res.ok) {
    const errText = await res.text();
    console.error(`API Error on ${url}:`, errText);
    throw new Error(`Google API error: ${res.statusText}`);
  }
  return res;
}

/**
 * Searches for a folder named "KademIA" or creates it if not found.
 */
export async function getOrCreateFolder(token, onTokenExpired) {
  // 1. Search for existing KademIA folder
  const query = encodeURIComponent("name='KademIA' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const urlSearch = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  const resSearch = await apiFetch(urlSearch, { method: "GET" }, token, onTokenExpired);
  const searchResult = await resSearch.json();

  if (searchResult.files && searchResult.files.length > 0) {
    console.log("Found existing KademIA folder ID:", searchResult.files[0].id);
    return searchResult.files[0].id;
  }

  // 2. Create KademIA folder
  console.log("Creating new KademIA folder...");
  const urlCreate = "https://www.googleapis.com/drive/v3/files";
  const resCreate = await apiFetch(urlCreate, {
    method: "POST",
    body: JSON.stringify({
      name: "KademIA",
      mimeType: "application/vnd.google-apps.folder"
    })
  }, token, onTokenExpired);
  const createResult = await resCreate.json();
  console.log("Created KademIA folder ID:", createResult.id);
  return createResult.id;
}

/**
 * Searches for or creates the Google Sheet inside the KademIA folder.
 */
export async function getOrCreateSpreadsheet(token, folderId, onTokenExpired) {
  // 1. Search for KademIA spreadsheet inside folder
  const query = encodeURIComponent(`name='KademIA' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents and trashed=false`);
  const urlSearch = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  const resSearch = await apiFetch(urlSearch, { method: "GET" }, token, onTokenExpired);
  const searchResult = await resSearch.json();

  if (searchResult.files && searchResult.files.length > 0) {
    console.log("Found existing KademIA Sheet ID:", searchResult.files[0].id);
    return searchResult.files[0].id;
  }

  // 2. Create Sheet
  console.log("Creating new KademIA Google Sheet...");
  const urlCreate = "https://www.googleapis.com/drive/v3/files";
  const resCreate = await apiFetch(urlCreate, {
    method: "POST",
    body: JSON.stringify({
      name: "KademIA",
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [folderId]
    })
  }, token, onTokenExpired);
  const createResult = await resCreate.json();
  const spreadsheetId = createResult.id;
  console.log("Created KademIA Sheet ID:", spreadsheetId);

  // 3. Initialize Spreadsheet layout (rename default page, add pages, and write headers)
  await initializeSpreadsheetLayout(token, spreadsheetId, onTokenExpired);
  return spreadsheetId;
}

/**
 * Initializes the layout of the Google Sheet with three tabs: Perfil, Fichas, Histórico de Treinos.
 */
async function initializeSpreadsheetLayout(token, spreadsheetId, onTokenExpired) {
  console.log("Initializing Sheet tabs layout...");
  
  // Get current sheets inside spreadsheet to rename the default one
  const urlMeta = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`;
  const resMeta = await apiFetch(urlMeta, { method: "GET" }, token, onTokenExpired);
  const meta = await resMeta.json();
  
  const currentSheets = meta.sheets || [];
  const firstSheetId = currentSheets[0]?.properties?.sheetId ?? 0;
  const firstSheetTitle = currentSheets[0]?.properties?.title || "";

  // Prepare batch requests
  const requests = [];

  // Rename first sheet if it exists and is not named "Perfil"
  if (firstSheetTitle !== "Perfil") {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: firstSheetId,
          title: "Perfil"
        },
        fields: "title"
      }
    });
  }

  // Check if Fichas and Histórico de Treinos exist, if not, add them
  const hasFichas = currentSheets.some(s => s.properties.title === "Fichas");
  const hasHist = currentSheets.some(s => s.properties.title === "Histórico de Treinos");

  if (!hasFichas) {
    requests.push({
      addSheet: {
        properties: {
          title: "Fichas"
        }
      }
    });
  }

  if (!hasHist) {
    requests.push({
      addSheet: {
        properties: {
          title: "Histórico de Treinos"
        }
      }
    });
  }

  if (requests.length > 0) {
    const urlBatch = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    await apiFetch(urlBatch, {
      method: "POST",
      body: JSON.stringify({ requests })
    }, token, onTokenExpired);
  }

  // Write headers to sheets in a single batch values update
  console.log("Writing headers to Sheet tabs...");
  const urlHeaders = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  await apiFetch(urlHeaders, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: "Perfil!A1:D1",
          values: [["Data de Sincronização", "Nome", "Peso (kg)", "Altura (cm)"]]
        },
        {
          range: "Fichas!A1:G1",
          values: [["ID Ficha", "Nome da Ficha", "Exercício", "Séries", "Repetições", "Carga Padrão (kg)", "Última Atualização"]]
        },
        {
          range: "Histórico de Treinos!A1:K1",
          values: [["Data/Hora", "ID Ficha", "Nome da Ficha", "Exercício", "Séries Feitas", "Série Número", "Carga (kg)", "Repetições Feitas", "Concluído", "Duração (min)", "Observações"]]
        }
      ]
    })
  }, token, onTokenExpired);
  console.log("Sheet layout initialized successfully.");
}

/**
 * Appends a new profile measurement row to the "Perfil" sheet.
 */
export async function appendProfile(token, spreadsheetId, profileData, onTokenExpired) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Perfil!A:D:append?valueInputOption=USER_ENTERED`;
  const dateStr = new Date().toLocaleString("pt-BR");
  const values = [[
    dateStr,
    profileData.name || "",
    profileData.weight || "",
    profileData.height || ""
  ]];

  await apiFetch(url, {
    method: "POST",
    body: JSON.stringify({ values })
  }, token, onTokenExpired);
}

/**
 * Clears all rows in the "Perfil" sheet (except header).
 */
export async function clearProfileHistorySheet(token, spreadsheetId, onTokenExpired) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Perfil!A2:D10000:clear`;
  await apiFetch(url, { method: "POST" }, token, onTokenExpired);
}

/**
 * Clears all rows in the "Histórico de Treinos" sheet (except header).
 */
export async function clearWorkoutHistorySheet(token, spreadsheetId, onTokenExpired) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Histórico de Treinos!A2:K10000:clear`;
  await apiFetch(url, { method: "POST" }, token, onTokenExpired);
}

/**
 * Clears and rewrites all Routines (Fichas) in the "Fichas" sheet.
 */
export async function syncRoutines(token, spreadsheetId, workoutData, onTokenExpired) {
  // 1. Clear previous routine rows
  const urlClear = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Fichas!A2:G1000:clear`;
  await apiFetch(urlClear, { method: "POST" }, token, onTokenExpired);

  // 2. Format routines to rows
  const rows = [];
  if (workoutData && workoutData.routines) {
    workoutData.routines.forEach((routine, rIdx) => {
      if (routine.exercises) {
        routine.exercises.forEach((ex, exIdx) => {
          const isFirstRow = rIdx === 0 && exIdx === 0;
          rows.push([
            routine.id,
            routine.name,
            ex.name,
            ex.sets,
            ex.reps,
            ex.load || "",
            isFirstRow ? (workoutData.lastUpdated || new Date().toISOString()) : ""
          ]);
        });
      }
    });
  }

  if (rows.length === 0) return;

  // 3. Write new rows
  const urlWrite = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Fichas!A2?valueInputOption=USER_ENTERED`;
  await apiFetch(urlWrite, {
    method: "PUT",
    body: JSON.stringify({ values: rows })
  }, token, onTokenExpired);
}

/**
 * Appends a finished workout session to the "Histórico de Treinos" sheet.
 */
export async function appendWorkoutSession(token, spreadsheetId, session, onTokenExpired) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Histórico de Treinos!A:K:append?valueInputOption=USER_ENTERED`;
  const rows = [];
  const dateStr = new Date(session.date).toLocaleString("pt-BR");

  if (session.exercises) {
    for (const ex of session.exercises) {
      if (ex.setsData) {
        for (const set of ex.setsData) {
          rows.push([
            dateStr,
            session.routineId,
            session.routineName,
            ex.name,
            ex.sets,
            set.setNum,
            set.load || "",
            set.reps || "",
            set.completed ? "Sim" : "Não",
            session.duration || "",
            session.notes || ""
          ]);
        }
      }
    }
  }

  if (rows.length === 0) return;

  await apiFetch(url, {
    method: "POST",
    body: JSON.stringify({ values: rows })
  }, token, onTokenExpired);
}

/**
 * Performs a full sync of all local data to the Google Sheets.
 * Overwrites everything to ensure perfect consistency.
 */
export async function performFullSync(token, spreadsheetId, profileHistory, currentProfile, workoutData, history, onTokenExpired) {
  console.log("Starting full synchronization to Google Sheets...");

  // 1. Batch Clear all three sheets data ranges (except headers)
  const urlClear = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`;
  await apiFetch(urlClear, {
    method: "POST",
    body: JSON.stringify({
      ranges: [
        "Perfil!A2:D10000",
        "Fichas!A2:F1000",
        "Histórico de Treinos!A2:K10000"
      ]
    })
  }, token, onTokenExpired);

  // 2. Prepare Profile rows
  const profileRows = [];
  if (profileHistory && profileHistory.length > 0) {
    profileHistory.forEach(item => {
      const dStr = new Date(item.date).toLocaleString("pt-BR");
      profileRows.push([dStr, item.name || "", item.weight || "", item.height || ""]);
    });
  } else if (currentProfile && (currentProfile.name || currentProfile.weight || currentProfile.height)) {
    // Fallback if history is empty, write current profile
    const dStr = new Date().toLocaleString("pt-BR");
    profileRows.push([dStr, currentProfile.name || "", currentProfile.weight || "", currentProfile.height || ""]);
  }

  // 3. Prepare Routines rows
  const routineRows = [];
  if (workoutData && workoutData.routines) {
    workoutData.routines.forEach(routine => {
      if (routine.exercises) {
        routine.exercises.forEach(ex => {
          routineRows.push([
            routine.id,
            routine.name,
            ex.name,
            ex.sets,
            ex.reps,
            ex.load || ""
          ]);
        });
      }
    });
  }

  // 4. Prepare Workout History rows (reversed order so oldest are appended first, matching spreadsheet log flow)
  const workoutRows = [];
  const sortedHistory = [...history].reverse(); // oldest first
  sortedHistory.forEach(session => {
    const dStr = new Date(session.date).toLocaleString("pt-BR");
    if (session.exercises) {
      session.exercises.forEach(ex => {
        if (ex.setsData) {
          ex.setsData.forEach(set => {
            workoutRows.push([
              dStr,
              session.routineId,
              session.routineName,
              ex.name,
              ex.sets,
              set.setNum,
              set.load || "",
              set.reps || "",
              set.completed ? "Sim" : "Não",
              session.duration || "",
              session.notes || ""
            ]);
          });
        }
      });
    }
  });

  // 5. Batch Update values
  const urlUpdate = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const updates = [];

  if (profileRows.length > 0) {
    updates.push({
      range: "Perfil!A2",
      values: profileRows
    });
  }
  if (routineRows.length > 0) {
    updates.push({
      range: "Fichas!A2",
      values: routineRows
    });
  }
  if (workoutRows.length > 0) {
    updates.push({
      range: "Histórico de Treinos!A2",
      values: workoutRows
    });
  }

  if (updates.length > 0) {
    await apiFetch(urlUpdate, {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: updates
      })
    }, token, onTokenExpired);
  }

  console.log("Full synchronization completed successfully!");
}

/**
 * Performs a smart bidirectional synchronization.
 * Pulls, merges history/profiles/routines, and writes back the resolved state.
 */
export async function syncBidirectional(token, spreadsheetId, profileHistory, currentProfile, workoutData, history, onTokenExpired) {
  console.log("Iniciando sincronização inteligente bidirecional...");

  // 1. Fetch all sheet ranges in a single batchGet call
  const urlGet = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=Perfil!A2:D10000&ranges=Fichas!A2:G1000&ranges=Histórico de Treinos!A2:K10000`;
  const resGet = await apiFetch(urlGet, {}, token, onTokenExpired);
  const dataGet = await resGet.json();

  const rowsProfile = dataGet.valueRanges[0].values || [];
  const rowsRoutines = dataGet.valueRanges[1].values || [];
  const rowsHistory = dataGet.valueRanges[2].values || [];

  // Helper to parse dd/mm/yyyy, hh:mm:ss
  const parseDateStr = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.trim().split(/[\s,]+/);
    const dateParts = parts[0].split("/");
    const timeParts = parts[1] ? parts[1].split(":") : ["00", "00", "00"];
    
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    
    const hour = parseInt(timeParts[0], 10) || 0;
    const minute = parseInt(timeParts[1], 10) || 0;
    const second = parseInt(timeParts[2], 10) || 0;
    
    return new Date(year, month, day, hour, minute, second);
  };

  // Helper to normalize date strings to ISO strings with milliseconds set to 0.
  // This prevents duplication issues when merging dates that were stripped of millisecond precision.
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

  // 2. Profile History Smart Merge
  const profileHistoryClearedAt = localStorage.getItem("kademia_profile_history_cleared_at");
  const parsedProfileHistory = rowsProfile.map(row => {
    const [date, name, weight, height] = row;
    if (!date) return null;
    const isoDate = parseDateStr(date).toISOString();
    // Ignore sheet records deleted before the watermark
    if (profileHistoryClearedAt && new Date(isoDate) <= new Date(profileHistoryClearedAt)) {
      return null;
    }
    return {
      date: isoDate,
      name: name || "",
      weight: weight ? parseFloat(weight) : "",
      height: height ? parseFloat(height) : ""
    };
  }).filter(Boolean);

  const profileMap = {};
  profileHistory.forEach(item => {
    const key = getNormalizedDateKey(item.date);
    profileMap[key] = item;
  });
  parsedProfileHistory.forEach(item => {
    const key = getNormalizedDateKey(item.date);
    if (profileMap[key]) {
      // Keep the local date with milliseconds if available
      item.date = profileMap[key].date;
    }
    profileMap[key] = item;
  });

  const mergedProfileHistory = Object.values(profileMap).sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestProfile = mergedProfileHistory[0] || { name: "", weight: "", height: "" };
  const mergedProfile = {
    name: latestProfile.name || currentProfile.name || "",
    weight: latestProfile.weight || currentProfile.weight || "",
    height: latestProfile.height || currentProfile.height || ""
  };

  // 3. Workout History Smart Merge
  const workoutHistoryClearedAt = localStorage.getItem("kademia_workout_history_cleared_at");
  const sessionsMap = {};
  rowsHistory.forEach(row => {
    const [date, routineId, routineName, exName, exSets, setNum, load, reps, completed, duration, notes] = row;
    if (!date) return;

    const isoDate = parseDateStr(date).toISOString();
    // Ignore sheet records deleted before the watermark
    if (workoutHistoryClearedAt && new Date(isoDate) <= new Date(workoutHistoryClearedAt)) {
      return;
    }

    if (!sessionsMap[isoDate]) {
      sessionsMap[isoDate] = {
        routineId: routineId || "",
        routineName: routineName || "",
        date: isoDate,
        duration: parseInt(duration) || 0,
        notes: notes || "",
        exercises: []
      };
    }

    const session = sessionsMap[isoDate];
    let exercise = session.exercises.find(e => e.name === exName);
    if (!exercise) {
      exercise = {
        name: exName,
        sets: parseInt(exSets) || 1,
        setsData: []
      };
      session.exercises.push(exercise);
    }

    const setNumInt = parseInt(setNum) || 1;
    const hasSet = exercise.setsData.some(s => s.setNum === setNumInt);
    if (!hasSet) {
      exercise.setsData.push({
        setNum: setNumInt,
        load: load || "",
        reps: reps || "",
        completed: completed === "Sim"
      });
    }
  });

  const sheetHistoryList = Object.values(sessionsMap);
  const historyMap = {};
  history.forEach(session => {
    const key = getNormalizedDateKey(session.date);
    historyMap[key] = session;
  });
  sheetHistoryList.forEach(session => {
    const key = getNormalizedDateKey(session.date);
    if (historyMap[key]) {
      // Keep the local date with milliseconds if available
      session.date = historyMap[key].date;
    }
    historyMap[key] = session;
  });

  const mergedHistory = Object.values(historyMap).sort((a, b) => new Date(b.date) - new Date(a.date));

  // 4. Routines (Fichas) Smart Merge
  const sheetRoutinesTimestamp = rowsRoutines[0] && rowsRoutines[0][6] ? rowsRoutines[0][6] : null;
  const localRoutinesTimestamp = workoutData.lastUpdated || null;

  let finalWorkoutData = { ...workoutData };
  let shouldRewriteSheetRoutines = false;

  const reconstructRoutinesFromRows = (rows, timestamp) => {
    const routinesMap = {};
    rows.forEach(row => {
      const [routineId, routineName, exName, exSets, exReps, exLoad] = row;
      if (!routineId) return;

      if (!routinesMap[routineId]) {
        routinesMap[routineId] = {
          id: routineId,
          name: routineName,
          exercises: []
        };
      }

      routinesMap[routineId].exercises.push({
        name: exName,
        sets: parseInt(exSets) || 1,
        reps: exReps || "",
        load: exLoad || "",
        rest: 60
      });
    });

    return {
      routines: Object.values(routinesMap),
      lastUpdated: timestamp
    };
  };

  if (!sheetRoutinesTimestamp) {
    // Sheet routines don't have timestamp. Overwrite sheet.
    shouldRewriteSheetRoutines = true;
  } else if (!localRoutinesTimestamp) {
    // Local routines don't have timestamp. Download from sheet.
    finalWorkoutData = reconstructRoutinesFromRows(rowsRoutines, sheetRoutinesTimestamp);
  } else {
    const sheetTime = new Date(sheetRoutinesTimestamp).getTime();
    const localTime = new Date(localRoutinesTimestamp).getTime();
    if (localTime > sheetTime) {
      // Local changes are newer. Overwrite sheet.
      shouldRewriteSheetRoutines = true;
    } else {
      // Sheet changes are newer. Download from sheet.
      finalWorkoutData = reconstructRoutinesFromRows(rowsRoutines, sheetRoutinesTimestamp);
    }
  }

  // 5. Construct final rows to update Google Sheets
  // Prepare profile rows
  const profileRows = mergedProfileHistory.map(item => {
    const dStr = new Date(item.date).toLocaleString("pt-BR");
    return [dStr, item.name || "", item.weight || "", item.height || ""];
  });

  // Prepare routine rows (include timestamp on first row)
  const routineRows = [];
  finalWorkoutData.routines.forEach((routine, rIdx) => {
    if (routine.exercises) {
      routine.exercises.forEach((ex, exIdx) => {
        const isFirstRow = rIdx === 0 && exIdx === 0;
        routineRows.push([
          routine.id,
          routine.name,
          ex.name,
          ex.sets,
          ex.reps,
          ex.load || "",
          isFirstRow ? (finalWorkoutData.lastUpdated || new Date().toISOString()) : ""
        ]);
      });
    }
  });

  // Prepare workout history rows (reversed so oldest are appended first)
  const workoutRows = [];
  const sortedHistoryForSheet = [...mergedHistory].reverse();
  sortedHistoryForSheet.forEach(session => {
    const dStr = new Date(session.date).toLocaleString("pt-BR");
    if (session.exercises) {
      session.exercises.forEach(ex => {
        if (ex.setsData) {
          ex.setsData.forEach(set => {
            workoutRows.push([
              dStr,
              session.routineId,
              session.routineName,
              ex.name,
              ex.sets,
              set.setNum,
              set.load || "",
              set.reps || "",
              set.completed ? "Sim" : "Não",
              session.duration || "",
              session.notes || ""
            ]);
          });
        }
      });
    }
  });

  // 6. Clear and Batch Update Google Sheets
  const urlClear = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`;
  await apiFetch(urlClear, {
    method: "POST",
    body: JSON.stringify({
      ranges: [
        "Perfil!A2:D10000",
        "Fichas!A2:G1000",
        "Histórico de Treinos!A2:K10000"
      ]
    })
  }, token, onTokenExpired);

  const urlUpdate = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const updates = [];
  if (profileRows.length > 0) updates.push({ range: "Perfil!A2", values: profileRows });
  if (routineRows.length > 0) updates.push({ range: "Fichas!A2", values: routineRows });
  if (workoutRows.length > 0) updates.push({ range: "Histórico de Treinos!A2", values: workoutRows });

  if (updates.length > 0) {
    await apiFetch(urlUpdate, {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: updates
      })
    }, token, onTokenExpired);
  }

  console.log("Sincronização bidirecional concluída com sucesso!");

  return {
    history: mergedHistory,
    profileHistory: mergedProfileHistory,
    profile: mergedProfile,
    workoutData: finalWorkoutData
  };
}
