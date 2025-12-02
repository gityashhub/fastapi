import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
from typing import Dict, List, Any, Tuple
import plotly.figure_factory as ff

# Remove the placeholder - caching will be done at instance level

class DataVisualizer:
    """Comprehensive visualization module for data cleaning assistant"""
    
    def __init__(self):
        self.color_palette = px.colors.qualitative.Set3
        self.plot_config = {
            'displayModeBar': True,
            'modeBarButtonsToAdd': ['drawline', 'drawopenpath', 'drawrect', 'eraseshape']
        }
        self._corr_cache = {}
    
    def plot_missing_patterns(self, df: pd.DataFrame, max_cols: int = 50) -> go.Figure:
        """Create heatmap of missing value patterns - optimized for large datasets"""
        # Limit columns for visualization performance
        if len(df.columns) > max_cols:
            cols_to_show = df.columns[:max_cols].tolist()
            df_viz = df[cols_to_show]
            title_suffix = f" (showing first {max_cols} columns)"
        else:
            df_viz = df
            title_suffix = ""
        
        # Sample rows if dataset is very large (>10000 rows)
        if len(df_viz) > 10000:
            # Sample every nth row to reduce memory usage
            sample_rate = len(df_viz) // 5000
            df_viz = df_viz.iloc[::sample_rate]
            title_suffix += f" (sampled {len(df_viz)} rows)"
        
        # Create missing value matrix - optimized
        missing_matrix = df_viz.isnull().astype(np.int8)  # Use int8 instead of int for memory
        
        fig = go.Figure(data=go.Heatmap(
            z=missing_matrix.values.T,
            y=missing_matrix.columns,
            x=missing_matrix.index,
            colorscale=[[0, 'lightblue'], [1, 'red']],
            showscale=True,
            colorbar=dict(title="Missing Values", tickvals=[0, 1], ticktext=["Present", "Missing"])
        ))
        
        fig.update_layout(
            title=f"Missing Value Pattern{title_suffix}",
            xaxis_title="Row Index",
            yaxis_title="Columns",
            height=max(400, min(len(df_viz.columns) * 20, 800)),  # Cap height
            xaxis=dict(showticklabels=False) if len(df_viz) > 1000 else {}
        )
        
        return fig
    
    def plot_column_overview(self, df: pd.DataFrame) -> go.Figure:
        """Create overview plot of all columns with basic statistics"""
        stats = []
        for col in df.columns:
            col_stats = {
                'column': col,
                'missing_pct': (df[col].isnull().sum() / len(df)) * 100,
                'unique_pct': (df[col].nunique() / len(df)) * 100,
                'dtype': str(df[col].dtype)
            }
            stats.append(col_stats)
        
        stats_df = pd.DataFrame(stats)
        
        fig = go.Figure()
        
        # Missing percentage bars
        fig.add_trace(go.Bar(
            name='Missing %',
            x=stats_df['column'],
            y=stats_df['missing_pct'],
            yaxis='y',
            marker_color='red',
            opacity=0.7
        ))
        
        # Unique percentage line
        fig.add_trace(go.Scatter(
            name='Unique %',
            x=stats_df['column'],
            y=stats_df['unique_pct'],
            yaxis='y2',
            mode='lines+markers',
            line=dict(color='blue', width=2),
            marker=dict(size=6)
        ))
        
        fig.update_layout(
            title="Column Overview: Missing Values and Uniqueness",
            xaxis_title="Columns",
            yaxis=dict(title="Missing Percentage", side="left", color="red"),
            yaxis2=dict(title="Unique Percentage", side="right", overlaying="y", color="blue"),
            height=500,
            xaxis=dict(tickangle=45),
            hovermode='x unified',
            legend=dict(x=0.01, y=0.99)
        )
        
        return fig
    
    def plot_column_distribution(self, series: pd.Series, column_name: str) -> go.Figure:
        """Plot distribution for a specific column"""
        if pd.api.types.is_numeric_dtype(series):
            return self._plot_numeric_distribution(series, column_name)
        else:
            return self._plot_categorical_distribution(series, column_name)
    
    def _plot_numeric_distribution(self, series: pd.Series, column_name: str) -> go.Figure:
        """Plot numeric column distribution with statistics"""
        non_null_series = series.dropna()
        
        if len(non_null_series) == 0:
            fig = go.Figure()
            fig.add_annotation(text="No data to display", 
                             x=0.5, y=0.5, 
                             xref="paper", yref="paper",
                             showarrow=False, font_size=20)
            fig.update_layout(title=f"{column_name} - No Data")
            return fig
        
        fig = go.Figure()
        
        # Histogram
        fig.add_trace(go.Histogram(
            x=non_null_series,
            name="Distribution",
            nbinsx=min(50, int(len(non_null_series) / 10)),
            marker_color='lightblue',
            opacity=0.7
        ))
        
        # Add statistics lines
        mean_val = non_null_series.mean()
        median_val = non_null_series.median()
        
        fig.add_vline(x=mean_val, line_dash="dash", line_color="red", 
                     annotation_text=f"Mean: {mean_val:.2f}")
        fig.add_vline(x=median_val, line_dash="dash", line_color="blue", 
                     annotation_text=f"Median: {median_val:.2f}")
        
        # Add quartiles
        q25 = non_null_series.quantile(0.25)
        q75 = non_null_series.quantile(0.75)
        fig.add_vline(x=q25, line_dash="dot", line_color="green", opacity=0.5)
        fig.add_vline(x=q75, line_dash="dot", line_color="green", opacity=0.5)
        
        fig.update_layout(
            title=f"{column_name} - Distribution",
            xaxis_title=column_name,
            yaxis_title="Frequency",
            height=400,
            showlegend=False
        )
        
        return fig
    
    def _plot_categorical_distribution(self, series: pd.Series, column_name: str) -> go.Figure:
        """Plot categorical column distribution"""
        value_counts = series.value_counts().head(20)  # Top 20 categories
        
        if len(value_counts) == 0:
            fig = go.Figure()
            fig.add_annotation(text="No data to display", 
                             x=0.5, y=0.5, 
                             xref="paper", yref="paper",
                             showarrow=False, font_size=20)
            fig.update_layout(title=f"{column_name} - No Data")
            return fig
        
        fig = go.Figure(data=[
            go.Bar(x=value_counts.index, y=value_counts.values,
                   marker_color='lightcoral')
        ])
        
        fig.update_layout(
            title=f"{column_name} - Top Categories",
            xaxis_title="Categories",
            yaxis_title="Count",
            height=400,
            xaxis=dict(tickangle=45)
        )
        
        return fig
    
    def plot_outliers(self, series: pd.Series, column_name: str, outlier_results: Dict[str, Any]) -> go.Figure:
        """Plot outlier detection results"""
        if not pd.api.types.is_numeric_dtype(series):
            fig = go.Figure()
            fig.add_annotation(text="Outlier detection only available for numeric columns", 
                             x=0.5, y=0.5, xref="paper", yref="paper",
                             showarrow=False, font_size=16)
            fig.update_layout(title=f"{column_name} - Not Numeric")
            return fig
        
        non_null_series = series.dropna()
        
        if len(non_null_series) < 10:
            fig = go.Figure()
            fig.add_annotation(text="Insufficient data for outlier detection", 
                             x=0.5, y=0.5, xref="paper", yref="paper",
                             showarrow=False, font_size=16)
            fig.update_layout(title=f"{column_name} - Insufficient Data")
            return fig
        
        fig = go.Figure()
        
        # Box plot
        fig.add_trace(go.Box(
            y=non_null_series,
            name="Data",
            boxpoints="outliers",
            marker_color="lightblue"
        ))
        
        # Add outlier detection results if available
        if 'method_results' in outlier_results:
            iqr_results = outlier_results['method_results'].get('iqr', {})
            if iqr_results:
                # Highlight IQR outliers
                outlier_values = iqr_results.get('outlier_values', [])
                if outlier_values:
                    fig.add_trace(go.Scatter(
                        y=outlier_values,
                        x=['Outliers'] * len(outlier_values),
                        mode='markers',
                        name='IQR Outliers',
                        marker=dict(color='red', size=8, symbol='x')
                    ))
        
        fig.update_layout(
            title=f"{column_name} - Outlier Detection",
            yaxis_title=column_name,
            height=400
        )
        
        return fig
    
    def plot_before_after_comparison(self, before_series: pd.Series, after_series: pd.Series, 
                                   column_name: str, operation: str) -> go.Figure:
        """Create before/after comparison visualization"""
        fig = go.Figure()
        
        if pd.api.types.is_numeric_dtype(before_series):
            # Numeric comparison - histograms
            fig.add_trace(go.Histogram(
                x=before_series.dropna(),
                name="Before",
                opacity=0.6,
                marker_color='red',
                nbinsx=30
            ))
            
            fig.add_trace(go.Histogram(
                x=after_series.dropna(),
                name="After",
                opacity=0.6,
                marker_color='blue',
                nbinsx=30
            ))
            
            fig.update_layout(
                title=f"{column_name} - Before/After {operation}",
                xaxis_title=column_name,
                yaxis_title="Frequency",
                barmode='overlay'
            )
        else:
            # Categorical comparison - bar charts
            before_counts = before_series.value_counts().head(10)
            after_counts = after_series.value_counts().head(10)
            
            # Align categories
            all_categories = list(set(before_counts.index) | set(after_counts.index))
            
            before_aligned = [before_counts.get(cat, 0) for cat in all_categories]
            after_aligned = [after_counts.get(cat, 0) for cat in all_categories]
            
            fig.add_trace(go.Bar(
                x=all_categories,
                y=before_aligned,
                name="Before",
                marker_color='red',
                opacity=0.7
            ))
            
            fig.add_trace(go.Bar(
                x=all_categories,
                y=after_aligned,
                name="After",
                marker_color='blue',
                opacity=0.7
            ))
            
            fig.update_layout(
                title=f"{column_name} - Before/After {operation}",
                xaxis_title="Categories",
                yaxis_title="Count",
                barmode='group',
                xaxis=dict(tickangle=45)
            )
        
        fig.update_layout(height=400, legend=dict(x=0.01, y=0.99))
        return fig
    
    def plot_correlation_matrix(self, df: pd.DataFrame, max_cols: int = 20) -> go.Figure:
        """Create correlation matrix for numeric columns - optimized with caching"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if len(numeric_df.columns) == 0:
            fig = go.Figure()
            fig.add_annotation(text="No numeric columns for correlation analysis", 
                             x=0.5, y=0.5, xref="paper", yref="paper",
                             showarrow=False, font_size=16)
            fig.update_layout(title="Correlation Matrix - No Numeric Data")
            return fig
        
        # Limit columns for visualization performance
        if len(numeric_df.columns) > max_cols:
            numeric_df = numeric_df.iloc[:, :max_cols]
        
        # Create cache key based on columns and data hash
        cols_tuple = tuple(numeric_df.columns)
        cache_key = (cols_tuple, len(numeric_df))
        
        # Check cache first
        if cache_key in self._corr_cache:
            corr_matrix = self._corr_cache[cache_key]
        else:
            # Calculate correlation matrix (optimized with numpy)
            corr_matrix = numeric_df.corr(method='pearson')
            self._corr_cache[cache_key] = corr_matrix
        
        # Create heatmap
        fig = go.Figure(data=go.Heatmap(
            z=corr_matrix.values,
            x=corr_matrix.columns,
            y=corr_matrix.columns,
            colorscale='RdBu',
            zmid=0,
            colorbar=dict(title="Correlation")
        ))
        
        fig.update_layout(
            title="Correlation Matrix (Numeric Columns)",
            height=600,
            xaxis=dict(tickangle=45),
            yaxis=dict(tickangle=0)
        )
        
        return fig
    
    def create_summary_dashboard(self, df: pd.DataFrame, analysis_results: Dict[str, Any]) -> List[go.Figure]:
        """Create a comprehensive summary dashboard"""
        figures = []
        
        # 1. Dataset Overview
        overview_fig = self.plot_column_overview(df)
        figures.append(overview_fig)
        
        # 2. Missing Pattern
        missing_fig = self.plot_missing_patterns(df)
        figures.append(missing_fig)
        
        # 3. Data Quality Summary
        quality_scores = []
        columns = []
        
        for col, analysis in analysis_results.items():
            if 'data_quality' in analysis:
                quality_scores.append(analysis['data_quality'].get('score', 0))
                columns.append(col)
        
        if quality_scores:
            quality_fig = go.Figure(data=[
                go.Bar(x=columns, y=quality_scores, 
                       marker_color=[
                           'green' if score >= 80 else 'orange' if score >= 60 else 'red' 
                           for score in quality_scores
                       ])
            ])
            
            quality_fig.update_layout(
                title="Data Quality Scores by Column",
                xaxis_title="Columns",
                yaxis_title="Quality Score",
                height=400,
                xaxis=dict(tickangle=45)
            )
            
            figures.append(quality_fig)
        
        return figures

    def plot_bar_chart(self, df: pd.DataFrame, x_column: str, y_column: str = None) -> go.Figure:
        """Create a bar chart for the specified columns"""
        if df is None or df.empty:
            fig = go.Figure()
            fig.add_annotation(text="No data available", x=0.5, y=0.5, 
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        if x_column not in df.columns:
            fig = go.Figure()
            fig.add_annotation(text=f"Column '{x_column}' not found", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        try:
            if y_column and y_column in df.columns:
                data = df.groupby(x_column)[y_column].mean().reset_index()
                fig = go.Figure(data=[
                    go.Bar(x=data[x_column], y=data[y_column], marker_color='steelblue')
                ])
                fig.update_layout(
                    title=f"{y_column} by {x_column}",
                    xaxis_title=x_column,
                    yaxis_title=y_column,
                    height=400
                )
            else:
                value_counts = df[x_column].value_counts().head(20)
                fig = go.Figure(data=[
                    go.Bar(x=value_counts.index.astype(str), y=value_counts.values, marker_color='steelblue')
                ])
                fig.update_layout(
                    title=f"Distribution of {x_column}",
                    xaxis_title=x_column,
                    yaxis_title="Count",
                    height=400
                )
        except Exception as e:
            fig = go.Figure()
            fig.add_annotation(text=f"Error creating chart: {str(e)[:50]}", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=14)
        return fig
    
    def plot_line_chart(self, df: pd.DataFrame, columns: List[str]) -> go.Figure:
        """Create a line chart for the specified columns"""
        fig = go.Figure()
        
        if df is None or df.empty:
            fig.add_annotation(text="No data available", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        if not columns:
            fig.add_annotation(text="No columns selected", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        valid_cols = []
        for col in columns:
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                try:
                    fig.add_trace(go.Scatter(
                        x=df.index,
                        y=df[col],
                        mode='lines+markers',
                        name=col
                    ))
                    valid_cols.append(col)
                except Exception:
                    continue
        
        if not valid_cols:
            fig.add_annotation(text="No numeric columns found for line chart", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
        
        fig.update_layout(
            title="Line Chart",
            xaxis_title="Index",
            yaxis_title="Value",
            height=400
        )
        return fig
    
    def plot_scatter(self, df: pd.DataFrame, x_column: str, y_column: str) -> go.Figure:
        """Create a scatter plot for two columns"""
        fig = go.Figure()
        
        if df is None or df.empty:
            fig.add_annotation(text="No data available", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        if x_column not in df.columns or y_column not in df.columns:
            missing = []
            if x_column not in df.columns:
                missing.append(x_column)
            if y_column not in df.columns:
                missing.append(y_column)
            fig.add_annotation(text=f"Column(s) not found: {', '.join(missing)}", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=14)
            return fig
        
        try:
            fig.add_trace(go.Scatter(
                x=df[x_column],
                y=df[y_column],
                mode='markers',
                marker=dict(color='steelblue', size=8, opacity=0.6)
            ))
            fig.update_layout(
                title=f"{y_column} vs {x_column}",
                xaxis_title=x_column,
                yaxis_title=y_column,
                height=400
            )
        except Exception as e:
            fig.add_annotation(text=f"Error: {str(e)[:50]}", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=14)
        return fig
    
    def plot_box(self, df: pd.DataFrame, columns: List[str]) -> go.Figure:
        """Create box plots for the specified columns"""
        fig = go.Figure()
        
        if df is None or df.empty:
            fig.add_annotation(text="No data available", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        if not columns:
            fig.add_annotation(text="No columns selected", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        valid_cols = []
        for col in columns:
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                try:
                    fig.add_trace(go.Box(y=df[col], name=col))
                    valid_cols.append(col)
                except Exception:
                    continue
        
        if not valid_cols:
            fig.add_annotation(text="No numeric columns found for box plot", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
        
        fig.update_layout(
            title="Box Plot",
            yaxis_title="Value",
            height=400
        )
        return fig
    
    def plot_violin(self, df: pd.DataFrame, columns: List[str]) -> go.Figure:
        """Create violin plots for the specified columns"""
        fig = go.Figure()
        
        if df is None or df.empty:
            fig.add_annotation(text="No data available", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        if not columns:
            fig.add_annotation(text="No columns selected", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        valid_cols = []
        for col in columns:
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                try:
                    fig.add_trace(go.Violin(y=df[col], name=col, box_visible=True))
                    valid_cols.append(col)
                except Exception:
                    continue
        
        if not valid_cols:
            fig.add_annotation(text="No numeric columns found for violin plot", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
        
        fig.update_layout(
            title="Violin Plot",
            yaxis_title="Value",
            height=400
        )
        return fig
    
    def plot_kde(self, df: pd.DataFrame, column: str) -> go.Figure:
        """Create a KDE (Kernel Density Estimation) plot"""
        fig = go.Figure()
        
        if df is None or (hasattr(df, 'empty') and df.empty):
            fig.add_annotation(text="No data available", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        if not column or column not in df.columns:
            fig.add_annotation(text=f"Column '{column}' not found", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        try:
            col_data = df[column]
        except (KeyError, TypeError):
            fig.add_annotation(text=f"Error accessing column '{column}'", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        if not pd.api.types.is_numeric_dtype(col_data):
            fig.add_annotation(text=f"Column '{column}' is not numeric", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        series = col_data.dropna()
        if len(series) < 2:
            fig.add_annotation(text="Insufficient data for KDE", 
                             x=0.5, y=0.5, xref="paper", yref="paper",
                             showarrow=False, font_size=16)
            return fig
        
        try:
            from scipy import stats
            kde = stats.gaussian_kde(series)
            x_range = np.linspace(series.min(), series.max(), 200)
            y_kde = kde(x_range)
            
            fig.add_trace(go.Scatter(x=x_range, y=y_kde, mode='lines', 
                                    fill='tozeroy', name='KDE'))
            fig.update_layout(
                title=f"KDE of {column}",
                xaxis_title=column,
                yaxis_title="Density",
                height=400
            )
        except ImportError:
            fig = px.histogram(df, x=column, histnorm='probability density', nbins=50)
            fig.update_layout(title=f"Distribution of {column}", height=400)
        except Exception as e:
            fig.add_annotation(text=f"Error: {str(e)[:50]}", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=14)
        
        return fig
    
    def plot_qq(self, df: pd.DataFrame, column: str) -> go.Figure:
        """Create a Q-Q plot to check normality"""
        fig = go.Figure()
        
        if df is None or (hasattr(df, 'empty') and df.empty):
            fig.add_annotation(text="No data available", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        if not column or column not in df.columns:
            fig.add_annotation(text=f"Column '{column}' not found", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        try:
            col_data = df[column]
        except (KeyError, TypeError):
            fig.add_annotation(text=f"Error accessing column '{column}'", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        if not pd.api.types.is_numeric_dtype(col_data):
            fig.add_annotation(text=f"Column '{column}' is not numeric", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        series = col_data.dropna()
        if len(series) < 2:
            fig.add_annotation(text="Insufficient data for Q-Q plot", 
                             x=0.5, y=0.5, xref="paper", yref="paper",
                             showarrow=False, font_size=16)
            return fig
        
        try:
            from scipy import stats
            sorted_data = np.sort(series)
            theoretical_quantiles = stats.norm.ppf(np.linspace(0.01, 0.99, len(sorted_data)))
            
            fig.add_trace(go.Scatter(
                x=theoretical_quantiles,
                y=sorted_data,
                mode='markers',
                name='Data'
            ))
            
            min_val = min(theoretical_quantiles.min(), sorted_data.min())
            max_val = max(theoretical_quantiles.max(), sorted_data.max())
            fig.add_trace(go.Scatter(
                x=[min_val, max_val],
                y=[min_val, max_val],
                mode='lines',
                name='Reference Line',
                line=dict(dash='dash', color='red')
            ))
            
            fig.update_layout(
                title=f"Q-Q Plot of {column}",
                xaxis_title="Theoretical Quantiles",
                yaxis_title="Sample Quantiles",
                height=400
            )
        except ImportError:
            sorted_data = np.sort(series)
            fig.add_trace(go.Scatter(
                x=list(range(len(sorted_data))),
                y=sorted_data,
                mode='markers',
                name='Sorted Data'
            ))
            fig.update_layout(title=f"Sorted Values of {column}", height=400)
        except Exception as e:
            fig.add_annotation(text=f"Error: {str(e)[:50]}", 
                             x=0.5, y=0.5, xref="paper", yref="paper",
                             showarrow=False, font_size=14)
        
        return fig
    
    def plot_pie(self, df: pd.DataFrame, column: str) -> go.Figure:
        """Create a pie chart for categorical data"""
        fig = go.Figure()
        
        if df is None or df.empty:
            fig.add_annotation(text="No data available", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        if column not in df.columns:
            fig.add_annotation(text=f"Column '{column}' not found", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        try:
            value_counts = df[column].value_counts().head(10)
            if len(value_counts) == 0:
                fig.add_annotation(text="No values to display", x=0.5, y=0.5,
                                 xref="paper", yref="paper", showarrow=False, font_size=16)
                return fig
            
            fig.add_trace(go.Pie(
                labels=value_counts.index.astype(str), 
                values=value_counts.values
            ))
            fig.update_layout(
                title=f"Distribution of {column}",
                height=400
            )
        except Exception as e:
            fig.add_annotation(text=f"Error: {str(e)[:50]}", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=14)
        
        return fig
    
    def plot_heatmap(self, df: pd.DataFrame, columns: List[str]) -> go.Figure:
        """Create a heatmap for the specified columns"""
        fig = go.Figure()
        
        if df is None or df.empty:
            fig.add_annotation(text="No data available", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=16)
            return fig
        
        if not columns or len(columns) < 2:
            return self.plot_correlation_matrix(df)
        
        valid_columns = [c for c in columns if c in df.columns]
        if len(valid_columns) < 2:
            fig.add_annotation(text="Need at least 2 valid columns for heatmap", 
                             x=0.5, y=0.5, xref="paper", yref="paper",
                             showarrow=False, font_size=16)
            return fig
        
        try:
            subset = df[valid_columns].select_dtypes(include=[np.number])
            if len(subset.columns) < 2:
                fig.add_annotation(text="Need at least 2 numeric columns for heatmap", 
                                 x=0.5, y=0.5, xref="paper", yref="paper",
                                 showarrow=False, font_size=16)
                return fig
            
            corr = subset.corr()
            fig = go.Figure(data=go.Heatmap(
                z=corr.values,
                x=corr.columns.tolist(),
                y=corr.columns.tolist(),
                colorscale='RdBu',
                zmid=0
            ))
            fig.update_layout(
                title="Correlation Heatmap",
                height=500
            )
        except Exception as e:
            fig.add_annotation(text=f"Error: {str(e)[:50]}", x=0.5, y=0.5,
                             xref="paper", yref="paper", showarrow=False, font_size=14)
        
        return fig
