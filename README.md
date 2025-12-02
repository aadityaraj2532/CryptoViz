# CryptoViz - Cryptocurrency Visualization Platform

![CryptoViz](https://img.shields.io/badge/CryptoViz-Cryptocurrency%20Visualization-blue)
![Python](https://img.shields.io/badge/Python-3.9%2B-blue)
![Flask](https://img.shields.io/badge/Flask-3.1.0-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.1.3-purple)
![Chart.js](https://img.shields.io/badge/Chart.js-Latest-orange)

CryptoViz is a comprehensive cryptocurrency visualization platform designed to simplify cryptocurrency analysis by providing real-time visual insights. Whether you're an investor, trader, or just a curious enthusiast, our platform helps you make informed decisions with intuitive data representation.

![Top Gainers](https://github.com/iPriyadarshi/CryptoViz/blob/main/top-gainers-cryptoviz.png)
## 🚀 Key Features

- **Live Cryptocurrency Price Tracking** - Stay updated with real-time market movements
- **Historical Data Visualization** - Analyze past trends to predict future changes
- **Normalized Trend Analysis** - Compare different assets efficiently
- **Volatility Analysis** - Understand price fluctuations and risk metrics
- **Correlation Matrix** - Discover relationships between different cryptocurrencies
- **Market Sentiment Analysis** - Track market sentiment from various sources
- **Top Gainers Tracking** - Monitor the best performing cryptocurrencies in the last 24 hours
- **User-Friendly Interface** - Designed for accessibility and ease of use

## 📋 Project Structure

The project is organized into three main components:

```
CryptoViz/
├── crypto-backend/       # Flask backend API
├── crypto-frontend/      # HTML/CSS/JS frontend
└── historical_data_scrapper/ # Data collection scripts
```

### Backend (Flask)

The backend is built with Flask and provides RESTful API endpoints for:
- Cryptocurrency data retrieval
- Historical price data
- Volatility metrics
- Correlation analysis
- Sentiment data
- Top gainers information

### Frontend (HTML/CSS/JavaScript)

The frontend is built with HTML, CSS, and JavaScript, using:
- Bootstrap for responsive design
- Chart.js for interactive data visualization
- Custom CSS for theming (light/dark mode)

## 🛠️ Installation & Setup

### Prerequisites

- Python 3.9 or higher
- Web browser with JavaScript enabled

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd crypto-backend
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Start the Flask server:
   ```bash
   python app.py
   ```
   The backend API will be available at http://127.0.0.1:5000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd crypto-frontend
   ```

2. Open the `public/index.html` file in your web browser, or serve it using a local web server:
   - Using Python:
     ```bash
     python -m http.server 8000 --directory public
     ```

3. Access the application at http://localhost:8000 (or the port specified by your web server)

## 📊 Available Pages

- **Home** - Overview of top cryptocurrencies with price charts
- **Normalized Trend** - Compare price trends of different cryptocurrencies
- **Volatility** - Analyze price volatility metrics
- **Correlation** - View correlation between different cryptocurrencies
- **Sentiment** - Track market sentiment from various sources
- **Top Gainers** - Monitor the best performing cryptocurrencies

## 🔌 API Endpoints

The backend provides the following API endpoints:

- `GET /api/crypto` - Get the latest cryptocurrency data
- `GET /api/crypto/{symbol}/history` - Get historical price data for a specific cryptocurrency
- `GET /api/crypto/{symbol}/volatility` - Get volatility metrics for a specific cryptocurrency
- `GET /api/volatility` - Get volatility metrics for all cryptocurrencies
- `GET /api/correlation` - Get correlation matrix for all cryptocurrencies
- `GET /api/sentiment` - Get the latest sentiment data
- `GET /api/sentiment/history` - Get historical sentiment data
- `GET /api/top-gainers` - Get the latest top gaining cryptocurrencies
- `GET /api/top-gainers/update` - Trigger a top gainers data update
- `GET /api/sentiment/update` - Trigger a sentiment data update

## 🔄 Data Sources

CryptoViz collects data from multiple sources:

- **Price Data**: CoinMarketCap (primary), CoinGecko (fallback)
- **Sentiment Data**: News articles, social media, and specialized crypto sentiment sources
- **Top Gainers**: CoinGecko API

## 🎨 Customization

### Themes

CryptoViz supports both light and dark themes. You can toggle between themes using the theme switcher in the application header.

### Configuration

Backend configuration can be customized through environment variables:
- `FLASK_DEBUG`: Enable/disable debug mode (default: false)
- `FLASK_HOST`: Host to bind the server to (default: 0.0.0.0)
- `FLASK_PORT`: Port to run the server on (default: 5000)

Frontend API endpoint configuration can be modified in `crypto-frontend/public/js/config.js`.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

Built with ❤️ for cryptocurrency enthusiasts and data visualization lovers.
