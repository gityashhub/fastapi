import { useState, useEffect } from 'react';
import { FlaskConical, Play, Info, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Accordion from '../components/Accordion';

export default function HypothesisPage() {
  const { sessionId, dataset, columnInfo, columnTypes } = useApp();
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [alpha, setAlpha] = useState(0.05);
  const [testValue, setTestValue] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  useEffect(() => {
    loadAvailableTests();
  }, []);

  useEffect(() => {
    if (selectedColumns.length >= 1) {
      getRecommendations();
    }
  }, [selectedColumns]);

  const loadAvailableTests = async () => {
    try {
      const result = await api.getAvailableTests();
      setAvailableTests(result.tests);
    } catch (error) {
      console.error('Failed to load tests:', error);
    }
  };

  const getRecommendations = async () => {
    try {
      const result = await api.recommendTest(sessionId, selectedColumns);
      setRecommendations(result);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
    }
  };

  const handleRunTest = async () => {
    if (!selectedTest || selectedColumns.length === 0) {
      toast.error('Please select a test and columns');
      return;
    }

    setLoading(true);
    try {
      const params = { alpha };
      if (selectedTest === 'one_sample_ttest') {
        params.test_value = testValue;
      }
      const testResult = await api.runHypothesisTest(
        sessionId,
        selectedTest,
        selectedColumns,
        params
      );
      setResult(testResult);
      toast.success('Test completed');
    } catch (error) {
      toast.error(error.message || 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (column) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">No Dataset Loaded</h2>
        <p className="text-gray-500 mt-2">Upload a dataset to perform hypothesis testing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hypothesis Testing</h1>
        <p className="text-gray-600">Perform statistical hypothesis tests on your data</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Step 1: Select Columns</h3>
            <div className="flex flex-wrap gap-2">
              {columnInfo.map((col) => (
                <button
                  key={col.name}
                  onClick={() => toggleColumn(col.name)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedColumns.includes(col.name)
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  {col.name}
                  <span className="ml-2 text-xs text-gray-500">
                    ({columnTypes[col.name] || col.detected_type})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {recommendations?.recommendations?.length > 0 && (
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Recommended Tests
              </h3>
              <div className="space-y-2">
                {recommendations.recommendations.map((rec, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedTest(rec.test)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedTest === rec.test
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-white text-gray-700 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{rec.test.replace(/_/g, ' ')}</span>
                      <span className={`badge ${rec.priority === 'high' ? 'badge-success' : 'badge-info'}`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{rec.reason}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Step 2: Select Test</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {availableTests.map((test) => (
                <button
                  key={test.id}
                  onClick={() => setSelectedTest(test.id)}
                  disabled={selectedColumns.length < test.min_columns}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedTest === test.id
                      ? 'border-primary-500 bg-primary-50'
                      : selectedColumns.length < test.min_columns
                        ? 'border-gray-200 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-800">{test.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{test.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Step 3: Configure & Run</h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Significance Level (α)
                </label>
                <select
                  className="select-field"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                >
                  <option value={0.01}>0.01 (99% confidence)</option>
                  <option value={0.05}>0.05 (95% confidence)</option>
                  <option value={0.10}>0.10 (90% confidence)</option>
                </select>
              </div>

              {selectedTest === 'one_sample_ttest' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Value (μ₀)
                  </label>
                  <input
                    type="number"
                    value={testValue}
                    onChange={(e) => setTestValue(parseFloat(e.target.value))}
                    className="input-field"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleRunTest}
              disabled={loading || !selectedTest || selectedColumns.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <span className="loading-spinner" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run Test
            </button>
          </div>

          {result && !result.error && (
            <div className={`card ${result.p_value < alpha ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-start gap-3 mb-4">
                {result.p_value < alpha ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-800">{result.test_name}</h3>
                  <p className={`text-sm ${result.p_value < alpha ? 'text-green-700' : 'text-yellow-700'}`}>
                    {result.decision}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Test Statistic</p>
                  <p className="text-lg font-semibold">{result.statistic?.toFixed(4)}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">P-Value</p>
                  <p className={`text-lg font-semibold ${result.p_value < alpha ? 'text-green-600' : 'text-yellow-600'}`}>
                    {result.p_value?.toFixed(6)}
                  </p>
                </div>
                {result.effect_size && (
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-500">{result.effect_size.type}</p>
                    <p className="text-lg font-semibold">{result.effect_size.value?.toFixed(4)}</p>
                  </div>
                )}
              </div>

              {result.interpretation && (
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-700">{result.interpretation}</p>
                </div>
              )}

              {result.warnings?.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Warnings:</p>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result?.error && (
            <div className="card bg-red-50 border-red-200">
              <p className="text-red-700">{result.error}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-4">
            <h3 className="font-semibold text-gray-800 mb-4">Test Guide</h3>
            <div className="space-y-4 text-sm">
              <Accordion title="Comparing Means" defaultOpen={false}>
                <ul className="space-y-2 text-gray-600">
                  <li><strong>One-sample t-test:</strong> Compare mean to a value</li>
                  <li><strong>Welch's t-test:</strong> Compare means of 2 groups</li>
                  <li><strong>ANOVA:</strong> Compare means of 3+ groups</li>
                </ul>
              </Accordion>
              <Accordion title="Correlation" defaultOpen={false}>
                <ul className="space-y-2 text-gray-600">
                  <li><strong>Pearson:</strong> Linear relationship (normal data)</li>
                  <li><strong>Spearman:</strong> Monotonic relationship (any data)</li>
                </ul>
              </Accordion>
              <Accordion title="Categorical Data" defaultOpen={false}>
                <ul className="space-y-2 text-gray-600">
                  <li><strong>Chi-square:</strong> Test independence</li>
                  <li><strong>Fisher's exact:</strong> Small sample sizes</li>
                </ul>
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
