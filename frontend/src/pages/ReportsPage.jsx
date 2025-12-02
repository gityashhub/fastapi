import { useState, useEffect } from 'react';
import { FileText, Download, Settings, FileSpreadsheet, FileJson, Eye, Printer, CheckCircle, AlertTriangle, BarChart2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import MetricCard from '../components/MetricCard';
import Plot from 'react-plotly.js';

const reportSections = [
  { id: 'summary', label: 'Executive Summary', icon: '📋' },
  { id: 'quality', label: 'Data Quality Assessment', icon: '⭐' },
  { id: 'cleaning', label: 'Cleaning Operations Log', icon: '🧹' },
  { id: 'statistics', label: 'Statistical Summary', icon: '📊' },
  { id: 'recommendations', label: 'Recommendations', icon: '🎯' },
  { id: 'visualizations', label: 'Visualizations', icon: '📈' },
];

export default function ReportsPage() {
  const { sessionId, dataset, stats, columnInfo, columnAnalysis } = useApp();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('configure');
  const [selectedSections, setSelectedSections] = useState(['summary', 'quality', 'cleaning', 'statistics']);
  const [reportFormat, setReportFormat] = useState('html');
  const [includeRawData, setIncludeRawData] = useState(false);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [savedVisualizations, setSavedVisualizations] = useState([]);
  const [cleaningHistory, setCleaningHistory] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem(`saved_visualizations_${sessionId}`);
    if (saved) {
      try {
        setSavedVisualizations(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved visualizations');
      }
    }
    loadCleaningHistory();
  }, [sessionId]);

  const loadCleaningHistory = async () => {
    if (!sessionId) return;
    try {
      const result = await api.getHistory(sessionId);
      setCleaningHistory(result.cleaning_history || {});
    } catch (error) {
      console.error('Failed to load cleaning history:', error);
    }
  };

  const handleExportData = async (format) => {
    setLoading(true);
    try {
      const blob = await api.exportData(sessionId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cleaned_data.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportConfig = async () => {
    try {
      const config = await api.exportConfig(sessionId);
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cleaning_config.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Configuration exported');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const generatePreview = async () => {
    setLoading(true);
    try {
      const preview = await api.generateReportPreview(sessionId, {
        sections: selectedSections,
        include_charts: includeCharts,
        include_raw_data: includeRawData
      });
      setPreviewData(preview);
      setActiveTab('preview');
      toast.success('Preview generated');
    } catch (error) {
      setPreviewData({
        summary: generateLocalSummary(),
        quality: generateLocalQuality(),
        cleaning: cleaningHistory,
        statistics: generateLocalStats()
      });
      setActiveTab('preview');
    } finally {
      setLoading(false);
    }
  };

  const generateLocalSummary = () => ({
    dataset_name: 'Uploaded Dataset',
    rows: stats?.total_rows || 0,
    columns: stats?.total_columns || 0,
    missing_values: stats?.missing_values || 0,
    memory_usage: stats?.memory_usage_mb || 0,
    generated_at: new Date().toISOString()
  });

  const generateLocalQuality = () => {
    const analyzed = Object.keys(columnAnalysis).length;
    const withIssues = Object.values(columnAnalysis).filter(a => a.data_quality?.issues?.length > 0).length;
    const avgScore = analyzed > 0 
      ? Object.values(columnAnalysis).reduce((sum, a) => sum + (a.data_quality?.score || 0), 0) / analyzed 
      : 0;
    return { analyzed, withIssues, avgScore };
  };

  const generateLocalStats = () => {
    const numericCols = columnInfo.filter(c => ['continuous', 'integer'].includes(c.detected_type));
    const categoricalCols = columnInfo.filter(c => ['categorical', 'binary', 'ordinal'].includes(c.detected_type));
    return {
      numeric_columns: numericCols.length,
      categorical_columns: categoricalCols.length,
      columns_with_missing: columnInfo.filter(c => c.missing_percentage > 0).length
    };
  };

  const toggleSection = (sectionId) => {
    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const downloadReport = async () => {
    setLoading(true);
    try {
      const blob = await api.generateReport(sessionId, {
        sections: selectedSections,
        format: reportFormat,
        include_charts: includeCharts,
        include_raw_data: includeRawData
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data_cleaning_report.${reportFormat === 'html' ? 'html' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error('Report generation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">No Dataset Loaded</h2>
        <p className="text-gray-500 mt-2">Upload a dataset to generate reports.</p>
      </div>
    );
  }

  const analyzedColumns = Object.keys(columnAnalysis).length;
  const columnsWithIssues = Object.values(columnAnalysis).filter(
    a => a.data_quality?.issues?.length > 0
  ).length;
  const totalOperations = Object.values(cleaningHistory).reduce((sum, ops) => sum + ops.length, 0);
  const avgQuality = analyzedColumns > 0
    ? Object.values(columnAnalysis).reduce((sum, a) => sum + (a.data_quality?.score || 0), 0) / analyzedColumns
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          📄 Reports & Export
        </h1>
        <p className="text-gray-600">Generate comprehensive reports and export your cleaned data</p>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('configure')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'configure'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configure Report
          </span>
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'preview'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </span>
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'export'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </span>
        </button>
      </div>

      {activeTab === 'configure' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Report Sections</h3>
              <p className="text-sm text-gray-600 mb-4">Select which sections to include in your report</p>
              
              <div className="grid md:grid-cols-2 gap-3">
                {reportSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedSections.includes(section.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{section.icon}</span>
                      <span className="font-medium text-gray-800">{section.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Report Options</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Format
                  </label>
                  <select
                    className="select-field w-48"
                    value={reportFormat}
                    onChange={(e) => setReportFormat(e.target.value)}
                  >
                    <option value="html">HTML (Interactive)</option>
                    <option value="pdf">PDF (Print-ready)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={(e) => setIncludeCharts(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Include Charts & Visualizations</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeRawData}
                      onChange={(e) => setIncludeRawData(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Include Raw Data Sample (first 100 rows)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex gap-3">
                <button
                  onClick={generatePreview}
                  disabled={loading || selectedSections.length === 0}
                  className="btn-secondary flex items-center gap-2"
                >
                  {loading ? <span className="loading-spinner" /> : <Eye className="w-4 h-4" />}
                  Preview Report
                </button>
                <button
                  onClick={downloadReport}
                  disabled={loading || selectedSections.length === 0}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading ? <span className="loading-spinner" /> : <Download className="w-4 h-4" />}
                  Download Report
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <h3 className="font-semibold text-gray-800 mb-4">Report Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Selected Sections</span>
                  <span className="font-medium">{selectedSections.length}/{reportSections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Include Charts</span>
                  <span className="font-medium">{includeCharts ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Format</span>
                  <span className="font-medium">{reportFormat.toUpperCase()}</span>
                </div>
                {savedVisualizations.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saved Visualizations</span>
                    <span className="font-medium">{savedVisualizations.length}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-gray-700 mb-2">Dataset Stats</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Rows:</strong> {stats?.total_rows?.toLocaleString()}</p>
                  <p><strong>Columns:</strong> {stats?.total_columns}</p>
                  <p><strong>Analyzed:</strong> {analyzedColumns}/{stats?.total_columns}</p>
                  <p><strong>Cleaning Operations:</strong> {totalOperations}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="space-y-6">
          {!previewData ? (
            <div className="card text-center py-12">
              <Eye className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No Preview Generated</h3>
              <p className="text-gray-500 mt-2">Configure your report and click "Preview Report" to see a preview</p>
              <button
                onClick={() => setActiveTab('configure')}
                className="btn-primary mt-4"
              >
                Configure Report
              </button>
            </div>
          ) : (
            <>
              <div className="card">
                <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Executive Summary</h2>
                
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <MetricCard title="Total Rows" value={stats?.total_rows?.toLocaleString()} color="primary" />
                  <MetricCard title="Total Columns" value={stats?.total_columns} color="blue" />
                  <MetricCard title="Missing Values" value={stats?.missing_values?.toLocaleString()} color="yellow" />
                  <MetricCard title="Memory Usage" value={`${stats?.memory_usage_mb?.toFixed(1)} MB`} color="green" />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Report generated on {new Date().toLocaleString()}. This dataset contains {stats?.total_rows?.toLocaleString()} rows 
                    across {stats?.total_columns} columns with {stats?.missing_values?.toLocaleString()} total missing values 
                    ({((stats?.missing_values || 0) / (stats?.total_rows * stats?.total_columns) * 100).toFixed(2)}%).
                  </p>
                </div>
              </div>

              {selectedSections.includes('quality') && (
                <div className="card">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">⭐ Data Quality Assessment</h2>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <MetricCard
                      title="Columns Analyzed"
                      value={`${analyzedColumns}/${stats?.total_columns}`}
                      color="primary"
                    />
                    <MetricCard
                      title="Columns with Issues"
                      value={columnsWithIssues}
                      color={columnsWithIssues > 0 ? 'yellow' : 'green'}
                    />
                    <MetricCard
                      title="Average Quality Score"
                      value={`${avgQuality.toFixed(0)}/100`}
                      color={avgQuality >= 80 ? 'green' : avgQuality >= 60 ? 'yellow' : 'red'}
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th>Type</th>
                          <th>Missing %</th>
                          <th>Unique</th>
                          <th>Quality</th>
                        </tr>
                      </thead>
                      <tbody>
                        {columnInfo.map((col) => {
                          const analysis = columnAnalysis[col.name];
                          return (
                            <tr key={col.name}>
                              <td className="font-medium">{col.name}</td>
                              <td>
                                <span className="badge badge-info">{col.detected_type}</span>
                              </td>
                              <td className={col.missing_percentage > 20 ? 'text-red-600 font-medium' : ''}>
                                {col.missing_percentage.toFixed(1)}%
                              </td>
                              <td>{col.unique_count}</td>
                              <td>
                                {analysis?.data_quality ? (
                                  <span className={`badge ${
                                    analysis.data_quality.score >= 80 ? 'badge-success' :
                                    analysis.data_quality.score >= 60 ? 'badge-warning' : 'badge-error'
                                  }`}>
                                    {analysis.data_quality.grade} ({analysis.data_quality.score})
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Not analyzed</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedSections.includes('cleaning') && (
                <div className="card">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">🧹 Cleaning Operations Log</h2>
                  
                  {Object.keys(cleaningHistory).length === 0 ? (
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-600">No cleaning operations performed yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(cleaningHistory).map(([column, operations]) => (
                        <div key={column} className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-800 mb-2">{column}</h4>
                          <ul className="space-y-1 text-sm text-gray-600">
                            {operations.map((op, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>{op.method_name}</span>
                                <span className="text-gray-400">({new Date(op.timestamp).toLocaleDateString()})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      <p className="text-sm text-gray-600">
                        <strong>Total:</strong> {totalOperations} operations across {Object.keys(cleaningHistory).length} columns
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedSections.includes('visualizations') && savedVisualizations.length > 0 && (
                <div className="card">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Visualizations</h2>
                  
                  <div className="space-y-6">
                    {savedVisualizations.map((viz, idx) => (
                      <div key={viz.id} className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-800 mb-2">
                          {idx + 1}. {viz.config.title || `${viz.type} Chart`}
                        </h4>
                        <Plot
                          data={viz.data.data}
                          layout={{ ...viz.data.layout, autosize: true, height: 350 }}
                          config={{ displayModeBar: false }}
                          style={{ width: '100%' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <div className="flex gap-3">
                  <button
                    onClick={downloadReport}
                    disabled={loading}
                    className="btn-primary flex items-center gap-2"
                  >
                    {loading ? <span className="loading-spinner" /> : <Download className="w-4 h-4" />}
                    Download Full Report
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print Preview
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'export' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary-600" />
              Export Data
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Download your cleaned dataset in various formats
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleExportData('csv')}
                disabled={loading}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => handleExportData('xlsx')}
                disabled={loading}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-600" />
              Export Configuration
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Save your column types and cleaning history for reuse
            </p>
            <button
              onClick={handleExportConfig}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <FileJson className="w-4 h-4" />
              Export Config
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
