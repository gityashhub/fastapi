import { useState, useEffect } from 'react';
import { Sparkles, Play, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Accordion from '../components/Accordion';

export default function CleaningWizardPage() {
  const { sessionId, dataset, columnInfo, columnTypes, applyCleaning, loading } = useApp();
  const [cleaningMethods, setCleaningMethods] = useState({});
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedMethodType, setSelectedMethodType] = useState('missing_values');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [parameters, setParameters] = useState({});
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState({});

  useEffect(() => {
    loadCleaningMethods();
    loadHistory();
  }, []);

  useEffect(() => {
    if (columnInfo.length > 0 && !selectedColumn) {
      setSelectedColumn(columnInfo[0].name);
    }
  }, [columnInfo]);

  const loadCleaningMethods = async () => {
    try {
      const methods = await api.getCleaningMethods();
      setCleaningMethods(methods);
    } catch (error) {
      console.error('Failed to load cleaning methods:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const result = await api.getHistory(sessionId);
      setHistory(result.cleaning_history || {});
    } catch (error) {
      console.error('Failed to load history:', error);
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
      await loadHistory();
      toast.success(`Applied ${selectedMethod} to ${selectedColumn}`);
    } catch (error) {
      toast.error(error.message || 'Cleaning operation failed');
    }
  };

  const getApplicableMethods = () => {
    if (!selectedColumn || !cleaningMethods[selectedMethodType]) return [];
    const colType = columnTypes[selectedColumn] || 'unknown';
    return cleaningMethods[selectedMethodType].filter(method =>
      method.applicable.includes('all') || method.applicable.includes(colType)
    );
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Cleaning Wizard</h1>
        <p className="text-gray-600">Apply cleaning methods to your data with full control</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Step 1: Select Column</h3>
            <select
              className="select-field"
              value={selectedColumn || ''}
              onChange={(e) => setSelectedColumn(e.target.value)}
            >
              <option value="">Select a column...</option>
              {columnInfo.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({columnTypes[col.name] || col.detected_type}) - {col.missing_percentage.toFixed(1)}% missing
                </option>
              ))}
            </select>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Step 2: Select Method Type</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'missing_values', label: 'Missing Values', icon: AlertCircle },
                { key: 'outliers', label: 'Outliers', icon: AlertCircle },
                { key: 'data_quality', label: 'Data Quality', icon: CheckCircle },
              ].map((type) => (
                <button
                  key={type.key}
                  onClick={() => {
                    setSelectedMethodType(type.key);
                    setSelectedMethod(null);
                    setParameters({});
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMethodType === type.key
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <type.icon className={`w-6 h-6 mx-auto mb-2 ${
                    selectedMethodType === type.key ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    selectedMethodType === type.key ? 'text-primary-700' : 'text-gray-600'
                  }`}>
                    {type.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Step 3: Select Method</h3>
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
            {getApplicableMethods().length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No applicable methods for this column type
              </p>
            )}
          </div>

          {selectedMethod && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Step 4: Configure & Apply</h3>
              
              {selectedMethod === 'knn_imputation' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Neighbors (K)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={parameters.n_neighbors || 5}
                    onChange={(e) => setParameters({ ...parameters, n_neighbors: parseInt(e.target.value) })}
                    className="input-field w-32"
                  />
                </div>
              )}

              {(selectedMethod === 'winsorization' || selectedMethod === 'cap_outliers') && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lower Percentile
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={parameters.lower_percentile || 5}
                      onChange={(e) => setParameters({ ...parameters, lower_percentile: parseInt(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upper Percentile
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      value={parameters.upper_percentile || 95}
                      onChange={(e) => setParameters({ ...parameters, upper_percentile: parseInt(e.target.value) })}
                      className="input-field"
                    />
                  </div>
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

              <button
                onClick={handleApplyCleaning}
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <span className="loading-spinner" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Apply Cleaning
              </button>
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
        </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-4">
            <h3 className="font-semibold text-gray-800 mb-4">Cleaning History</h3>
            {Object.keys(history).length === 0 ? (
              <p className="text-gray-500 text-sm">No cleaning operations yet</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
                {Object.entries(history).map(([column, operations]) => (
                  <Accordion key={column} title={column} defaultOpen={false}>
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
          </div>
        </div>
      </div>
    </div>
  );
}
