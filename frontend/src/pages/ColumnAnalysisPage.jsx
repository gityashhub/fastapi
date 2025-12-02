import { useState, useEffect } from 'react';
import { BarChart3, AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MetricCard from '../components/MetricCard';
import Accordion from '../components/Accordion';
import ProgressBar from '../components/ProgressBar';
import Plot from 'react-plotly.js';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ColumnAnalysisPage() {
  const { sessionId, dataset, columnInfo, columnAnalysis, analyzeColumn, loading } = useApp();
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loadingChart, setLoadingChart] = useState(false);

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
      await analyzeColumn(selectedColumn, true);
      await loadChart();
      toast.success(`Analysis complete for ${selectedColumn}`);
    } catch (error) {
      toast.error('Analysis failed');
    }
  };

  const analysis = selectedColumn ? columnAnalysis[selectedColumn] : null;

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">No Dataset Loaded</h2>
        <p className="text-gray-500 mt-2">Upload a dataset to start analyzing columns.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Column Analysis</h1>
          <p className="text-gray-600">Detailed analysis of individual columns</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card h-fit sticky top-4">
            <h3 className="font-semibold text-gray-800 mb-3">Columns</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto scrollbar-thin">
              {columnInfo.map((col) => (
                <button
                  key={col.name}
                  onClick={() => setSelectedColumn(col.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedColumn === col.name
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{col.name}</span>
                    {col.missing_percentage > 0 && (
                      <span className={`text-xs ${col.missing_percentage > 20 ? 'text-red-500' : 'text-yellow-500'}`}>
                        {col.missing_percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedColumn && (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">{selectedColumn}</h2>
                  <button
                    onClick={handleAnalyze}
                    className="btn-primary flex items-center gap-2"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Analyze
                  </button>
                </div>

                {loadingChart ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="loading-spinner w-8 h-8" />
                  </div>
                ) : chartData ? (
                  <Plot
                    data={chartData.data}
                    layout={{ ...chartData.layout, autosize: true, height: 300 }}
                    config={{ responsive: true, displayModeBar: true }}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Click Analyze to generate distribution chart
                  </div>
                )}
              </div>

              {analysis && (
                <>
                  <div className="grid md:grid-cols-4 gap-4">
                    <MetricCard
                      title="Total Count"
                      value={analysis.basic_info?.count?.toLocaleString() || 'N/A'}
                      color="primary"
                    />
                    <MetricCard
                      title="Missing"
                      value={`${analysis.basic_info?.missing_percentage?.toFixed(1) || 0}%`}
                      subtitle={`${analysis.basic_info?.missing_count || 0} values`}
                      color={analysis.basic_info?.missing_percentage > 20 ? 'red' : 'green'}
                    />
                    <MetricCard
                      title="Unique Values"
                      value={analysis.basic_info?.unique_count?.toLocaleString() || 'N/A'}
                      subtitle={`${analysis.basic_info?.unique_percentage?.toFixed(1) || 0}%`}
                      color="blue"
                    />
                    <MetricCard
                      title="Quality Score"
                      value={analysis.data_quality?.grade || 'N/A'}
                      subtitle={`${analysis.data_quality?.score || 0}/100`}
                      color={analysis.data_quality?.score >= 80 ? 'green' : analysis.data_quality?.score >= 60 ? 'yellow' : 'red'}
                    />
                  </div>

                  {analysis.basic_info?.mean !== undefined && (
                    <div className="card">
                      <h3 className="font-semibold text-gray-800 mb-4">Numeric Statistics</h3>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Mean</p>
                          <p className="text-lg font-semibold">{analysis.basic_info.mean?.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Median</p>
                          <p className="text-lg font-semibold">{analysis.basic_info.median?.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Std Dev</p>
                          <p className="text-lg font-semibold">{analysis.basic_info.std?.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Range</p>
                          <p className="text-lg font-semibold">{analysis.basic_info.min?.toFixed(2)} - {analysis.basic_info.max?.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {analysis.outlier_analysis?.method_results && Object.keys(analysis.outlier_analysis.method_results).length > 0 && (
                    <Accordion title="Outlier Analysis" icon={AlertTriangle} defaultOpen={true}>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className={`badge ${analysis.outlier_analysis.summary?.severity === 'high' ? 'badge-error' : analysis.outlier_analysis.summary?.severity === 'moderate' ? 'badge-warning' : 'badge-success'}`}>
                            {analysis.outlier_analysis.summary?.severity || 'low'} severity
                          </span>
                          <span className="text-sm text-gray-500">
                            {analysis.outlier_analysis.summary?.consensus_outliers || 0} potential outliers detected
                          </span>
                        </div>
                        {Object.entries(analysis.outlier_analysis.method_results).map(([method, result]) => (
                          <div key={method} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-700">{result.method}</span>
                              <span className="text-sm text-gray-500">
                                {result.outlier_count} outliers ({result.outlier_percentage?.toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Accordion>
                  )}

                  {analysis.missing_analysis && analysis.missing_analysis.total_missing > 0 && (
                    <Accordion title="Missing Value Analysis" icon={Info} defaultOpen={true}>
                      <div className="space-y-3">
                        <ProgressBar
                          value={analysis.missing_analysis.percentage}
                          label="Missing Percentage"
                          color={analysis.missing_analysis.percentage > 20 ? 'red' : 'yellow'}
                        />
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-sm text-gray-500">Pattern Type</p>
                            <p className="font-medium">{analysis.missing_analysis.pattern_type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Max Consecutive</p>
                            <p className="font-medium">{analysis.missing_analysis.max_consecutive || 0}</p>
                          </div>
                        </div>
                      </div>
                    </Accordion>
                  )}

                  {analysis.cleaning_recommendations?.length > 0 && (
                    <Accordion title="Cleaning Recommendations" icon={CheckCircle} defaultOpen={true}>
                      <div className="space-y-3">
                        {analysis.cleaning_recommendations.map((rec, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start gap-3">
                              <span className={`badge ${rec.priority === 'high' ? 'badge-error' : rec.priority === 'medium' ? 'badge-warning' : 'badge-info'}`}>
                                {rec.priority}
                              </span>
                              <div>
                                <p className="font-medium text-gray-700">{rec.type}</p>
                                <p className="text-sm text-gray-500">{rec.recommendation}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Accordion>
                  )}

                  {analysis.data_quality?.issues?.length > 0 && (
                    <Accordion title="Data Quality Issues" icon={AlertTriangle}>
                      <ul className="space-y-2">
                        {analysis.data_quality.issues.map((issue, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </Accordion>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
