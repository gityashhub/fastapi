import { useState, useEffect } from 'react';
import { AlertTriangle, Search, Trash2, Edit2, CheckCircle, XCircle, RefreshCw, Download, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import MetricCard from '../components/MetricCard';

export default function AnomalyDetectionPage() {
  const { sessionId, dataset, columnTypes, columnInfo, fetchStats, stats } = useApp();
  const [activeTab, setActiveTab] = useState('anomalies');
  const [anomalies, setAnomalies] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [columnAnomalies, setColumnAnomalies] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [replacementValue, setReplacementValue] = useState('');
  const [fixMethod, setFixMethod] = useState('null');
  const [duplicates, setDuplicates] = useState(null);
  const [dupColumns, setDupColumns] = useState([]);
  const [keepOption, setKeepOption] = useState('first');
  const [scanningAll, setScanningAll] = useState(false);
  const [allColumnResults, setAllColumnResults] = useState([]);

  useEffect(() => {
    if (columnInfo.length > 0 && !selectedColumn) {
      setSelectedColumn(columnInfo[0].name);
    }
  }, [columnInfo]);

  const scanColumn = async () => {
    if (!selectedColumn) return;
    setLoading(true);
    try {
      const result = await api.detectAnomalies(sessionId, selectedColumn);
      setColumnAnomalies(result);
      if (result.anomalies && result.anomalies.length > 0) {
        toast.success(`Found ${result.anomaly_count} anomalies in ${selectedColumn}`);
      } else {
        toast.success(`No anomalies found in ${selectedColumn}`);
      }
    } catch (error) {
      toast.error('Failed to scan for anomalies');
    } finally {
      setLoading(false);
    }
  };

  const scanAllColumns = async () => {
    setScanningAll(true);
    const results = [];
    try {
      for (const col of columnInfo) {
        const result = await api.detectAnomalies(sessionId, col.name);
        results.push({
          column: col.name,
          expected_type: columnTypes[col.name] || col.detected_type,
          anomaly_count: result.anomaly_count || 0,
          percentage: ((result.anomaly_count || 0) / stats.total_rows * 100).toFixed(2)
        });
      }
      setAllColumnResults(results);
      toast.success('Scan complete for all columns');
    } catch (error) {
      toast.error('Failed to scan all columns');
    } finally {
      setScanningAll(false);
    }
  };

  const detectDuplicates = async () => {
    setLoading(true);
    try {
      const result = await api.detectDuplicates(sessionId, dupColumns.length > 0 ? dupColumns : null);
      setDuplicates(result);
      if (result.duplicate_count > 0) {
        toast.success(`Found ${result.duplicate_count} duplicate rows`);
      } else {
        toast.success('No duplicates found');
      }
    } catch (error) {
      toast.error('Failed to detect duplicates');
    } finally {
      setLoading(false);
    }
  };

  const removeDuplicates = async () => {
    if (!duplicates || duplicates.duplicate_count === 0) return;
    setLoading(true);
    try {
      await api.removeDuplicates(sessionId, dupColumns.length > 0 ? dupColumns : null, keepOption);
      await fetchStats();
      await detectDuplicates();
      toast.success('Duplicates removed successfully');
    } catch (error) {
      toast.error('Failed to remove duplicates');
    } finally {
      setLoading(false);
    }
  };

  const handleFixAnomalies = async () => {
    if (!selectedColumn || selectedRows.length === 0) {
      toast.error('Please select anomalies to fix');
      return;
    }

    setLoading(true);
    try {
      if (fixMethod === 'null') {
        await api.fixAnomaly(sessionId, selectedColumn, 'null', selectedRows, null);
      } else {
        await api.fixAnomaly(sessionId, selectedColumn, 'replace', selectedRows, replacementValue);
      }
      toast.success('Anomalies fixed successfully');
      setSelectedRows([]);
      setReplacementValue('');
      await fetchStats();
      await scanColumn();
    } catch (error) {
      toast.error('Failed to fix anomalies');
    } finally {
      setLoading(false);
    }
  };

  const toggleRowSelection = (rowIndex) => {
    setSelectedRows(prev =>
      prev.includes(rowIndex)
        ? prev.filter(r => r !== rowIndex)
        : [...prev, rowIndex]
    );
  };

  const selectAllAnomalies = () => {
    if (columnAnomalies?.anomalies) {
      const indices = columnAnomalies.anomalies.map(a => a.row_index);
      setSelectedRows(indices);
    }
  };

  const getColumnInfo = () => {
    const col = columnInfo.find(c => c.name === selectedColumn);
    return col || {};
  };

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">No Dataset Loaded</h2>
        <p className="text-gray-500 mt-2">Upload a dataset to detect anomalies.</p>
      </div>
    );
  }

  const colInfo = getColumnInfo();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Search className="w-6 h-6 text-primary-600" />
          Data Type Anomaly Detection & Duplicate Removal
        </h1>
        <p className="text-gray-600">Detect type mismatches, duplicates, and invalid formats in your data</p>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'anomalies'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Type Anomalies
          </span>
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'duplicates'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Duplicate Removal
          </span>
        </button>
      </div>

      {activeTab === 'anomalies' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">1. Select Column to Check</h3>
            <select
              className="select-field mb-4"
              value={selectedColumn}
              onChange={(e) => {
                setSelectedColumn(e.target.value);
                setColumnAnomalies(null);
                setSelectedRows([]);
              }}
            >
              <option value="">Select a column...</option>
              {columnInfo.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>

            {selectedColumn && (
              <div className="grid md:grid-cols-3 gap-4">
                <MetricCard
                  title="Expected Type"
                  value={columnTypes[selectedColumn] || colInfo.detected_type || 'unknown'}
                  color="primary"
                />
                <MetricCard
                  title="Total Values"
                  value={stats?.total_rows?.toLocaleString() || '0'}
                  color="blue"
                />
                <MetricCard
                  title="Null Values"
                  value={colInfo.null_count?.toLocaleString() || '0'}
                  color="yellow"
                />
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">2. Scan for Anomalies</h3>
            <div className="flex gap-3">
              <button
                onClick={scanColumn}
                disabled={loading || !selectedColumn}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <span className="loading-spinner" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Scan Column
              </button>
            </div>

            {columnAnomalies && (
              <div className="mt-4">
                {columnAnomalies.anomaly_count === 0 ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-700">No anomalies detected in this column</span>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-700">
                      Found {columnAnomalies.anomaly_count} anomalies ({columnAnomalies.anomaly_percentage?.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {columnAnomalies && columnAnomalies.anomalies?.length > 0 && (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">3. Review Anomalies</h3>
                  <div className="flex gap-2">
                    <button onClick={selectAllAnomalies} className="btn-secondary text-sm">
                      Select All
                    </button>
                    <button className="btn-secondary text-sm flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left w-8"></th>
                          <th className="px-3 py-2 text-left">Row Index</th>
                          <th className="px-3 py-2 text-left">Anomalous Value</th>
                          <th className="px-3 py-2 text-left">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {columnAnomalies.anomalies.slice(0, 50).map((anomaly, idx) => (
                          <tr
                            key={idx}
                            className={`border-t cursor-pointer hover:bg-gray-50 ${
                              selectedRows.includes(anomaly.row_index) ? 'bg-primary-50' : ''
                            }`}
                            onClick={() => toggleRowSelection(anomaly.row_index)}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(anomaly.row_index)}
                                onChange={() => {}}
                                className="rounded"
                              />
                            </td>
                            <td className="px-3 py-2 text-gray-500 font-mono">{anomaly.row_index}</td>
                            <td className="px-3 py-2 text-red-600 font-mono truncate max-w-[200px]">
                              {String(anomaly.value)}
                            </td>
                            <td className="px-3 py-2 text-gray-500">{anomaly.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {columnAnomalies.anomalies.length > 50 && (
                    <p className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                      Showing 50 of {columnAnomalies.anomalies.length} anomalies
                    </p>
                  )}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">4. Fix Anomalies</h3>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="fixMethod"
                        value="null"
                        checked={fixMethod === 'null'}
                        onChange={(e) => setFixMethod(e.target.value)}
                        className="text-primary-600"
                      />
                      <span>Set to Null</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="fixMethod"
                        value="replace"
                        checked={fixMethod === 'replace'}
                        onChange={(e) => setFixMethod(e.target.value)}
                        className="text-primary-600"
                      />
                      <span>Replace with Value</span>
                    </label>
                  </div>

                  {fixMethod === 'replace' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Replacement Value
                      </label>
                      <input
                        type="text"
                        value={replacementValue}
                        onChange={(e) => setReplacementValue(e.target.value)}
                        placeholder="Enter replacement value..."
                        className="input-field w-64"
                      />
                    </div>
                  )}

                  {selectedRows.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        {fixMethod === 'null' 
                          ? `This will set ${selectedRows.length} cell(s) to null.`
                          : `This will replace ${selectedRows.length} cell(s) with "${replacementValue}".`
                        }
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleFixAnomalies}
                      disabled={loading || selectedRows.length === 0 || (fixMethod === 'replace' && !replacementValue)}
                      className="btn-primary flex items-center gap-2"
                    >
                      {loading ? <span className="loading-spinner" /> : <CheckCircle className="w-4 h-4" />}
                      Apply Fix ({selectedRows.length})
                    </button>
                    <button
                      onClick={() => setSelectedRows([])}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="card">
            <details className="group">
              <summary className="cursor-pointer font-semibold text-gray-800 flex items-center gap-2">
                <span>Scan All Columns for Anomalies</span>
              </summary>
              <div className="mt-4 space-y-4">
                <button
                  onClick={scanAllColumns}
                  disabled={scanningAll}
                  className="btn-primary flex items-center gap-2"
                >
                  {scanningAll ? <span className="loading-spinner" /> : <Search className="w-4 h-4" />}
                  Scan All Columns
                </button>

                {allColumnResults.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th>Expected Type</th>
                          <th>Anomaly Count</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allColumnResults.map((result, idx) => (
                          <tr key={idx}>
                            <td className="font-medium">{result.column}</td>
                            <td><span className="badge badge-info">{result.expected_type}</span></td>
                            <td className={result.anomaly_count > 0 ? 'text-red-600 font-medium' : ''}>
                              {result.anomaly_count}
                            </td>
                            <td>{result.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      )}

      {activeTab === 'duplicates' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">1. Detect Complete Duplicate Rows</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-700">
                This detects rows that are completely identical across all columns. You can also check for duplicates based on a subset of columns.
              </p>
            </div>

            <button
              onClick={detectDuplicates}
              disabled={loading}
              className="btn-primary flex items-center gap-2 mb-4"
            >
              {loading ? <span className="loading-spinner" /> : <Search className="w-4 h-4" />}
              Detect Duplicates
            </button>

            {duplicates && (
              <div className="grid md:grid-cols-3 gap-4">
                <MetricCard
                  title="Total Rows"
                  value={stats?.total_rows?.toLocaleString() || '0'}
                  color="primary"
                />
                <MetricCard
                  title="Duplicate Rows"
                  value={duplicates.duplicate_count?.toLocaleString() || '0'}
                  color={duplicates.duplicate_count > 0 ? 'red' : 'green'}
                />
                <MetricCard
                  title="Duplicate %"
                  value={`${duplicates.duplicate_percentage?.toFixed(2) || '0'}%`}
                  color={duplicates.duplicate_count > 0 ? 'yellow' : 'green'}
                />
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">2. Configure Duplicate Detection</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Column Subset (optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select specific columns to check for duplicates. Leave empty to check all columns.
                </p>
                <select
                  multiple
                  className="select-field h-32"
                  value={dupColumns}
                  onChange={(e) => setDupColumns(Array.from(e.target.selectedOptions, option => option.value))}
                >
                  {columnInfo.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))}
                </select>
                {dupColumns.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {dupColumns.join(', ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keep Option
                </label>
                <select
                  className="select-field w-48"
                  value={keepOption}
                  onChange={(e) => setKeepOption(e.target.value)}
                >
                  <option value="first">Keep First</option>
                  <option value="last">Keep Last</option>
                  <option value="none">Keep None</option>
                </select>
              </div>

              <button
                onClick={detectDuplicates}
                disabled={loading}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Re-check with Settings
              </button>
            </div>
          </div>

          {duplicates && duplicates.duplicate_count > 0 && duplicates.sample_duplicates && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">3. Preview Duplicates</h3>
              
              <div className="overflow-x-auto max-h-72">
                <table className="data-table">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      {duplicates.sample_duplicates.length > 0 && 
                        Object.keys(duplicates.sample_duplicates[0]).map((key) => (
                          <th key={key}>{key}</th>
                        ))
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {duplicates.sample_duplicates.slice(0, 100).map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="truncate max-w-[150px]">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {duplicates.sample_duplicates.length > 100 && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing first 100 of {duplicates.duplicate_count} duplicate rows
                </p>
              )}
            </div>
          )}

          {duplicates && duplicates.duplicate_count > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">4. Remove Duplicates</h3>
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <p className="text-sm text-yellow-700">
                  This will remove {duplicates.duplicate_count} duplicate rows from your dataset.
                  {keepOption === 'first' && ' The first occurrence of each duplicate will be kept.'}
                  {keepOption === 'last' && ' The last occurrence of each duplicate will be kept.'}
                  {keepOption === 'none' && ' All duplicate rows will be removed.'}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={removeDuplicates}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading ? <span className="loading-spinner" /> : <Trash2 className="w-4 h-4" />}
                  Remove Duplicates
                </button>
                <button
                  onClick={() => setDuplicates(null)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {duplicates && duplicates.duplicate_count === 0 && (
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">No Duplicates Found</p>
                  <p className="text-sm text-green-600">Your dataset has no duplicate rows.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700 flex items-center gap-2">
          <span>💡</span>
          After fixing anomalies, proceed to Column Analysis for detailed insights.
        </p>
      </div>
    </div>
  );
}
