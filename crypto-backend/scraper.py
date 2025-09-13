"""
Cryptocurrency Data Scraper Module

This module provides classes to scrape cryptocurrency data from popular sources
like CoinMarketCap, with a fallback to CoinGecko API. It extracts price, market cap,
volume, and other metrics for the top cryptocurrencies.

The module handles web scraping with error handling and fallback mechanisms to ensure
reliable data collection even when the primary source is unavailable.

It also includes functionality to scrape and track top gainers in the cryptocurrency market.
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import re
import csv
import os
import json


class Utils:
    """
    Utility class providing helper methods for data processing.
    """

    @staticmethod
    def extract_float(text):
        """
        Helper method to extract numeric value from a string.

        This method uses regex to find and extract numeric values from text,
        handling commas and negative numbers appropriately.

        Args:
            text (str): The text string containing a numeric value

        Returns:
            float: The extracted numeric value, or 0.0 if extraction fails

        Example:
            >>> Utils.extract_float("$1,234.56")
            1234.56
            >>> Utils.extract_float("-5.7%")
            -5.7
        """
        # Handle None or non-string inputs
        if text is None:
            return 0.0

        if not isinstance(text, str):
            try:
                # If it's already a number, just return it
                return float(text)
            except (TypeError, ValueError):
                return 0.0

        try:
            # Find the first occurrence of a number pattern (with optional negative sign and commas)
            match = re.search(r'-?[\d,.]+', text)
            if match:
                # Remove commas and convert to float
                return float(match.group(0).replace(',', ''))
            else:
                return 0.0
        except Exception as e:
            return 0.0

class BaseScraper:
    """
    Base class for cryptocurrency data scrapers.

    This class provides common functionality for all scraper classes,
    including HTTP request handling and timestamp generation.
    """

    def __init__(self):
        """Initialize the base scraper with common headers."""
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    def get_current_timestamp(self):
        """Get the current timestamp in a formatted string."""
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    def make_request(self, url, params=None, timeout=15):
        """
        Make an HTTP request with error handling.

        Args:
            url (str): The URL to request
            params (dict, optional): Query parameters for the request
            timeout (int, optional): Request timeout in seconds

        Returns:
            requests.Response or None: The response object if successful, None otherwise
        """
        try:
            response = requests.get(url, headers=self.headers, params=params, timeout=timeout)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            return None


class CryptoDataScraper(BaseScraper):
    """
    Scraper for cryptocurrency market data.

    This class handles scraping cryptocurrency data from CoinMarketCap
    with a fallback to CoinGecko API.
    """

    def __init__(self):
        """Initialize the crypto data scraper."""
        super().__init__()
        self.primary_url = "https://coinmarketcap.com/"
        self.fallback_url = "https://api.coingecko.com/api/v3/coins/markets"

    def get_crypto_data(self):
        """
        Scrape cryptocurrency data from CoinMarketCap.

        This method scrapes the CoinMarketCap website to get current data for the
        top 10 cryptocurrencies by market cap. It extracts name, symbol, price,
        market cap, 24h volume, and 24h percent change.

        Returns:
            list: A list of dictionaries containing cryptocurrency data, or an empty list if scraping fails
                Each dictionary contains: symbol, name, price, market_cap, volume_24h, percent_change_24h, timestamp

        Note:
            If scraping fails, the method falls back to the CoinGecko API via get_crypto_data_fallback()
        """
        try:
            # Make the HTTP request
            response = self.make_request(self.primary_url)
            if not response:
                return self.get_crypto_data_fallback()

            # Parse the HTML content
            soup = BeautifulSoup(response.text, 'html.parser')

            # Select the table rows for the top 10 cryptocurrencies
            rows = soup.select('table.cmc-table tbody tr')[:10]

            # Use local timezone for timestamp
            timestamp = self.get_current_timestamp()
            cryptos = []

            # Process each row to extract cryptocurrency data
            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 8:
                    continue  # Skip rows with insufficient columns

                try:
                    # Extract name and symbol
                    name_tag = cols[2].find('p', class_=re.compile(r'sc-.*'))
                    symbol_tag = cols[2].find('p', class_='coin-item-symbol')

                    name = name_tag.get_text(strip=True) if name_tag else 'unknown'
                    symbol = symbol_tag.get_text(strip=True).lower() if symbol_tag else 'n/a'

                    # Extract numeric data
                    price = Utils.extract_float(cols[3].text)
                    percent_change_24h = Utils.extract_float(cols[5].text)
                    volume_24h = Utils.extract_float(cols[6].text)
                    market_cap = Utils.extract_float(cols[7].text)

                    # Create a dictionary with the extracted data
                    cryptos.append({
                        'symbol': symbol,
                        'name': name,
                        'price': price,
                        'market_cap': market_cap,
                        'volume_24h': volume_24h,
                        'percent_change_24h': percent_change_24h,
                        'timestamp': timestamp
                    })

                except Exception as e:
                    continue

            # Return the scraped data or fall back to API if no valid data
            if cryptos:
                return cryptos
            else:
                return self.get_crypto_data_fallback()

        except Exception as e:
            return self.get_crypto_data_fallback()

    def get_crypto_data_fallback(self):
        """
        Fallback method to get cryptocurrency data from CoinGecko API.

        This method is called when scraping from CoinMarketCap fails. It uses
        the CoinGecko API to get data for the top 10 cryptocurrencies by market cap.

        Returns:
            list: A list of dictionaries containing cryptocurrency data, or an empty list if the API request fails
                Each dictionary contains: symbol, name, price, market_cap, volume_24h, percent_change_24h, timestamp
        """
        try:
            # Parameters for the API request
            params = {
                'vs_currency': 'usd',           # Get prices in USD
                'order': 'market_cap_desc',     # Order by market cap (descending)
                'per_page': 10,                 # Get top 10 cryptocurrencies
                'page': 1,                      # First page of results
                'sparkline': False              # Don't include sparkline data
            }

            # Make the API request
            response = self.make_request(self.fallback_url, params=params)
            if not response:
                return []

            data = response.json()

            # Use local timezone for timestamp
            timestamp = self.get_current_timestamp()

            # Process the API response
            cryptos = []
            for crypto in data:
                cryptos.append({
                    'symbol': crypto.get('symbol', '').lower(),
                    'name': crypto.get('name', ''),
                    'price': crypto.get('current_price', 0),
                    'market_cap': crypto.get('market_cap', 0),
                    'volume_24h': crypto.get('total_volume', 0),
                    'percent_change_24h': crypto.get('price_change_percentage_24h', 0),
                    'timestamp': timestamp
                })
            return cryptos

        except Exception as e:
            return []  # Return empty list if all attempts fail

class DataProcessor:
    """
    Class for processing and storing cryptocurrency data.

    This class provides methods for saving data to CSV and JSON files,
    as well as cleaning up old data files.
    """

    @staticmethod
    def save_to_csv(data, filename='crypto_data.csv'):
        """
        Save cryptocurrency data to a CSV file.

        This method appends the provided cryptocurrency data to a CSV file.
        If the file doesn't exist, it creates a new one with appropriate headers.

        Args:
            data (list): List of dictionaries containing cryptocurrency data
            filename (str, optional): Path to the CSV file. Defaults to 'crypto_data.csv'.

        Note:
            The CSV file is opened in append mode, so new data is added to the end of the file.
        """
        # Check if the file already exists
        file_exists = os.path.isfile(filename)

        # Define the column names for the CSV file
        fieldnames = ['symbol', 'name', 'price', 'market_cap', 'volume_24h', 'percent_change_24h', 'timestamp']

        # Open the file in append mode
        with open(filename, mode='a', newline='', encoding='utf-8') as file:
            writer = csv.DictWriter(file, fieldnames=fieldnames)

            # Write header only if the file is new
            if not file_exists:
                writer.writeheader()

            # Write each data entry as a row
            for entry in data:
                writer.writerow(entry)

    @staticmethod
    def save_top_gainers_data(data, filename='data/top_gainers_data.json'):
        """
        Save top gainers data to a JSON file.

        This method saves the provided top gainers data to a JSON file
        and also creates a timestamped backup file for historical tracking.

        Args:
            data (list): List of dictionaries containing top gainer cryptocurrency data
            filename (str, optional): Path to the JSON file. Defaults to 'data/top_gainers_data.json'.
        """
        # Ensure data directory exists
        os.makedirs(os.path.dirname(filename), exist_ok=True)

        # Create a timestamp for the backup file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"data/top_gainers_{timestamp}.json"

        # Save to the main file
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)

        # Save to the backup file
        with open(backup_filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)

    @staticmethod
    def cleanup_old_top_gainers_data(max_age_hours=24):
        """
        Clean up old top gainers data files.

        This method removes top gainers data files that are older than the specified
        maximum age in hours.

        Args:
            max_age_hours (int, optional): Maximum age of files to keep in hours. Defaults to 24.
        """
        data_dir = "data"
        if not os.path.exists(data_dir):
            return

        # Calculate the cutoff time
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)

        # Find and remove old files
        for filename in os.listdir(data_dir):
            if filename.startswith("top_gainers_") and filename.endswith(".json"):
                if filename == "top_gainers_data.json":
                    continue  # Skip the main data file

                file_path = os.path.join(data_dir, filename)
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))

                if file_time < cutoff_time:
                    try:
                        os.remove(file_path)
                    except Exception as e:
                        pass

class TopGainersScraper(BaseScraper):
    """
    Scraper for top gaining cryptocurrencies.

    This class handles scraping top gainer data from CoinMarketCap
    with a fallback to CoinGecko API.
    """

    def __init__(self):
        """Initialize the top gainers scraper."""
        super().__init__()
        self.primary_url = "https://coinmarketcap.com/gainers-losers/"
        self.fallback_url = "https://api.coingecko.com/api/v3/coins/markets"

    def get_top_gainers(self, limit=20):
        """
        Scrape top gaining cryptocurrencies from CoinMarketCap.

        This method scrapes the CoinMarketCap website to get data for the
        top gaining cryptocurrencies in the last 24 hours. It extracts name, symbol,
        price, market cap, volume, and percent change.

        Args:
            limit (int, optional): Maximum number of top gainers to return. Defaults to 20.

        Returns:
            list: A list of dictionaries containing top gainer cryptocurrency data,
                or an empty list if scraping fails.
                Each dictionary contains: symbol, name, price, market_cap, volume_24h,
                percent_change_24h, timestamp, rank
        """
        try:
            # Make the HTTP request
            response = self.make_request(self.primary_url)
            if not response:
                return self.get_top_gainers_fallback(limit)

            # Parse the HTML content
            soup = BeautifulSoup(response.text, 'html.parser')

            # Find the gainers table - it's usually the first table on the page
            gainers_table = soup.select_one('table.cmc-table')

            if not gainers_table:
                return self.get_top_gainers_fallback(limit)

            # Select the table rows for the top gainers
            rows = gainers_table.select('tbody tr')[:limit]

            # Use local timezone for timestamp
            timestamp = self.get_current_timestamp()
            top_gainers = []

            # Process each row to extract cryptocurrency data
            for rank, row in enumerate(rows, 1):
                cols = row.find_all('td')
                if len(cols) < 7:  # Ensure we have enough columns
                    continue

                try:
                    # Extract name and symbol
                    name_tag = cols[2].find('p', class_=re.compile(r'sc-.*'))
                    symbol_tag = cols[2].find('p', class_='coin-item-symbol')

                    name = name_tag.get_text(strip=True) if name_tag else 'unknown'
                    symbol = symbol_tag.get_text(strip=True).lower() if symbol_tag else 'n/a'

                    # Extract numeric data
                    price = Utils.extract_float(cols[3].text)
                    percent_change_24h = Utils.extract_float(cols[4].text)
                    volume_24h = Utils.extract_float(cols[5].text)
                    market_cap = Utils.extract_float(cols[6].text)

                    # Create a dictionary with the extracted data
                    top_gainers.append({
                        'symbol': symbol,
                        'name': name,
                        'price': price,
                        'market_cap': market_cap,
                        'volume_24h': volume_24h,
                        'percent_change_24h': percent_change_24h,
                        'timestamp': timestamp,
                        'rank': rank
                    })

                except Exception as e:
                    continue

            # Return the scraped data or fall back to API if no valid data
            if top_gainers:
                return top_gainers
            else:
                return self.get_top_gainers_fallback(limit)

        except Exception as e:
            return self.get_top_gainers_fallback(limit)

    def get_top_gainers_fallback(self, limit=20):
        """
        Fallback method to get top gaining cryptocurrencies from CoinGecko API.

        This method is called when scraping from CoinMarketCap fails. It uses
        the CoinGecko API to get data for cryptocurrencies with the highest price
        increase in the last 24 hours.

        Args:
            limit (int, optional): Maximum number of top gainers to return. Defaults to 20.

        Returns:
            list: A list of dictionaries containing top gainer cryptocurrency data,
                or an empty list if the API request fails
        """
        try:
            # Parameters for the API request
            params = {
                'vs_currency': 'usd',           # Get prices in USD
                'order': 'market_cap_desc',     # Order by market cap (descending)
                'per_page': 250,                # Get top 250 cryptocurrencies to filter for gainers
                'page': 1,                      # First page of results
                'sparkline': False,             # Don't include sparkline data
                'price_change_percentage': '24h' # Include 24h price change percentage
            }

            # Make the API request
            response = self.make_request(self.fallback_url, params=params)
            if not response:
                return []

            data = response.json()

            # Use local timezone for timestamp
            timestamp = self.get_current_timestamp()

            # Filter for cryptocurrencies with positive price change and sort by percent change
            gainers = []
            for crypto in data:
                # Get price change percentage with a default of 0 if None or not present
                price_change = crypto.get('price_change_percentage_24h')
                if price_change is not None and float(price_change) > 0:
                    gainers.append(crypto)

            # Sort by price change percentage (handle None values)
            gainers.sort(key=lambda x: float(x.get('price_change_percentage_24h', 0) or 0), reverse=True)

            # Limit to the requested number of top gainers
            gainers = gainers[:limit]

            # Process the API response
            top_gainers = []
            for rank, crypto in enumerate(gainers, 1):
                # Safely get values with appropriate defaults
                price_change = crypto.get('price_change_percentage_24h')
                price_change = float(price_change) if price_change is not None else 0

                current_price = crypto.get('current_price')
                current_price = float(current_price) if current_price is not None else 0

                market_cap = crypto.get('market_cap')
                market_cap = float(market_cap) if market_cap is not None else 0

                volume = crypto.get('total_volume')
                volume = float(volume) if volume is not None else 0

                top_gainers.append({
                    'symbol': crypto.get('symbol', '').lower(),
                    'name': crypto.get('name', ''),
                    'price': current_price,
                    'market_cap': market_cap,
                    'volume_24h': volume,
                    'percent_change_24h': price_change,
                    'timestamp': timestamp,
                    'rank': rank
                })
            return top_gainers

        except Exception as e:
            return []  # Return empty list if all attempts fail


# Example usage when the script is run directly
if __name__ == "__main__":
    # Create scraper instances
    crypto_scraper = CryptoDataScraper()
    gainers_scraper = TopGainersScraper()
    data_processor = DataProcessor()

    # Get regular crypto data
    crypto_data = crypto_scraper.get_crypto_data()
    data_processor.save_to_csv(crypto_data)

    # Get top gainers data
    top_gainers = gainers_scraper.get_top_gainers()
    data_processor.save_top_gainers_data(top_gainers)

    # Clean up old data
    data_processor.cleanup_old_top_gainers_data()

