import axios from 'axios';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

const api = {
  createSession: async (sessionId) => {
    const response = await client.post('/session/create', { session_id: sessionId });
    return response.data;
  },

  getSession: async (sessionId) => {
    const response = await client.get(`/session/${sessionId}`);
    return response.data;
  },

  uploadFile: async (sessionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post(`/upload?session_id=${sessionId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getData: async (sessionId, offset = 0, limit = 100) => {
    const response = await client.get(`/data/${sessionId}?offset=${offset}&limit=${limit}`);
    return response.data;
  },

  getStats: async (sessionId) => {
    const response = await client.get(`/data/${sessionId}/stats`);
    return response.data;
  },

  updateColumnTypes: async (sessionId, columnTypes) => {
    const response = await client.post('/column-types/update', {
      session_id: sessionId,
      column_types: columnTypes,
    });
    return response.data;
  },

  getColumnTypes: async (sessionId) => {
    const response = await client.get(`/column-types/${sessionId}`);
    return response.data;
  },

  analyzeColumn: async (sessionId, column, forceRefresh = false) => {
    const response = await client.post(`/analyze/column/${sessionId}/${column}?force_refresh=${forceRefresh}`);
    return response.data;
  },

  analyzeAllColumns: async (sessionId) => {
    const response = await client.post(`/analyze/all/${sessionId}`);
    return response.data;
  },

  detectAnomalies: async (sessionId, column = null) => {
    const url = column 
      ? `/anomaly/detect/${sessionId}/${column}`
      : `/anomaly/detect/${sessionId}`;
    const response = await client.post(url);
    return response.data;
  },

  detectDuplicates: async (sessionId, columns = null) => {
    const response = await client.post('/anomaly/duplicates/detect', {
      session_id: sessionId,
      columns,
    });
    return response.data;
  },

  removeDuplicates: async (sessionId, columns = null, keep = 'first') => {
    const response = await client.post('/anomaly/duplicates/remove', {
      session_id: sessionId,
      columns,
      keep,
    });
    return response.data;
  },

  fixAnomaly: async (sessionId, column, action, indices, replacementValue) => {
    const response = await client.post('/anomaly/fix', {
      session_id: sessionId,
      column,
      action,
      indices,
      replacement_value: replacementValue,
    });
    return response.data;
  },

  getCleaningMethods: async () => {
    const response = await client.get('/cleaning-methods');
    return response.data;
  },

  applyCleaning: async (sessionId, column, methodType, methodName, parameters = {}) => {
    const response = await client.post('/clean', {
      session_id: sessionId,
      column,
      method_type: methodType,
      method_name: methodName,
      parameters,
    });
    return response.data;
  },

  previewCleaning: async (sessionId, column, methodType, methodName, parameters = {}) => {
    const response = await client.post('/clean/preview', {
      session_id: sessionId,
      column,
      method_type: methodType,
      method_name: methodName,
      parameters,
    });
    return response.data;
  },

  configureWeights: async (sessionId, weightColumn) => {
    const response = await client.post('/weights/configure', {
      session_id: sessionId,
      weight_column: weightColumn,
    });
    return response.data;
  },

  undo: async (sessionId) => {
    const response = await client.post(`/undo/${sessionId}`);
    return response.data;
  },

  redo: async (sessionId) => {
    const response = await client.post(`/redo/${sessionId}`);
    return response.data;
  },

  getHistory: async (sessionId) => {
    const response = await client.get(`/history/${sessionId}`);
    return response.data;
  },

  recommendTest: async (sessionId, columns) => {
    const response = await client.post(`/hypothesis/recommend/${sessionId}?columns=${columns.join(',')}`);
    return response.data;
  },

  runHypothesisTest: async (sessionId, testType, columns, parameters = {}) => {
    const response = await client.post('/hypothesis/test', {
      session_id: sessionId,
      test_type: testType,
      columns,
      parameters,
    });
    return response.data;
  },

  getAvailableTests: async () => {
    const response = await client.get('/hypothesis/tests');
    return response.data;
  },

  getAITestRecommendation: async (sessionId, question) => {
    const response = await client.post('/hypothesis/ai-recommend', {
      session_id: sessionId,
      question,
    });
    return response.data;
  },

  balanceData: async (sessionId, targetColumn, method, parameters = {}) => {
    const response = await client.post('/balance', {
      session_id: sessionId,
      target_column: targetColumn,
      method,
      parameters,
    });
    return response.data;
  },

  getBalancingMethods: async () => {
    const response = await client.get('/balance/methods');
    return response.data;
  },

  getClassDistribution: async (sessionId, column) => {
    const response = await client.get(`/balance/distribution/${sessionId}/${column}`);
    return response.data;
  },

  stratifiedSplit: async (sessionId, targetColumn, testSize = 0.2) => {
    const response = await client.post('/balance/split', {
      session_id: sessionId,
      target_column: targetColumn,
      test_size: testSize,
    });
    return response.data;
  },

  getDistributionChart: async (sessionId, column) => {
    const response = await client.get(`/visualization/${sessionId}/distribution/${column}`);
    return response.data;
  },

  getCorrelationChart: async (sessionId) => {
    const response = await client.get(`/visualization/${sessionId}/correlation`);
    return response.data;
  },

  getMissingChart: async (sessionId) => {
    const response = await client.get(`/visualization/${sessionId}/missing`);
    return response.data;
  },

  getOverviewChart: async (sessionId) => {
    const response = await client.get(`/visualization/${sessionId}/overview`);
    return response.data;
  },

  generateChart: async (sessionId, chartType, columns, config = {}) => {
    const response = await client.post('/visualization/generate', {
      session_id: sessionId,
      chart_type: chartType,
      columns,
      config,
    });
    return response.data;
  },

  exportConfig: async (sessionId) => {
    const response = await client.post(`/export/config/${sessionId}`);
    return response.data;
  },

  importConfig: async (sessionId, config) => {
    const response = await client.post(`/import/config/${sessionId}`, config);
    return response.data;
  },

  exportData: async (sessionId, format = 'csv') => {
    const response = await client.get(`/export/data/${sessionId}?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  generateReportPreview: async (sessionId, options = {}) => {
    const response = await client.post('/report/preview', {
      session_id: sessionId,
      ...options,
    });
    return response.data;
  },

  generateReport: async (sessionId, options = {}) => {
    const response = await client.post('/report/generate', {
      session_id: sessionId,
      ...options,
    }, {
      responseType: 'blob',
    });
    return response.data;
  },

  reset: async (sessionId) => {
    const response = await client.post(`/reset/${sessionId}`);
    return response.data;
  },

  askAI: async (sessionId, question, column = null, context = {}) => {
    const response = await client.post('/ai/ask', {
      session_id: sessionId,
      question,
      column,
      ...context,
    });
    return response.data;
  },

  getAIRecommendation: async (sessionId, column) => {
    const response = await client.post(`/ai/recommend/${sessionId}/${column}`);
    return response.data;
  },

  getAIHistory: async (sessionId) => {
    const response = await client.get(`/ai/history/${sessionId}`);
    return response.data;
  },

  clearAIHistory: async (sessionId) => {
    const response = await client.post(`/ai/clear/${sessionId}`);
    return response.data;
  },
};

export default api;
