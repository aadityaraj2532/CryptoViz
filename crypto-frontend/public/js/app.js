/**
 * Main Application JavaScript for CryptoViz
 *
 * This file contains the core functionality for the cryptocurrency dashboard,
 * including data fetching, chart rendering, and UI interactions.
 * It handles the main page functionality for displaying cryptocurrency prices,
 * historical data, and market statistics.
 */

// API_BASE_URL is now imported from config.js

// Global variables
let priceChart;                // Chart.js instance for price chart
let currentSelectedCrypto = null; // Currently selected cryptocurrency
let currentTimeframe = '24h';  // Default timeframe for historical data (24h, 7d, 1m)

/**
 * Initialize the application when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Theme switching is handled by common.js for consistency across pages

    // Set up event listeners for user interactions
    initEventListeners();

    // Fetch initial cryptocurrency data
    fetchCryptoData();

    // Listen for theme changes to update chart colors and styling
    document.addEventListener('themeChanged', function(e) {
        if (priceChart) {
            updateChartTheme(e.detail.theme);
        }
    });

    // Setup chart resize observer
    setupChartResizeObserver();
});

/**
 * Update the price chart's theme based on the current application theme
 *
 * This function adjusts the chart's colors and styling to match the current
 * light or dark theme, ensuring visual consistency across the application.
 *
 * @param {string} theme - The current theme ('light' or 'dark')
 */
function updateChartTheme(theme) {
    // Determine if we're using dark theme
    const isDark = theme === 'dark';

    // Set appropriate colors based on theme
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e9ecef' : '#212529';
    const borderColor = isDark ? '#2d2d2d' : '#e9ecef';

    // Update chart options if chart exists
    if (priceChart) {
        // Update grid colors
        priceChart.options.scales.x.grid.color = gridColor;
        priceChart.options.scales.y.grid.color = gridColor;

        // Update text colors
        priceChart.options.scales.x.ticks.color = textColor;
        priceChart.options.scales.y.ticks.color = textColor;

        // Update tooltip colors
        priceChart.options.plugins.tooltip.backgroundColor = isDark ? '#2d2d2d' : '#ffffff';
        priceChart.options.plugins.tooltip.titleColor = isDark ? '#e9ecef' : '#212529';
        priceChart.options.plugins.tooltip.bodyColor = isDark ? '#e9ecef' : '#212529';

        // Apply the changes
        priceChart.update();
    }
}

/**
 * Initialize all event listeners for user interactions
 *
 * Sets up event handlers for search functionality, timeframe selection,
 * and other interactive elements on the page.
 */
function initEventListeners() {
    // Search functionality with debounce to improve performance
    document.getElementById('searchCrypto').addEventListener('input', debounce(function() {
        // Get the search term and convert to lowercase for case-insensitive matching
        const searchTerm = this.value.toLowerCase().trim();
        const items = document.querySelectorAll('.crypto-item');

        // Filter cryptocurrency items based on search term
        items.forEach(item => {
            const cryptoName = item.textContent.toLowerCase();
            // Show or hide based on whether the name contains the search term
            item.style.display = cryptoName.includes(searchTerm) ? 'flex' : 'none';
        });
    }, 300)); // 300ms debounce delay

    // Timeframe selector buttons (24h, 7d, 1m)
    document.querySelectorAll('.btn-timeframe').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all timeframe buttons
            document.querySelectorAll('.btn-timeframe').forEach(b => b.classList.remove('active'));
            // Add active class to the clicked button
            this.classList.add('active');
            // Update current timeframe based on the button's data attribute
            currentTimeframe = this.dataset.timeframe;

            // Fetch new historical data if a cryptocurrency is selected
            if (currentSelectedCrypto) {
                fetchHistoricalData(currentSelectedCrypto.symbol, currentTimeframe);
            }
        });
    });
}

/**
 * Debounce function to limit how often a function can be called
 *
 * This utility function prevents a function from being called too frequently,
 * which is useful for performance-intensive operations like search filtering
 * that might be triggered by rapid user input.
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - The delay in milliseconds
 * @returns {Function} - The debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        // Clear previous timeout to reset the timer
        clearTimeout(timeout);
        // Set a new timeout
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Fetch cryptocurrency data from the API
 *
 * This async function retrieves the latest cryptocurrency data from the backend,
 * updates the UI with the new data, and handles any errors that might occur.
 * It's called on initial page load and periodically to keep data fresh.
 */
async function fetchCryptoData() {
    try {
        // Show loading indicator while fetching data
        showLoading(document.getElementById('cryptoList'));

        // Fetch data from the API
        const response = await fetch(`${API_BASE_URL}/api/crypto`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // Parse the JSON response
        const data = await response.json();

        // Check if we received valid data
        if (data.data && data.data.length > 0) {
            // Update the cryptocurrency list with new data
            updateCryptoList(data.data);
            // Update the last updated timestamp
            updateLastUpdated();

            // Auto-select the first cryptocurrency if none is currently selected
            if (!currentSelectedCrypto) {
                selectCrypto(data.data[0]);
            }
        } else {
            // Show error if no data was received
            showError(document.getElementById('cryptoList'), 'No data available');
        }
    } catch (error) {
        // Log and display any errors that occurred

        showError(document.getElementById('cryptoList'), 'Failed to load data. Please try again later.');
    }
}

/**
 * Display a loading spinner in the specified element
 *
 * This function replaces the content of the given element with a loading spinner,
 * providing visual feedback to users during asynchronous operations.
 *
 * @param {HTMLElement} element - The DOM element to show the loading spinner in
 */
function showLoading(element) {
    element.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>`;
}

/**
 * Display an error message in the specified element
 *
 * This function replaces the content of the given element with an error message,
 * providing clear feedback when operations fail.
 *
 * @param {HTMLElement} element - The DOM element to show the error in
 * @param {string} message - The error message to display
 */
function showError(element, message) {
    element.innerHTML = `
        <div class="alert alert-danger d-flex align-items-center">
            ${exclamationTriangleIcon('me-2')}
            <div>${message}</div>
        </div>`;
}

/**
 * Update the "Last Updated" timestamp display
 *
 * This function updates the last updated timestamp to the current time,
 * helping users know when the data was last refreshed.
 */
function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = now.toLocaleString();
}

function updateCryptoList(cryptos) {
    const cryptoListElement = document.getElementById('cryptoList');
    cryptoListElement.innerHTML = '';

    if (cryptos.length === 0) {
        showError(cryptoListElement, 'No cryptocurrencies found');
        return;
    }

    cryptos.forEach(crypto => {
        const cryptoItem = document.createElement('div');
        cryptoItem.className = 'crypto-item';
        if (currentSelectedCrypto && currentSelectedCrypto.symbol === crypto.symbol) {
            cryptoItem.classList.add('active');
        }

        cryptoItem.innerHTML = `
            <div class="crypto-info">
                <div class="crypto-icon">
                    ${getCryptoIcon(crypto.symbol, 'crypto-svg-icon')}
                </div>
                <div>
                    <div class="crypto-name">${crypto.name}</div>
                    <div class="crypto-symbol">${crypto.symbol}</div>
                </div>
            </div>
            <div class="crypto-details">
                <div class="crypto-price">$${formatPrice(crypto.price)}</div>
                <div class="crypto-change ${crypto.percent_change_24h >= 0 ? 'positive' : 'negative'}">
                    ${crypto.percent_change_24h >= 0 ? '+' : ''}${crypto.percent_change_24h.toFixed(2)}%
                </div>
            </div>
        `;

        cryptoItem.addEventListener('click', () => {
            document.querySelectorAll('.crypto-item').forEach(item => item.classList.remove('active'));
            cryptoItem.classList.add('active');
            selectCrypto(crypto);
        });

        cryptoListElement.appendChild(cryptoItem);
    });
}

function formatPrice(price) {
    return price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
    });
}

function selectCrypto(crypto) {
    currentSelectedCrypto = crypto;

    // Update the header
    document.getElementById('selectedCryptoName').textContent = `${crypto.name} (${crypto.symbol})`;

    // Update the stats
    document.getElementById('currentPrice').textContent = `$${formatPrice(crypto.price)}`;
    document.getElementById('marketCap').textContent = formatMarketCap(crypto.market_cap);
    document.getElementById('volume24h').textContent = formatVolume(crypto.volume_24h);

    // Update the price change badge
    updatePriceChangeBadge(crypto.percent_change_24h);

    // Fetch and display historical data
    fetchHistoricalData(crypto.symbol, currentTimeframe);
}

function formatMarketCap(marketCap) {
    // The market cap values are already in billions, so we need to adjust our thresholds
    if (marketCap >= 1000) return `$${(marketCap / 1000).toFixed(2)} Trillion USD`;
    if (marketCap >= 1) return `$${marketCap.toFixed(2)} Billion USD`;
    if (marketCap >= 0.001) return `$${(marketCap * 1000).toFixed(2)} Million USD`;
    if (marketCap >= 0.000001) return `$${(marketCap * 1000000).toFixed(2)} Thousand USD`;
    return `$${formatPrice(marketCap)} USD`;
}

function formatVolume(volume) {
    // The volume values are already in billions, so we need to adjust our thresholds
    if (volume >= 1000) return `$${(volume / 1000).toFixed(2)} Trillion USD`;
    if (volume >= 1) return `$${volume.toFixed(2)} Billion USD`;
    if (volume >= 0.001) return `$${(volume * 1000).toFixed(2)} Million USD`;
    if (volume >= 0.000001) return `$${(volume * 1000000).toFixed(2)} Thousand USD`;
    return `$${formatPrice(volume)} USD`;
}

function updatePriceChangeBadge(change) {
    const changeBadge = document.getElementById('priceChangeBadge');
    const changeValue = changeBadge.querySelector('.change-value');
    const changeIcon = changeBadge.querySelector('.change-icon');

    changeValue.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

    if (change >= 0) {
        changeBadge.className = 'price-change positive';
        changeIcon.innerHTML = `<svg class="change-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="1em" height="1em">
            <path fill="currentColor" d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"/>
        </svg>`;
    } else {
        changeBadge.className = 'price-change negative';
        changeIcon.innerHTML = `<svg class="change-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="1em" height="1em">
            <path fill="currentColor" d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
        </svg>`;
    }
}

async function fetchHistoricalData(symbol, timeframe = '24h') {
    const chartCanvas = document.getElementById('priceChart');
    showChartLoading(chartCanvas);

    try {
        const response = await fetch(`${API_BASE_URL}/api/crypto/${symbol}/history`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        // Filter data based on the selected timeframe
        const currentTime = new Date();
        let cutoffTime;

        if (timeframe === '24h') {
            cutoffTime = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
        } else if (timeframe === '7d') {
            cutoffTime = new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeframe === '1m') {
            cutoffTime = new Date(currentTime.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const filteredTimestamps = [];
        const filteredPrices = [];

        // First pass: filter by timeframe
        for (let i = 0; i < data.timestamps.length; i++) {
            const timestamp = new Date(data.timestamps[i]);
            if (timestamp >= cutoffTime && timestamp <= currentTime) {
                filteredTimestamps.push(data.timestamps[i]);
                filteredPrices.push(data.prices[i]);
            }
        }

        // Second pass: ensure we don't have long periods with the same price
        // by adding intermediate points if needed
        const finalTimestamps = [];
        const finalPrices = [];

        if (filteredTimestamps.length > 0) {
            // Always include the first point
            finalTimestamps.push(filteredTimestamps[0]);
            finalPrices.push(filteredPrices[0]);

            // Process the rest of the points
            for (let i = 1; i < filteredTimestamps.length; i++) {
                const currentTime = new Date(filteredTimestamps[i]);
                const prevTime = new Date(finalTimestamps[finalTimestamps.length - 1]);
                const timeDiff = (currentTime - prevTime) / (1000 * 60); // Time difference in minutes

                // If more than 15 minutes have passed with the same price, add intermediate points
                if (timeDiff > 15 && filteredPrices[i] === finalPrices[finalPrices.length - 1]) {
                    // Add an intermediate point at 5 minutes after the previous point
                    const intermediateTime = new Date(prevTime.getTime() + 5 * 60 * 1000);
                    finalTimestamps.push(intermediateTime.toISOString().replace('T', ' ').substring(0, 19));
                    finalPrices.push(filteredPrices[i]);
                }

                // Always include the current point
                finalTimestamps.push(filteredTimestamps[i]);
                finalPrices.push(filteredPrices[i]);
            }
        }


        updatePriceChart({ timestamps: finalTimestamps, prices: finalPrices }, timeframe);
    } catch (error) {

        showChartError(chartCanvas, 'Failed to load historical data');
    }
}

function showChartLoading(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '16px "Space Grotesk", sans-serif';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
    ctx.textAlign = 'center';
    ctx.fillText('Loading chart data...', canvas.width/2, canvas.height/2);
}

function showChartError(canvas, message) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '16px "Space Grotesk", sans-serif';
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--danger-color');
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width/2, canvas.height/2);
}

function updatePriceChart(historyData, timeframe) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Use CSS variables for consistent theming
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim();
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();

    // Format dates based on timeframe
    const formattedDates = historyData.timestamps.map(timestamp => {
        const date = new Date(timestamp);

        switch(timeframe) {
            case '24h':
                return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            case '7d':
                return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
            case '1m':
                return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
            default:
                return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    });

    const chartData = {
        labels: formattedDates,
        datasets: [{
            label: 'Price (USD)',
            data: historyData.prices,
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color'),
            backgroundColor: 'rgba(67, 97, 238, 0.2)',
            borderWidth: 2,
            tension: 0.1,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: '#fff',
            pointBorderColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color'),
            pointBorderWidth: 2
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 100, // Add a small delay to prevent excessive redraws
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg'),
                titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color'),
                bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color'),
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: function(context) {
                        return `Price: $${context.parsed.y.toFixed(6)}`;
                    },
                    title: function(context) {
                        return new Date(historyData.timestamps[context[0].dataIndex]).toLocaleString();
                    }
                }
            },
            zoom: {
                zoom: {
                    wheel: {
                        enabled: true
                    },
                    pinch: {
                        enabled: true
                    },
                    mode: 'xy'
                },
                pan: {
                    enabled: true,
                    mode: 'xy'
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: gridColor,
                    drawBorder: false
                },
                ticks: {
                    color: textColor,
                    callback: function(value) {
                        return '$' + value.toLocaleString();
                    }
                }
            },
            x: {
                grid: {
                    color: gridColor,
                    drawBorder: false
                },
                ticks: {
                    color: textColor,
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 8
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    if (priceChart) {
        priceChart.data = chartData;
        priceChart.options = chartOptions;
        priceChart.update();
    } else {
        priceChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: chartOptions
        });
    }
}

/**
 * Setup chart resize observer to maintain consistent chart height
 *
 * This function creates a ResizeObserver that watches the chart container
 * and ensures the chart properly resizes when the container dimensions change.
 * This is important for responsive layouts and window resizing.
 */
function setupChartResizeObserver() {
    // Wait for the chart to be created
    setTimeout(() => {
        const chartCanvas = document.getElementById('priceChart');
        const chartContainer = document.querySelector('.chart-container');

        if (chartCanvas && chartContainer) {


            // Create a resize observer with debounce to prevent excessive updates
            let resizeTimeout;
            const resizeObserver = new ResizeObserver(() => {
                // Clear any existing timeout
                clearTimeout(resizeTimeout);

                // Set a new timeout to debounce the resize event
                resizeTimeout = setTimeout(() => {
                    // If the chart exists, update it with minimal animation
                    if (priceChart) {

                        priceChart.resize();
                        priceChart.update({
                            duration: 0,
                            easing: 'linear'
                        });
                    }
                }, 100); // 100ms debounce
            });

            // Start observing the chart container (not just the canvas)
            resizeObserver.observe(chartContainer);

            // Also observe window resize events
            window.addEventListener('resize', () => {
                if (priceChart) {
                    // Clear any existing timeout
                    clearTimeout(resizeTimeout);

                    // Set a new timeout to debounce the resize event
                    resizeTimeout = setTimeout(() => {

                        priceChart.resize();
                        priceChart.update({
                            duration: 0,
                            easing: 'linear'
                        });
                    }, 100); // 100ms debounce
                }
            });
        }
    }, 1000);
}

/**
 * Auto-refresh data every 5 minutes (300,000 milliseconds)
 *
 * This ensures that the cryptocurrency data displayed to the user
 * stays relatively fresh without requiring manual refreshes.
 * The interval is set to balance between data freshness and
 * avoiding excessive API calls.
 */
setInterval(fetchCryptoData, 300000);