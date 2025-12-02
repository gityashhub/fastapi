import { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api from '../services/api';

const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [sessionId, setSessionId] = useState(() => {
    const saved = localStorage.getItem('sessionId');
    return saved || uuidv4();
  });
  
  const [dataset, setDataset] = useState(null);
  const [columnTypes, setColumnTypes] = useState({});
  const [columnAnalysis, setColumnAnalysis] = useState({});
  const [stats, setStats] = useState(null);
  const [columnInfo, setColumnInfo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [redoAvailable, setRedoAvailable] = useState(false);

  useEffect(() => {
    localStorage.setItem('sessionId', sessionId);
    api.createSession(sessionId);
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
    setError,
    setLoading
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
