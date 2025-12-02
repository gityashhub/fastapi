import { useState, useEffect } from 'react';
import { AlertTriangle, Search, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AnomalyDetectionPage() {
  const { sessionId, dataset, columnTypes, fetchStats } = useApp();
  const [anomalies, setAnomalies] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [replacementValue, setReplacementValue] = useState('');

  const detectAnomalies = async () => {
    setLoading(true);
    try {
      const result = await api.detectAnomalies(sessionId);
      setAnomalies(result.anomalies);
      toast.success('Anomaly detection complete');
    } catch (error) {
      toast.error('Failed to detect anomalies');
    } finally {
      setLoading(false);
    }
  };

  const handleFix = async (action) => {
    if (!selectedColumn || selectedRows.length === 0) {
      toast.error('Please select anomalies to fix');
      return;
    }

    try {
      await api.fixAnomaly(
        sessionId,
        selectedColumn,
        action,
        selectedRows,
        action === 'replace' ? replacementValue : null
      );
      toast.success('Anomalies fixed successfully');
      setSelectedRows([]);
      setReplacementValue('');
      await fetchStats();
      await detectAnomalies();
    } catch (error) {
      toast.error('Failed to fix anomalies');
    }
  };

  const toggleRowSelection = (rowIndex) => {
    setSelectedRows(prev =>
      prev.includes(rowIndex)
        ? prev.filter(r => r !== rowIndex)
        : [...prev, rowIndex]
    );
  };

  const selectAllInColumn = (column) => {
    const colAnomalies = anomalies[column]?.anomalies || [];
    const indices = colAnomalies.map(a => a.row_index);
    setSelectedRows(indices);
    setSelectedColumn(column);
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

  const totalAnomalies = Object.values(anomalies).reduce(
    (sum, col) => sum + (col.anomaly_count || 0),
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anomaly Detection</h1>
          <p className="text-gray-600">Detect and fix data type mismatches and anomalies</p>
        </div>
        <button
          onClick={detectAnomalies}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <span className="loading-spinner" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Detect Anomalies
        </button>
      </div>

      {Object.keys(anomalies).length === 0 ? (
        <div className="card text-center py-12">
          <AlertTriangle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No Anomalies Detected</h3>
          <p className="text-gray-500 mt-2">
            Click "Detect Anomalies" to scan your dataset for type mismatches and formatting issues.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">Summary</h3>
                <p className="text-sm text-gray-500">
                  Found {totalAnomalies} anomalies across {Object.keys(anomalies).length} columns
                </p>
              </div>
              {selectedRows.length > 0 && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Replacement value"
                    value={replacementValue}
                    onChange={(e) => setReplacementValue(e.target.value)}
                    className="input-field w-48"
                  />
                  <button
                    onClick={() => handleFix('replace')}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Replace ({selectedRows.length})
                  </button>
                  <button
                    onClick={() => handleFix('remove')}
                    className="btn-danger flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove ({selectedRows.length})
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {Object.entries(anomalies).map(([column, data]) => (
              <div key={column} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">{column}</h3>
                    <p className="text-sm text-gray-500">
                      Expected type: <span className="badge badge-info">{data.expected_type}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${data.anomaly_percentage > 10 ? 'badge-error' : 'badge-warning'}`}>
                      {data.anomaly_count} anomalies
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.anomaly_percentage?.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3">{data.summary}</p>

                {data.anomalies?.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Anomalous Values</span>
                      <button
                        onClick={() => selectAllInColumn(column)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto scrollbar-thin">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left w-8"></th>
                            <th className="px-3 py-2 text-left">Row</th>
                            <th className="px-3 py-2 text-left">Value</th>
                            <th className="px-3 py-2 text-left">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.anomalies.slice(0, 20).map((anomaly, idx) => (
                            <tr
                              key={idx}
                              className={`border-t cursor-pointer hover:bg-gray-50 ${
                                selectedRows.includes(anomaly.row_index) && selectedColumn === column
                                  ? 'bg-primary-50'
                                  : ''
                              }`}
                              onClick={() => {
                                setSelectedColumn(column);
                                toggleRowSelection(anomaly.row_index);
                              }}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedRows.includes(anomaly.row_index) && selectedColumn === column}
                                  onChange={() => {}}
                                  className="rounded"
                                />
                              </td>
                              <td className="px-3 py-2 text-gray-500 font-mono">
                                {anomaly.row_index}
                              </td>
                              <td className="px-3 py-2 text-red-600 font-mono truncate max-w-[150px]">
                                {String(anomaly.value)}
                              </td>
                              <td className="px-3 py-2 text-gray-500 text-xs">
                                {anomaly.reason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.anomalies.length > 20 && (
                        <p className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                          Showing 20 of {data.anomalies.length} anomalies
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
