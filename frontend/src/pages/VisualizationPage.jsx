import { useState, useEffect } from 'react';
import { LineChart, BarChart3, Grid3X3, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Plot from 'react-plotly.js';

export default function VisualizationPage() {
  const { sessionId, dataset, columnInfo } = useApp();
  const [activeTab, setActiveTab] = useState('distribution');
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (columnInfo.length > 0 && !selectedColumn) {
      setSelectedColumn(columnInfo[0].name);
    }
  }, [columnInfo]);

  useEffect(() => {
    if (sessionId && dataset) {
      loadChart();
    }
  }, [activeTab, selectedColumn, sessionId, dataset]);

  const loadChart = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      let result;
      switch (activeTab) {
        case 'distribution':
          if (selectedColumn) {
            result = await api.getDistributionChart(sessionId, selectedColumn);
          }
          break;
        case 'correlation':
          result = await api.getCorrelationChart(sessionId);
          break;
        case 'missing':
          result = await api.getMissingChart(sessionId);
          break;
        case 'overview':
          result = await api.getOverviewChart(sessionId);
          break;
      }
      if (result) {
        setChartData(JSON.parse(result.chart));
      }
    } catch (error) {
      console.error('Failed to load chart:', error);
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'distribution', label: 'Distribution', icon: BarChart3 },
    { id: 'correlation', label: 'Correlation', icon: Grid3X3 },
    { id: 'missing', label: 'Missing Patterns', icon: TrendingUp },
    { id: 'overview', label: 'Overview', icon: LineChart },
  ];

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <LineChart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">No Dataset Loaded</h2>
        <p className="text-gray-500 mt-2">Upload a dataset to create visualizations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visualization</h1>
        <p className="text-gray-600">Interactive charts and visualizations of your data</p>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'distribution' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Column
            </label>
            <select
              className="select-field w-64"
              value={selectedColumn || ''}
              onChange={(e) => setSelectedColumn(e.target.value)}
            >
              {columnInfo.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="min-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="loading-spinner w-8 h-8" />
            </div>
          ) : chartData ? (
            <Plot
              data={chartData.data}
              layout={{
                ...chartData.layout,
                autosize: true,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
              }}
              config={{
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'eraseshape'],
              }}
              style={{ width: '100%', height: '500px' }}
            />
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-500">
              No data available for this visualization
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
