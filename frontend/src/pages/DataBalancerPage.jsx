import { useState, useEffect } from 'react';
import { Scale, Play, Info, ArrowUp, ArrowDown, Shuffle, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const fallbackMethods = {
  Oversampling: [
    { id: 'random_oversample', name: 'Random Oversampling', description: 'Duplicate minority class samples randomly' },
    { id: 'smote', name: 'SMOTE', description: 'Synthetic Minority Over-sampling Technique' },
  ],
  Undersampling: [
    { id: 'random_undersample', name: 'Random Undersampling', description: 'Remove majority class samples randomly' },
    { id: 'tomek', name: 'Tomek Links', description: 'Remove borderline majority samples' },
    { id: 'enn', name: 'ENN', description: 'Edited Nearest Neighbors' },
    { id: 'nearmiss1', name: 'NearMiss-1', description: 'Keep majority samples closest to minority' },
  ],
  Hybrid: [
    { id: 'smoteenn', name: 'SMOTE + ENN', description: 'SMOTE with Edited Nearest Neighbors cleaning' },
    { id: 'smotetomek', name: 'SMOTE + Tomek', description: 'SMOTE with Tomek links cleaning' },
  ]
};

export default function DataBalancerPage() {
  const { sessionId, dataset, columnInfo, columnTypes, fetchStats } = useApp();
  const [targetColumn, setTargetColumn] = useState('');
  const [method, setMethod] = useState('smote');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Oversampling');
  const [balancingMethods, setBalancingMethods] = useState(fallbackMethods);

  useEffect(() => {
    loadBalancingMethods();
  }, []);

  const loadBalancingMethods = async () => {
    try {
      const response = await api.getBalancingMethods();
      if (response.methods && response.methods.length > 0) {
        const grouped = {};
        response.methods.forEach(m => {
          if (!grouped[m.category]) {
            grouped[m.category] = [];
          }
          grouped[m.category].push(m);
        });
        setBalancingMethods(grouped);
      }
    } catch (error) {
      console.error('Failed to load balancing methods:', error);
    }
  };

  const categoricalColumns = columnInfo.filter(col => 
    ['categorical', 'binary', 'ordinal'].includes(columnTypes[col.name] || col.detected_type)
  );

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Oversampling': return <ArrowUp className="w-4 h-4" />;
      case 'Undersampling': return <ArrowDown className="w-4 h-4" />;
      case 'Hybrid': return <Shuffle className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleBalance = async () => {
    if (!targetColumn) {
      toast.error('Please select a target column');
      return;
    }

    setLoading(true);
    try {
      const balanceResult = await api.balanceData(sessionId, targetColumn, method, {});
      setResult(balanceResult);
      await fetchStats();
      toast.success('Dataset balanced successfully');
    } catch (error) {
      toast.error(error.message || 'Balancing failed');
    } finally {
      setLoading(false);
    }
  };

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">No Dataset Loaded</h2>
        <p className="text-gray-500 mt-2">Upload a dataset to balance class distribution.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Balancer</h1>
        <p className="text-gray-600">Balance class distribution for machine learning</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Step 1: Select Target Column</h3>
            <p className="text-sm text-gray-600 mb-3">
              Choose the categorical column you want to balance (usually your target/label column)
            </p>
            <select
              className="select-field"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
            >
              <option value="">Select target column...</option>
              {categoricalColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.unique_count} classes)
                </option>
              ))}
            </select>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Step 2: Select Balancing Method</h3>
            
            <div className="flex gap-2 mb-4">
              {Object.keys(balancingMethods).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === category
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  {getCategoryIcon(category)}
                  {category}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {balancingMethods[activeCategory]?.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    method === m.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-800">{m.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{m.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <button
              onClick={handleBalance}
              disabled={loading || !targetColumn}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <span className="loading-spinner" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Balance Dataset
            </button>
          </div>

          {result?.success && result.summary && (
            <div className="card bg-green-50 border-green-200">
              <h4 className="font-semibold text-green-800 mb-3">Balancing Complete</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Original Samples</p>
                  <p className="text-lg font-semibold">{result.summary.original_samples?.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">New Samples</p>
                  <p className="text-lg font-semibold text-green-600">{result.summary.new_samples?.toLocaleString()}</p>
                </div>
              </div>
              {result.summary.class_distribution && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">New Class Distribution:</p>
                  <div className="space-y-2">
                    {Object.entries(result.summary.class_distribution).map(([cls, count]) => (
                      <div key={cls} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{cls}</span>
                        <span className="font-medium">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-4">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary-600" />
              About Balancing
            </h3>
            <div className="space-y-4 text-sm text-gray-600">
              <p>
                <strong>Why balance?</strong> Imbalanced datasets can lead to biased machine learning models that perform poorly on minority classes.
              </p>
              <p>
                <strong>Oversampling</strong> creates synthetic samples of the minority class to match the majority.
              </p>
              <p>
                <strong>Undersampling</strong> reduces the majority class to match the minority.
              </p>
              <p>
                <strong>SMOTE</strong> creates synthetic samples by interpolating between existing minority samples.
              </p>
              <div className="p-3 bg-yellow-50 rounded-lg text-yellow-700">
                <strong>Note:</strong> Balancing changes your dataset. Use undo if you want to revert.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
