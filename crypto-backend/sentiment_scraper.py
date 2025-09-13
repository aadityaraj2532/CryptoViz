"""
Cryptocurrency Market Sentiment Scraper Module

This module provides functionality to scrape and analyze sentiment data from various
sources including cryptocurrency news websites, Reddit, and other social media platforms.
It uses natural language processing to determine sentiment scores for the overall market
and specific cryptocurrencies.

The module collects data from multiple sources, processes it to extract sentiment,
and aggregates it into a comprehensive sentiment analysis report.
"""

import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import os

# Download NLTK resources if not already downloaded
# VADER (Valence Aware Dictionary and sEntiment Reasoner) is used for sentiment analysis
try:
    nltk.data.find("vader_lexicon")  # Check if VADER lexicon is already downloaded
except LookupError:
    nltk.download("vader_lexicon")  # Download if not available

# Initialize VADER sentiment intensity analyzer
# This will be used to calculate sentiment scores for text content
sia = SentimentIntensityAnalyzer()

# Create data directory for storing sentiment data if it doesn't exist
if not os.path.exists("data"):
    os.makedirs("data")


class SentimentScraper:
    """
    A class for scraping and analyzing cryptocurrency market sentiment from various sources.

    This class provides methods to collect sentiment data from news websites, Reddit,
    and other sources, analyze the sentiment using natural language processing,
    and aggregate the results into a comprehensive sentiment report.
    """

    def __init__(self):
        """
        Initialize the SentimentScraper with necessary configuration.

        Sets up HTTP headers for web requests, defines the list of cryptocurrencies to track,
        and initializes data structures for storing sentiment information.
        """
        # Browser-like user agent to avoid being blocked by websites
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        # List of cryptocurrency symbols to track
        self.crypto_symbols = [
            "BTC",
            "ETH",
            "BNB",
            "SOL",
            "XRP",
            "ADA",
            "DOGE",
            "SHIB",
            "DOT",
            "AVAX",
            "MATIC",
            "LTC",
            "LINK",
            "UNI",
            "ATOM",
            "XLM",
            "ALGO",
            "FIL",
            "HBAR",
            "VET",
        ]

        # Mapping of cryptocurrency symbols to their full names
        self.crypto_names = {
            "BTC": "Bitcoin",
            "ETH": "Ethereum",
            "BNB": "Binance Coin",
            "SOL": "Solana",
            "XRP": "Ripple",
            "ADA": "Cardano",
            "DOGE": "Dogecoin",
            "SHIB": "Shiba Inu",
            "DOT": "Polkadot",
            "AVAX": "Avalanche",
            "MATIC": "Polygon",
            "LTC": "Litecoin",
            "LINK": "Chainlink",
            "UNI": "Uniswap",
            "ATOM": "Cosmos",
            "XLM": "Stellar",
            "ALGO": "Algorand",
            "FIL": "Filecoin",
            "HBAR": "Hedera",
            "VET": "VeChain",
        }

        # Initialize data structure for storing sentiment information
        self.sentiment_data = {
            "overall": {},  # Overall market sentiment metrics
            "crypto_specific": {},  # Sentiment data for specific cryptocurrencies
            "sources": [],  # Raw sources used for sentiment analysis
        }

        # Initialize Fear & Greed Index (will be populated during scraping)
        self.fear_greed_index = None

    def scrape_fear_and_greed_index(self):
        """
        Scrape the Crypto Fear & Greed Index from alternative.me.

        The Fear & Greed Index is a market sentiment indicator that measures
        investor sentiment on a scale from 0 (extreme fear) to 100 (extreme greed).
        It's based on various market factors including volatility, market momentum,
        social media, and surveys.

        Returns:
            int: The current Fear & Greed Index value (0-100), or 50 (neutral) if scraping fails
        """
        try:
            # URL for the Fear & Greed Index
            url = "https://alternative.me/crypto/fear-and-greed-index/"

            # Make the HTTP request
            response = requests.get(url, headers=self.headers)

            # Parse the HTML content
            soup = BeautifulSoup(response.text, "html.parser")

            # Find the fear and greed value (typically in a div with class 'fng-circle')
            fng_value = soup.find("div", class_="fng-circle")
            if fng_value:
                # Extract the numeric value
                value = fng_value.text.strip()
                try:
                    # Convert to integer
                    self.fear_greed_index = int(value)
                    return self.fear_greed_index
                except ValueError:
                    pass

            return 50  # Default neutral value if element not found
        except Exception:
            return 50  # Default neutral value on any error

    def scrape_crypto_news(self, limit=10):
        """
        Scrape cryptocurrency news from multiple sources.

        This method collects news articles from various cryptocurrency news websites,
        extracts relevant information, analyzes sentiment, and identifies which
        cryptocurrencies are mentioned in each article.

        The method tries multiple primary sources first, then falls back to additional
        sources if needed to reach the requested number of articles.

        Args:
            limit (int, optional): Maximum number of news articles to collect. Defaults to 10.

        Returns:
            list: A list of dictionaries containing news article data, including title,
                  summary, source, URL, sentiment score, and mentioned cryptocurrencies
        """
        news_items = []

        # Define primary news sources to scrape with their CSS selectors
        news_sources = [
            {
                "name": "CoinDesk",  # Name of the news source
                "url": "https://www.coindesk.com/",  # URL to scrape
                "article_selector": "article",  # CSS selector for article elements
                "title_selector": [
                    "h6",
                    "h5",
                    "h4",
                ],  # CSS selectors for title elements (tried in order)
                "summary_selector": "p",  # CSS selector for summary/content elements
                "base_url": "https://www.coindesk.com",  # Base URL for resolving relative links
            },
            {
                "name": "Cointelegraph",
                "url": "https://cointelegraph.com/",
                "article_selector": "article",
                "title_selector": ["h2", "h1"],
                "summary_selector": "p.post-card__text",
                "base_url": "https://cointelegraph.com",
            },
            {
                "name": "CryptoNews",
                "url": "https://cryptonews.com/",
                "article_selector": ".cn-tile",
                "title_selector": ["h4", "h3"],
                "summary_selector": "p",
                "base_url": "https://cryptonews.com",
            },
        ]

        # Track how many articles we've collected so far
        total_collected = 0

        # Try each primary news source until we have enough articles
        for source in news_sources:
            # Stop if we've already collected enough articles
            if total_collected >= limit:
                break

            try:
                # Scrape this specific news source
                source_items = self._scrape_news_source(source, limit - total_collected)

                if source_items:
                    # Add the scraped items to our collection
                    news_items.extend(source_items)
                    total_collected += len(source_items)
            except Exception:
                continue  # Try the next source if this one fails

        # If we still don't have enough articles, try additional backup sources
        if total_collected < limit:
            additional_items = self._try_additional_news_sources(
                limit - total_collected
            )
            if additional_items:
                news_items.extend(additional_items)
                total_collected += len(additional_items)

        # If we couldn't get any data from any source, return empty list
        if not news_items:
            return []

        # Add all collected news items to the sentiment data structure
        self.sentiment_data["sources"].extend(news_items)
        return news_items

    def normalize_sentiment_score(self, score, min_val=-1, max_val=1):
        """
        Convert a sentiment score from the VADER scale (-1 to 1) to a 0-100 scale.

        VADER sentiment scores range from -1 (extremely negative) to 1 (extremely positive).
        This method converts that range to a more intuitive 0-100 scale where:
        - 0 represents extremely negative sentiment
        - 50 represents neutral sentiment
        - 100 represents extremely positive sentiment

        Args:
            score (float): The original sentiment score (typically between -1 and 1)
            min_val (float, optional): The minimum value of the original scale. Defaults to -1.
            max_val (float, optional): The maximum value of the original scale. Defaults to 1.

        Returns:
            float: The normalized sentiment score on a 0-100 scale
        """
        return ((score - min_val) / (max_val - min_val)) * 100

    def _scrape_news_source(self, source, limit):
        """Scrape a specific news source"""
        news_items = []
        try:
            # Get the page content
            response = requests.get(source["url"], headers=self.headers, timeout=10)
            if response.status_code != 200:
                return []

            soup = BeautifulSoup(response.text, "html.parser")

            # Find news articles
            articles = soup.select(source["article_selector"])
            if not articles:
                return []

            # Process each article
            for article in articles[:limit]:
                try:
                    # Extract title
                    title = None
                    for selector in source["title_selector"]:
                        title_element = article.find(selector)
                        if title_element:
                            title = title_element.text.strip()
                            break

                    if not title:
                        continue

                    # Extract link
                    link_element = article.find("a")
                    link = (
                        link_element["href"]
                        if link_element and "href" in link_element.attrs
                        else ""
                    )
                    if link and not link.startswith("http"):
                        link = source["base_url"] + link

                    # Extract summary if available
                    summary = ""
                    summary_element = article.select_one(source["summary_selector"])
                    if summary_element:
                        summary = summary_element.text.strip()

                    # Analyze sentiment
                    text_to_analyze = title + " " + summary
                    sentiment_score = sia.polarity_scores(text_to_analyze)["compound"]
                    normalized_score = self.normalize_sentiment_score(sentiment_score)

                    # Determine which cryptocurrencies are mentioned
                    mentioned_cryptos = []
                    for symbol in self.crypto_symbols:
                        if (
                            symbol in text_to_analyze.upper()
                            or self.crypto_names[symbol].lower()
                            in text_to_analyze.lower()
                        ):
                            mentioned_cryptos.append(symbol)

                    # If no specific crypto is mentioned, it might be about the market in general
                    if not mentioned_cryptos and any(
                        keyword in text_to_analyze.lower()
                        for keyword in [
                            "crypto",
                            "bitcoin",
                            "blockchain",
                            "cryptocurrency",
                        ]
                    ):
                        mentioned_cryptos = [
                            "BTC"
                        ]  # Default to Bitcoin for general market news

                    # Create news item
                    news_item = {
                        "type": "news",
                        "source": source["name"],
                        "title": title,
                        "text": summary,
                        "url": link,
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "sentiment": normalized_score,
                        "mentioned_cryptos": mentioned_cryptos,
                    }

                    news_items.append(news_item)

                    # Update crypto-specific sentiment
                    for crypto in mentioned_cryptos:
                        if crypto not in self.sentiment_data["crypto_specific"]:
                            self.sentiment_data["crypto_specific"][crypto] = {
                                "sentiment_scores": [],
                                "sources": [],
                            }

                        self.sentiment_data["crypto_specific"][crypto][
                            "sentiment_scores"
                        ].append(normalized_score)
                        self.sentiment_data["crypto_specific"][crypto][
                            "sources"
                        ].append(
                            {
                                "type": "news",
                                "title": title,
                                "sentiment": normalized_score,
                            }
                        )

                except Exception:
                    continue

            return news_items

        except Exception:
            return []

    def _try_additional_news_sources(self, limit):
        """Try additional news sources when primary sources fail"""
        news_items = []

        # Additional crypto news sources to try
        additional_sources = [
            {
                "name": "BeInCrypto",
                "url": "https://beincrypto.com/",
                "article_selector": ".jeg_post",
                "title_selector": ["h3", "h2"],
                "summary_selector": "p",
                "base_url": "https://beincrypto.com",
            },
            {
                "name": "Bitcoinist",
                "url": "https://bitcoinist.com/",
                "article_selector": "article",
                "title_selector": ["h2", "h3"],
                "summary_selector": ".entry-content p",
                "base_url": "https://bitcoinist.com",
            },
        ]

        # Try each additional source
        for source in additional_sources:
            if len(news_items) >= limit:
                break

            try:
                source_items = self._scrape_news_source(source, limit - len(news_items))
                if source_items:
                    news_items.extend(source_items)
            except Exception:
                continue

        # Try RSS feeds as another source
        if len(news_items) < limit:
            try:
                rss_items = self._try_scrape_news_rss(limit - len(news_items))
                if rss_items:
                    news_items.extend(rss_items)
            except Exception:
                pass

        return news_items

    def _try_scrape_news_rss(self, limit):
        """Try to scrape news from RSS feeds"""
        news_items = []

        # Common crypto RSS feeds
        rss_feeds = [
            "https://cointelegraph.com/rss",
            "https://coindesk.com/arc/outboundfeeds/rss/",
            "https://news.bitcoin.com/feed/",
        ]

        for feed_url in rss_feeds:
            if len(news_items) >= limit:
                break

            try:
                response = requests.get(feed_url, headers=self.headers, timeout=10)
                if response.status_code != 200:
                    continue

                # Parse the RSS feed
                soup = BeautifulSoup(response.text, "xml")

                # Find items
                items = soup.find_all("item")

                for item in items[: limit - len(news_items)]:
                    try:
                        # Extract title
                        title_elem = item.find("title")
                        if not title_elem:
                            continue
                        title = title_elem.text.strip()

                        # Extract link
                        link_elem = item.find("link")
                        link = link_elem.text.strip() if link_elem else "#"

                        # Extract description/summary
                        desc_elem = item.find("description")
                        description = desc_elem.text.strip() if desc_elem else ""

                        # Clean up description (remove HTML)
                        description = BeautifulSoup(
                            description, "html.parser"
                        ).get_text()

                        # Extract source
                        source_name = "Crypto News"
                        if "cointelegraph.com" in feed_url:
                            source_name = "Cointelegraph"
                        elif "coindesk.com" in feed_url:
                            source_name = "CoinDesk"
                        elif "bitcoin.com" in feed_url:
                            source_name = "Bitcoin.com"

                        # Analyze sentiment
                        text_to_analyze = title + " " + description
                        sentiment_score = sia.polarity_scores(text_to_analyze)[
                            "compound"
                        ]
                        normalized_score = self.normalize_sentiment_score(
                            sentiment_score
                        )

                        # Determine which cryptocurrencies are mentioned
                        mentioned_cryptos = []
                        for symbol in self.crypto_symbols:
                            if (
                                symbol in text_to_analyze.upper()
                                or self.crypto_names[symbol].lower()
                                in text_to_analyze.lower()
                            ):
                                mentioned_cryptos.append(symbol)

                        # If no specific crypto is mentioned, it might be about the market in general
                        if not mentioned_cryptos and any(
                            keyword in text_to_analyze.lower()
                            for keyword in [
                                "crypto",
                                "bitcoin",
                                "blockchain",
                                "cryptocurrency",
                            ]
                        ):
                            mentioned_cryptos = [
                                "BTC"
                            ]  # Default to Bitcoin for general market news

                        # Create news item
                        news_item = {
                            "type": "news",
                            "source": source_name,
                            "title": title,
                            "text": (
                                description[:200] + "..."
                                if len(description) > 200
                                else description
                            ),
                            "url": link,
                            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "sentiment": normalized_score,
                            "mentioned_cryptos": mentioned_cryptos,
                        }

                        news_items.append(news_item)

                    except Exception:
                        continue

            except Exception:
                continue

        return news_items

    def scrape_reddit_sentiment(self, subreddit="CryptoCurrency", limit=10):
        """
        Scrape sentiment data from Reddit cryptocurrency communities.

        This method collects posts from specified subreddits, extracts their content,
        analyzes sentiment, and identifies which cryptocurrencies are mentioned.
        Reddit is a valuable source of retail investor sentiment in the crypto market.

        Args:
            subreddit (str, optional): The subreddit to scrape. Defaults to 'CryptoCurrency'.
            limit (int, optional): Maximum number of posts to collect. Defaults to 10.

        Returns:
            list: A list of dictionaries containing Reddit post data, including title,
                  content, URL, sentiment score, and mentioned cryptocurrencies
        """
        reddit_items = []
        try:
            # Using old.reddit.com which has a simpler HTML structure for scraping
            url = f"https://old.reddit.com/r/{subreddit}/hot/"

            # Make the HTTP request
            response = requests.get(url, headers=self.headers)

            # Parse the HTML content
            soup = BeautifulSoup(response.text, "html.parser")

            # Find post elements (each post is in a div with class 'thing')
            posts = soup.find_all("div", class_="thing", limit=limit)

            # Process each post
            for post in posts:
                try:
                    # Extract post title
                    title_element = post.find("a", class_="title")
                    if not title_element:
                        continue  # Skip posts without a title

                    title = title_element.text.strip()

                    # Extract post link
                    link = title_element["href"]
                    # Convert relative URLs to absolute URLs
                    if link and not link.startswith("http"):
                        link = "https://www.reddit.com" + link

                    # Extract post content if available (only for text posts)
                    content = ""
                    if "self" in post.get("class", []):  # Check if it's a text post
                        expando = post.find("div", class_="expando")
                        if expando:
                            content_element = expando.find("div", class_="md")
                            if content_element:
                                content = content_element.text.strip()

                    # Analyze sentiment using VADER
                    text_to_analyze = title + " " + content
                    sentiment_score = sia.polarity_scores(text_to_analyze)["compound"]
                    normalized_score = self.normalize_sentiment_score(sentiment_score)

                    # Determine which cryptocurrencies are mentioned in the post
                    mentioned_cryptos = []
                    for symbol in self.crypto_symbols:
                        # Check for both symbol (e.g., "BTC") and full name (e.g., "Bitcoin")
                        if (
                            symbol in text_to_analyze.upper()
                            or self.crypto_names[symbol].lower()
                            in text_to_analyze.lower()
                        ):
                            mentioned_cryptos.append(symbol)

                    # Create data structure for this Reddit post
                    reddit_item = {
                        "type": "reddit",  # Source type
                        "source": f"r/{subreddit}",  # Specific subreddit
                        "title": title,  # Post title
                        "text": (
                            content[:200] + "..." if len(content) > 200 else content
                        ),  # Truncated content
                        "url": link,  # Post URL
                        "timestamp": datetime.now().strftime(
                            "%Y-%m-%d %H:%M:%S"
                        ),  # Current timestamp
                        "sentiment": normalized_score,  # Sentiment score (0-100)
                        "mentioned_cryptos": mentioned_cryptos,  # List of mentioned cryptocurrencies
                    }

                    # Add to the list of Reddit items
                    reddit_items.append(reddit_item)

                    # Update cryptocurrency-specific sentiment data
                    for crypto in mentioned_cryptos:
                        # Initialize data structure for this crypto if it doesn't exist
                        if crypto not in self.sentiment_data["crypto_specific"]:
                            self.sentiment_data["crypto_specific"][crypto] = {
                                "sentiment_scores": [],
                                "sources": [],
                            }

                        # Add sentiment score for this crypto
                        self.sentiment_data["crypto_specific"][crypto][
                            "sentiment_scores"
                        ].append(normalized_score)

                        # Add source reference for this crypto
                        self.sentiment_data["crypto_specific"][crypto][
                            "sources"
                        ].append(
                            {
                                "type": "reddit",
                                "title": title,
                                "sentiment": normalized_score,
                            }
                        )

                except Exception:
                    continue  # Skip this post and continue with the next one

            # Add all Reddit items to the main sources list
            self.sentiment_data["sources"].extend(reddit_items)
            return reddit_items

        except Exception:
            return []  # Return empty list on error

    def calculate_overall_sentiment(self):
        """
        Calculate overall market sentiment based on all collected sources.

        This method computes the overall cryptocurrency market sentiment by:
        1. Calculating average sentiment from news sources
        2. Calculating average sentiment from social media (Reddit)
        3. Incorporating the Fear & Greed Index
        4. Combining these metrics with appropriate weights

        The weights are:
        - 50% news sentiment (most reliable indicator)
        - 30% social media sentiment (Reddit)
        - 20% Fear & Greed Index (market indicator)

        Returns:
            float: The overall market sentiment score (0-100), or 50 (neutral) if calculation fails
        """
        try:
            # Collect all sentiment scores for reference (not used in calculation)
            all_scores = []
            for source in self.sentiment_data["sources"]:
                all_scores.append(source["sentiment"])

            # Calculate social media sentiment (Reddit only, X.com removed)
            # Extract sentiment scores from Reddit sources
            social_scores = [
                s["sentiment"]
                for s in self.sentiment_data["sources"]
                if s["type"] == "reddit"
            ]
            # Calculate average, defaulting to neutral (50) if no data
            social_sentiment = (
                sum(social_scores) / len(social_scores) if social_scores else 50
            )

            # Calculate news sentiment
            # Extract sentiment scores from news sources
            news_scores = [
                s["sentiment"]
                for s in self.sentiment_data["sources"]
                if s["type"] == "news"
            ]
            # Calculate average, defaulting to neutral (50) if no data
            news_sentiment = sum(news_scores) / len(news_scores) if news_scores else 50

            # Get Fear & Greed Index value, defaulting to neutral (50) if not available
            fear_greed = (
                self.fear_greed_index if self.fear_greed_index is not None else 50
            )

            # Calculate overall sentiment as a weighted average of the three components
            # 50% news, 30% Reddit, 20% fear & greed (adjusted weights since X.com was removed)
            overall_sentiment = (
                (0.5 * news_sentiment) + (0.3 * social_sentiment) + (0.2 * fear_greed)
            )

            # Update the sentiment data structure with the calculated values
            self.sentiment_data["overall"] = {
                "sentiment": overall_sentiment,  # Combined weighted sentiment
                "social_sentiment": social_sentiment,  # Reddit sentiment
                "news_sentiment": news_sentiment,  # News sentiment
                "fear_greed_index": fear_greed,  # Fear & Greed Index
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),  # Current timestamp
            }

            return overall_sentiment

        except Exception:
            return 50  # Default to neutral value on error

    def calculate_crypto_rankings(self):
        """
        Calculate sentiment rankings for cryptocurrencies.

        This method analyzes the sentiment data collected for each cryptocurrency and:
        1. Calculates the average sentiment score for each cryptocurrency
        2. Categorizes them as positive (≥50) or negative (<50)
        3. Ranks them within each category
        4. Returns the top 5 most positive and top 5 most negative cryptocurrencies

        The rankings provide insight into which cryptocurrencies currently have
        the most positive and most negative sentiment in the market.

        Returns:
            dict: A dictionary with two lists - 'positive' and 'negative' - each containing
                  the top 5 cryptocurrencies in that category with their sentiment data
        """
        try:
            # Initialize rankings structure with empty lists
            rankings = {"positive": [], "negative": []}

            # Process each cryptocurrency that has sentiment data
            for symbol, data in self.sentiment_data["crypto_specific"].items():
                # Skip cryptocurrencies with no sentiment scores
                if not data["sentiment_scores"]:
                    continue

                # Calculate average sentiment score for this cryptocurrency
                avg_sentiment = sum(data["sentiment_scores"]) / len(
                    data["sentiment_scores"]
                )

                # Calculate sentiment change (compared to historical data)
                # Currently set to 0 as we don't have historical comparison
                # This could be enhanced in the future to show sentiment trends
                sentiment_change = 0

                # Create data structure for this cryptocurrency
                crypto_data = {
                    "symbol": symbol,  # Cryptocurrency symbol (e.g., 'BTC')
                    "name": self.crypto_names.get(
                        symbol, symbol
                    ),  # Full name (e.g., 'Bitcoin')
                    "score": avg_sentiment,  # Average sentiment score (0-100)
                    "change": sentiment_change,  # Sentiment change (currently 0)
                    "sources_count": len(
                        data["sources"]
                    ),  # Number of sources mentioning this crypto
                }

                # Categorize as positive or negative based on sentiment score
                if avg_sentiment >= 50:  # 50 is neutral, ≥50 is positive
                    rankings["positive"].append(crypto_data)
                else:  # <50 is negative
                    rankings["negative"].append(crypto_data)

            # Sort the positive rankings by score (highest first)
            rankings["positive"] = sorted(
                rankings["positive"], key=lambda x: x["score"], reverse=True
            )

            # Sort the negative rankings by score (lowest first)
            rankings["negative"] = sorted(
                rankings["negative"], key=lambda x: x["score"]
            )

            # Limit each category to the top 5 cryptocurrencies
            rankings["positive"] = rankings["positive"][:5]
            rankings["negative"] = rankings["negative"][:5]

            # Update the sentiment data with the rankings
            self.sentiment_data["rankings"] = rankings
            return rankings

        except Exception:
            return {"positive": [], "negative": []}  # Return empty rankings on error

    def cleanup_old_sentiment_data(self, max_age_days=30):
        """
        Clean up old sentiment data files.

        This method removes sentiment data files that are older than the specified
        maximum age in days. It only removes files with the pattern 'sentiment_data_*.json'
        and leaves the 'latest_sentiment_data.json' file untouched.

        Args:
            max_age_days (int, optional): Maximum age of files to keep in days. Defaults to 30.
        """
        data_dir = "data"
        if not os.path.exists(data_dir):
            return

        # Calculate the cutoff time
        cutoff_time = datetime.now() - timedelta(days=max_age_days)

        # Find and remove old files
        removed_count = 0
        for filename in os.listdir(data_dir):
            if filename.startswith("sentiment_data_") and filename.endswith(".json"):
                if filename == "latest_sentiment_data.json":
                    continue  # Skip the main data file

                file_path = os.path.join(data_dir, filename)
                file_time = datetime.fromtimestamp(os.path.getmtime(file_path))

                if file_time < cutoff_time:
                    try:
                        os.remove(file_path)
                        removed_count += 1
                    except Exception as e:
                        pass

        # Return the number of files removed (can be used by calling functions if needed)
        return removed_count

    def filter_decrypt_sources(self):
        """
        Filter out any sources from decrypt.co from the sentiment data.

        This method removes all news sources from decrypt.co from both the main
        sources list and from the cryptocurrency-specific sentiment data. It also
        recalculates sentiment scores to ensure they don't include data from
        the filtered sources.

        This filtering is done as per application requirements to exclude
        specific news sources from the sentiment analysis.

        Returns:
            bool: True if filtering was successful, False if an error occurred
        """
        try:
            # Filter out sources from decrypt.co from the main sources list
            # Keep only sources that are not from Decrypt and don't have decrypt.co in the URL
            filtered_sources = [
                source
                for source in self.sentiment_data["sources"]
                if source.get("source") != "Decrypt"
                and "decrypt.co" not in source.get("url", "")
            ]

            # Update the main sources list with the filtered list
            self.sentiment_data["sources"] = filtered_sources

            # Also update crypto-specific sentiment data to maintain consistency
            for crypto, data in self.sentiment_data["crypto_specific"].items():
                # Initialize new lists for scores and sources without decrypt.co content
                new_scores = []
                new_sources = []

                # Process each source and its corresponding sentiment score
                for i, source in enumerate(data.get("sources", [])):
                    # Skip sources from decrypt.co
                    if source.get("type") == "news" and "decrypt.co" in source.get(
                        "url", ""
                    ):
                        continue

                    # Keep the corresponding sentiment score if available
                    if i < len(data.get("sentiment_scores", [])):
                        new_scores.append(data["sentiment_scores"][i])

                    # Keep the source information
                    new_sources.append(source)

                # Update the crypto-specific data with filtered lists
                if new_scores or new_sources:
                    self.sentiment_data["crypto_specific"][crypto][
                        "sentiment_scores"
                    ] = new_scores
                    self.sentiment_data["crypto_specific"][crypto][
                        "sources"
                    ] = new_sources

            return True
        except Exception:
            return False

    def save_sentiment_data(self):
        """
        Save sentiment data to JSON files.

        This method saves the collected sentiment data in two formats:
        1. A timestamped file for historical records (sentiment_data_YYYYMMDD_HHMMSS.json)
        2. A fixed filename (latest_sentiment_data.json) that is overwritten each time
           for easy access by the API

        Before saving, it ensures that any sources from decrypt.co are filtered out
        as per the application requirements.

        Returns:
            str: The path to the timestamped JSON file, or None if saving failed
        """
        try:
            # Filter out decrypt.co sources before saving
            self.filter_decrypt_sources()

            # Create timestamp for filename using local timezone
            # Format: YYYYMMDD_HHMMSS (e.g., 20230101_120000)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"data/sentiment_data_{timestamp}.json"

            # Save to timestamped file for historical records
            with open(filename, "w") as f:
                json.dump(
                    self.sentiment_data, f, indent=4
                )  # Pretty-print with 4-space indentation

            # Also save to a fixed filename that will be overwritten each time
            # This file is used by the API to always get the latest data
            with open("data/latest_sentiment_data.json", "w") as f:
                json.dump(
                    self.sentiment_data, f, indent=4
                )  # Pretty-print with 4-space indentation

            # Clean up old sentiment data files (older than 30 days)
            try:
                self.cleanup_old_sentiment_data(30)
            except Exception:
                pass

            return filename

        except Exception:
            return None

    def run_scraper(self):
        """
        Run the complete sentiment scraping process.

        This method orchestrates the entire sentiment analysis workflow:
        1. Scrapes the Fear & Greed Index
        2. Collects news articles from cryptocurrency news sites
        3. Gathers sentiment data from Reddit
        4. Calculates overall market sentiment
        5. Ranks cryptocurrencies by sentiment
        6. Saves the collected data to JSON files

        Each step is executed in a separate try-except block to ensure that
        failure in one step doesn't prevent the execution of subsequent steps.

        Returns:
            dict: The complete sentiment data structure containing overall sentiment,
                  cryptocurrency-specific sentiment, and all sources
        """
        try:
            # Step 1: Scrape Fear & Greed Index (market sentiment indicator)
            self.scrape_fear_and_greed_index()
        except Exception:
            pass

        try:
            # Step 2: Scrape news from cryptocurrency news websites
            # Increased limit to get more news from various sources for better coverage
            self.scrape_crypto_news(limit=30)
        except Exception:
            pass

        try:
            # Step 3: Scrape sentiment data from Reddit cryptocurrency communities
            # Increased limit to match news sources for balanced sentiment analysis
            self.scrape_reddit_sentiment(limit=20)
        except Exception:
            pass

        try:
            # Step 4: Calculate overall market sentiment from all collected sources
            # This combines news, social media, and Fear & Greed Index with appropriate weights
            self.calculate_overall_sentiment()
        except Exception:
            pass

        try:
            # Step 5: Rank cryptocurrencies by sentiment (most positive and most negative)
            self.calculate_crypto_rankings()
        except Exception:
            pass

        try:
            # Step 6: Save all collected and processed data to JSON files
            # This saves both a timestamped file and updates the latest data file
            self.save_sentiment_data()
        except Exception:
            pass

        return self.sentiment_data


# Main execution block - runs when the script is executed directly
if __name__ == "__main__":
    """
    Main execution block for running the sentiment scraper as a standalone script.

    When this script is run directly (not imported as a module), this section:
    1. Creates a SentimentScraper instance
    2. Runs the complete scraping process
    3. Prints the resulting sentiment data as formatted JSON

    This is useful for testing the scraper or running it manually outside
    of the main application.
    """
    # Create a sentiment scraper instance
    scraper = SentimentScraper()

    # Run the complete scraping process
    sentiment_data = scraper.run_scraper()

    # Print the resulting sentiment data as formatted JSON
    print(json.dumps(sentiment_data, indent=4))
