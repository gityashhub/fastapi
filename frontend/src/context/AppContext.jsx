import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api from '../services/api';

const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

const STORAGE_KEYS = {
  SESSION_ID: 'renvo_session_id',
  DATASET: 'renvo_dataset',
  COLUMN_TYPES: 'renvo_column_types',
  STATS: 'renvo_stats',
  COLUMN_INFO: 'renvo_column_info',
  COLUMN_ANALYSIS: 'renvo_column_analysis'
};

const loadFromStorage = (key, defaultValue = null) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error(`Failed to load ${key} from storage:`, e);
    return defaultValue;
  }
};

const sanitizeForStorage = (value) => {
  if (value === null || value === undefined) return null;
  
  const sanitize = (obj) => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (obj instanceof Set) return [...obj];
    if (obj instanceof Map) return Object.fromEntries(obj);
    if (obj instanceof Date) return obj.toISOString();
    
    const sanitized = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'function') continue;
      sanitized[k] = sanitize(v);
    }
    return sanitized;
  };
  
  return sanitize(value);
};

const saveToStorage = (key, value) => {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      const sanitized = sanitizeForStorage(value);
      localStorage.setItem(key, JSON.stringify(sanitized));
    }
  } catch (e) {
    console.error(`Failed to save ${key} to storage:`, e);
  }
};

export function AppProvider({ children }) {
  const [sessionId, setSessionId] = useState(() => {
    const saved = loadFromStorage(STORAGE_KEYS.SESSION_ID);
    return saved || uuidv4();
  });
  
  const [dataset, setDatasetState] = useState(() => loadFromStorage(STORAGE_KEYS.DATASET));
  const [columnTypes, setColumnTypesState] = useState(() => loadFromStorage(STORAGE_KEYS.COLUMN_TYPES, {}));
  const [columnAnalysis, setColumnAnalysisState] = useState(() => loadFromStorage(STORAGE_KEYS.COLUMN_ANALYSIS, {}));
  const [stats, setStatsState] = useState(() => loadFromStorage(STORAGE_KEYS.STATS));
  const [columnInfo, setColumnInfoState] = useState(() => loadFromStorage(STORAGE_KEYS.COLUMN_INFO, []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [redoAvailable, setRedoAvailable] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  const setDataset = useCallback((value) => {
    setDatasetState(value);
    saveToStorage(STORAGE_KEYS.DATASET, value);
  }, []);

  const setColumnTypes = useCallback((value) => {
    setColumnTypesState(value);
    saveToStorage(STORAGE_KEYS.COLUMN_TYPES, value);
  }, []);

  const setStats = useCallback((value) => {
    setStatsState(value);
    saveToStorage(STORAGE_KEYS.STATS, value);
  }, []);

  const setColumnInfo = useCallback((value) => {
    setColumnInfoState(value);
    saveToStorage(STORAGE_KEYS.COLUMN_INFO, value);
  }, []);

  const setColumnAnalysis = useCallback((value) => {
    if (typeof value === 'function') {
      setColumnAnalysisState(prev => {
        const newValue = value(prev);
        saveToStorage(STORAGE_KEYS.COLUMN_ANALYSIS, newValue);
        return newValue;
      });
    } else {
      setColumnAnalysisState(value);
      saveToStorage(STORAGE_KEYS.COLUMN_ANALYSIS, value);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const initSession = async () => {
      try {
        await api.createSession(sessionId);
        
        if (!isMounted) return;
        
        saveToStorage(STORAGE_KEYS.SESSION_ID, sessionId);
        
        if (dataset && !sessionInitialized) {
          try {
            const result = await api.getStats(sessionId);
            if (!isMounted) return;
            
            if (result && result.stats) {
              setStats(result.stats);
              if (result.column_types) setColumnTypes(result.column_types);
              setSessionInitialized(true);
            }
          } catch (statsError) {
            if (!isMounted) return;
            
            if (statsError.response?.status === 404 || statsError.response?.status === 500) {
              setDatasetState(null);
              setStatsState(null);
              setColumnInfoState([]);
              setColumnTypesState({});
              setColumnAnalysisState({});
              
              Object.values(STORAGE_KEYS).forEach(key => {
                if (key !== STORAGE_KEYS.SESSION_ID) {
                  localStorage.removeItem(key);
                }
              });
            }
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      }
    };
    
    initSession();
    
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const uploadFile = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.uploadFile(sessionId, file);
      setStats(result.stats);
      setColumnInfo(result.column_info);
      setColumnTypes(result.column_types);
      setDataset({ filename: result.filename, ...result.stats });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (offset = 0, limit = 100) => {
    try {
      const result = await api.getData(sessionId, offset, limit);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const fetchStats = async () => {
    try {
      const result = await api.getStats(sessionId);
      setStats(result.stats);
      setColumnTypes(result.column_types);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateColumnTypes = async (types) => {
    try {
      await api.updateColumnTypes(sessionId, types);
      setColumnTypes(types);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const analyzeColumn = async (column, forceRefresh = false) => {
    try {
      const result = await api.analyzeColumn(sessionId, column, forceRefresh);
      setColumnAnalysis(prev => ({ ...prev, [column]: result.analysis }));
      return result.analysis;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const analyzeAllColumns = async () => {
    setLoading(true);
    try {
      const result = await api.analyzeAllColumns(sessionId);
      setColumnAnalysis(result.analyses);
      return result.analyses;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const applyCleaning = async (column, methodType, methodName, parameters = {}) => {
    setLoading(true);
    try {
      const result = await api.applyCleaning(sessionId, column, methodType, methodName, parameters);
      setUndoAvailable(true);
      setRedoAvailable(false);
      await fetchStats();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const undo = async () => {
    try {
      await api.undo(sessionId);
      await fetchStats();
      const history = await api.getHistory(sessionId);
      setUndoAvailable(history.undo_available);
      setRedoAvailable(history.redo_available);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const redo = async () => {
    try {
      await api.redo(sessionId);
      await fetchStats();
      const history = await api.getHistory(sessionId);
      setUndoAvailable(history.undo_available);
      setRedoAvailable(history.redo_available);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resetToOriginal = async () => {
    try {
      await api.reset(sessionId);
      await fetchStats();
      setUndoAvailable(true);
      setRedoAvailable(false);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const clearSession = useCallback(() => {
    setSessionInitialized(false);
    setDatasetState(null);
    setStatsState(null);
    setColumnInfoState([]);
    setColumnTypesState({});
    setColumnAnalysisState({});
    setUndoAvailable(false);
    setRedoAvailable(false);
    
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    setTimeout(() => {
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      saveToStorage(STORAGE_KEYS.SESSION_ID, newSessionId);
    }, 0);
  }, []);

  const value = {
    sessionId,
    dataset,
    columnTypes,
    columnAnalysis,
    stats,
    columnInfo,
    loading,
    error,
    undoAvailable,
    redoAvailable,
    sessionInitialized,
    uploadFile,
    fetchData,
    fetchStats,
    updateColumnTypes,
    analyzeColumn,
    analyzeAllColumns,
    applyCleaning,
    undo,
    redo,
    resetToOriginal,
    clearSession,
    setError,
    setLoading
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
