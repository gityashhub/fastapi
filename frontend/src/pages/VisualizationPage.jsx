import { useState, useEffect } from 'react';
import { LineChart, BarChart3, Grid3X3, TrendingUp, Save, Download, Trash2, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Plot from 'react-plotly.js';
import toast from 'react-hot-toast';
import MetricCard from '../components/MetricCard';

const chartTypes = [
  { id: 'bar', icon: '📊', name: 'Bar Chart' },
  { id: 'line', icon: '📈', name: 'Line Chart' },
  { id: 'scatter', icon: '🔵', name: 'Scatter Plot' },
  { id: 'box', icon: '📦', name: 'Box Plot' },
  { id: 'violin', icon: '🎻', name: 'Violin Plot' },
  { id: 'histogram', icon: '📊', name: 'Histogram' },
  { id: 'kde', icon: '📈', name: 'KDE Plot' },
  { id: 'qq', icon: '📉', name: 'Q-Q Plot' },
  { id: 'pie', icon: '🥧', name: 'Pie Chart' },
  { id: 'heatmap', icon: '🔥', name: 'Heatmap' },
  { id: 'correlation', icon: '🔗', name: 'Correlation Matrix' },
];

export default function VisualizationPage() {
  const { sessionId, dataset, columnInfo, columnAnalysis, stats } = useApp();
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [chartType, setChartType] = useState('bar');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedVisualizations, setSavedVisualizations] = useState([]);
  const [chartConfig, setChartConfig] = useState({
    title: '',
    height: 500,
    showLegend: true
  });
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`saved_visualizations_${sessionId}`);
    if (saved) {
      try {
        setSavedVisualizations(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved visualizations');
      }
    }
  }, [sessionId]);

  const generateChart = async () => {
    if (selectedColumns.length === 0) {
      toast.error('Please select at least one column');
      return;
    }

    setLoading(true);
    try {
      const result = await api.generateChart(sessionId, chartType, selectedColumns, chartConfig);
      if (result.chart) {
        const parsed = JSON.parse(result.chart);
        if (chartConfig.title) {
          parsed.layout.title = chartConfig.title;
        }
        parsed.layout.height = chartConfig.height;
        parsed.layout.showlegend = chartConfig.showLegend;
        setChartData(parsed);
        toast.success('Chart generated successfully');
      }
    } catch (error) {
      console.error('Failed to generate chart:', error);
      toast.error('Failed to generate chart');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const saveVisualization = () => {
    if (!chartData) {
      toast.error('Generate a chart first');
      return;
    }

    const newViz = {
      id: Date.now(),
      type: chartType,
      columns: selectedColumns,
      config: chartConfig,
      data: chartData,
      createdAt: new Date().toISOString()
    };

    const updated = [...savedVisualizations, newViz];
    setSavedVisualizations(updated);
    localStorage.setItem(`saved_visualizations_${sessionId}`, JSON.stringify(updated));
    toast.success('Visualization saved for report');
  };

  const removeVisualization = (id) => {
    const updated = savedVisualizations.filter(v => v.id !== id);
    setSavedVisualizations(updated);
    localStorage.setItem(`saved_visualizations_${sessionId}`, JSON.stringify(updated));
    toast.success('Visualization removed');
  };

  const clearAllVisualizations = () => {
    setSavedVisualizations([]);
    localStorage.removeItem(`saved_visualizations_${sessionId}`);
    toast.success('All visualizations cleared');
  };

  const toggleColumn = (column) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const getDefaultTitle = () => {
    if (selectedColumns.length === 0) return '';
    const chartName = chartTypes.find(c => c.id === chartType)?.name || chartType;
    return `${chartName} - ${selectedColumns.join(', ')}`;
  };

  const analyzedCount = Object.keys(columnAnalysis).length;
  const cleanedCount = Object.values(columnAnalysis).filter(a => a.data_quality?.score >= 80).length;
  const missingPercentage = stats?.missing_values ? ((stats.missing_values / (stats.total_rows * stats.total_columns)) * 100).toFixed(1) : 0;
  const avgQuality = Object.values(columnAnalysis).reduce((sum, a) => sum + (a.data_quality?.score || 0), 0) / (analyzedCount || 1);

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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          📊 Interactive Data Visualization
        </h1>
        <p className="text-gray-600">Create custom visualizations that reflect your cleaning progress</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              🎨 Custom Visualization Builder
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📋 Select Columns
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
                  </button>
                ))}
              </div>
              {selectedColumns.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {selectedColumns.join(', ')}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 Chart Type
              </label>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {chartTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setChartType(type.id)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      chartType === type.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{type.icon}</span>
                    <p className="text-xs mt-1">{type.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <details className="mb-4" open={showConfig}>
              <summary 
                className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2"
                onClick={() => setShowConfig(!showConfig)}
              >
                <Settings className="w-4 h-4" />
                Chart Configuration
              </summary>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chart Title
                  </label>
                  <input
                    type="text"
                    value={chartConfig.title}
                    onChange={(e) => setChartConfig({ ...chartConfig, title: e.target.value })}
                    placeholder={getDefaultTitle()}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chart Height: {chartConfig.height}px
                  </label>
                  <input
                    type="range"
                    min="300"
                    max="800"
                    value={chartConfig.height}
                    onChange={(e) => setChartConfig({ ...chartConfig, height: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={chartConfig.showLegend}
                    onChange={(e) => setChartConfig({ ...chartConfig, showLegend: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Show Legend</span>
                </label>
              </div>
            </details>

            <button
              onClick={generateChart}
              disabled={loading || selectedColumns.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <span className="loading-spinner" /> : '🎨'}
              Generate Visualization
            </button>
          </div>

          {chartData && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Generated Chart</h3>
                <div className="flex gap-2">
                  <button
                    onClick={saveVisualization}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Save className="w-4 h-4" />
                    Save to Report
                  </button>
                  <button className="btn-secondary flex items-center gap-2 text-sm">
                    <Download className="w-4 h-4" />
                    Download PNG
                  </button>
                </div>
              </div>

              {cleanedCount > 0 ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <p className="text-sm text-green-700">
                    ✅ Data has been cleaned - visualization reflects {cleanedCount} cleaned columns with reduced missing values
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <p className="text-sm text-blue-700">
                    📊 Shows current dataset state - consider cleaning data for better visualizations
                  </p>
                </div>
              )}

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
                  toImageButtonOptions: {
                    format: 'png',
                    filename: chartConfig.title || 'chart',
                  }
                }}
                style={{ width: '100%', height: `${chartConfig.height}px` }}
              />
            </div>
          )}

          {savedVisualizations.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  💾 Saved Visualizations for PDF Reports
                </h3>
                <button
                  onClick={clearAllVisualizations}
                  className="btn-secondary flex items-center gap-2 text-sm text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                <p className="text-sm text-green-700">
                  📊 {savedVisualizations.length} visualization(s) saved for your report
                </p>
              </div>

              <div className="space-y-4">
                {savedVisualizations.map((viz, idx) => (
                  <details key={viz.id} className="group">
                    <summary className="cursor-pointer p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                      <span className="font-medium text-gray-800">
                        📈 {idx + 1}. {viz.config.title || `${chartTypes.find(c => c.id === viz.type)?.name} - ${viz.columns.join(', ')}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            removeVisualization(viz.id);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </summary>
                    <div className="mt-2 p-4 border rounded-lg">
                      <Plot
                        data={viz.data.data}
                        layout={{ ...viz.data.layout, autosize: true, height: 350 }}
                        config={{ responsive: true }}
                        style={{ width: '100%' }}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        <strong>Type:</strong> {viz.type} | <strong>Columns:</strong> {viz.columns.join(', ')}
                      </p>
                    </div>
                  </details>
                ))}
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t">
                <button className="btn-primary flex items-center gap-2">
                  📊 Generate Report
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              💡 Data Quality Dashboard
            </h3>
            <div className="space-y-4">
              <MetricCard
                title="Missing Data"
                value={`${missingPercentage}%`}
                color={parseFloat(missingPercentage) > 10 ? 'red' : 'green'}
              />
              <MetricCard
                title="Analyzed Columns"
                value={`${analyzedCount}/${columnInfo.length}`}
                color="blue"
              />
              <MetricCard
                title="Cleaned Columns"
                value={`${cleanedCount}/${columnInfo.length}`}
                color="green"
              />
              <MetricCard
                title="Avg Quality Score"
                value={`${avgQuality.toFixed(0)}/100`}
                color={avgQuality >= 80 ? 'green' : avgQuality >= 60 ? 'yellow' : 'red'}
              />
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Chart Tips</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p><strong>📊 Bar/Line:</strong> Best for comparing categories or trends</p>
              <p><strong>🔵 Scatter:</strong> Shows relationships between two numeric variables</p>
              <p><strong>📦 Box/Violin:</strong> Distribution and outliers visualization</p>
              <p><strong>🥧 Pie:</strong> Show proportions (use for categorical data)</p>
              <p><strong>🔥 Heatmap:</strong> Visualize patterns in 2D data</p>
              <p><strong>🔗 Correlation:</strong> Relationships between all numeric columns</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
