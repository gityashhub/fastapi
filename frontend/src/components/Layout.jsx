import { Outlet, NavLink } from 'react-router-dom';
import { 
  Home, 
  BarChart3, 
  AlertTriangle, 
  Sparkles, 
  LineChart, 
  FlaskConical, 
  Scale, 
  Bot, 
  FileText,
  Database,
  Undo2,
  Redo2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/anomaly-detection', icon: AlertTriangle, label: 'Anomaly Detection' },
  { path: '/column-analysis', icon: BarChart3, label: 'Column Analysis' },
  { path: '/cleaning-wizard', icon: Sparkles, label: 'Cleaning Wizard' },
  { path: '/visualization', icon: LineChart, label: 'Visualization' },
  { path: '/hypothesis', icon: FlaskConical, label: 'Hypothesis Testing' },
  { path: '/data-balancer', icon: Scale, label: 'Data Balancer' },
  { path: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
  { path: '/reports', icon: FileText, label: 'Reports' },
];

export default function Layout() {
  const { dataset, stats, undoAvailable, redoAvailable, undo, redo } = useApp();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Renvo AI</h1>
              <p className="text-xs text-gray-500">Data Cleaning Assistant</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {dataset && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-2 mb-3">
              <button
                onClick={undo}
                disabled={!undoAvailable}
                className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2"
              >
                <Undo2 className="w-4 h-4" />
                Undo
              </button>
              <button
                onClick={redo}
                disabled={!redoAvailable}
                className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm py-2"
              >
                <Redo2 className="w-4 h-4" />
                Redo
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Rows:</span>
                <span className="font-medium">{stats?.total_rows?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Columns:</span>
                <span className="font-medium">{stats?.total_columns}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Missing:</span>
                <span className="font-medium">{stats?.missing_values?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
