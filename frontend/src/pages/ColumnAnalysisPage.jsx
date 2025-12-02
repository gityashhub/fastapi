import { useState, useEffect } from 'react';
import { BarChart3, AlertTriangle, CheckCircle, Info, RefreshCw, Target, TrendingUp, Percent, Hash } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MetricCard from '../components/MetricCard';
import ProgressBar from '../components/ProgressBar';
import Plot from 'react-plotly.js';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ColumnAnalysisPage() {
  const { sessionId, dataset, columnInfo, columnAnalysis, analyzeColumn, analyzeAllColumns, loading, columnTypes } = useApp();
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showOverview, setShowOverview] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);

  useEffect(() => {
    if (columnInfo.length > 0 && !selectedColumn) {
      setSelectedColumn(columnInfo[0].name);
    }
  }, [columnInfo, selectedColumn]);

  useEffect(() => {
    if (selectedColumn && sessionId) {
      loadChart();
    }
  }, [selectedColumn, sessionId]);

  const loadChart = async () => {
    if (!selectedColumn) return;
    setLoadingChart(true);
    try {
      const result = await api.getDistributionChart(sessionId, selectedColumn);
      setChartData(JSON.parse(result.chart));
    } catch (error) {
      console.error('Failed to load chart:', error);
    } finally {
      setLoadingChart(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedColumn) return;
    try {
      await analyzeColumn(selectedColumn, forceRefresh);
      await loadChart();
      toast.success(`Analysis complete for ${selectedColumn}`);
    } catch (error) {
      toast.error('Analysis failed');
    }
  };

  const handleAnalyzeAll = async () => {
    setAnalyzingAll(true);
    try {
      await analyzeAllColumns();
      toast.success('All columns analyzed');
    } catch (error) {
      toast.error('Analysis failed');
    } finally {
      setAnalyzingAll(false);
    }
  };

  const loadOverview = async () => {
    try {
      const result = await api.getOverviewChart(sessionId);
      setOverviewData(JSON.parse(result.chart));
      setShowOverview(true);
    } catch (error) {
      toast.error('Failed to load overview');
    }
  };

  const analysis = selectedColumn ? columnAnalysis[selectedColumn] : null;
  const colInfo = columnInfo.find(c => c.name === selectedColumn) || {};

  const getQualityColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBg = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getSkewnessInterpretation = (skew) => {
    if (!skew) return { icon: '', text: 'N/A' };
    const absSkew = Math.abs(skew);
    if (absSkew < 0.5) return { icon: '✅', text: 'Approximately Normal' };
    if (absSkew < 1) return { icon: '⚠️', text: 'Moderately Skewed' };
    return { icon: '🔴', text: 'Highly Skewed' };
  };

  const getKurtosisInterpretation = (kurt) => {
    if (!kurt) return { icon: '', text: 'N/A' };
    if (kurt < -0.5) return { icon: '📊', text: 'Platykurtic (flat)' };
    if (kurt <= 0.5) return { icon: '✅', text: 'Mesokurtic (normal-like)' };
    return { icon: '📈', text: 'Leptokurtic (peaked)' };
  };

  const getMissingPatternInfo = (pattern) => {
    const patterns = {
      sporadic: { emoji: '🟢', desc: 'Randomly scattered (<5% missing)' },
      random: { emoji: '🟡', desc: 'Randomly distributed' },
      systematic_blocks: { emoji: '🟠', desc: 'Large consecutive blocks' },
      front_loaded: { emoji: '🔵', desc: 'Most at beginning' },
      tail_loaded: { emoji: '🟣', desc: 'Most at end' }
    };
    return patterns[pattern] || { emoji: '❓', desc: 'Unknown pattern' };
  };

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">No Dataset Loaded</h2>
        <p className="text-gray-500 mt-2">Upload a dataset to start analyzing columns.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📋' },
    { id: 'missing', label: 'Missing Data', icon: '❌' },
    { id: 'outliers', label: 'Outliers', icon: '⚡' },
    { id: 'distribution', label: 'Distribution', icon: '📈' },
    { id: 'recommendations', label: 'Recommendations', icon: '🎯' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Search className="w-6 h-6 text-primary-600" />
            Individual Column Analysis
          </h1>
          <p className="text-gray-600">Tailored analysis based on data type with detailed insights</p>
        </div>
        <button
          onClick={loadOverview}
          className="btn-secondary flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          Quick Overview
        </button>
      </div>

      {showOverview && overviewData && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              📊 All Columns Overview
            </h3>
            <button onClick={() => setShowOverview(false)} className="btn-secondary text-sm">
              ❌ Close Overview
            </button>
          </div>
          <Plot
            data={overviewData.data}
            layout={{ ...overviewData.layout, autosize: true, height: 400 }}
            config={{ responsive: true }}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card h-fit sticky top-4">
            <h3 className="font-semibold text-gray-800 mb-3">1. Select Column for Analysis</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto scrollbar-thin">
              {columnInfo.map((col) => {
                const colAnalysis = columnAnalysis[col.name];
                return (
                  <button
                    key={col.name}
                    onClick={() => {
                      setSelectedColumn(col.name);
                      setActiveTab('basic');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedColumn === col.name
                        ? 'bg-primary-100 text-primary-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{col.name}</span>
                      <div className="flex items-center gap-1">
                        {colAnalysis && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getQualityBg(colAnalysis.data_quality?.score || 0)}`}>
                            {colAnalysis.data_quality?.grade}
                          </span>
                        )}
                        {col.missing_percentage > 0 && (
                          <span className={`text-xs ${col.missing_percentage > 20 ? 'text-red-500' : 'text-yellow-500'}`}>
                            {col.missing_percentage.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t">
              <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <input
                  type="checkbox"
                  checked={forceRefresh}
                  onChange={(e) => setForceRefresh(e.target.checked)}
                  className="rounded"
                />
                Force Refresh
              </label>
              <button
                onClick={handleAnalyze}
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={loading || !selectedColumn}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Analyze Column
              </button>
            </div>

            <details className="mt-4">
              <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                Analyze All Columns
              </summary>
              <div className="mt-2">
                <button
                  onClick={handleAnalyzeAll}
                  disabled={analyzingAll}
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                >
                  {analyzingAll ? <span className="loading-spinner" /> : <Search className="w-4 h-4" />}
                  Analyze All
                </button>
              </div>
            </details>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedColumn && (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{selectedColumn}</h2>
                    <p className="text-sm text-gray-500">
                      Type: <span className="badge badge-info">{columnTypes[selectedColumn] || colInfo.detected_type}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-b pb-4">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-4 gap-4">
                    <MetricCard
                      title="Total Values"
                      value={analysis?.basic_info?.count?.toLocaleString() || colInfo.null_count ? (dataset.length || 0).toLocaleString() : '0'}
                      icon={Hash}
                      color="primary"
                    />
                    <MetricCard
                      title="Missing Values"
                      value={analysis?.basic_info?.missing_count?.toLocaleString() || '0'}
                      subtitle={`${analysis?.basic_info?.missing_percentage?.toFixed(1) || colInfo.missing_percentage?.toFixed(1) || 0}%`}
                      icon={AlertTriangle}
                      color={analysis?.basic_info?.missing_percentage > 20 ? 'red' : 'green'}
                    />
                    <MetricCard
                      title="Missing %"
                      value={`${analysis?.basic_info?.missing_percentage?.toFixed(1) || colInfo.missing_percentage?.toFixed(1) || 0}%`}
                      icon={Percent}
                      color={analysis?.basic_info?.missing_percentage > 20 ? 'red' : 'yellow'}
                    />
                    <MetricCard
                      title="Unique Values"
                      value={analysis?.basic_info?.unique_count?.toLocaleString() || colInfo.unique_count?.toLocaleString() || 'N/A'}
                      icon={Target}
                      color="blue"
                    />
                  </div>

                  {analysis?.basic_info?.mean !== undefined && (
                    <div className="card">
                      <h3 className="font-semibold text-gray-800 mb-4">Numeric Statistics</h3>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Mean</p>
                          <p className="text-lg font-semibold">{analysis.basic_info.mean?.toFixed(3)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Median</p>
                          <p className="text-lg font-semibold">{analysis.basic_info.median?.toFixed(3)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Std Dev</p>
                          <p className="text-lg font-semibold">{analysis.basic_info.std?.toFixed(3)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Range</p>
                          <p className="text-lg font-semibold">{analysis.basic_info.min?.toFixed(2)} - {analysis.basic_info.max?.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {analysis?.data_quality && (
                    <div className="card">
                      <h3 className="font-semibold text-gray-800 mb-4">Data Quality Assessment</h3>
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`text-3xl font-bold ${getQualityColor(analysis.data_quality.score)}`}>
                          {analysis.data_quality.score}/100
                        </div>
                        <div className={`px-3 py-1 rounded-full ${getQualityBg(analysis.data_quality.score)}`}>
                          <span className={`font-semibold ${getQualityColor(analysis.data_quality.score)}`}>
                            Grade: {analysis.data_quality.grade}
                          </span>
                        </div>
                      </div>

                      {analysis.data_quality.issues?.length > 0 ? (
                        <div className="space-y-2">
                          {analysis.data_quality.issues.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                              <span>⚠️</span>
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span>No significant quality issues detected</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'missing' && (
                <div className="space-y-6">
                  <div className="card">
                    <h3 className="font-semibold text-gray-800 mb-4">Missing Data Analysis</h3>
                    
                    {(!analysis?.missing_analysis || analysis.missing_analysis.total_missing === 0) ? (
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <span className="text-green-700 font-medium">No missing values in this column</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                          <MetricCard
                            title="Total Missing"
                            value={analysis.missing_analysis.total_missing?.toLocaleString() || '0'}
                            color="red"
                          />
                          <MetricCard
                            title="Missing %"
                            value={`${analysis.missing_analysis.percentage?.toFixed(2) || 0}%`}
                            color="yellow"
                          />
                          <MetricCard
                            title="Pattern Type"
                            value={analysis.missing_analysis.pattern_type || 'Unknown'}
                            color="blue"
                          />
                        </div>

                        {analysis.missing_analysis.pattern_type && (
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="font-medium text-blue-800">
                              {getMissingPatternInfo(analysis.missing_analysis.pattern_type).emoji}{' '}
                              {getMissingPatternInfo(analysis.missing_analysis.pattern_type).desc}
                            </p>
                          </div>
                        )}

                        {analysis.missing_analysis.max_consecutive > 0 && (
                          <p className="text-sm text-gray-600">
                            <strong>Max Consecutive Missing:</strong> {analysis.missing_analysis.max_consecutive}
                          </p>
                        )}

                        <ProgressBar
                          value={analysis.missing_analysis.percentage}
                          label="Missing Percentage"
                          color={analysis.missing_analysis.percentage > 20 ? 'red' : 'yellow'}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'outliers' && (
                <div className="space-y-6">
                  <div className="card">
                    <h3 className="font-semibold text-gray-800 mb-4">Outlier Detection</h3>
                    
                    {!analysis?.outlier_analysis || !['continuous', 'integer'].includes(columnTypes[selectedColumn] || colInfo.detected_type) ? (
                      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                        <Info className="w-6 h-6 text-blue-600" />
                        <span className="text-blue-700">Outlier detection is only applicable to numeric columns</span>
                      </div>
                    ) : !analysis.outlier_analysis.method_results || Object.keys(analysis.outlier_analysis.method_results).length === 0 ? (
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <span className="text-green-700 font-medium">No outliers detected</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className={`p-3 rounded-lg ${
                          analysis.outlier_analysis.summary?.severity === 'high' ? 'bg-red-100' :
                          analysis.outlier_analysis.summary?.severity === 'moderate' ? 'bg-yellow-100' : 'bg-green-100'
                        }`}>
                          <span className={`font-semibold ${
                            analysis.outlier_analysis.summary?.severity === 'high' ? 'text-red-700' :
                            analysis.outlier_analysis.summary?.severity === 'moderate' ? 'text-yellow-700' : 'text-green-700'
                          }`}>
                            {analysis.outlier_analysis.summary?.severity?.toUpperCase() || 'LOW'} SEVERITY
                          </span>
                          <span className="ml-2 text-gray-600">
                            - {analysis.outlier_analysis.summary?.consensus_outliers || 0} potential outliers detected
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Method</th>
                                <th>Outliers Found</th>
                                <th>Percentage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(analysis.outlier_analysis.method_results).map(([method, result]) => (
                                <tr key={method}>
                                  <td className="font-medium">{result.method || method}</td>
                                  <td>{result.outlier_count}</td>
                                  <td>{result.outlier_percentage?.toFixed(2)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <details className="group">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700">
                            📊 Detection Methods Explained
                          </summary>
                          <div className="mt-2 space-y-2 text-sm text-gray-600">
                            <p><strong>IQR:</strong> Interquartile Range method - values outside 1.5*IQR</p>
                            <p><strong>Z-Score:</strong> Standard deviation based - values beyond 3 std devs</p>
                            <p><strong>Modified Z-Score:</strong> Robust to outliers - uses median absolute deviation</p>
                            <p><strong>Isolation Forest:</strong> Machine learning based detection</p>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'distribution' && (
                <div className="space-y-6">
                  <div className="card">
                    <h3 className="font-semibold text-gray-800 mb-4">Distribution Analysis</h3>
                    
                    {loadingChart ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="loading-spinner w-8 h-8" />
                      </div>
                    ) : chartData ? (
                      <Plot
                        data={chartData.data}
                        layout={{ ...chartData.layout, autosize: true, height: 350 }}
                        config={{ responsive: true, displayModeBar: true }}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        Click Analyze to generate distribution chart
                      </div>
                    )}

                    <div className="p-4 bg-blue-50 rounded-lg mt-4">
                      <p className="text-sm text-blue-700">
                        📊 <strong>Understanding Distribution:</strong> The chart shows how values are distributed across the range.
                        Look for skewness, multiple peaks, or unusual patterns.
                      </p>
                    </div>
                  </div>

                  {analysis?.distribution && (
                    <div className="card">
                      <h3 className="font-semibold text-gray-800 mb-4">Distribution Characteristics Explained</h3>
                      
                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Skewness</p>
                          <p className="text-lg font-semibold">{analysis.distribution.skewness?.toFixed(3) || 'N/A'}</p>
                          <p className="text-xs text-gray-500">
                            {getSkewnessInterpretation(analysis.distribution.skewness).icon}{' '}
                            {getSkewnessInterpretation(analysis.distribution.skewness).text}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Kurtosis</p>
                          <p className="text-lg font-semibold">{analysis.distribution.kurtosis?.toFixed(3) || 'N/A'}</p>
                          <p className="text-xs text-gray-500">
                            {getKurtosisInterpretation(analysis.distribution.kurtosis).icon}{' '}
                            {getKurtosisInterpretation(analysis.distribution.kurtosis).text}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Normality Test</p>
                          <p className="text-lg font-semibold">
                            {analysis.distribution.is_normal ? 'Normal' : 'Not Normal'}
                          </p>
                          <p className="text-xs text-gray-500">
                            p-value: {analysis.distribution.normality_p_value?.toFixed(4) || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {analysis.basic_info?.quartiles && (
                        <>
                          <h4 className="font-medium text-gray-700 mt-4 mb-2">Quartile Analysis</h4>
                          <div className="grid grid-cols-5 gap-2">
                            <div className="p-2 bg-gray-50 rounded text-center">
                              <p className="text-xs text-gray-500">Min</p>
                              <p className="font-semibold">{analysis.basic_info.min?.toFixed(2)}</p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded text-center">
                              <p className="text-xs text-gray-500">Q1</p>
                              <p className="font-semibold">{analysis.basic_info.quartiles?.q1?.toFixed(2)}</p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded text-center">
                              <p className="text-xs text-gray-500">Median</p>
                              <p className="font-semibold">{analysis.basic_info.median?.toFixed(2)}</p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded text-center">
                              <p className="text-xs text-gray-500">Q3</p>
                              <p className="font-semibold">{analysis.basic_info.quartiles?.q3?.toFixed(2)}</p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded text-center">
                              <p className="text-xs text-gray-500">Max</p>
                              <p className="font-semibold">{analysis.basic_info.max?.toFixed(2)}</p>
                            </div>
                          </div>
                        </>
                      )}

                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700">
                          💡 How to Interpret These Statistics
                        </summary>
                        <div className="mt-2 space-y-2 text-sm text-gray-600">
                          <p><strong>Skewness:</strong> Measures asymmetry. Positive = right-skewed, Negative = left-skewed</p>
                          <p><strong>Kurtosis:</strong> Measures "tailedness". High = heavy tails, Low = light tails</p>
                          <p><strong>Normality:</strong> Tests if data follows a normal distribution (important for many statistical tests)</p>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'recommendations' && (
                <div className="space-y-6">
                  <div className="card">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      🎯 AI-Generated Recommendations
                    </h3>
                    
                    {analysis?.cleaning_recommendations?.length > 0 ? (
                      <div className="space-y-3">
                        {analysis.cleaning_recommendations.map((rec, idx) => (
                          <div key={idx} className={`p-4 rounded-lg border ${
                            rec.priority === 'high' ? 'bg-red-50 border-red-200' :
                            rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="flex items-start gap-3">
                              <span className={`badge ${
                                rec.priority === 'high' ? 'badge-error' :
                                rec.priority === 'medium' ? 'badge-warning' : 'badge-info'
                              }`}>
                                {rec.priority}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{rec.type}</p>
                                <p className="text-sm text-gray-600 mt-1">{rec.recommendation}</p>
                                {rec.suggested_method && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Suggested method: <code className="bg-gray-100 px-1 rounded">{rec.suggested_method}</code>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Target className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p>Run analysis to get AI-generated recommendations</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!analysis && (
                <div className="card text-center py-12">
                  <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600">No Analysis Yet</h3>
                  <p className="text-gray-500 mt-2">Click "Analyze Column" to generate detailed analysis</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Search({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}
