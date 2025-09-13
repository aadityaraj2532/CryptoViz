import requests
import pandas as pd
import time
import numpy as np
from datetime import datetime, timedelta
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# CoinGecko coin IDs mapped to symbols (lowercase as requested)
COINS = {
    "bitcoin": "btc",
    "ethereum": "eth",
    "tether": "usdt",
    "ripple": "xrp",
    "binancecoin": "bnb",
    "solana": "sol",
    "usd-coin": "usdc",
    "dogecoin": "doge",
    "tron": "trx",
    "cardano": "ada"
}

# Names as shown in the example
COIN_NAMES = {
    "btc": "Bitcoin",
    "eth": "Ethereum",
    "usdt": "Tether",
    "xrp": "XRP",
    "bnb": "BNB",
    "sol": "Solana",
    "usdc": "USDC",
    "doge": "Dogecoin",
    "trx": "TRON",
    "ada": "Cardano"
}

def find_closest_timestamp(target_ts, timestamps_list):
    timestamps_array = np.array([ts[0] for ts in timestamps_list])
    idx = (np.abs(timestamps_array - target_ts)).argmin()
    return idx

def get_historical_crypto_data():
    end_time = datetime.now()
    start_time = end_time - timedelta(days=31)

    end_time = end_time.replace(second=0, microsecond=0)
    minute_remainder = end_time.minute % 5
    end_time = end_time - timedelta(minutes=minute_remainder)

    interval_minutes = 5
    time_intervals = []
    current_time = end_time
    while current_time >= start_time:
        time_intervals.append(current_time)
        current_time -= timedelta(minutes=interval_minutes)

    time_intervals.reverse()

    total_intervals = len(time_intervals)
    collection_intervals = time_intervals

    logging.info(f"Collecting {total_intervals} intervals at 5-minute frequency")

    all_data = []

    for coin_id, symbol in COINS.items():
        logging.info(f"Processing {coin_id}...")

        time.sleep(15)

        chunk_size = 7
        chunk_start = start_time

        all_prices = []
        all_market_caps = []
        all_volumes = []

        while chunk_start < end_time:
            chunk_end = min(chunk_start + timedelta(days=chunk_size), end_time)
            chunk_from_ts = int(chunk_start.timestamp())
            chunk_to_ts = int(chunk_end.timestamp())

            logging.info(f"Fetching data for period: {chunk_start.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')}")

            url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart/range"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            params = {
                "vs_currency": "usd",
                "from": chunk_from_ts,
                "to": chunk_to_ts
            }

            try:
                response = requests.get(url, headers=headers, params=params)
                response.raise_for_status()
                data = response.json()

                chunk_prices = data.get("prices", [])
                chunk_market_caps = data.get("market_caps", [])
                chunk_volumes = data.get("total_volumes", [])

                all_prices.extend(chunk_prices)
                all_market_caps.extend(chunk_market_caps)
                all_volumes.extend(chunk_volumes)

                if chunk_end < end_time:
                    logging.info("Waiting between chunks...")
                    time.sleep(10)

                chunk_start = chunk_end

            except requests.exceptions.RequestException as e:
                logging.error(f"Error fetching data: {e}")
                time.sleep(60)

                try:
                    retry_headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 Edg/92.0.902.73'
                    }
                    response = requests.get(url, headers=retry_headers, params=params)
                    response.raise_for_status()
                    data = response.json()

                    chunk_prices = data.get("prices", [])
                    chunk_market_caps = data.get("market_caps", [])
                    chunk_volumes = data.get("total_volumes", [])

                    all_prices.extend(chunk_prices)
                    all_market_caps.extend(chunk_market_caps)
                    all_volumes.extend(chunk_volumes)

                    chunk_start = chunk_end

                except Exception as retry_error:
                    logging.error(f"Error fetching data after retry: {retry_error}")
                    chunk_start = chunk_end
                    continue

        prices = all_prices
        market_caps = all_market_caps
        volumes = all_volumes

        if not prices:
            logging.warning(f"No price data available for {coin_id}")
            continue

        try:
            for interval_time in collection_intervals:
                interval_ts = int(interval_time.timestamp() * 1000)

                price_idx = find_closest_timestamp(interval_ts, prices)
                price_ts = prices[price_idx][0]
                price = prices[price_idx][1]

                if abs(price_ts - interval_ts) > 30 * 60 * 1000:
                    continue

                market_cap_idx = find_closest_timestamp(interval_ts, market_caps)
                market_cap = market_caps[market_cap_idx][1] / 1e9

                volume_idx = find_closest_timestamp(interval_ts, volumes)
                volume = volumes[volume_idx][1] / 1e9

                day_ago_interval = interval_time - timedelta(days=1)
                day_ago_ts = int(day_ago_interval.timestamp() * 1000)

                percent_change_24h = None
                if interval_time >= start_time + timedelta(days=1):
                    day_ago_idx = find_closest_timestamp(day_ago_ts, prices)
                    if abs(prices[day_ago_idx][0] - day_ago_ts) <= 30 * 60 * 1000:
                        price_24h_ago = prices[day_ago_idx][1]
                        if price_24h_ago > 0:
                            percent_change_24h = ((price - price_24h_ago) / price_24h_ago) * 100

                ts_str = interval_time.strftime('%Y-%m-%d %H:%M:%S')

                all_data.append({
                    "symbol": symbol,
                    "name": COIN_NAMES[symbol],
                    "price": price,
                    "market_cap": round(market_cap, 2),
                    "volume_24h": round(volume, 2),
                    "percent_change_24h": round(percent_change_24h, 2) if percent_change_24h is not None else None,
                    "timestamp": ts_str
                })

            logging.info(f"Finished processing {coin_id}")

        except Exception as e:
            logging.error(f"Error processing data for {coin_id}: {e}")

    return all_data

def main():
    crypto_data = get_historical_crypto_data()

    df = pd.DataFrame(crypto_data)

    df['percent_change_24h'] = df['percent_change_24h'].fillna(0)

    df = df.sort_values(by=['timestamp', 'symbol'])

    df.to_csv("crypto_data.csv", index=False)

if __name__ == "__main__":
    main()
