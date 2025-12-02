import { useState } from 'react';
import { Database, Columns, AlertCircle, CheckCircle2, MemoryStick } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import MetricCard from '../components/MetricCard';
import DataTable from '../components/DataTable';
import Accordion from '../components/Accordion';
import { useApp } from '../context/AppContext';

const typeOptions = [
  'continuous', 'integer', 'ordinal', 'categorical', 'binary',
  'text', 'datetime', 'empty', 'unknown'
];

const typeDescriptions = {
  continuous: 'Continuous numeric data (e.g., age, income, measurements)',
  integer: 'Integer numeric data (e.g., count of items, number of children)',
  ordinal: 'Ordered categories (e.g., education level, satisfaction rating)',
  categorical: 'Unordered categories (e.g., gender, region, occupation)',
  binary: 'Two-category variables (e.g., yes/no, male/female)',
  text: 'Free text data (e.g., comments, descriptions)',
  datetime: 'Date and time information',
  empty: 'Columns with no data',
  unknown: 'Unable to determine type automatically'
};

export default function HomePage() {
  const { dataset, stats, columnInfo, columnTypes, updateColumnTypes, analyzeAllColumns, loading } = useApp();
  const [localTypes, setLocalTypes] = useState({});
  const [analyzing, setAnalyzing] = useState(false);

  const handleTypeChange = (column, type) => {
    setLocalTypes(prev => ({ ...prev, [column]: type }));
  };

  const handleUpdateTypes = async () => {
    const updatedTypes = { ...columnTypes, ...localTypes };
    await updateColumnTypes(updatedTypes);
    setLocalTypes({});
  };

  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    try {
      const updatedTypes = { ...columnTypes, ...localTypes };
      await updateColumnTypes(updatedTypes);
      await analyzeAllColumns();
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Renvo AI - Intelligent Data Cleaning Assistant</h1>
        <p className="text-gray-600 mt-2">
          Welcome to the Survey Data Cleaning Assistant - an AI-powered tool designed specifically for statistical agencies.
        </p>
      </div>

      {!dataset ? (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary-600" />
              Data Upload & Configuration
            </h2>
            <FileUploader />
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Features</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: 'Individual Column Analysis', desc: 'Each column is analyzed separately with tailored recommendations' },
                { title: 'AI-Powered Assistance', desc: 'Context-aware guidance using advanced language models' },
                { title: 'Multiple Cleaning Strategies', desc: 'Various methods for handling missing values, outliers, and inconsistencies' },
                { title: 'Comprehensive Audit Trail', desc: 'Track all cleaning operations with undo/redo functionality' },
              ].map((feature, idx) => (
                <div key={idx} className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">{feature.title}</p>
                    <p className="text-sm text-gray-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Rows"
              value={stats?.total_rows?.toLocaleString() || '0'}
              icon={Database}
              color="primary"
            />
            <MetricCard
              title="Total Columns"
              value={stats?.total_columns || '0'}
              icon={Columns}
              color="blue"
            />
            <MetricCard
              title="Missing Values"
              value={stats?.missing_values?.toLocaleString() || '0'}
              icon={AlertCircle}
              color={stats?.missing_values > 0 ? 'yellow' : 'green'}
            />
            <MetricCard
              title="Memory Usage"
              value={`${stats?.memory_usage_mb?.toFixed(1) || '0'} MB`}
              icon={MemoryStick}
              color="purple"
            />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Data Preview</h2>
              <FileUploader />
            </div>
            <DataTable maxRows={50} />
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Column Type Configuration</h2>
            <p className="text-gray-600 mb-4">
              Correct column types are crucial for appropriate cleaning recommendations. Review the auto-detected types and adjust as needed.
            </p>

            <Accordion title="Column Type Guide" defaultOpen={false}>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(typeDescriptions).map(([type, desc]) => (
                  <div key={type} className="text-sm">
                    <span className="font-medium text-gray-700 capitalize">{type}:</span>{' '}
                    <span className="text-gray-500">{desc}</span>
                  </div>
                ))}
              </div>
            </Accordion>

            <div className="mt-6 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Column Name</th>
                    <th>Detected Type</th>
                    <th>Assigned Type</th>
                    <th>Missing</th>
                    <th>Unique</th>
                    <th>Sample Values</th>
                  </tr>
                </thead>
                <tbody>
                  {columnInfo.map((col) => (
                    <tr key={col.name}>
                      <td className="font-medium">{col.name}</td>
                      <td>
                        <span className="badge badge-info">{col.detected_type}</span>
                      </td>
                      <td>
                        <select
                          className="select-field py-1 text-sm"
                          value={localTypes[col.name] || columnTypes[col.name] || col.detected_type}
                          onChange={(e) => handleTypeChange(col.name, e.target.value)}
                        >
                          {typeOptions.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={col.missing_percentage > 20 ? 'text-red-600 font-medium' : ''}>
                          {col.missing_percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td>{col.unique_count}</td>
                      <td className="text-gray-500 text-xs max-w-xs truncate">
                        {col.sample_values?.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateTypes}
                className="btn-secondary"
                disabled={Object.keys(localTypes).length === 0}
              >
                Save Column Types
              </button>
              <button
                onClick={handleAnalyzeAll}
                className="btn-primary"
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <span className="loading-spinner mr-2" />
                    Analyzing...
                  </>
                ) : (
                  'Start Column Analysis'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
