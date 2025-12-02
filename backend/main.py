from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
import io
import json
import uuid
from datetime import datetime

import sys
sys.path.insert(0, '..')

from modules.data_analyzer import ColumnAnalyzer
from modules.cleaning_engine import DataCleaningEngine
from modules.anomaly_detector import AnomalyDetector
from modules.visualization import DataVisualizer
from modules.hypothesis_analysis import HypothesisAnalyzer
from modules.data_balancer import DataBalancer
from modules.report_generator import ReportGenerator

app = FastAPI(title="Renvo AI - Data Cleaning API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: Dict[str, Dict[str, Any]] = {}

def get_session(session_id: str) -> Dict[str, Any]:
    if session_id not in sessions:
        sessions[session_id] = {
            "dataset": None,
            "original_dataset": None,
            "column_types": {},
            "column_analysis": {},
            "cleaning_history": {},
            "undo_stack": [],
            "redo_stack": [],
            "anomaly_results": {},
            "created_at": datetime.now().isoformat()
        }
    return sessions[session_id]

def detect_column_types(df: pd.DataFrame) -> Dict[str, str]:
    column_types = {}
    for col in df.columns:
        series = df[col].dropna()
        if len(series) == 0:
            column_types[col] = 'empty'
            continue
        unique_vals = series.unique()
        if len(unique_vals) == 2:
            column_types[col] = 'binary'
            continue
        if series.dtype == 'object':
            if len(unique_vals) / len(series) < 0.1 and len(unique_vals) < 20:
                column_types[col] = 'categorical'
            else:
                column_types[col] = 'text'
            continue
        if pd.api.types.is_numeric_dtype(series):
            if pd.api.types.is_integer_dtype(series):
                if len(unique_vals) < 10 and series.min() >= 0:
                    column_types[col] = 'ordinal'
                else:
                    column_types[col] = 'integer'
            else:
                column_types[col] = 'continuous'
            continue
        if pd.api.types.is_datetime64_any_dtype(series):
            column_types[col] = 'datetime'
            continue
        column_types[col] = 'unknown'
    return column_types

def serialize_value(val):
    if pd.isna(val):
        return None
    if isinstance(val, (np.integer, np.floating)):
        return float(val) if np.isfinite(val) else None
    if isinstance(val, np.ndarray):
        return val.tolist()
    if isinstance(val, pd.Timestamp):
        return val.isoformat()
    return val

def make_serializable(obj):
    """Recursively convert numpy/pandas types to native Python types for JSON serialization."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {str(k): make_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_serializable(v) for v in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        val = float(obj)
        return val if np.isfinite(val) else None
    elif isinstance(obj, np.ndarray):
        return [make_serializable(v) for v in obj.tolist()]
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif pd.isna(obj):
        return None
    elif isinstance(obj, (str, int, float, bool)):
        return obj
    else:
        try:
            return str(obj)
        except:
            return None

def df_to_json(df: pd.DataFrame, max_rows: int = 1000) -> Dict[str, Any]:
    if len(df) > max_rows:
        sample_df = df.head(max_rows)
    else:
        sample_df = df
    
    records = []
    for idx, row in sample_df.iterrows():
        record = {"_index": idx}
        for col in sample_df.columns:
            record[col] = serialize_value(row[col])
        records.append(record)
    
    return {
        "data": records,
        "total_rows": len(df),
        "displayed_rows": len(sample_df),
        "columns": list(df.columns)
    }

class SessionCreate(BaseModel):
    session_id: Optional[str] = None

class ColumnTypeUpdate(BaseModel):
    session_id: str
    column_types: Dict[str, str]

class CleaningRequest(BaseModel):
    session_id: str
    column: str
    method_type: str
    method_name: str
    parameters: Optional[Dict[str, Any]] = None

class AnomalyFixRequest(BaseModel):
    session_id: str
    column: str
    action: str
    indices: Optional[List[int]] = None
    replacement_value: Optional[Any] = None

class HypothesisTestRequest(BaseModel):
    session_id: str
    test_type: str
    columns: List[str]
    parameters: Optional[Dict[str, Any]] = None

class BalancerRequest(BaseModel):
    session_id: str
    target_column: str
    method: str
    parameters: Optional[Dict[str, Any]] = None

@app.get("/")
def root():
    return {"message": "Renvo AI - Data Cleaning API", "version": "1.0.0"}

@app.post("/api/session/create")
def create_session(request: SessionCreate):
    session_id = request.session_id or str(uuid.uuid4())
    get_session(session_id)
    return {"session_id": session_id}

@app.get("/api/session/{session_id}")
def get_session_info(session_id: str):
    session = get_session(session_id)
    has_data = session["dataset"] is not None
    return {
        "session_id": session_id,
        "has_data": has_data,
        "column_count": len(session["column_types"]) if has_data else 0,
        "row_count": len(session["dataset"]) if has_data else 0,
        "created_at": session["created_at"]
    }

@app.post("/api/upload")
async def upload_file(session_id: str, file: UploadFile = File(...)):
    session = get_session(session_id)
    
    try:
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        session["dataset"] = df
        session["original_dataset"] = df.copy()
        session["column_types"] = detect_column_types(df)
        session["column_analysis"] = {}
        session["cleaning_history"] = {}
        session["undo_stack"] = []
        session["redo_stack"] = []
        
        stats = {
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "missing_values": int(df.isnull().sum().sum()),
            "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024**2, 2)
        }
        
        column_info = []
        for col in df.columns:
            col_data = {
                "name": col,
                "dtype": str(df[col].dtype),
                "detected_type": session["column_types"].get(col, "unknown"),
                "non_null_count": int(df[col].count()),
                "missing_count": int(df[col].isnull().sum()),
                "missing_percentage": round((df[col].isnull().sum() / len(df)) * 100, 2),
                "unique_count": int(df[col].nunique()),
                "sample_values": [serialize_value(v) for v in df[col].dropna().head(3).tolist()]
            }
            column_info.append(col_data)
        
        return {
            "success": True,
            "filename": file.filename,
            "stats": stats,
            "column_info": column_info,
            "column_types": session["column_types"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/{session_id}")
def get_data(session_id: str, offset: int = 0, limit: int = 100):
    session = get_session(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    subset = df.iloc[offset:offset + limit]
    
    return {
        "data": df_to_json(subset, max_rows=limit),
        "total_rows": len(df),
        "offset": offset,
        "limit": limit
    }

@app.get("/api/data/{session_id}/stats")
def get_data_stats(session_id: str):
    session = get_session(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    
    stats = {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "missing_values": int(df.isnull().sum().sum()),
        "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024**2, 2),
        "duplicate_rows": int(df.duplicated().sum())
    }
    
    column_stats = {}
    for col in df.columns:
        col_stats = {
            "dtype": str(df[col].dtype),
            "count": int(df[col].count()),
            "missing": int(df[col].isnull().sum()),
            "unique": int(df[col].nunique())
        }
        
        if pd.api.types.is_numeric_dtype(df[col]):
            series = df[col].dropna()
            if len(series) > 0:
                col_stats.update({
                    "mean": float(series.mean()),
                    "median": float(series.median()),
                    "std": float(series.std()),
                    "min": float(series.min()),
                    "max": float(series.max()),
                    "q25": float(series.quantile(0.25)),
                    "q75": float(series.quantile(0.75))
                })
        
        column_stats[col] = col_stats
    
    return {
        "stats": stats,
        "column_stats": column_stats,
        "column_types": session["column_types"]
    }

@app.post("/api/column-types/update")
def update_column_types(request: ColumnTypeUpdate):
    session = get_session(request.session_id)
    session["column_types"] = request.column_types
    return {"success": True, "column_types": session["column_types"]}

@app.get("/api/column-types/{session_id}")
def get_column_types(session_id: str):
    session = get_session(session_id)
    return {"column_types": session["column_types"]}

@app.post("/api/analyze/column/{session_id}/{column}")
def analyze_column(session_id: str, column: str, force_refresh: bool = False):
    session = get_session(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    
    if column not in df.columns:
        raise HTTPException(status_code=404, detail=f"Column {column} not found")
    
    analyzer = ColumnAnalyzer()
    analysis = analyzer.analyze_column(df, column, force_refresh)
    
    def make_serializable(obj):
        if isinstance(obj, dict):
            return {k: make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [make_serializable(v) for v in obj]
        elif isinstance(obj, (np.integer, np.floating)):
            return float(obj) if np.isfinite(obj) else None
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        return obj
    
    analysis = make_serializable(analysis)
    session["column_analysis"][column] = analysis
    
    return {"column": column, "analysis": analysis}

@app.post("/api/analyze/all/{session_id}")
def analyze_all_columns(session_id: str):
    session = get_session(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    analyzer = ColumnAnalyzer()
    
    results = {}
    for col in df.columns:
        try:
            analysis = analyzer.analyze_column(df, col)
            
            def make_serializable(obj):
                if isinstance(obj, dict):
                    return {k: make_serializable(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [make_serializable(v) for v in obj]
                elif isinstance(obj, (np.integer, np.floating)):
                    return float(obj) if np.isfinite(obj) else None
                elif isinstance(obj, np.ndarray):
                    return obj.tolist()
                elif pd.isna(obj):
                    return None
                return obj
            
            results[col] = make_serializable(analysis)
        except Exception as e:
            results[col] = {"error": str(e)}
    
    session["column_analysis"] = results
    return {"analyses": results}

@app.post("/api/anomaly/detect/{session_id}")
def detect_anomalies(session_id: str):
    session = get_session(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    detector = AnomalyDetector()
    
    all_anomalies = detector.detect_all_anomalies(df, session["column_types"])
    
    def make_serializable(obj):
        if isinstance(obj, dict):
            return {k: make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [make_serializable(v) for v in obj]
        elif isinstance(obj, (np.integer, np.floating)):
            return float(obj) if np.isfinite(obj) else None
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        return obj
    
    all_anomalies = make_serializable(all_anomalies)
    session["anomaly_results"] = all_anomalies
    
    return {"anomalies": all_anomalies}

@app.post("/api/anomaly/fix")
def fix_anomaly(request: AnomalyFixRequest):
    session = get_session(request.session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"].copy()
    detector = AnomalyDetector()
    
    session["undo_stack"].append({
        "dataset": session["dataset"].copy(),
        "timestamp": datetime.now().isoformat()
    })
    if len(session["undo_stack"]) > 20:
        session["undo_stack"].pop(0)
    session["redo_stack"].clear()
    
    if request.action == "remove":
        df, summary = detector.remove_anomalies(df, request.column, request.indices or [])
    elif request.action == "replace":
        if request.indices and len(request.indices) == 1:
            df, summary = detector.replace_anomaly(df, request.indices[0], request.column, request.replacement_value)
        else:
            replacements = {idx: request.replacement_value for idx in (request.indices or [])}
            df, summary = detector.batch_replace_anomalies(df, request.column, replacements)
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    session["dataset"] = df
    
    return {"success": True, "summary": summary}

@app.post("/api/clean")
def apply_cleaning(request: CleaningRequest):
    session = get_session(request.session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"].copy()
    engine = DataCleaningEngine()
    
    session["undo_stack"].append({
        "dataset": session["dataset"].copy(),
        "timestamp": datetime.now().isoformat()
    })
    if len(session["undo_stack"]) > 20:
        session["undo_stack"].pop(0)
    session["redo_stack"].clear()
    
    try:
        cleaned_series, metadata = engine.apply_cleaning_method(
            df, request.column, request.method_type, request.method_name, request.parameters
        )
        
        df[request.column] = cleaned_series
        session["dataset"] = df
        
        if request.column not in session["cleaning_history"]:
            session["cleaning_history"][request.column] = []
        
        session["cleaning_history"][request.column].append({
            "method_type": request.method_type,
            "method_name": request.method_name,
            "parameters": request.parameters,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat()
        })
        
        def make_serializable(obj):
            if isinstance(obj, dict):
                return {k: make_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [make_serializable(v) for v in obj]
            elif isinstance(obj, (np.integer, np.floating)):
                return float(obj) if np.isfinite(obj) else None
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif pd.isna(obj):
                return None
            return obj
        
        return {"success": True, "metadata": make_serializable(metadata)}
    
    except Exception as e:
        session["undo_stack"].pop()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cleaning-methods")
def get_cleaning_methods():
    return {
        "missing_values": [
            {"name": "mean_imputation", "label": "Mean Imputation", "description": "Fill missing values with column mean", "applicable": ["continuous", "integer"]},
            {"name": "median_imputation", "label": "Median Imputation", "description": "Fill missing values with column median", "applicable": ["continuous", "integer", "ordinal"]},
            {"name": "mode_imputation", "label": "Mode Imputation", "description": "Fill missing values with most frequent value", "applicable": ["categorical", "binary", "text"]},
            {"name": "forward_fill", "label": "Forward Fill", "description": "Fill with previous valid value", "applicable": ["all"]},
            {"name": "backward_fill", "label": "Backward Fill", "description": "Fill with next valid value", "applicable": ["all"]},
            {"name": "knn_imputation", "label": "KNN Imputation", "description": "Fill using K-nearest neighbors", "applicable": ["continuous", "integer"]},
            {"name": "interpolation", "label": "Interpolation", "description": "Linear interpolation for ordered data", "applicable": ["continuous", "integer"]},
            {"name": "missing_category", "label": "Missing Category", "description": "Create 'Missing' category", "applicable": ["categorical", "text"]},
            {"name": "regression_imputation", "label": "Regression Imputation", "description": "Predict missing values using regression", "applicable": ["continuous", "integer"]}
        ],
        "outliers": [
            {"name": "iqr_removal", "label": "IQR Removal", "description": "Remove outliers using IQR method", "applicable": ["continuous", "integer"]},
            {"name": "zscore_removal", "label": "Z-Score Removal", "description": "Remove outliers using Z-score", "applicable": ["continuous", "integer"]},
            {"name": "winsorization", "label": "Winsorization", "description": "Cap outliers at percentiles", "applicable": ["continuous", "integer"]},
            {"name": "log_transformation", "label": "Log Transformation", "description": "Apply log to reduce skewness", "applicable": ["continuous", "integer"]},
            {"name": "cap_outliers", "label": "Cap Outliers", "description": "Cap outliers at bounds", "applicable": ["continuous", "integer"]},
            {"name": "isolation_forest", "label": "Isolation Forest", "description": "ML-based outlier detection", "applicable": ["continuous", "integer"]}
        ],
        "data_quality": [
            {"name": "type_standardization", "label": "Type Standardization", "description": "Standardize data types", "applicable": ["all"]},
            {"name": "remove_duplicates", "label": "Remove Duplicates", "description": "Remove duplicate rows", "applicable": ["all"]},
            {"name": "trim_whitespace", "label": "Trim Whitespace", "description": "Remove leading/trailing spaces", "applicable": ["text", "categorical"]},
            {"name": "standardize_case", "label": "Standardize Case", "description": "Convert to lowercase/uppercase", "applicable": ["text", "categorical"]}
        ]
    }

@app.post("/api/undo/{session_id}")
def undo_operation(session_id: str):
    session = get_session(session_id)
    
    if not session["undo_stack"]:
        raise HTTPException(status_code=400, detail="Nothing to undo")
    
    session["redo_stack"].append({
        "dataset": session["dataset"].copy(),
        "timestamp": datetime.now().isoformat()
    })
    
    previous_state = session["undo_stack"].pop()
    session["dataset"] = previous_state["dataset"]
    
    return {"success": True, "message": "Undo successful"}

@app.post("/api/redo/{session_id}")
def redo_operation(session_id: str):
    session = get_session(session_id)
    
    if not session["redo_stack"]:
        raise HTTPException(status_code=400, detail="Nothing to redo")
    
    session["undo_stack"].append({
        "dataset": session["dataset"].copy(),
        "timestamp": datetime.now().isoformat()
    })
    
    next_state = session["redo_stack"].pop()
    session["dataset"] = next_state["dataset"]
    
    return {"success": True, "message": "Redo successful"}

@app.get("/api/history/{session_id}")
def get_cleaning_history(session_id: str):
    session = get_session(session_id)
    return {
        "cleaning_history": make_serializable(session["cleaning_history"]),
        "undo_available": len(session["undo_stack"]) > 0,
        "redo_available": len(session["redo_stack"]) > 0
    }

@app.post("/api/hypothesis/recommend/{session_id}")
def recommend_hypothesis_test(session_id: str, columns: List[str]):
    session = get_session(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    analyzer = HypothesisAnalyzer()
    
    data_types = {}
    for col in columns:
        col_type = session["column_types"].get(col, "unknown")
        if col_type in ["continuous", "integer", "ordinal"]:
            data_types[col] = "numeric"
        else:
            data_types[col] = "categorical"
    
    recommendations = analyzer.recommend_test(df, columns, data_types)
    return recommendations

@app.post("/api/hypothesis/test")
def run_hypothesis_test(request: HypothesisTestRequest):
    session = get_session(request.session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    analyzer = HypothesisAnalyzer()
    
    if request.parameters and "alpha" in request.parameters:
        analyzer.set_alpha(request.parameters["alpha"])
    
    test_method = getattr(analyzer, request.test_type, None)
    if test_method is None:
        raise HTTPException(status_code=400, detail=f"Unknown test type: {request.test_type}")
    
    try:
        if request.test_type in ["one_sample_ttest"]:
            test_value = request.parameters.get("test_value", 0) if request.parameters else 0
            result = test_method(df, request.columns[0], test_value)
        elif request.test_type in ["welch_ttest", "mann_whitney", "independent_ttest", "one_way_anova", "kruskal_wallis"]:
            result = test_method(df, request.columns[0], request.columns[1])
        elif request.test_type in ["pearson_correlation", "spearman_correlation", "chi_square", "fisher_exact"]:
            result = test_method(df, request.columns[0], request.columns[1])
        else:
            result = {"error": "Test not implemented"}
        
        def make_serializable(obj):
            if isinstance(obj, dict):
                return {k: make_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [make_serializable(v) for v in obj]
            elif isinstance(obj, tuple):
                return [make_serializable(v) for v in obj]
            elif isinstance(obj, (np.integer, np.floating)):
                val = float(obj)
                return val if np.isfinite(val) else None
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif pd.isna(obj):
                return None
            return obj
        
        return make_serializable(result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/hypothesis/tests")
def get_available_tests():
    return {
        "tests": [
            {"id": "one_sample_ttest", "name": "One-Sample t-Test", "description": "Test if mean differs from a value", "min_columns": 1, "max_columns": 1},
            {"id": "welch_ttest", "name": "Welch's t-Test", "description": "Compare means of two groups", "min_columns": 2, "max_columns": 2},
            {"id": "mann_whitney", "name": "Mann-Whitney U Test", "description": "Non-parametric comparison of two groups", "min_columns": 2, "max_columns": 2},
            {"id": "pearson_correlation", "name": "Pearson Correlation", "description": "Linear correlation between variables", "min_columns": 2, "max_columns": 2},
            {"id": "spearman_correlation", "name": "Spearman Correlation", "description": "Rank correlation between variables", "min_columns": 2, "max_columns": 2},
            {"id": "chi_square", "name": "Chi-Square Test", "description": "Test independence of categorical variables", "min_columns": 2, "max_columns": 2},
            {"id": "fisher_exact", "name": "Fisher's Exact Test", "description": "Exact test for 2x2 tables", "min_columns": 2, "max_columns": 2},
            {"id": "one_way_anova", "name": "One-Way ANOVA", "description": "Compare means across groups", "min_columns": 2, "max_columns": 2},
            {"id": "kruskal_wallis", "name": "Kruskal-Wallis Test", "description": "Non-parametric ANOVA", "min_columns": 2, "max_columns": 2}
        ]
    }

@app.post("/api/balance")
def balance_data(request: BalancerRequest):
    session = get_session(request.session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    balancer = DataBalancer()
    
    try:
        balanced_df, summary = balancer.balance_dataset(
            df, request.target_column, request.method, request.parameters or {}
        )
        
        session["undo_stack"].append({
            "dataset": session["dataset"].copy(),
            "timestamp": datetime.now().isoformat()
        })
        session["dataset"] = balanced_df
        
        def make_serializable(obj):
            if isinstance(obj, dict):
                return {k: make_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [make_serializable(v) for v in obj]
            elif isinstance(obj, (np.integer, np.floating)):
                return float(obj) if np.isfinite(obj) else None
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif pd.isna(obj):
                return None
            return obj
        
        return {"success": True, "summary": make_serializable(summary)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/visualization/{session_id}/distribution/{column}")
def get_distribution_chart(session_id: str, column: str):
    session = get_session(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    visualizer = DataVisualizer()
    
    fig = visualizer.plot_column_distribution(df[column], column)
    return {"chart": fig.to_json()}

@app.get("/api/visualization/{session_id}/correlation")
def get_correlation_chart(session_id: str):
    session = get_session(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    visualizer = DataVisualizer()
    
    fig = visualizer.plot_correlation_matrix(df)
    return {"chart": fig.to_json()}

@app.get("/api/visualization/{session_id}/missing")
def get_missing_chart(session_id: str):
    session = get_session(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    visualizer = DataVisualizer()
    
    fig = visualizer.plot_missing_patterns(df)
    return {"chart": fig.to_json()}

@app.get("/api/visualization/{session_id}/overview")
def get_overview_chart(session_id: str):
    session = get_session(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    visualizer = DataVisualizer()
    
    fig = visualizer.plot_column_overview(df)
    return {"chart": fig.to_json()}

@app.post("/api/export/config/{session_id}")
def export_config(session_id: str):
    session = get_session(session_id)
    
    config = {
        "column_types": session["column_types"],
        "cleaning_history": make_serializable(session["cleaning_history"]),
        "exported_at": datetime.now().isoformat()
    }
    
    return config

@app.post("/api/import/config/{session_id}")
def import_config(session_id: str, config: Dict[str, Any]):
    session = get_session(session_id)
    
    if "column_types" in config:
        session["column_types"] = config["column_types"]
    if "cleaning_history" in config:
        session["cleaning_history"] = config["cleaning_history"]
    
    return {"success": True}

@app.get("/api/export/data/{session_id}")
def export_data(session_id: str, format: str = "csv"):
    session = get_session(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    
    if format == "csv":
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=cleaned_data.csv"}
        )
    elif format == "xlsx":
        output = io.BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=cleaned_data.xlsx"}
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

@app.post("/api/reset/{session_id}")
def reset_to_original(session_id: str):
    session = get_session(session_id)
    
    if session["original_dataset"] is None:
        raise HTTPException(status_code=404, detail="No original dataset")
    
    session["undo_stack"].append({
        "dataset": session["dataset"].copy(),
        "timestamp": datetime.now().isoformat()
    })
    
    session["dataset"] = session["original_dataset"].copy()
    session["cleaning_history"] = {}
    
    return {"success": True, "message": "Reset to original dataset"}

class AIQuestionRequest(BaseModel):
    session_id: str
    question: str
    column: Optional[str] = None

class AIRecommendationRequest(BaseModel):
    session_id: str
    column: str

ai_assistants: Dict[str, Any] = {}

def get_ai_assistant(session_id: str):
    if session_id not in ai_assistants:
        from modules.ai_assistant import AIAssistant
        ai_assistants[session_id] = AIAssistant()
    return ai_assistants[session_id]

@app.post("/api/ai/ask")
def ask_ai(request: AIQuestionRequest):
    session = get_session(request.session_id)
    assistant = get_ai_assistant(request.session_id)
    
    current_state = {}
    if session["dataset"] is not None:
        df = session["dataset"]
        current_state = {
            'current_dataset_stats': {
                'rows': len(df),
                'columns': len(df.columns),
                'missing_total': int(df.isnull().sum().sum()),
                'columns_cleaned': len(session["cleaning_history"])
            },
            'cleaning_history': make_serializable(session["cleaning_history"])
        }
        
        dataset_info = {
            'shape': f"{len(df)} rows x {len(df.columns)} columns",
            'columns': len(df.columns),
            'column_types': session["column_types"],
            'missing_summary': {col: int(df[col].isnull().sum()) for col in df.columns}
        }
        assistant.set_context(dataset_info)
    
    try:
        response = assistant.ask_question(
            request.question,
            column_specific=request.column,
            current_data_state=current_state
        )
        return {"response": response, "success": True}
    except Exception as e:
        return {"response": f"I apologize, but I couldn't process your question. Error: {str(e)}", "success": False}

@app.post("/api/ai/recommend/{session_id}/{column}")
def get_ai_recommendation(session_id: str, column: str):
    session = get_session(session_id)
    assistant = get_ai_assistant(session_id)
    
    if session["dataset"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    df = session["dataset"]
    
    if column not in df.columns:
        raise HTTPException(status_code=404, detail=f"Column {column} not found")
    
    dataset_info = {
        'shape': f"{len(df)} rows x {len(df.columns)} columns",
        'columns': len(df.columns),
        'column_types': session["column_types"],
        'missing_summary': {col: int(df[col].isnull().sum()) for col in df.columns}
    }
    assistant.set_context(dataset_info)
    
    analysis = session["column_analysis"].get(column, {})
    
    try:
        if analysis:
            recommendation = assistant.get_intelligent_cleaning_recommendation(column, analysis, df)
        else:
            recommendation = assistant.get_cleaning_recommendation(column, {})
        return {"recommendation": recommendation, "column": column, "success": True}
    except Exception as e:
        return {"recommendation": f"Unable to generate recommendation: {str(e)}", "success": False}

@app.get("/api/ai/history/{session_id}")
def get_ai_history(session_id: str):
    assistant = get_ai_assistant(session_id)
    return {"history": assistant.get_conversation_history()}

@app.post("/api/ai/clear/{session_id}")
def clear_ai_history(session_id: str):
    assistant = get_ai_assistant(session_id)
    assistant.clear_conversation_history()
    return {"success": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
