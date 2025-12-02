import { useState } from 'react';
import { FileText, Download, Settings, FileSpreadsheet, FileJson } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const { sessionId, dataset, stats, columnInfo, columnAnalysis } = useApp();
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Export</h1>
        <p className="text-gray-600">Generate reports and export your cleaned data</p>
      </div>

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

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Dataset Summary Report</h3>
        
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900">{stats?.total_rows?.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Rows</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900">{stats?.total_columns}</p>
            <p className="text-sm text-gray-500">Total Columns</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900">{stats?.missing_values?.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Missing Values</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900">{stats?.memory_usage_mb?.toFixed(1)} MB</p>
            <p className="text-sm text-gray-500">Memory Usage</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-800 mb-3">Column Summary</h4>
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

        {analyzedColumns > 0 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-800 mb-3">Analysis Summary</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-lg font-bold text-green-700">{analyzedColumns}</p>
                <p className="text-sm text-green-600">Columns Analyzed</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-lg font-bold text-yellow-700">{columnsWithIssues}</p>
                <p className="text-sm text-yellow-600">Columns with Issues</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold text-blue-700">
                  {analyzedColumns - columnsWithIssues}
                </p>
                <p className="text-sm text-blue-600">Clean Columns</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
