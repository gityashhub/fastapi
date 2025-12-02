import { useState, useEffect } from 'react';
import { FlaskConical, Play, Info, CheckCircle, XCircle, Target, BookOpen, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Accordion from '../components/Accordion';
import MetricCard from '../components/MetricCard';

const testCategories = {
  parametric: {
    comparison: ['one_sample_ttest', 'independent_ttest', 'paired_ttest', 'anova', 'welch_ttest'],
    correlation: ['pearson'],
    regression: ['linear_regression']
  },
  nonParametric: {
    comparison: ['mann_whitney', 'wilcoxon', 'kruskal_wallis', 'friedman'],
    correlation: ['spearman', 'kendall'],
    categorical: ['chi_square', 'fisher_exact', 'mcnemar']
  }
};

const testInfo = {
  one_sample_ttest: { name: 'One-Sample T-Test', desc: 'Compare mean to a known value', category: 'Parametric' },
  independent_ttest: { name: 'Independent T-Test', desc: 'Compare means of 2 independent groups', category: 'Parametric' },
  paired_ttest: { name: 'Paired T-Test', desc: 'Compare means of paired observations', category: 'Parametric' },
  welch_ttest: { name: "Welch's T-Test", desc: 'Compare means with unequal variances', category: 'Parametric' },
  anova: { name: 'One-Way ANOVA', desc: 'Compare means of 3+ groups', category: 'Parametric' },
  pearson: { name: 'Pearson Correlation', desc: 'Linear correlation coefficient', category: 'Parametric' },
  mann_whitney: { name: 'Mann-Whitney U', desc: 'Non-parametric 2-group comparison', category: 'Non-Parametric' },
  wilcoxon: { name: 'Wilcoxon Signed-Rank', desc: 'Non-parametric paired comparison', category: 'Non-Parametric' },
  kruskal_wallis: { name: 'Kruskal-Wallis H', desc: 'Non-parametric 3+ group comparison', category: 'Non-Parametric' },
  spearman: { name: 'Spearman Correlation', desc: 'Rank-based correlation', category: 'Non-Parametric' },
  chi_square: { name: 'Chi-Square Test', desc: 'Test independence of categorical variables', category: 'Non-Parametric' },
  fisher_exact: { name: "Fisher's Exact Test", desc: 'Exact test for 2x2 tables', category: 'Non-Parametric' },
  shapiro_wilk: { name: 'Shapiro-Wilk', desc: 'Test for normality', category: 'Normality' },
  levene: { name: "Levene's Test", desc: 'Test for equal variances', category: 'Assumption' }
};

export default function HypothesisPage() {
  const { sessionId, dataset, columnInfo, columnTypes } = useApp();
  const [activeTab, setActiveTab] = useState('ai');
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [alpha, setAlpha] = useState(0.05);
  const [testValue, setTestValue] = useState(0);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [useSample, setUseSample] = useState(false);
  const [sampleSize, setSampleSize] = useState(1000);
  const [autoSampleSize, setAutoSampleSize] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    loadAvailableTests();
  }, []);

  const loadAvailableTests = async () => {
    try {
      const result = await api.getAvailableTests();
      setAvailableTests(result.tests);
    } catch (error) {
      console.error('Failed to load tests:', error);
    }
  };

  const handleAIRecommendation = async () => {
    if (!aiQuestion.trim()) {
      toast.error('Please describe your research question');
      return;
    }

    setLoading(true);
    try {
      const result = await api.getAITestRecommendation(sessionId, aiQuestion);
      setAiRecommendations(result);
      if (result.primary_test) {
        setSelectedTest(result.primary_test.test_id);
      }
      toast.success('AI recommendations received');
    } catch (error) {
      toast.error('Failed to get AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  const quickExamples = [
    { icon: '📊', label: 'Compare groups', prompt: 'Compare means between two or more groups' },
    { icon: '🔗', label: 'Find relationship', prompt: 'Find correlation between two variables' },
    { icon: '📈', label: 'Check normality', prompt: 'Test if my data is normally distributed' },
    { icon: '🎲', label: 'Test distribution', prompt: 'Test if categorical data follows expected distribution' }
  ];

  const handleRunTest = async () => {
    if (!selectedTest || selectedColumns.length === 0) {
      toast.error('Please select a test and columns');
      return;
    }

    setLoading(true);
    try {
      const params = { 
        alpha,
        use_sample: useSample,
        sample_size: autoSampleSize ? null : sampleSize
      };
      if (selectedTest === 'one_sample_ttest') {
        params.test_value = testValue;
      }

      const testResult = await api.runHypothesisTest(
        sessionId,
        selectedTest,
        selectedColumns,
        params
      );

      setResults(prev => [...prev, { ...testResult, id: Date.now() }]);
      toast.success('Test completed');
    } catch (error) {
      toast.error(error.message || 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const removeResult = (id) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  const clearAllResults = () => {
    setResults([]);
    toast.success('All results cleared');
  };

  const toggleColumn = (column) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const getFilteredTests = () => {
    if (categoryFilter === 'all') return availableTests;
    return availableTests.filter(t => 
      testInfo[t.id]?.category?.toLowerCase().includes(categoryFilter.toLowerCase())
    );
  };

  const numericColumns = columnInfo.filter(col => 
    ['continuous', 'integer'].includes(columnTypes[col.name] || col.detected_type)
  );

  const categoricalColumns = columnInfo.filter(col => 
    ['categorical', 'binary', 'ordinal'].includes(columnTypes[col.name] || col.detected_type)
  );

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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          🔬 Hypothesis Testing & Statistical Analysis
        </h1>
        <p className="text-gray-600">AI-powered test selection with 24+ statistical tests available</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          🤖 Step 1: Describe Your Research Question
        </h3>

        <div className="flex gap-2 border-b mb-4">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              AI-Powered Suggestion
            </span>
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'browse'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Browse Tests Manually
            </span>
          </button>
        </div>

        {activeTab === 'ai' && (
          <div className="space-y-4">
            <p className="font-medium text-gray-700">Tell the AI what you want to test:</p>
            
            <textarea
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Example: I want to compare the average income between male and female respondents..."
              className="input-field w-full"
              rows={3}
            />

            <div className="flex flex-wrap gap-2">
              {quickExamples.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiQuestion(ex.prompt)}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  {ex.icon} {ex.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleAIRecommendation}
              disabled={loading || !aiQuestion.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <span className="loading-spinner" /> : <Sparkles className="w-4 h-4" />}
              Get AI Recommendation
            </button>

            {aiRecommendations && (
              <div className="space-y-4 mt-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  🎯 AI Recommendations
                </h4>

                {aiRecommendations.primary_test && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h5 className="font-semibold text-green-800">
                      Recommended: {aiRecommendations.primary_test.name}
                    </h5>
                    <p className="text-sm text-green-700 mt-1">
                      <strong>Category:</strong> {aiRecommendations.primary_test.category}
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      <strong>Rationale:</strong> {aiRecommendations.primary_test.rationale}
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      <strong>Confidence:</strong> {aiRecommendations.primary_test.confidence}%
                    </p>
                  </div>
                )}

                {aiRecommendations.alternatives?.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer font-medium text-gray-700">
                      🔄 Alternative Options
                    </summary>
                    <div className="mt-2 space-y-2">
                      {aiRecommendations.alternatives.map((alt, idx) => (
                        <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                          <p className="font-medium text-blue-800">{alt.name}</p>
                          <p className="text-sm text-blue-600">{alt.reason}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {aiRecommendations.suggested_columns && (
                  <details className="group">
                    <summary className="cursor-pointer font-medium text-gray-700">
                      📋 Suggested Columns
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Numeric:</strong> {aiRecommendations.suggested_columns.numeric?.join(', ') || 'None'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Categorical:</strong> {aiRecommendations.suggested_columns.categorical?.join(', ') || 'None'}
                      </p>
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'browse' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              {['all', 'Parametric', 'Non-Parametric'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    categoryFilter === cat
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'all' ? 'All Tests' : cat}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {getFilteredTests().map((test) => (
                <button
                  key={test.id}
                  onClick={() => setSelectedTest(test.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedTest === test.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-800">{test.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{test.description}</p>
                  <span className="text-xs badge badge-info mt-2">
                    {testInfo[test.id]?.category || 'Statistical'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedTest && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            ⚙️ Step 2: Configure Test - {testInfo[selectedTest]?.name || selectedTest}
          </h3>

          <div className="p-4 bg-blue-50 rounded-lg mb-4">
            <p className="text-sm text-blue-700">
              <strong>Description:</strong> {testInfo[selectedTest]?.desc}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Category:</strong> {testInfo[selectedTest]?.category}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Columns
              </label>
              <div className="flex flex-wrap gap-2">
                {columnInfo.map((col) => (
                  <button
                    key={col.name}
                    onClick={() => toggleColumn(col.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedColumns.includes(col.name)
                        ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                        : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    {col.name}
                    <span className="ml-1 text-xs text-gray-500">
                      ({columnTypes[col.name] || col.detected_type})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Significance Level (α): {alpha}
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.10"
                  step="0.01"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="w-full"
                />
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

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useSample}
                  onChange={(e) => setUseSample(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Use Sample</span>
              </label>

              {useSample && (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoSampleSize}
                      onChange={(e) => setAutoSampleSize(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Auto Sample Size</span>
                  </label>

                  {!autoSampleSize && (
                    <input
                      type="number"
                      value={sampleSize}
                      onChange={(e) => setSampleSize(parseInt(e.target.value))}
                      className="input-field w-32"
                      min="50"
                    />
                  )}
                </>
              )}
            </div>

            <button
              onClick={handleRunTest}
              disabled={loading || selectedColumns.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <span className="loading-spinner" /> : <FlaskConical className="w-4 h-4" />}
              Run Test
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              📊 Step 3: Test Results
            </h3>
            <button
              onClick={clearAllResults}
              className="btn-secondary text-sm text-red-600"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-4">
            {results.map((result) => (
              <details key={result.id} className="group" open>
                <summary className={`cursor-pointer p-4 rounded-lg ${
                  result.p_value < alpha ? 'bg-green-50' : 'bg-yellow-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {result.p_value < alpha ? '✅' : '❌'} {result.test_name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        removeResult(result.id);
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                </summary>
                <div className="mt-2 p-4 border rounded-lg space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <MetricCard
                      title="Test Statistic"
                      value={result.statistic?.toFixed(4) || 'N/A'}
                      color="primary"
                    />
                    <MetricCard
                      title="P-Value"
                      value={result.p_value?.toFixed(6) || 'N/A'}
                      color={result.p_value < alpha ? 'green' : 'yellow'}
                    />
                    {result.effect_size && (
                      <MetricCard
                        title={result.effect_size.type}
                        value={result.effect_size.value?.toFixed(4) || 'N/A'}
                        color="blue"
                      />
                    )}
                  </div>

                  <div className={`p-3 rounded-lg ${result.p_value < alpha ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    <p className={`font-medium ${result.p_value < alpha ? 'text-green-800' : 'text-yellow-800'}`}>
                      {result.decision}
                    </p>
                  </div>

                  {result.interpretation && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700"><strong>Interpretation:</strong> {result.interpretation}</p>
                    </div>
                  )}

                  {result.warnings?.length > 0 && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">⚠️ Warnings:</p>
                      <ul className="text-sm text-yellow-700 mt-1">
                        {result.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>

          <p className="text-sm text-gray-600 mt-4">
            <strong>{results.length} test(s) performed</strong>
          </p>
        </div>
      )}

      <Accordion title="📚 Quick Guide to Choosing Statistical Tests" defaultOpen={false}>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Comparing Groups</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• <strong>2 groups:</strong> T-test or Mann-Whitney</li>
              <li>• <strong>3+ groups:</strong> ANOVA or Kruskal-Wallis</li>
              <li>• <strong>Paired data:</strong> Paired T-test or Wilcoxon</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Relationships</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• <strong>Linear:</strong> Pearson correlation</li>
              <li>• <strong>Monotonic:</strong> Spearman correlation</li>
              <li>• <strong>Categorical:</strong> Chi-square test</li>
            </ul>
          </div>
        </div>
      </Accordion>
    </div>
  );
}
