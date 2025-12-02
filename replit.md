# Renvo AI - Intelligent Data Cleaning Assistant

## Overview
A modern web application for statistical agencies, designed to clean and analyze survey data. The application has been migrated from Streamlit to a React + FastAPI architecture for improved performance and a polished user experience. It provides AI-powered guidance, comprehensive analysis tools, and detailed reporting capabilities for data quality assessment and cleaning operations.

## System Architecture

### Frontend (React + Vite)
- **Framework**: React 18 with Vite for fast development and HMR
- **Styling**: Tailwind CSS 4 for modern, responsive design
- **State Management**: React Context API for global state
- **Routing**: React Router v6 for client-side navigation
- **Charts**: Plotly.js and Recharts for interactive visualizations
- **HTTP Client**: Axios for API communication
- **UI Components**: Lucide React icons, Framer Motion for animations, React Hot Toast for notifications

### Backend (FastAPI)
- **Framework**: FastAPI with Uvicorn server
- **Data Processing**: Pandas, NumPy, openpyxl
- **Analysis**: Scikit-learn, SciPy, imbalanced-learn
- **Session Management**: In-memory session storage with undo/redo support
- **Visualization**: Plotly for server-generated charts

### Directory Structure
```
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React Context providers
│   │   ├── services/      # API service layer
│   │   └── main.jsx       # App entry point
│   ├── vite.config.js     # Vite configuration
│   └── package.json       # Frontend dependencies
├── backend/               # FastAPI backend
│   └── main.py           # API endpoints
├── modules/              # Shared Python business logic
│   ├── data_analyzer.py  # Column analysis
│   ├── cleaning_engine.py # Data cleaning methods
│   ├── anomaly_detector.py # Anomaly detection
│   ├── visualization.py   # Chart generation
│   ├── hypothesis_analysis.py # Statistical tests
│   ├── data_balancer.py   # Class balancing
│   └── report_generator.py # PDF/report generation
└── app.py                # Legacy Streamlit app
```

## Key Features

### Pages
1. **Home** - Dataset upload, column type configuration, data preview
2. **Anomaly Detection** - Detect and fix data type mismatches
3. **Column Analysis** - Individual column statistics, distributions, quality scores
4. **Cleaning Wizard** - Missing values, outliers, data quality methods
5. **Visualization** - Distribution, correlation, missing patterns charts
6. **Hypothesis Testing** - 9+ statistical tests with recommendations
7. **Data Balancer** - SMOTE, undersampling, hybrid methods
8. **AI Assistant** - Context-aware guidance (built-in knowledge)
9. **Reports** - Export data and configuration

### Core Capabilities
- **Auto Column Type Detection**: binary, categorical, continuous, ordinal, integer, text, datetime
- **Missing Value Handling**: Mean/median/mode imputation, KNN, regression, interpolation
- **Outlier Detection**: IQR, Z-score, isolation forest with winsorization and capping
- **Statistical Tests**: t-tests, ANOVA, correlation, chi-square, Mann-Whitney, and more
- **Data Balancing**: 14 methods across 3 categories:
  - Oversampling: Random Oversampling, SMOTE
  - Undersampling: Random Undersampling, Tomek Links, NearMiss (1-3), ENN, CNN, OSS, Cluster Centroids, NCR
  - Hybrid: SMOTE + Tomek Links, SMOTE + ENN
- **Undo/Redo**: Full operation history with 20-step limit
- **Export**: CSV, Excel, and JSON configuration

## API Endpoints

### Session Management
- `POST /api/session/create` - Create new session
- `GET /api/session/{session_id}` - Get session info

### Data Operations
- `POST /api/upload` - Upload dataset
- `GET /api/data/{session_id}` - Get paginated data
- `GET /api/data/{session_id}/stats` - Get statistics
- `POST /api/column-types/update` - Update column types

### Analysis
- `POST /api/analyze/column/{session_id}/{column}` - Analyze single column
- `POST /api/analyze/all/{session_id}` - Analyze all columns
- `POST /api/anomaly/detect/{session_id}` - Detect anomalies
- `POST /api/anomaly/fix` - Fix detected anomalies

### Cleaning
- `GET /api/cleaning-methods` - List available methods
- `POST /api/clean` - Apply cleaning method
- `POST /api/undo/{session_id}` - Undo last operation
- `POST /api/redo/{session_id}` - Redo operation

### Statistical Testing
- `GET /api/hypothesis/tests` - List available tests
- `POST /api/hypothesis/recommend/{session_id}` - Get recommendations
- `POST /api/hypothesis/test` - Run hypothesis test

### Balancing & Export
- `GET /api/balance/methods` - Get available balancing methods with categories
- `POST /api/balance` - Balance dataset (auto-selects numeric feature columns)
- `GET /api/export/data/{session_id}` - Export data
- `POST /api/export/config/{session_id}` - Export configuration

## Workflows
- **Backend API**: `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- **Frontend App**: `cd frontend && npm run dev` (runs on port 5000)

## Recent Updates (December 2025)

### UI/UX Enhancements
- **Anomaly Detection Page**: Tabbed interface for Type Anomalies and Duplicate Removal with action dropdowns
- **Column Analysis Page**: 6-tab interface (Basic Info, Missing Data, Outliers, Distribution, Rule Violations, Recommendations)
- **Cleaning Wizard Page**: Survey weights support, undo/redo controls, AI guidance section, method parameters
- **Visualization Page**: Custom chart builder with 11 chart types (bar, line, scatter, box, violin, histogram, KDE, Q-Q, pie, heatmap, correlation)
- **Hypothesis Testing Page**: AI-powered test selection, test browsing tabs, configuration options
- **Data Balancer Page**: Feature column selection, stratified train/test split, step-by-step workflow
- **AI Assistant Page**: Quick actions, context modes (General/Column/Method/Stats), conversation export
- **Reports Page**: Report configuration, section selection, preview/export tabs, saved visualizations

### New API Endpoints
- `POST /api/anomaly/detect/{session_id}/{column}` - Per-column anomaly detection
- `POST /api/anomaly/duplicates/detect` - Detect duplicate rows
- `POST /api/anomaly/duplicates/remove` - Remove duplicate rows
- `POST /api/visualization/generate` - Custom chart generation
- `POST /api/weights/configure` - Survey weights configuration
- `POST /api/clean/preview` - Preview cleaning changes before applying
- `GET /api/balance/distribution/{session_id}/{column}` - Class distribution
- `POST /api/balance/split` - Stratified train/test split
- `POST /api/hypothesis/ai-recommend` - AI-powered test recommendation
- `POST /api/report/preview` - Generate report preview
- `POST /api/report/generate` - Download full report

### Previous Updates
- **React + FastAPI Migration**: Complete rewrite from Streamlit to modern React/FastAPI architecture
- **Modern UI**: Polished, professional interface with Tailwind CSS
- **Improved Performance**: Client-side rendering, optimized API endpoints
- **Better UX**: Responsive design, animated transitions, toast notifications
- **API-First Design**: RESTful API enabling future mobile/desktop clients
- **Data Balancer Enhancement**: 14 balancing methods with categorized UI (Oversampling/Undersampling/Hybrid)
- **Fixed JSON Serialization**: Resolved numpy/pandas type serialization issues across API endpoints
- **Method ID Consistency**: Frontend and backend now use consistent canonical method identifiers
