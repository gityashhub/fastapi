import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ColumnAnalysisPage from './pages/ColumnAnalysisPage';
import AnomalyDetectionPage from './pages/AnomalyDetectionPage';
import CleaningWizardPage from './pages/CleaningWizardPage';
import VisualizationPage from './pages/VisualizationPage';
import HypothesisPage from './pages/HypothesisPage';
import DataBalancerPage from './pages/DataBalancerPage';
import AIAssistantPage from './pages/AIAssistantPage';
import ReportsPage from './pages/ReportsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="column-analysis" element={<ColumnAnalysisPage />} />
        <Route path="anomaly-detection" element={<AnomalyDetectionPage />} />
        <Route path="cleaning-wizard" element={<CleaningWizardPage />} />
        <Route path="visualization" element={<VisualizationPage />} />
        <Route path="hypothesis" element={<HypothesisPage />} />
        <Route path="data-balancer" element={<DataBalancerPage />} />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
