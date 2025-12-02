import { useState, useEffect } from 'react';
import { Sparkles, Play, Info, CheckCircle, AlertCircle, Undo2, Redo2, Bot, Scale, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Accordion from '../components/Accordion';
import MetricCard from '../components/MetricCard';

const methodCategories = {
  missing_values: { icon: '❌', label: 'Missing Values' },
  outliers: { icon: '⚡', label: 'Outliers' },
  data_quality: { icon: '🔧', label: 'Data Quality' }
};

export default function CleaningWizardPage() {
  const { sessionId, dataset, columnInfo, columnTypes, columnAnalysis, applyCleaning, loading, stats, fetchStats } = useApp();
  const [cleaningMethods, setCleaningMethods] = useState({});
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedMethodType, setSelectedMethodType] = useState('missing_values');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [parameters, setParameters] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState({});
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [weightsColumn, setWeightsColumn] = useState('');
  const [weightsActive, setWeightsActive] = useState(false);
  const [weightsDiagnostics, setWeightsDiagnostics] = useState(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    loadCleaningMethods();
    loadHistory();
  }, []);

  const loadCleaningMethods = async () => {
    try {
      const methods = await api.getCleaningMethods();
      setCleaningMethods(methods);
    } catch (error) {
      console.error('Failed to load cleaning methods:', error);
    }
  };

  const loadHistory = async () => {
    if (!sessionId) return;
    try {
      const result = await api.getHistory(sessionId);
      setHistory(result.cleaning_history || {});
      setUndoStack(result.undo_stack || []);
      setRedoStack(result.redo_stack || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleUndo = async () => {
    try {
      await api.undo(sessionId);
      await fetchStats();
      await loadHistory();
      toast.success('Undo successful');
    } catch (error) {
      toast.error('Undo failed');
    }
  };

  const handleRedo = async () => {
    try {
      await api.redo(sessionId);
      await fetchStats();
      await loadHistory();
      toast.success('Redo successful');
    } catch (error) {
      toast.error('Redo failed');
    }
  };

  const handleConfigureWeights = async () => {
    if (!weightsColumn) {
      setWeightsActive(false);
      setWeightsDiagnostics(null);
      toast.success('Weights disabled');
      return;
    }

    try {
      const result = await api.configureWeights(sessionId, weightsColumn);
      setWeightsDiagnostics(result.diagnostics);
      setWeightsActive(true);
      toast.success(`Weights configured using ${weightsColumn}`);
    } catch (error) {
      toast.error('Failed to configure weights');
    }
  };

  const handlePreview = async () => {
    if (!selectedColumn || !selectedMethod) {
      toast.error('Please select a column and method');
      return;
    }

    try {
      const preview = await api.previewCleaning(sessionId, selectedColumn, selectedMethodType, selectedMethod, parameters);
      setPreviewData(preview);
      toast.success('Preview generated');
    } catch (error) {
      toast.error('Preview failed');
    }
  };

  const handleApplyCleaning = async () => {
    if (!selectedColumn || !selectedMethod) {
      toast.error('Please select a column and cleaning method');
      return;
    }

    try {
      const cleaningResult = await applyCleaning(
        selectedColumn,
        selectedMethodType,
        selectedMethod,
        parameters
      );
      setResult(cleaningResult);
      setPreviewData(null);
      await loadHistory();
      toast.success(`Applied ${selectedMethod} to ${selectedColumn}`);
    } catch (error) {
      toast.error(error.message || 'Cleaning operation failed');
    }
  };

  const handleAskAI = async (question) => {
    const q = question || aiQuestion;
    if (!q) return;
    
    setAiLoading(true);
    try {
      const result = await api.askAI(sessionId, q, selectedColumn);
      setAiResponse(result.response || 'No response received');
    } catch (error) {
      setAiResponse('Failed to get AI response. Please check your API key configuration.');
    } finally {
      setAiLoading(false);
    }
  };

  const quickQuestions = [
    'Is this the best method for this column?',
    'What are the risks?',
    'How will this affect my analysis?',
    'Are there better alternatives?'
  ];

  const getApplicableMethods = () => {
    if (!selectedColumn || !cleaningMethods[selectedMethodType]) return [];
    const colType = columnTypes[selectedColumn] || 'unknown';
    return cleaningMethods[selectedMethodType].filter(method =>
      method.applicable.includes('all') || method.applicable.includes(colType)
    );
  };

  const numericColumns = columnInfo.filter(col => 
    ['continuous', 'integer'].includes(columnTypes[col.name] || col.detected_type)
  );

  const getColumnStats = () => {
    const col = columnInfo.find(c => c.name === selectedColumn);
    const analysis = columnAnalysis[selectedColumn];
    return { col, analysis };
  };

  const { col, analysis } = getColumnStats();

  const totalOperations = Object.values(history).reduce((sum, ops) => sum + ops.length, 0);
  const cleanedColumns = Object.keys(history).length;

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">No Dataset Loaded</h2>
        <p className="text-gray-500 mt-2">Upload a dataset to start cleaning.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          🧙‍♀️ Data Cleaning Wizard with Integrated Weights
        </h1>
        <p className="text-gray-600">Apply cleaning methods with weighted/unweighted statistics support</p>
      </div>

      {weightsActive ? (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <Scale className="w-5 h-5 text-blue-600" />
          <span className="text-blue-700">
            Survey weights active: Using '<strong>{weightsColumn}</strong>' for weighted analysis
          </span>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
          <Info className="w-5 h-5 text-gray-500" />
          <span className="text-gray-600">
            Unweighted analysis: No survey weights configured
          </span>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            🎛️ Cleaning Controls
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="btn-secondary flex items-center gap-1 text-sm"
            >
              <Undo2 className="w-4 h-4" />
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="btn-secondary flex items-center gap-1 text-sm"
            >
              <Redo2 className="w-4 h-4" />
              Redo
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Undo: {undoStack.length} | Redo: {redoStack.length}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">1. Survey Weights Configuration</h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure survey weights for design effect adjustment. Weighted statistics will be used in analysis.
            </p>
            
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight Column
                </label>
                <select
                  className="select-field"
                  value={weightsColumn}
                  onChange={(e) => setWeightsColumn(e.target.value)}
                >
                  <option value="">None (unweighted)</option>
                  {numericColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={handleConfigureWeights} className="btn-primary">
                Configure
              </button>
            </div>

            {weightsDiagnostics && (
              <div className="grid md:grid-cols-4 gap-4 mt-4">
                <MetricCard title="Mean Weight" value={weightsDiagnostics.mean?.toFixed(3) || 'N/A'} color="primary" />
                <MetricCard title="Weight Range" value={`${weightsDiagnostics.min?.toFixed(2)} - ${weightsDiagnostics.max?.toFixed(2)}`} color="blue" />
                <MetricCard title="Design Effect" value={weightsDiagnostics.design_effect?.toFixed(3) || 'N/A'} color="yellow" />
                <MetricCard title="Effective N" value={weightsDiagnostics.effective_n?.toLocaleString() || 'N/A'} color="green" />
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">2. Select Column and Cleaning Method</h3>
            <select
              className="select-field mb-4"
              value={selectedColumn}
              onChange={(e) => {
                setSelectedColumn(e.target.value);
                setSelectedMethod(null);
                setResult(null);
                setPreviewData(null);
              }}
            >
              <option value="">Select a column...</option>
              {columnInfo.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({columnTypes[col.name] || col.detected_type}) - {col.missing_percentage.toFixed(1)}% missing
                </option>
              ))}
            </select>

            {selectedColumn && col && (
              <div className="space-y-2 mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Column Type: <strong>{columnTypes[selectedColumn] || col.detected_type}</strong>
                  </p>
                </div>
                {col.missing_percentage > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      ⚠️ Missing values: {col.missing_count} ({col.missing_percentage.toFixed(1)}%)
                    </p>
                  </div>
                )}
                {analysis?.outlier_analysis?.summary?.consensus_outliers > 0 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700">
                      ⚡ Outliers detected: {analysis.outlier_analysis.summary.consensus_outliers}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-4">
              {Object.entries(methodCategories).map(([key, { icon, label }]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedMethodType(key);
                    setSelectedMethod(null);
                    setParameters({});
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMethodType === key
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-2xl mb-1">{icon}</p>
                  <p className={`text-sm font-medium ${
                    selectedMethodType === key ? 'text-primary-700' : 'text-gray-600'
                  }`}>
                    {label}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {getApplicableMethods().map((method) => (
                <button
                  key={method.name}
                  onClick={() => {
                    setSelectedMethod(method.name);
                    setParameters({});
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedMethod === method.name
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`font-medium ${
                    selectedMethod === method.name ? 'text-primary-700' : 'text-gray-800'
                  }`}>
                    {method.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{method.description}</p>
                </button>
              ))}
            </div>
            {getApplicableMethods().length === 0 && selectedColumn && (
              <p className="text-gray-500 text-center py-4">
                No applicable methods for this column type
              </p>
            )}
          </div>

          {selectedMethod && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">3. Method Parameters</h3>
              
              {selectedMethod === 'knn_imputation' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Neighbors (K): {parameters.n_neighbors || 5}
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={parameters.n_neighbors || 5}
                    onChange={(e) => setParameters({ ...parameters, n_neighbors: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              {selectedMethod === 'interpolation' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interpolation Method
                  </label>
                  <select
                    className="select-field"
                    value={parameters.method || 'linear'}
                    onChange={(e) => setParameters({ ...parameters, method: e.target.value })}
                  >
                    <option value="linear">Linear</option>
                    <option value="polynomial">Polynomial</option>
                    <option value="spline">Spline</option>
                  </select>
                </div>
              )}

              {selectedMethod === 'missing_category' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={parameters.category_name || 'Missing'}
                    onChange={(e) => setParameters({ ...parameters, category_name: e.target.value })}
                    className="input-field w-48"
                  />
                </div>
              )}

              {(selectedMethod === 'winsorization' || selectedMethod === 'cap_outliers') && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lower Percentile: {parameters.lower_percentile || 5}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={parameters.lower_percentile || 5}
                      onChange={(e) => setParameters({ ...parameters, lower_percentile: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upper Percentile: {parameters.upper_percentile || 95}%
                    </label>
                    <input
                      type="range"
                      min="90"
                      max="99.9"
                      step="0.1"
                      value={parameters.upper_percentile || 95}
                      onChange={(e) => setParameters({ ...parameters, upper_percentile: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {(selectedMethod === 'iqr_removal') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IQR Multiplier: {parameters.multiplier || 1.5}
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={parameters.multiplier || 1.5}
                    onChange={(e) => setParameters({ ...parameters, multiplier: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              {selectedMethod === 'zscore_removal' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Z-Score Threshold: {parameters.threshold || 3}
                  </label>
                  <input
                    type="range"
                    min="2.0"
                    max="4.0"
                    step="0.1"
                    value={parameters.threshold || 3}
                    onChange={(e) => setParameters({ ...parameters, threshold: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}

              {selectedMethod === 'standardize_case' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Case Type
                  </label>
                  <select
                    className="select-field"
                    value={parameters.case_type || 'lower'}
                    onChange={(e) => setParameters({ ...parameters, case_type: e.target.value })}
                  >
                    <option value="lower">Lowercase</option>
                    <option value="upper">Uppercase</option>
                    <option value="title">Title Case</option>
                  </select>
                </div>
              )}

              {selectedMethod === 'isolation_forest' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contamination: {(parameters.contamination || 0.1) * 100}%
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.2"
                    step="0.01"
                    value={parameters.contamination || 0.1}
                    onChange={(e) => setParameters({ ...parameters, contamination: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">4. Preview and Apply</h3>
            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                disabled={!selectedColumn || !selectedMethod}
                className="btn-secondary flex items-center gap-2"
              >
                👁️ Preview
              </button>
              <button
                onClick={handleApplyCleaning}
                disabled={loading || !selectedColumn || !selectedMethod}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <span className="loading-spinner" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Apply Cleaning
              </button>
            </div>
          </div>

          {previewData && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">5. Preview Results</h3>
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <MetricCard title="Rows Affected" value={previewData.rows_affected?.toLocaleString() || '0'} color="primary" />
                <MetricCard title="% Changed" value={`${previewData.percentage_changed?.toFixed(1) || 0}%`} color="blue" />
                <MetricCard title="Missing Before" value={previewData.missing_before?.toLocaleString() || '0'} color="red" />
                <MetricCard title="Missing After" value={previewData.missing_after?.toLocaleString() || '0'} color="green" />
              </div>

              {previewData.sample_changes && previewData.sample_changes.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Index</th>
                        <th>Before</th>
                        <th>After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.sample_changes.slice(0, 20).map((change, idx) => (
                        <tr key={idx}>
                          <td>{change.index}</td>
                          <td className="text-red-600">{String(change.before)}</td>
                          <td className="text-green-600">{String(change.after)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {result && result.success && (
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-800">Cleaning Applied Successfully</h4>
                  {result.metadata?.impact_stats && (
                    <div className="mt-2 text-sm text-green-700 space-y-1">
                      <p>Rows affected: {result.metadata.impact_stats.rows_affected}</p>
                      <p>Missing before: {result.metadata.impact_stats.missing_before}</p>
                      <p>Missing after: {result.metadata.impact_stats.missing_after}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary-600" />
              🤖 AI Guidance
            </h3>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskAI(q)}
                  disabled={aiLoading}
                  className="btn-secondary text-sm"
                >
                  ❓ {q}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <textarea
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask about this cleaning method..."
                className="input-field flex-1"
                rows={2}
              />
              <button
                onClick={() => handleAskAI()}
                disabled={aiLoading || !aiQuestion}
                className="btn-primary px-4"
              >
                {aiLoading ? <span className="loading-spinner" /> : '🤖'}
              </button>
            </div>

            {aiResponse && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-700 mb-2">AI Response:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{aiResponse}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="card sticky top-4">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              🧹 Cleaning Status
            </h3>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{cleanedColumns}/{columnInfo.length} columns</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500 transition-all"
                  style={{ width: `${(cleanedColumns / columnInfo.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                📊 <strong>Column Quality</strong>
              </p>
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                {columnInfo.slice(0, 10).map((col) => {
                  const colAnalysis = columnAnalysis[col.name];
                  const isCleaned = history[col.name]?.length > 0;
                  return (
                    <div key={col.name} className="flex items-center justify-between text-sm">
                      <span className="truncate">{col.name}</span>
                      <div className="flex items-center gap-1">
                        {isCleaned && <span className="text-green-500">✓</span>}
                        <span className="text-gray-500">
                          {colAnalysis?.data_quality?.score || '-'}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {columnInfo.length > 10 && (
                <p className="text-xs text-gray-400 mt-1">... and {columnInfo.length - 10} more columns</p>
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <h4 className="font-medium text-gray-700 text-sm">Quick Actions</h4>
              <button className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                <Download className="w-4 h-4" />
                Export Cleaned CSV
              </button>
              <button className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              📝 Cleaning History
            </h3>
            {Object.keys(history).length === 0 ? (
              <p className="text-gray-500 text-sm">No cleaning operations yet</p>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto scrollbar-thin">
                {Object.entries(history).map(([column, operations]) => (
                  <Accordion key={column} title={`${column} (${operations.length})`} defaultOpen={false}>
                    <div className="space-y-2">
                      {operations.map((op, idx) => (
                        <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                          <p className="font-medium">{op.method_name}</p>
                          <p className="text-xs text-gray-500">{op.method_type}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(op.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Accordion>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-600 mt-4 pt-4 border-t">
              <strong>{totalOperations} operations</strong> across <strong>{cleanedColumns} columns</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
