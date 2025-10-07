"""
ML Forecasting Module for Regulatory Trends
Uses statistical forecasting for regulatory volume prediction

Author: Legal Oracle Team
Date: 2025-10-07
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Note: Prophet requires significant dependencies. Using simpler statistical methods for now.
# For production, consider: pip install prophet


class RegulatoryForecaster:
    """
    Statistical forecasting for regulatory trends
    Uses moving averages, exponential smoothing, and trend analysis
    """
    
    def __init__(self):
        self.model_type = "exponential_smoothing"
        
    def prepare_time_series(self, historical_data: List[Dict]) -> pd.DataFrame:
        """
        Prepare time series data from historical regulations
        
        Args:
            historical_data: List of regulations with dates
        
        Returns:
            DataFrame with time series
        """
        try:
            if not historical_data:
                logger.warning("No historical data provided")
                return pd.DataFrame()
            
            # Extract dates and counts
            dates = []
            for item in historical_data:
                pub_date = item.get('publication_date')
                if pub_date:
                    try:
                        dates.append(datetime.strptime(pub_date, "%Y-%m-%d"))
                    except:
                        continue
            
            if not dates:
                logger.warning("No valid dates found")
                return pd.DataFrame()
            
            # Group by month
            df = pd.DataFrame({'date': dates})
            df['year_month'] = df['date'].dt.to_period('M')
            monthly_counts = df.groupby('year_month').size().reset_index(name='count')
            monthly_counts['date'] = monthly_counts['year_month'].dt.to_timestamp()
            
            return monthly_counts[['date', 'count']]
            
        except Exception as e:
            logger.error(f"Error preparing time series: {str(e)}")
            return pd.DataFrame()
    
    def exponential_smoothing_forecast(
        self, 
        data: pd.DataFrame, 
        periods: int = 12,
        alpha: float = 0.3
    ) -> Dict:
        """
        Exponential smoothing forecast
        
        Args:
            data: DataFrame with 'date' and 'count' columns
            periods: Number of periods to forecast
            alpha: Smoothing factor (0-1)
        
        Returns:
            Forecast results
        """
        try:
            if data.empty or len(data) < 3:
                return self._generate_fallback_forecast(periods)
            
            # Get historical values
            values = data['count'].values
            
            # Exponential smoothing
            smoothed = [values[0]]
            for i in range(1, len(values)):
                smoothed_value = alpha * values[i] + (1 - alpha) * smoothed[-1]
                smoothed.append(smoothed_value)
            
            # Calculate trend
            if len(smoothed) >= 2:
                trend = (smoothed[-1] - smoothed[0]) / len(smoothed)
            else:
                trend = 0
            
            # Forecast future values
            last_value = smoothed[-1]
            forecast_values = []
            
            for i in range(1, periods + 1):
                forecast_value = last_value + (trend * i)
                # Add some uncertainty bounds
                forecast_values.append(max(0, forecast_value))
            
            # Generate forecast dates
            last_date = data['date'].iloc[-1]
            forecast_dates = [
                last_date + timedelta(days=30 * i) for i in range(1, periods + 1)
            ]
            
            # Calculate confidence intervals (simple approach)
            historical_std = np.std(values)
            lower_bound = [max(0, v - 1.96 * historical_std) for v in forecast_values]
            upper_bound = [v + 1.96 * historical_std for v in forecast_values]
            
            return {
                "forecast_dates": [d.strftime("%Y-%m-%d") for d in forecast_dates],
                "forecast_values": [float(v) for v in forecast_values],
                "lower_bound": [float(v) for v in lower_bound],
                "upper_bound": [float(v) for v in upper_bound],
                "trend": "increasing" if trend > 0 else "decreasing" if trend < 0 else "stable",
                "trend_magnitude": float(abs(trend)),
                "historical_average": float(np.mean(values)),
                "historical_std": float(historical_std),
                "confidence": 0.75,  # 75% confidence for simple model
                "method": "exponential_smoothing"
            }
            
        except Exception as e:
            logger.error(f"Exponential smoothing error: {str(e)}")
            return self._generate_fallback_forecast(periods)
    
    def moving_average_forecast(
        self,
        data: pd.DataFrame,
        periods: int = 12,
        window: int = 3
    ) -> Dict:
        """
        Moving average forecast
        """
        try:
            if data.empty or len(data) < window:
                return self._generate_fallback_forecast(periods)
            
            values = data['count'].values
            
            # Calculate moving average
            ma_values = []
            for i in range(len(values)):
                if i >= window - 1:
                    ma = np.mean(values[i - window + 1:i + 1])
                    ma_values.append(ma)
                else:
                    ma_values.append(values[i])
            
            # Use last MA value for forecast
            last_ma = ma_values[-1]
            forecast_values = [last_ma] * periods
            
            # Generate dates
            last_date = data['date'].iloc[-1]
            forecast_dates = [
                last_date + timedelta(days=30 * i) for i in range(1, periods + 1)
            ]
            
            # Confidence intervals
            historical_std = np.std(values)
            lower_bound = [max(0, last_ma - 1.5 * historical_std)] * periods
            upper_bound = [last_ma + 1.5 * historical_std] * periods
            
            return {
                "forecast_dates": [d.strftime("%Y-%m-%d") for d in forecast_dates],
                "forecast_values": forecast_values,
                "lower_bound": lower_bound,
                "upper_bound": upper_bound,
                "trend": "stable",
                "historical_average": float(np.mean(values)),
                "confidence": 0.65,
                "method": "moving_average"
            }
            
        except Exception as e:
            logger.error(f"Moving average error: {str(e)}")
            return self._generate_fallback_forecast(periods)
    
    def _generate_fallback_forecast(self, periods: int = 12) -> Dict:
        """
        Generate fallback forecast when insufficient data
        """
        base_value = 10  # Assumed baseline regulatory volume
        
        forecast_dates = [
            (datetime.now() + timedelta(days=30 * i)).strftime("%Y-%m-%d")
            for i in range(1, periods + 1)
        ]
        
        return {
            "forecast_dates": forecast_dates,
            "forecast_values": [base_value] * periods,
            "lower_bound": [base_value * 0.7] * periods,
            "upper_bound": [base_value * 1.3] * periods,
            "trend": "insufficient_data",
            "historical_average": base_value,
            "confidence": 0.4,
            "method": "fallback",
            "warning": "Insufficient historical data for accurate forecast"
        }
    
    def detect_seasonality(self, data: pd.DataFrame) -> Dict:
        """
        Detect seasonal patterns in regulatory activity
        """
        try:
            if data.empty or len(data) < 12:
                return {"seasonality_detected": False, "pattern": "insufficient_data"}
            
            # Extract month from dates
            data['month'] = pd.to_datetime(data['date']).dt.month
            monthly_avg = data.groupby('month')['count'].mean()
            
            # Check if there's significant variation
            coefficient_of_variation = monthly_avg.std() / monthly_avg.mean()
            
            if coefficient_of_variation > 0.3:
                peak_month = monthly_avg.idxmax()
                low_month = monthly_avg.idxmin()
                
                return {
                    "seasonality_detected": True,
                    "pattern": "seasonal",
                    "peak_month": int(peak_month),
                    "low_month": int(low_month),
                    "variation_coefficient": float(coefficient_of_variation),
                    "monthly_averages": monthly_avg.to_dict()
                }
            else:
                return {
                    "seasonality_detected": False,
                    "pattern": "no_clear_seasonality",
                    "variation_coefficient": float(coefficient_of_variation)
                }
                
        except Exception as e:
            logger.error(f"Seasonality detection error: {str(e)}")
            return {"seasonality_detected": False, "error": str(e)}
    
    def forecast(
        self,
        historical_data: List[Dict],
        horizon_months: int = 12,
        method: str = "auto"
    ) -> Dict:
        """
        Main forecasting method
        
        Args:
            historical_data: List of historical regulations
            horizon_months: Forecast horizon in months
            method: Forecasting method (auto, exponential, moving_average)
        
        Returns:
            Forecast results with metadata
        """
        try:
            # Prepare time series
            ts_data = self.prepare_time_series(historical_data)
            
            if ts_data.empty:
                logger.warning("No time series data, using fallback")
                return self._generate_fallback_forecast(horizon_months)
            
            # Detect seasonality
            seasonality = self.detect_seasonality(ts_data)
            
            # Choose forecasting method
            if method == "auto":
                # Use exponential smoothing if enough data
                if len(ts_data) >= 6:
                    method = "exponential"
                else:
                    method = "moving_average"
            
            # Generate forecast
            if method == "exponential":
                forecast_result = self.exponential_smoothing_forecast(
                    ts_data, 
                    periods=horizon_months
                )
            else:
                forecast_result = self.moving_average_forecast(
                    ts_data,
                    periods=horizon_months
                )
            
            # Add seasonality info
            forecast_result["seasonality"] = seasonality
            forecast_result["data_points"] = len(ts_data)
            
            return forecast_result
            
        except Exception as e:
            logger.error(f"Forecast error: {str(e)}")
            return self._generate_fallback_forecast(horizon_months)


def calculate_regulatory_risk_score(
    forecast: Dict,
    current_volume: int,
    industry_baseline: int = 15
) -> Dict:
    """
    Calculate risk score based on forecast
    
    Args:
        forecast: Forecast results
        current_volume: Current regulatory volume
        industry_baseline: Industry average baseline
    
    Returns:
        Risk assessment
    """
    try:
        forecast_avg = np.mean(forecast.get("forecast_values", [industry_baseline]))
        trend = forecast.get("trend", "stable")
        
        # Calculate risk components
        volume_risk = min(forecast_avg / industry_baseline, 2.0)  # Cap at 2x
        
        trend_risk = 1.0
        if trend == "increasing":
            trend_risk = 1.3
        elif trend == "decreasing":
            trend_risk = 0.8
        
        # Overall risk score (0-10)
        risk_score = volume_risk * trend_risk * 5
        risk_score = min(risk_score, 10)
        
        # Risk level
        if risk_score >= 7:
            risk_level = "high"
            recommendation = "Proactive compliance strategy recommended. Allocate additional resources."
        elif risk_score >= 4:
            risk_level = "medium"
            recommendation = "Monitor closely. Standard compliance procedures sufficient."
        else:
            risk_level = "low"
            recommendation = "Maintain current compliance posture."
        
        return {
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "volume_factor": round(volume_risk, 2),
            "trend_factor": round(trend_risk, 2),
            "recommendation": recommendation,
            "forecast_average": round(forecast_avg, 1),
            "current_volume": current_volume,
            "industry_baseline": industry_baseline
        }
        
    except Exception as e:
        logger.error(f"Risk calculation error: {str(e)}")
        return {
            "risk_score": 5.0,
            "risk_level": "medium",
            "recommendation": "Unable to calculate precise risk. Monitor regulatory developments.",
            "error": str(e)
        }


# Testing
if __name__ == "__main__":
    # Test with sample data
    sample_data = [
        {"publication_date": "2024-01-15"},
        {"publication_date": "2024-01-20"},
        {"publication_date": "2024-02-10"},
        {"publication_date": "2024-02-25"},
        {"publication_date": "2024-03-05"},
        {"publication_date": "2024-03-18"},
        {"publication_date": "2024-04-12"},
        {"publication_date": "2024-04-22"},
        {"publication_date": "2024-05-08"},
        {"publication_date": "2024-05-30"},
    ]
    
    forecaster = RegulatoryForecaster()
    result = forecaster.forecast(sample_data, horizon_months=6)
    
    print("Forecast Result:")
    print(f"Method: {result['method']}")
    print(f"Trend: {result['trend']}")
    print(f"Confidence: {result['confidence']}")
    print(f"Forecast values: {result['forecast_values'][:3]}...")
    
    risk = calculate_regulatory_risk_score(result, current_volume=10)
    print(f"\nRisk Assessment:")
    print(f"Risk Score: {risk['risk_score']}/10")
    print(f"Risk Level: {risk['risk_level']}")
    print(f"Recommendation: {risk['recommendation']}")
