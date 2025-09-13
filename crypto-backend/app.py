"""
CryptoViz Backend Application

This is the main Flask application that serves as the backend for the CryptoViz platform.
It provides API endpoints for cryptocurrency data, historical prices, volatility metrics,
correlation analysis, and sentiment data. The application also manages background tasks
for periodically updating cryptocurrency prices and sentiment information.

The backend scrapes data from various sources, processes it, and serves it to the
frontend through RESTful API endpoints.
"""

from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from scraper import (
    TopGainersScraper,
    DataProcessor,
)
from data_utils import (
    get_latest_data,
    get_history,
    calculate_volatility,
    get_all_volatility,
    calculate_correlation_matrix,
    update_data_periodically,
    update_sentiment_data_periodically,
    update_top_gainers_periodically,
    get_closest_price_for_timestamp,
    get_latest_price_before_timestamp,
    get_earliest_price_after_timestamp
)
from sentiment_scraper import SentimentScraper
import threading
import time
import os
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Flask application
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing to allow frontend to access API
# Configure CORS to allow requests from any origin
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configuration constants


@app.route("/")
def index():
    """
    Root endpoint that serves a simple HTML page with API documentation.

    Returns:
        HTML page with API documentation
    """
    return render_template("index.html")


@app.route("/api/crypto", methods=["GET"])
def get_crypto():
    """
    API endpoint to get the latest cryptocurrency data.

    Returns:
        JSON response containing the most recent data for all tracked cryptocurrencies.

    HTTP Methods:
        GET: Retrieve the latest cryptocurrency data

    Response Format:
        {
            "data": [
                {
                    "symbol": "btc",
                    "name": "Bitcoin",
                    "price": 50000.0,
                    "market_cap": 1000000000000,
                    "volume_24h": 30000000000,
                    "percent_change_24h": 2.5,
                    "timestamp": "2023-01-01 12:00:00"
                },
                ...
            ]
        }

    Error Response:
        {"error": "Server error"}, 500
    """
    try:
        # Get the most recent cryptocurrency data from storage
        data = get_latest_data()
        return jsonify({"data": data})
    except Exception:
        return jsonify({"error": "Server error"}), 500


@app.route("/api/crypto/<symbol>/history", methods=["GET"])
def get_crypto_history(symbol):
    """
    API endpoint to get historical price data for a specific cryptocurrency.

    Args:
        symbol (str): The cryptocurrency symbol (e.g., 'btc', 'eth')

    Returns:
        JSON response containing historical price data for the specified cryptocurrency.

    HTTP Methods:
        GET: Retrieve historical data for the specified cryptocurrency

    Response Format:
        {
            "prices": [50000.0, 51000.0, ...],
            "timestamps": ["2023-01-01 12:00:00", "2023-01-01 12:05:00", ...]
        }

    Error Response:
        {"error": "Server error"}, 500
    """
    try:
        # Get historical data for the specified cryptocurrency
        history = get_history(symbol)
        return jsonify(history)
    except Exception:
        return jsonify({"error": "Server error"}), 500


@app.route("/api/crypto/<symbol>/volatility", methods=["GET"])
def get_crypto_volatility(symbol):
    """
    API endpoint to get volatility metrics for a specific cryptocurrency.

    Args:
        symbol (str): The cryptocurrency symbol (e.g., 'btc', 'eth')

    Query Parameters:
        days (int, optional): Number of days to calculate volatility for. Default is 7.

    Returns:
        JSON response containing volatility metrics for the specified cryptocurrency.

    HTTP Methods:
        GET: Retrieve volatility data for the specified cryptocurrency

    Response Format:
        {
            "volatility": 5.2,           # Standard deviation of daily returns
            "max_drawdown": -12.5,       # Maximum percentage drop from peak
            "daily_returns": [2.1, -1.3, ...],
            "timestamps": ["2023-01-01 12:00:00", ...]
        }

    Error Response:
        {"error": "Server error"}, 500
    """
    try:
        # Get the number of days from query parameters (default: 7)
        days = request.args.get("days", default=7, type=int)

        # Calculate volatility metrics for the specified cryptocurrency and time period
        volatility_data = calculate_volatility(symbol, days)
        return jsonify(volatility_data)
    except Exception:
        return jsonify({"error": "Server error"}), 500


@app.route("/api/crypto/volatility", methods=["GET"])
def get_all_crypto_volatility():
    """
    API endpoint to get volatility data for all tracked cryptocurrencies.

    Query Parameters:
        days (int, optional): Number of days to calculate volatility for. Default is 7.

    Returns:
        JSON response containing volatility metrics for all cryptocurrencies.

    HTTP Methods:
        GET: Retrieve volatility data for all cryptocurrencies

    Response Format:
        {
            "data": [
                {
                    "symbol": "btc",
                    "name": "Bitcoin",
                    "price": 50000.0,
                    "volatility": 5.2,
                    "max_drawdown": -12.5,
                    "percent_change_24h": 2.5
                },
                ...
            ]
        }

    Error Response:
        {"error": "Server error", "message": "Error details"}, 500
    """
    try:
        # Get days parameter and ensure it's a valid integer
        days_param = request.args.get("days", default="7")
        try:
            days = int(days_param)
            if days <= 0:
                days = 7  # Default to 7 if invalid
        except (ValueError, TypeError):
            days = 7  # Default to 7 if conversion fails

        # Get volatility data for all cryptocurrencies for the specified time period
        volatility_data = get_all_volatility(days)

        # Ensure we have valid data
        if not volatility_data:
            volatility_data = []

        return jsonify({"data": volatility_data})
    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500


@app.route("/api/crypto/correlation", methods=["GET"])
def get_correlation_matrix():
    """
    API endpoint to get the price correlation matrix for all cryptocurrencies.

    This endpoint calculates how the price movements of different cryptocurrencies
    correlate with each other over a specified time period.

    Query Parameters:
        days (int, optional): Number of days to calculate correlation for. Default is 7.

    Returns:
        JSON response containing the correlation matrix and list of cryptocurrency symbols.

    HTTP Methods:
        GET: Retrieve correlation matrix for all cryptocurrencies

    Response Format:
        {
            "correlation_matrix": [
                [1.0, 0.75, 0.62, ...],
                [0.75, 1.0, 0.58, ...],
                ...
            ],
            "symbols": ["btc", "eth", ...]
        }

    Error Response:
        {"error": "Server error", "message": "Error details"}, 500
    """
    try:
        # Get days parameter and ensure it's a valid integer
        days_param = request.args.get("days", default="7")
        try:
            days = int(days_param)
            if days <= 0:
                days = 7  # Default to 7 if invalid
        except (ValueError, TypeError):
            days = 7  # Default to 7 if conversion fails

        # Calculate the correlation matrix for the specified time period
        correlation_data = calculate_correlation_matrix(days)

        # Ensure we have valid data structure
        if (
            not correlation_data
            or "correlation_matrix" not in correlation_data
            or "symbols" not in correlation_data
        ):
            correlation_data = {"correlation_matrix": [], "symbols": []}

        # Additional validation to ensure no NaN values in the matrix
        if (
            "correlation_matrix" in correlation_data
            and correlation_data["correlation_matrix"]
        ):
            import numpy as np
            import json

            # Convert any string "NaN" to None for proper JSON serialization
            for i, row in enumerate(correlation_data["correlation_matrix"]):
                for j, val in enumerate(row):
                    if val == "NaN" or (isinstance(val, float) and np.isnan(val)):
                        correlation_data["correlation_matrix"][i][j] = None

            # Verify JSON serialization works
            try:
                # Test if the data can be serialized to JSON
                json.dumps(correlation_data)
            except TypeError:
                # If serialization fails, create a clean structure
                correlation_data = {"correlation_matrix": [], "symbols": []}

        return jsonify(correlation_data)
    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500


@app.route("/api/sentiment", methods=["GET"])
def get_sentiment():
    """
    API endpoint to get the latest complete sentiment data.

    This endpoint returns the full sentiment data including overall sentiment,
    cryptocurrency-specific sentiment, rankings, and all sentiment sources.

    Returns:
        JSON response containing the complete sentiment data.

    HTTP Methods:
        GET: Retrieve the latest sentiment data

    Response Format:
        {
            "overall": {
                "sentiment": 65.2,
                "social_sentiment": 70.5,
                "news_sentiment": 62.1,
                "fear_greed_index": 58,
                "timestamp": "2023-01-01 12:00:00"
            },
            "crypto_specific": {
                "BTC": {
                    "sentiment_scores": [60.5, 70.2, ...],
                    "sources": [...]
                },
                ...
            },
            "rankings": {
                "positive": [...],
                "negative": [...]
            },
            "sources": [...]
        }

    Error Response:
        {"error": "No sentiment data available", "message": "..."}, 404
        {"error": "Server error", "message": "..."}, 500
    """
    try:
        # Check if we have the latest sentiment data file
        sentiment_file = "data/latest_sentiment_data.json"

        if not os.path.exists(sentiment_file):
            # If file doesn't exist, return error with informative message
            return (
                jsonify(
                    {
                        "error": "No sentiment data available",
                        "message": "Sentiment data is being collected. Please try again later.",
                    }
                ),
                404,
            )

        # Read the sentiment data from the JSON file
        with open(sentiment_file, "r") as f:
            sentiment_data = json.load(f)

        return jsonify(sentiment_data)
    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500


@app.route("/api/sentiment/overall", methods=["GET"])
def get_overall_sentiment():
    """
    API endpoint to get overall market sentiment data.

    This endpoint provides aggregated sentiment metrics for the entire cryptocurrency
    market over a specified time period.

    Query Parameters:
        days (int, optional): Time period for sentiment data (1, 7, or 30 days). Default is 1.

    Returns:
        JSON response containing overall sentiment metrics.

    HTTP Methods:
        GET: Retrieve overall sentiment data

    Response Format:
        {
            "sentiment": 65.2,           # Overall combined sentiment score (0-100)
            "social_sentiment": 70.5,    # Sentiment from social media sources (0-100)
            "news_sentiment": 62.1,      # Sentiment from news sources (0-100)
            "fear_greed_index": 58,      # Fear & Greed Index value (0-100)
            "timestamp": "2023-01-01 12:00:00",
            "period": "7d",              # Only included for multi-day periods
            "data_points": 24            # Only included for multi-day periods
        }

    Error Response:
        {"error": "No sentiment data available", "message": "..."}, 404
        {"error": "Server error", "message": "..."}, 500
    """
    try:
        # Get the requested time range (default to 1 day if not specified)
        days = request.args.get("days", default=1, type=int)

        # If days=1, just return the latest data
        if days == 1:
            # Check if we have the latest sentiment data file
            sentiment_file = "data/latest_sentiment_data.json"

            if not os.path.exists(sentiment_file):
                # If file doesn't exist, return error with informative message
                return (
                    jsonify(
                        {
                            "error": "No sentiment data available",
                            "message": "Sentiment data is being collected. Please try again later.",
                        }
                    ),
                    404,
                )

            # Read the sentiment data from the JSON file
            with open(sentiment_file, "r") as f:
                sentiment_data = json.load(f)

            # Extract only the overall sentiment section
            overall_sentiment = sentiment_data.get("overall", {})

            return jsonify(overall_sentiment)
        else:
            # For longer time ranges (7d, 30d), calculate an average from multiple files
            # Find all sentiment data files from the past N days
            sentiment_files = []
            data_dir = "data"

            if os.path.exists(data_dir):
                for filename in os.listdir(data_dir):
                    if filename.startswith("sentiment_data_") and filename.endswith(
                        ".json"
                    ):
                        file_path = os.path.join(data_dir, filename)
                        file_time = os.path.getmtime(file_path)
                        file_date = datetime.fromtimestamp(file_time)

                        # Check if the file is within the requested time range
                        if (datetime.now() - file_date).days <= days:
                            sentiment_files.append((file_path, file_date))

            # If no files found, return the latest data or default values
            if not sentiment_files:
                sentiment_file = "data/latest_sentiment_data.json"
                if os.path.exists(sentiment_file):
                    with open(sentiment_file, "r") as f:
                        sentiment_data = json.load(f)
                    overall_sentiment = sentiment_data.get("overall", {})
                else:
                    # Return default values if no data available
                    overall_sentiment = {
                        "sentiment": 50,
                        "social_sentiment": 50,
                        "news_sentiment": 50,
                        "fear_greed_index": 50,
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    }

                return jsonify(overall_sentiment)

            # Sort files by date (newest first)
            sentiment_files.sort(key=lambda x: x[1], reverse=True)

            # For 7d and 30d, calculate an average of the sentiment values
            sentiment_sum = 0
            social_sentiment_sum = 0
            news_sentiment_sum = 0
            fear_greed_sum = 0
            count = 0

            # Use the timestamp from the most recent file
            latest_timestamp = sentiment_files[0][1].strftime("%Y-%m-%d %H:%M:%S")

            # Process each file to calculate averages
            for file_path, _ in sentiment_files:
                try:
                    with open(file_path, "r") as f:
                        data = json.load(f)

                    overall = data.get("overall", {})
                    if overall:
                        sentiment_sum += overall.get("sentiment", 50)
                        social_sentiment_sum += overall.get("social_sentiment", 50)
                        news_sentiment_sum += overall.get("news_sentiment", 50)
                        fear_greed_sum += overall.get("fear_greed_index", 50)
                        count += 1
                except Exception:
                    continue

            # Calculate averages
            if count > 0:
                avg_sentiment = sentiment_sum / count
                avg_social_sentiment = social_sentiment_sum / count
                avg_news_sentiment = news_sentiment_sum / count
                avg_fear_greed = fear_greed_sum / count
            else:
                # Default values if no valid data found
                avg_sentiment = 50
                avg_social_sentiment = 50
                avg_news_sentiment = 50
                avg_fear_greed = 50

            # Create the response object with period information
            overall_sentiment = {
                "sentiment": avg_sentiment,
                "social_sentiment": avg_social_sentiment,
                "news_sentiment": avg_news_sentiment,
                "fear_greed_index": avg_fear_greed,
                "timestamp": latest_timestamp,
                "period": f"{days}d",
                "data_points": count,
            }

            return jsonify(overall_sentiment)
    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500


@app.route("/api/sentiment/rankings", methods=["GET"])
def get_sentiment_rankings():
    """
    API endpoint to get sentiment rankings for cryptocurrencies.

    This endpoint returns lists of cryptocurrencies with the most positive and
    most negative sentiment scores based on sentiment data for the specified time period.

    Query Parameters:
        days (int, optional): Time period for sentiment data (1, 7, or 30 days). Default is 1.

    Returns:
        JSON response containing positive and negative sentiment rankings.

    HTTP Methods:
        GET: Retrieve sentiment rankings

    Response Format:
        {
            "positive": [
                {
                    "symbol": "BTC",
                    "name": "Bitcoin",
                    "score": 75.2,
                    "change": 5.3,
                    "sources_count": 12
                },
                ...
            ],
            "negative": [
                {
                    "symbol": "XRP",
                    "name": "Ripple",
                    "score": 35.8,
                    "change": -8.2,
                    "sources_count": 8
                },
                ...
            ]
        }

    Error Response:
        {"error": "No sentiment data available", "message": "..."}, 404
        {"error": "Server error", "message": "..."}, 500
    """
    try:
        # Get the requested time range (default to 1 day if not specified)
        days = request.args.get("days", default=1, type=int)

        # Validate days parameter (only allow 1, 7, or 30 days)
        if days not in [1, 7, 30]:
            days = 1

        # If days=1, just return the latest data
        if days == 1:
            # Check if we have the latest sentiment data file
            sentiment_file = "data/latest_sentiment_data.json"

            if not os.path.exists(sentiment_file):
                # If file doesn't exist, return error with informative message
                return (
                    jsonify(
                        {
                            "error": "No sentiment data available",
                            "message": "Sentiment data is being collected. Please try again later.",
                        }
                    ),
                    404,
                )

            # Read the sentiment data from the JSON file
            with open(sentiment_file, "r") as f:
                sentiment_data = json.load(f)

            # Extract just the rankings section
            rankings = sentiment_data.get("rankings", {"positive": [], "negative": []})

            return jsonify(rankings)
        else:
            # For longer time ranges (7d, 30d), calculate an average from multiple files
            # Find all sentiment data files from the past N days
            sentiment_files = []
            data_dir = "data"

            if os.path.exists(data_dir):
                for filename in os.listdir(data_dir):
                    if filename.startswith("sentiment_data_") and filename.endswith(
                        ".json"
                    ):
                        file_path = os.path.join(data_dir, filename)
                        file_time = os.path.getmtime(file_path)
                        file_date = datetime.fromtimestamp(file_time)

                        # Check if the file is within the requested time range
                        if (datetime.now() - file_date).days <= days:
                            sentiment_files.append((file_path, file_date))

            # If no files found, return the latest data
            if not sentiment_files:
                sentiment_file = "data/latest_sentiment_data.json"
                if os.path.exists(sentiment_file):
                    with open(sentiment_file, "r") as f:
                        sentiment_data = json.load(f)
                    rankings = sentiment_data.get(
                        "rankings", {"positive": [], "negative": []}
                    )
                else:
                    # Return empty rankings if no data available
                    rankings = {"positive": [], "negative": []}

                return jsonify(rankings)

            # Sort files by date (newest first)
            sentiment_files.sort(key=lambda x: x[1], reverse=True)

            # Use the rankings from the most recent file
            # This is a simplification - for a more complex implementation,
            # we could aggregate rankings across multiple files
            file_path = sentiment_files[0][0]
            with open(file_path, "r") as f:
                sentiment_data = json.load(f)

            rankings = sentiment_data.get("rankings", {"positive": [], "negative": []})

            return jsonify(rankings)
    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500


@app.route("/api/sentiment/sources", methods=["GET"])
def get_sentiment_sources():
    """
    API endpoint to get sentiment data sources.

    This endpoint returns the raw sources used for sentiment analysis,
    such as news articles, social media posts, etc. The results can be
    filtered by source type, cryptocurrency, and time period.

    Query Parameters:
        type (str, optional): Filter sources by type (e.g., 'news', 'reddit', 'x')
        crypto (str, optional): Filter sources by mentioned cryptocurrency (e.g., 'BTC')
        limit (int, optional): Maximum number of sources to return
        days (int, optional): Time period for sentiment data (1, 7, or 30 days). Default is 1.

    Returns:
        JSON response containing sentiment sources.

    HTTP Methods:
        GET: Retrieve sentiment sources

    Response Format:
        {
            "sources": [
                {
                    "type": "news",
                    "source": "CoinDesk",
                    "title": "Bitcoin Surges Past $60,000",
                    "text": "Bitcoin has reached a new all-time high...",
                    "url": "https://example.com/article",
                    "timestamp": "2023-01-01 12:00:00",
                    "sentiment": 85.2,
                    "mentioned_cryptos": ["BTC", "ETH"]
                },
                ...
            ],
            "count": 42
        }

    Error Response:
        {"error": "No sentiment data available", "message": "..."}, 404
        {"error": "Server error", "message": "..."}, 500
    """
    try:
        # Get the requested time range (default to 1 day if not specified)
        days = request.args.get("days", default=1, type=int)

        # Validate days parameter (only allow 1, 7, or 30 days)
        if days not in [1, 7, 30]:
            days = 1

        # If days=1, just return the latest data
        if days == 1:
            # Check if we have the latest sentiment data file
            sentiment_file = "data/latest_sentiment_data.json"

            if not os.path.exists(sentiment_file):
                # If file doesn't exist, return error with informative message
                return (
                    jsonify(
                        {
                            "error": "No sentiment data available",
                            "message": "Sentiment data is being collected. Please try again later.",
                        }
                    ),
                    404,
                )

            # Read the sentiment data from the JSON file
            with open(sentiment_file, "r") as f:
                sentiment_data = json.load(f)

            # Extract all sources
            sources = sentiment_data.get("sources", [])
        else:
            # For longer time ranges (7d, 30d), collect sources from multiple files
            # Find all sentiment data files from the past N days
            sentiment_files = []
            data_dir = "data"
            all_sources = []

            if os.path.exists(data_dir):
                for filename in os.listdir(data_dir):
                    if filename.startswith("sentiment_data_") and filename.endswith(
                        ".json"
                    ):
                        file_path = os.path.join(data_dir, filename)
                        file_time = os.path.getmtime(file_path)
                        file_date = datetime.fromtimestamp(file_time)

                        # Check if the file is within the requested time range
                        if (datetime.now() - file_date).days <= days:
                            sentiment_files.append((file_path, file_date))

            # If no files found, return the latest data
            if not sentiment_files:
                sentiment_file = "data/latest_sentiment_data.json"
                if os.path.exists(sentiment_file):
                    with open(sentiment_file, "r") as f:
                        sentiment_data = json.load(f)
                    sources = sentiment_data.get("sources", [])
                else:
                    # Return empty sources if no data available
                    sources = []
            else:
                # Sort files by date (newest first)
                sentiment_files.sort(key=lambda x: x[1], reverse=True)

                # Collect sources from all files within the time range
                for file_path, _ in sentiment_files:
                    try:
                        with open(file_path, "r") as f:
                            data = json.load(f)
                            file_sources = data.get("sources", [])
                            all_sources.extend(file_sources)
                    except Exception:
                        continue

                # Remove duplicates (based on URL or other unique identifier)
                unique_sources = {}
                for source in all_sources:
                    # Use URL as a unique identifier if available, otherwise use title
                    identifier = source.get("url", "") or source.get("title", "")
                    if identifier and identifier not in unique_sources:
                        unique_sources[identifier] = source

                sources = list(unique_sources.values())

        # Filter by source type if specified in query parameters
        source_type = request.args.get("type")
        if source_type:
            sources = [s for s in sources if s.get("type") == source_type]

        # Filter by cryptocurrency if specified in query parameters
        crypto = request.args.get("crypto")
        if crypto:
            sources = [
                s for s in sources if crypto.upper() in s.get("mentioned_cryptos", [])
            ]

        # Sort sources by timestamp (newest first)
        sources = sorted(sources, key=lambda x: x.get("timestamp", ""), reverse=True)

        # Limit the number of sources if specified in query parameters
        limit = request.args.get("limit", type=int)
        if limit and limit > 0:
            sources = sources[:limit]

        return jsonify({"sources": sources, "count": len(sources)})
    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500


@app.route("/api/sentiment/trends", methods=["GET"])
def get_sentiment_trends():
    """
    API endpoint to get sentiment trends over time.

    This endpoint provides historical sentiment data for a specific cryptocurrency
    or the overall market, along with corresponding price data when available.

    Query Parameters:
        days (int, optional): Time period for trend data (1, 7, or 30 days). Default is 7.
        symbol (str, optional): Cryptocurrency symbol to get trends for. Default is "BTC".
                               Use "all" for overall market sentiment.

    Returns:
        JSON response containing sentiment and price trends over time.

    HTTP Methods:
        GET: Retrieve sentiment trend data

    Response Format:
        {
            "dates": ["2023-01-01 12:00", "2023-01-02 12:00", ...],
            "sentiment": [65.2, 68.7, 62.3, ...],
            "price": [50000.0, 51200.0, 49800.0, ...]
        }

    Error Response:
        {"error": "Server error", "message": "Error details"}, 500
    """
    try:
        # Get the requested time range from query parameters
        days = request.args.get("days", default=7, type=int)

        # Validate days parameter (only allow 1, 7, or 30 days)
        if days not in [1, 7, 30]:
            days = 7

        # Get the cryptocurrency symbol from query parameters
        symbol = request.args.get("symbol", default="BTC")

        # Find all sentiment data files from the past N days
        sentiment_files = []
        data_dir = "data"

        if os.path.exists(data_dir):
            for filename in os.listdir(data_dir):
                if filename.startswith("sentiment_data_") and filename.endswith(
                    ".json"
                ):
                    file_path = os.path.join(data_dir, filename)
                    file_time = os.path.getmtime(file_path)
                    file_date = datetime.fromtimestamp(file_time)

                    # Check if the file is within the requested time range
                    if (datetime.now() - file_date).days <= days:
                        sentiment_files.append((file_path, file_date))

        # Sort files by date (oldest to newest)
        sentiment_files.sort(key=lambda x: x[1])

        # Initialize trend data structure
        trend_data = {
            "dates": [],
            "sentiment": [],
            "price": [],
        }

        # Extract sentiment data from each file
        for file_path, file_date in sentiment_files:
            try:
                with open(file_path, "r") as f:
                    data = json.load(f)

                # Add date to trend data
                trend_data["dates"].append(file_date.strftime("%Y-%m-%d %H:%M"))

                # Add overall sentiment or crypto-specific sentiment based on the symbol
                if (
                    symbol == "all" or symbol == "BTC"
                ):  # Default to Bitcoin if not specified
                    # Use overall market sentiment
                    sentiment_value = data.get("overall", {}).get("sentiment", 50)
                else:
                    # Get crypto-specific sentiment if available
                    crypto_data = data.get("crypto_specific", {}).get(
                        symbol.upper(), {}
                    )
                    if crypto_data and crypto_data.get("sentiment_scores"):
                        # Calculate average sentiment from all scores for this crypto
                        sentiment_value = sum(crypto_data["sentiment_scores"]) / len(
                            crypto_data["sentiment_scores"]
                        )
                    else:
                        sentiment_value = 50  # Default if no data available

                trend_data["sentiment"].append(sentiment_value)

                # Get real price data from the historical price data CSV
                # For 'all', use BTC as the market indicator
                price_symbol = "btc" if symbol == "all" else symbol.lower()

                # Get the timestamp for this data point
                timestamp = file_date

                # Find the closest price data point to this timestamp
                price = get_closest_price_for_timestamp(price_symbol, timestamp)

                # If no price data found, try to get it from the next available data point
                if price is None:

                    # Try to get the latest price data before this timestamp
                    price = get_latest_price_before_timestamp(price_symbol, timestamp)

                    # If still no price, try to get the earliest price data after this timestamp
                    if price is None:
                        price = get_earliest_price_after_timestamp(
                            price_symbol, timestamp
                        )

                        # If we still don't have price data, use the latest available price for this symbol
                        if price is None:
                            latest_data = get_latest_data()
                            for crypto in latest_data:
                                if crypto["symbol"] == price_symbol:
                                    price = crypto["price"]

                                    break

                trend_data["price"].append(price)

            except Exception:
                continue

        # If we don't have enough data points, return what we have or an empty response
        if len(trend_data["dates"]) < 2 and len(trend_data["dates"]) == 0:
            # Return empty arrays in the response
            trend_data = {"dates": [], "sentiment": [], "price": []}

        return jsonify(trend_data)
    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500


@app.route("/api/top-gainers", methods=["GET"])
def get_top_gainers_data():
    """
    API endpoint to get the top gaining cryptocurrencies.

    This endpoint returns data for cryptocurrencies with the highest price
    increase in the last 24 hours.

    Query Parameters:
        limit (int, optional): Maximum number of top gainers to return. Default is 20.

    Returns:
        JSON response containing top gainer cryptocurrency data.

    HTTP Methods:
        GET: Retrieve top gainers data

    Response Format:
        {
            "data": [
                {
                    "symbol": "sol",
                    "name": "Solana",
                    "price": 150.25,
                    "market_cap": 65000000000,
                    "volume_24h": 5000000000,
                    "percent_change_24h": 15.7,
                    "timestamp": "2023-01-01 12:00:00",
                    "rank": 1
                },
                ...
            ],
            "last_updated": "2023-01-01 12:00:00"
        }

    Error Response:
        {"error": "No top gainers data available", "message": "..."}, 404
        {"error": "Server error", "message": "..."}, 500
    """
    try:
        # Get optional limit parameter
        limit = request.args.get("limit", default=20, type=int)

        # Check if we have the latest top gainers data file
        top_gainers_file = "data/top_gainers_data.json"

        if not os.path.exists(top_gainers_file):
            # If file doesn't exist, scrape the data now
            gainers_scraper = TopGainersScraper()
            data_processor = DataProcessor()
            top_gainers = gainers_scraper.get_top_gainers(limit)
            if top_gainers:
                data_processor.save_top_gainers_data(top_gainers)
            else:
                return (
                    jsonify(
                        {
                            "error": "No top gainers data available",
                            "message": "Failed to retrieve top gainers data. Please try again later.",
                        }
                    ),
                    404,
                )

        # Read the top gainers data from the JSON file
        with open(top_gainers_file, "r") as f:
            top_gainers_data = json.load(f)

        # Limit the number of results if requested
        if limit and limit > 0 and limit < len(top_gainers_data):
            top_gainers_data = top_gainers_data[:limit]

        # Get the file's last modified time
        last_updated = datetime.fromtimestamp(
            os.path.getmtime(top_gainers_file)
        ).strftime("%Y-%m-%d %H:%M:%S")

        return jsonify({"data": top_gainers_data, "last_updated": last_updated})

    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500


@app.route("/api/top-gainers/update", methods=["GET"])
def trigger_top_gainers_update():
    """
    API endpoint to manually trigger a top gainers data update.

    This endpoint allows manual triggering of the top gainers data collection process.
    It includes a safeguard to prevent unnecessary updates if data is recent.

    Query Parameters:
        force (bool, optional): Force update even if data is recent. Default is false.

    Returns:
        JSON response indicating whether the update was triggered or skipped.

    HTTP Methods:
        GET: Trigger top gainers data update

    Response Format:
        {
            "message": "Top gainers data update triggered",
            "status": "success"
        }

        or

        {
            "message": "Top gainers data is recent (updated X minutes ago). Use force=true to update anyway.",
            "status": "skipped"
        }

    Error Response:
        {"error": "Server error", "message": "Error details"}, 500
    """
    try:
        # Get optional force parameter (default: false)
        force_update = request.args.get("force", "false").lower() == "true"

        # Check if we need to update (if the data is recent and force is not set, don't update)
        top_gainers_file = "data/top_gainers_data.json"
        if os.path.exists(top_gainers_file) and not force_update:
            file_time = os.path.getmtime(top_gainers_file)
            file_age = time.time() - file_time

            # If file is less than 15 minutes old, don't update unless forced
            if file_age < 15 * 60:
                return jsonify(
                    {
                        "message": f"Top gainers data is recent (updated {int(file_age/60)} minutes ago). Use force=true to update anyway.",
                        "status": "skipped",
                    }
                )

        # Create a new thread to update top gainers data
        def update_top_gainers():
            gainers_scraper = TopGainersScraper()
            data_processor = DataProcessor()
            top_gainers = gainers_scraper.get_top_gainers()
            if top_gainers:
                data_processor.save_top_gainers_data(top_gainers)

        update_thread = threading.Thread(target=update_top_gainers)
        update_thread.daemon = True
        update_thread.start()

        return jsonify(
            {"message": "Top gainers data update triggered", "status": "success"}
        )
    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500


@app.route("/api/sentiment/update", methods=["GET"])
def trigger_sentiment_update():
    """
    API endpoint to manually trigger a sentiment data update.

    This endpoint allows manual triggering of the sentiment data collection process.
    It includes a safeguard to prevent unnecessary updates if data is recent.

    Query Parameters:
        force (bool, optional): Force update even if data is recent. Default is false.

    Returns:
        JSON response indicating whether the update was triggered or skipped.

    HTTP Methods:
        GET: Trigger sentiment data update

    Response Format:
        {
            "message": "Sentiment data update triggered",
            "status": "success"
        }

        or

        {
            "message": "Sentiment data is recent (updated X minutes ago). Use force=true to update anyway.",
            "status": "skipped"
        }

    Error Response:
        {"error": "Server error", "message": "Error details"}, 500
    """
    try:
        # Get optional force parameter (default: false)
        force_update = request.args.get("force", "false").lower() == "true"

        # Check if we need to update (if the data is recent and force is not set, don't update)
        sentiment_file = "data/latest_sentiment_data.json"
        if os.path.exists(sentiment_file) and not force_update:
            file_time = os.path.getmtime(sentiment_file)
            file_age = time.time() - file_time

            # If file is less than 30 minutes old, don't update unless forced
            if file_age < 30 * 60:
                return jsonify(
                    {
                        "message": f"Sentiment data is recent (updated {int(file_age/60)} minutes ago). Use force=true to update anyway.",
                        "status": "skipped",
                    }
                )

        # Create a new thread to update sentiment data and clean up old files
        def update_and_cleanup():
            try:
                scraper = SentimentScraper()
                scraper.run_scraper()
                # Clean up old sentiment data files (older than 30 days)
                scraper.cleanup_old_sentiment_data(30)
            except Exception:
                pass

        update_thread = threading.Thread(target=update_and_cleanup)
        update_thread.daemon = True
        update_thread.start()

        return jsonify(
            {"message": "Sentiment data update triggered", "status": "success"}
        )
    except Exception as e:
        return jsonify({"error": "Server error", "message": str(e)}), 500


if __name__ == "__main__":
    """
    Main application entry point.

    When the script is run directly (not imported as a module), this section:
    1. Starts background threads for periodic data updates
    2. Launches the Flask web server with configuration from environment variables
    """
    # Create templates directory if it doesn't exist
    os.makedirs("templates", exist_ok=True)

    # Start background thread for cryptocurrency price data updates
    price_updater = threading.Thread(target=update_data_periodically)
    price_updater.daemon = True  # Thread will exit when main program exits
    price_updater.start()

    # Start background thread for sentiment data updates
    sentiment_updater = threading.Thread(target=update_sentiment_data_periodically)
    sentiment_updater.daemon = True  # Thread will exit when main program exits
    sentiment_updater.start()

    # Start background thread for top gainers data updates
    top_gainers_updater = threading.Thread(target=update_top_gainers_periodically)
    top_gainers_updater.daemon = True  # Thread will exit when main program exits
    top_gainers_updater.start()

    # Start the Flask web server
    app.run(
        debug=os.getenv("FLASK_DEBUG", "false").lower()
        == "true",  # Debug mode from environment variable
        host=os.getenv(
            "FLASK_HOST", "0.0.0.0"
        ),  # Host from environment variable (default: 0.0.0.0)
        port=int(
            os.getenv("FLASK_PORT", 5000)
        ),  # Port from environment variable (default: 5000)
    )
