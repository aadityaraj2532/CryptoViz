// Configuration
const API_BASE_URL = 'http://127.0.0.1:5000'
// Global variables
let sentimentGaugeChart;
let sentimentTrendChart;
let chartResizeObserver = null;
let selectedTimeRange = '24h';
let selectedCrypto = 'BTC'; // Default to Bitcoin instead of 'all'
let selectedSource = 'all';

// Initialize the page
function initPage() {

    // Initialize time range buttons
    initTimeRangeButtons();

    // Initialize crypto selector
    initCryptoSelector();

    // Initialize source filter buttons
    initSourceFilterButtons();

    // Load sentiment data
    loadSentimentData();

    // Update last updated timestamp
    updateLastUpdated();

    // Set up auto-refresh every 5 minutes
    setInterval(() => {
        loadSentimentData();
        updateLastUpdated();
    }, 5 * 60 * 1000);

    // Set up chart resize observer for stability
    setupChartResizeObserver();
}

// Initialize time range buttons
function initTimeRangeButtons() {
    const timeRangeButtons = document.querySelectorAll('.time-range-button');

    // Set default time range to 24h
    selectedTimeRange = '24h';

    // Make sure the 24h button is active by default
    timeRangeButtons.forEach(btn => {
        if (btn.getAttribute('data-range') === '24h') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    timeRangeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get the new time range
            const newTimeRange = button.getAttribute('data-range');

            // Only proceed if the time range actually changed
            if (newTimeRange !== selectedTimeRange) {

                // Remove active class from all buttons
                timeRangeButtons.forEach(btn => btn.classList.remove('active'));

                // Add active class to clicked button
                button.classList.add('active');

                // Update selected time range
                selectedTimeRange = newTimeRange;

                // If we have existing charts, destroy them
                if (sentimentGaugeChart) {

                    sentimentGaugeChart.destroy();
                    sentimentGaugeChart = null;
                }

                if (sentimentTrendChart) {

                    sentimentTrendChart.destroy();
                    sentimentTrendChart = null;
                }

                // Show loading spinners
                showLoading(document.querySelector('.sentiment-gauge-container'));
                showLoading(document.querySelector('.chart-container'));
                showLoading(document.getElementById('positiveTableBody'));
                showLoading(document.getElementById('negativeTableBody'));
                showLoading(document.getElementById('sentimentSources'));

                // Update the last updated text to show loading
                const lastUpdatedElement = document.getElementById('lastUpdated');
                if (lastUpdatedElement) {
                    lastUpdatedElement.textContent = 'Updating...';
                }

                // Reload data with new time range
                loadSentimentData();
            }
        });
    });
}

// Initialize crypto selector
function initCryptoSelector() {
    const cryptoSelector = document.getElementById('cryptoSelector');

    if (cryptoSelector) {
        // Set initial value
        selectedCrypto = cryptoSelector.value || 'BTC';

        // Set initial chart title
        const titleElement = document.getElementById('sentimentTrendTitle');
        if (titleElement) {
            titleElement.textContent = `Sentiment Trends (${selectedCrypto.toUpperCase()})`;
        }

        cryptoSelector.addEventListener('change', () => {
            // Get the new selected value
            const newValue = cryptoSelector.value;

            // Update selected crypto only if it changed
            if (newValue !== selectedCrypto) {

                selectedCrypto = newValue;

                // Update the chart title
                const titleElement = document.getElementById('sentimentTrendTitle');
                if (titleElement) {
                    titleElement.textContent = `Sentiment Trends (${selectedCrypto.toUpperCase()})`;
                }

                // Show loading spinner in chart container
                const chartContainer = document.querySelector('.chart-container');
                showLoading(chartContainer);

                // If we have an existing chart, destroy it
                if (sentimentTrendChart) {

                    sentimentTrendChart.destroy();
                    sentimentTrendChart = null;
                }

                // Reload data with new crypto selection
                loadSentimentData();
            }
        });
    } else {

    }
}

// Initialize source filter buttons
function initSourceFilterButtons() {
    const sourceButtons = document.querySelectorAll('.source-button');

    sourceButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            sourceButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Update selected source
            selectedSource = button.getAttribute('data-source');

            // Filter sentiment sources
            filterSentimentSources();
        });
    });
}

// Load sentiment data from API
function loadSentimentData() {

    // Ensure all required containers exist
    const containers = [
        { selector: '.sentiment-gauge-container', id: 'sentimentGauge-container' },
        { selector: '.chart-container', id: 'sentimentTrendChart-container' },
        { selector: '#positiveTableBody', id: 'positiveTableBody' },
        { selector: '#negativeTableBody', id: 'negativeTableBody' },
        { selector: '#sentimentSources', id: 'sentimentSources' }
    ];

    // Check each container
    let allContainersFound = true;
    containers.forEach(container => {
        const element = document.querySelector(container.selector);
        if (!element) {

            allContainersFound = false;
        } else {

        }
    });

    if (!allContainersFound) {

        setTimeout(loadSentimentData, 500);
        return;
    }

    // Show loading spinners
    showLoading(document.querySelector('.sentiment-gauge-container'));
    showLoading(document.querySelector('.chart-container'));
    showLoading(document.getElementById('positiveTableBody'));
    showLoading(document.getElementById('negativeTableBody'));
    showLoading(document.getElementById('sentimentSources'));

    // First, try to trigger an update if data is stale
    fetch(`${API_BASE_URL}/api/sentiment/update`)
        .then(response => response.json())
        .then(data => {

            if (data.status === 'success') {

            }
        })
        .catch(error => {

        });

    // Create promises for all API calls
    // Determine days parameter for overall sentiment based on selected time range
    const overallDays = selectedTimeRange === '24h' ? 1 : selectedTimeRange === '7d' ? 7 : 30;

    // Add days parameter to overall sentiment API call
    const overallPromise = fetch(`${API_BASE_URL}/api/sentiment/overall?days=${overallDays}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch overall sentiment data');
            }
            return response.json();
        });

    // Add days parameter to rankings API call
    const rankingsPromise = fetch(`${API_BASE_URL}/api/sentiment/rankings?days=${overallDays}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch sentiment rankings');
            }
            return response.json();
        });

    // Add days parameter to sources API call
    const sourcesPromise = fetch(`${API_BASE_URL}/api/sentiment/sources?days=${overallDays}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch sentiment sources');
            }
            return response.json();
        });

    // Determine days parameter based on selected time range
    const days = selectedTimeRange === '24h' ? 1 : selectedTimeRange === '7d' ? 7 : 30;

    // Build the URL for trends API
    let trendsUrl = `${API_BASE_URL}/api/sentiment/trends?days=${days}&symbol=${selectedCrypto}`;

    const trendsPromise = fetch(trendsUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch sentiment trends: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {

            // Process price data to ensure it's properly formatted
            if (data.price && Array.isArray(data.price)) {

                // Check if all prices are the same
                const allSamePrice = data.price.every((val, _, arr) => val === arr[0]);
                if (allSamePrice) {

                }

                // Convert any string prices to numbers
                data.price = data.price.map(price => {
                    if (typeof price === 'string') {
                        // Remove any currency symbols and commas
                        return parseFloat(price.replace(/[$,]/g, ''));
                    }
                    return typeof price === 'number' ? price : 0;
                });

                // Log a warning if all prices are the same, but don't modify the data
                if (allSamePrice && data.price[0] !== 0) {

                }
            } else {

                // Initialize empty price array if none exists
                if (!data.price) {
                    data.price = [];
                }
            }

            return data;
        });

    // Wait for all promises to resolve
    Promise.all([overallPromise, rankingsPromise, sourcesPromise, trendsPromise])
        .then(([overallData, rankingsData, sourcesData, trendsData]) => {
            // Check if we have valid data
            if (!overallData || !rankingsData || !sourcesData) {
                throw new Error('Incomplete data received from API');
            }

            // Check if we have valid trend data
            if (!trendsData || !trendsData.dates || !trendsData.sentiment || !trendsData.price ||
                trendsData.dates.length === 0 || trendsData.sentiment.length === 0 || trendsData.price.length === 0) {

                // Create empty trend data structure if not available
                trendsData = {
                    dates: [],
                    sentiment: [],
                    price: []
                };

                // Show a message in the chart container
                showMessage(document.querySelector('.chart-container'),
                    `No sentiment trend data available for ${selectedCrypto.toUpperCase()}.`);
            }

            // Update UI with real data
            updateSentimentGauge(overallData.sentiment || 50);

            updateSentimentStats({
                socialSentiment: overallData.social_sentiment || 50,
                newsSentiment: overallData.news_sentiment || 50,
                fearGreedIndex: overallData.fear_greed_index || 50
            });

            updateSentimentTrendChart(trendsData);
            updateSentimentRankings(rankingsData);
            updateSentimentSources(sourcesData.sources || []);

            // Hide loading spinners
            hideLoading(document.querySelector('.sentiment-gauge-container'));
            hideLoading(document.querySelector('.chart-container'));
            hideLoading(document.getElementById('positiveTableBody'));
            hideLoading(document.getElementById('negativeTableBody'));
            hideLoading(document.getElementById('sentimentSources'));

            // Update the last updated timestamp
            updateLastUpdated();

            // Check if we have empty data
            if ((!sourcesData.sources || sourcesData.sources.length === 0) &&
                (!rankingsData.positive || rankingsData.positive.length === 0) &&
                (!rankingsData.negative || rankingsData.negative.length === 0)) {

                // Show a message to the user
                const message = 'No sentiment data available at the moment. The system is collecting data from various sources. Please check back later.';
                showMessage(document.getElementById('sentimentSources'), message);
                showMessage(document.getElementById('positiveTableBody'), 'No positive sentiment data available');
                showMessage(document.getElementById('negativeTableBody'), 'No negative sentiment data available');
            }
        })
        .catch(error => {

            // Hide loading spinners first
            hideLoading(document.querySelector('.sentiment-gauge-container'));
            hideLoading(document.querySelector('.chart-container'));
            hideLoading(document.getElementById('positiveTableBody'));
            hideLoading(document.getElementById('negativeTableBody'));
            hideLoading(document.getElementById('sentimentSources'));

            // Show error messages
            showError(document.querySelector('.sentiment-gauge-container'), 'Failed to load sentiment data');
            showError(document.querySelector('.chart-container'), 'Failed to load sentiment trends');
            showError(document.getElementById('positiveTableBody'), 'Failed to load rankings');
            showError(document.getElementById('negativeTableBody'), 'Failed to load rankings');
            showError(document.getElementById('sentimentSources'), 'Failed to load sentiment sources. The system is collecting data from various sources. Please check back later.');
        });
}

// Update sentiment gauge
function updateSentimentGauge(sentimentValue) {
    const gaugeElement = document.getElementById('sentimentGauge');
    const valueElement = document.getElementById('sentimentValue');
    const descriptionElement = document.getElementById('sentimentDescription');

    if (!gaugeElement) {

        // Try to find the container and create the canvas if it doesn't exist
        const container = document.querySelector('.sentiment-gauge-container');
        if (container) {

            const canvas = document.createElement('canvas');
            canvas.id = 'sentimentGauge';
            canvas.width = 200;
            canvas.height = 200;

            // Insert the canvas before the value element if it exists
            if (valueElement) {
                container.insertBefore(canvas, valueElement);
            } else {
                container.appendChild(canvas);
            }
            // Try again with the new canvas
            return updateSentimentGauge(sentimentValue);
        }
        return;
    }

    // Format sentiment value
    const formattedValue = sentimentValue.toFixed(1);

    // Update value display
    if (valueElement) {
        valueElement.textContent = formattedValue;

        // Set color based on sentiment
        if (sentimentValue >= 70) {
            valueElement.style.color = 'var(--positive-color)';
        } else if (sentimentValue <= 30) {
            valueElement.style.color = 'var(--negative-color)';
        } else {
            valueElement.style.color = 'var(--neutral-color)';
        }
    }

    // Update description
    if (descriptionElement) {
        if (sentimentValue >= 70) {
            descriptionElement.textContent = 'The market is currently very bullish. High positive sentiment indicates strong investor confidence.';
        } else if (sentimentValue >= 55) {
            descriptionElement.textContent = 'The market is showing moderately positive sentiment. Investors are generally optimistic.';
        } else if (sentimentValue >= 45) {
            descriptionElement.textContent = 'The market sentiment is neutral. Investors are showing balanced opinions.';
        } else if (sentimentValue >= 30) {
            descriptionElement.textContent = 'The market is showing moderately negative sentiment. Investors are cautious.';
        } else {
            descriptionElement.textContent = 'The market is currently very bearish. High negative sentiment indicates low investor confidence.';
        }
    }

    // Create or update gauge chart
    try {
        if (sentimentGaugeChart) {
            sentimentGaugeChart.data.datasets[0].data = [sentimentValue, 100 - sentimentValue];
            sentimentGaugeChart.update();
        } else {
            const ctx = gaugeElement.getContext('2d');
            if (!ctx) {

                return;
            }

            // Create a custom semi-circle gauge using a doughnut chart
            sentimentGaugeChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Sentiment', 'Remaining'],
                    datasets: [{
                        data: [sentimentValue, 100 - sentimentValue],
                        backgroundColor: [
                            getGradientColor(sentimentValue),
                            'rgba(200, 200, 200, 0.1)'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    circumference: 180,
                    rotation: 270,
                    layout: {
                        padding: {
                            top: 20,
                            bottom: 20
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: false
                        }
                    },
                    animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 1000,
                        easing: 'easeOutQuart'
                    }
                }
            });
        }
    } catch (error) {

    }
}

// Get gradient color based on sentiment value
function getGradientColor(value) {
    if (value >= 70) {
        return 'var(--positive-color)';
    } else if (value >= 55) {
        return 'var(--success-color)';
    } else if (value >= 45) {
        return 'var(--neutral-color)';
    } else if (value >= 30) {
        return 'var(--warning-color)';
    } else {
        return 'var(--negative-color)';
    }
}

// Update sentiment stats
function updateSentimentStats(stats) {
    const socialElement = document.getElementById('socialSentiment');
    const newsElement = document.getElementById('newsSentiment');
    const fearGreedElement = document.getElementById('fearGreedIndex');

    if (socialElement) {
        socialElement.textContent = `${stats.socialSentiment.toFixed(1)}%`;
        socialElement.className = 'stat-value';
        if (stats.socialSentiment >= 60) {
            socialElement.classList.add('positive');
        } else if (stats.socialSentiment <= 40) {
            socialElement.classList.add('negative');
        } else {
            socialElement.classList.add('neutral');
        }
    }

    if (newsElement) {
        newsElement.textContent = `${stats.newsSentiment.toFixed(1)}%`;
        newsElement.className = 'stat-value';
        if (stats.newsSentiment >= 60) {
            newsElement.classList.add('positive');
        } else if (stats.newsSentiment <= 40) {
            newsElement.classList.add('negative');
        } else {
            newsElement.classList.add('neutral');
        }
    }

    if (fearGreedElement) {
        fearGreedElement.textContent = `${stats.fearGreedIndex} (${getFearGreedLabel(stats.fearGreedIndex)})`;
        fearGreedElement.className = 'stat-value';
        if (stats.fearGreedIndex >= 60) {
            fearGreedElement.classList.add('positive');
        } else if (stats.fearGreedIndex <= 40) {
            fearGreedElement.classList.add('negative');
        } else {
            fearGreedElement.classList.add('neutral');
        }
    }
}

// Get Fear & Greed label
function getFearGreedLabel(value) {
    if (value >= 80) {
        return 'Extreme Greed';
    } else if (value >= 60) {
        return 'Greed';
    } else if (value >= 40) {
        return 'Neutral';
    } else if (value >= 20) {
        return 'Fear';
    } else {
        return 'Extreme Fear';
    }
}

// Calculate appropriate min/max for price axis based on the data and selected crypto
function calculatePriceAxisSettings(priceData, cryptoSymbol) {
    // Default settings
    const settings = {
        beginAtZero: false,
        min: undefined,
        max: undefined,
        grace: '5%'
    };

    // If no data or empty array, return default settings
    if (!priceData || !Array.isArray(priceData) || priceData.length === 0) {
        return settings;
    }

    // Filter out any invalid values
    const validPrices = priceData.filter(price => typeof price === 'number' && !isNaN(price));

    // If no valid prices, return default settings
    if (validPrices.length === 0) {
        return settings;
    }

    // Find min and max prices
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);

    // Calculate price range
    const priceRange = maxPrice - minPrice;

    // Special case for "all" cryptocurrencies view
    if (cryptoSymbol === 'all') {
        // For "all" selection, use auto-scaling based on the actual price data
        if (validPrices.length > 0) {
            // Add some padding to the min/max
            settings.min = Math.max(0, minPrice - (priceRange * 0.05));
            settings.max = maxPrice + (priceRange * 0.05);
            settings.beginAtZero = minPrice < (maxPrice * 0.1); // Begin at zero if min is less than 10% of max
            settings.grace = '5%';
        }
        return settings;
    }

    // Adjust settings based on cryptocurrency
    switch (cryptoSymbol.toUpperCase()) {
        case 'BTC':
            // Bitcoin has high prices, use a narrower range
            settings.min = Math.max(0, minPrice - (priceRange * 0.05));
            settings.max = maxPrice + (priceRange * 0.05);
            settings.grace = '2%';
            break;

        case 'ETH':
            // Ethereum also has relatively high prices
            settings.min = Math.max(0, minPrice - (priceRange * 0.05));
            settings.max = maxPrice + (priceRange * 0.05);
            settings.grace = '3%';
            break;

        case 'XRP':
        case 'ADA':
        case 'DOGE':
            // Cryptocurrencies with lower prices
            settings.beginAtZero = minPrice < 1;
            settings.min = settings.beginAtZero ? 0 : Math.max(0, minPrice - (priceRange * 0.1));
            settings.max = maxPrice + (priceRange * 0.1);
            settings.grace = '5%';
            break;

        default:
            // For all other cryptocurrencies
            if (maxPrice > 1000) {
                // High-priced cryptos
                settings.min = Math.max(0, minPrice - (priceRange * 0.05));
                settings.max = maxPrice + (priceRange * 0.05);
                settings.grace = '3%';
            } else if (maxPrice > 100) {
                // Medium-priced cryptos
                settings.min = Math.max(0, minPrice - (priceRange * 0.08));
                settings.max = maxPrice + (priceRange * 0.08);
                settings.grace = '4%';
            } else if (maxPrice > 1) {
                // Lower-priced cryptos
                settings.min = Math.max(0, minPrice - (priceRange * 0.1));
                settings.max = maxPrice + (priceRange * 0.1);
                settings.grace = '5%';
            } else {
                // Very low-priced cryptos
                settings.beginAtZero = minPrice < 0.1;
                settings.min = settings.beginAtZero ? 0 : Math.max(0, minPrice - (priceRange * 0.15));
                settings.max = maxPrice + (priceRange * 0.15);
                settings.grace = '8%';
            }
    }

    return settings;
}

// Update sentiment trend chart
function updateSentimentTrendChart(trends) {

    // Get the chart container
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) {

        return;
    }

    // If we're changing cryptocurrencies, destroy the existing chart
    if (sentimentTrendChart) {

        sentimentTrendChart.destroy();
        sentimentTrendChart = null;
    }

    // Remove any existing canvas and create a new one
    let chartElement = document.getElementById('sentimentTrendChart');
    if (chartElement) {

        chartElement.remove();
    }

    // Create a new canvas element

    const canvas = document.createElement('canvas');
    canvas.id = 'sentimentTrendChart';
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.width = '100%';
    canvas.style.height = '600px';
    canvas.style.maxHeight = '600px';
    chartContainer.appendChild(canvas);

    // Get the new chart element
    chartElement = document.getElementById('sentimentTrendChart');

    // Get theme colors
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e9ecef' : '#212529';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    // Create trend chart
    try {
        // Validate data before creating chart
        if (!trends || !trends.dates || !trends.sentiment || !trends.price) {

            showMessage(chartContainer, 'No trend data available for the selected cryptocurrency.');
            return;
        }

        if (trends.dates.length === 0 || trends.sentiment.length === 0 || trends.price.length === 0) {

            showMessage(chartContainer, `No sentiment trend data available for ${selectedCrypto === 'all' ? 'all cryptocurrencies' : selectedCrypto.toUpperCase()}.`);
            return;
        }

        // Log detailed information about the trend data

        // Log the actual price data for debugging

        // Log information about price data validity without modifying it
        const validPrices = trends.price.filter(price => typeof price === 'number' && !isNaN(price) && price > 0);
        if (validPrices.length !== trends.price.length) {

            // If we have no valid price data, log a warning
            if (validPrices.length === 0) {

            }
        }

        const ctx = chartElement.getContext('2d');
        if (!ctx) {

            return;
        }

        // Calculate appropriate min/max for price axis based on the data
        const priceAxisSettings = calculatePriceAxisSettings(trends.price, selectedCrypto);

        // Prepare datasets
        const datasets = [
            {
                label: 'Sentiment Score',
                data: trends.sentiment,
                borderColor: isDark ? 'rgba(52, 211, 153, 1)' : 'rgba(16, 185, 129, 1)',
                backgroundColor: isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                yAxisID: 'y',
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ];

        // Only add price dataset if we have valid price data
        if (trends.price && trends.price.length > 0) {
            datasets.push({
                label: 'Price (USD)',
                data: trends.price,
                borderColor: 'rgb(255, 0, 0)', // Bright red for maximum visibility
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                borderWidth: 4, // Thicker line for better visibility
                borderDash: [],
                tension: 0.2,
                yAxisID: 'y1',
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: 'rgb(255, 0, 0)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                fill: false
            });
        } else {

        }

        // Create the chart
        sentimentTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trends.dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                responsiveAnimationDuration: 0, // Disable animation on resize
                animation: {
                    duration: 1000 // Consistent animation duration
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                layout: {
                    padding: {
                        top: 10,
                        right: 20,
                        bottom: 10,
                        left: 20
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                size: 12
                            },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 100,
                        beginAtZero: true,
                        suggestedMax: 100,
                        title: {
                            display: true,
                            text: 'Sentiment Score',
                            color: textColor,
                            font: {
                                size: 12,
                                weight: 'bold'
                            },
                            padding: {
                                bottom: 10
                            }
                        },
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                size: 12
                            },
                            padding: 8,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: trends.price && trends.price.length > 0, // Only show if we have price data
                        position: 'right',
                        beginAtZero: false, // Don't force zero for price axis
                        // Check if all prices are the same
                        suggestedMin: (() => {
                            // If all prices are the same, create a range around the price
                            const allSamePrice = trends.price.every((val, _, arr) => val === arr[0]);
                            if (allSamePrice && trends.price.length > 0) {
                                const price = trends.price[0];
                                // Create a range of ±5% around the price
                                return price * 0.95;
                            }
                            return undefined;
                        })(),
                        suggestedMax: (() => {
                            // If all prices are the same, create a range around the price
                            const allSamePrice = trends.price.every((val, _, arr) => val === arr[0]);
                            if (allSamePrice && trends.price.length > 0) {
                                const price = trends.price[0];
                                // Create a range of ±5% around the price
                                return price * 1.05;
                            }
                            return undefined;
                        })(),
                        title: {
                            display: true,
                            text: 'Price (USD)',
                            color: 'rgb(255, 0, 0)', // Bright red for maximum visibility
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            padding: {
                                bottom: 10
                            }
                        },
                        grid: {
                            drawOnChartArea: trends.price && trends.price.length > 0, // Only draw grid if we have price data
                            color: 'rgba(255, 0, 0, 0.1)'
                        },
                        border: {
                            color: 'rgb(255, 0, 0)'
                        },
                        ticks: {
                            color: 'rgb(255, 0, 0)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            padding: 8,
                            // Format price values with dollar sign
                            callback: function(value) {
                                return '$' + formatPrice(value);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor,
                            font: {
                                size: 12
                            },
                            padding: 10,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        padding: 10,
                        displayColors: true,
                        boxWidth: 12,
                        boxHeight: 12,
                        callbacks: {
                            title: function(tooltipItems) {
                                // Format the date for better readability
                                const date = new Date(tooltipItems[0].label);
                                return date.toLocaleString();
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.datasetIndex === 0) {
                                    // Sentiment score
                                    label += context.parsed.y.toFixed(1) + '%';
                                } else {
                                    // Price value
                                    const price = context.parsed.y;
                                    label += '$' + formatPrice(price);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        // Force the chart to resize after a short delay
        setTimeout(() => {
            if (sentimentTrendChart) {
                sentimentTrendChart.resize();
            }
        }, 50);

    } catch (error) {

        showMessage(chartContainer, 'Error creating chart. Please try again later.');
    }
}

// Update sentiment rankings
function updateSentimentRankings(rankings) {
    const positiveTableBody = document.getElementById('positiveTableBody');
    const negativeTableBody = document.getElementById('negativeTableBody');

    if (positiveTableBody) {
        positiveTableBody.innerHTML = '';

        rankings.positive.forEach((crypto, index) => {
            const row = document.createElement('tr');

            // Calculate sentiment bar width
            const barWidth = crypto.score;

            // Format change value
            const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
            const changeIcon = crypto.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            const changeValue = Math.abs(crypto.change).toFixed(1) + '%';

            row.innerHTML = `
                <td>${index + 1}</td>
                <td class="crypto-name">
                    <span>${crypto.name}</span>
                    <small>${crypto.symbol.toUpperCase()}</small>
                </td>
                <td>
                    <div class="sentiment-score">
                        <span>${crypto.score.toFixed(1)}%</span>
                        <div class="sentiment-indicator">
                            <div class="sentiment-bar sentiment-positive" style="width: ${barWidth}%"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="sentiment-change ${changeClass}">
                        <i class="fas ${changeIcon}"></i>
                        <span>${changeValue}</span>
                    </div>
                </td>
            `;

            positiveTableBody.appendChild(row);
        });
    }

    if (negativeTableBody) {
        negativeTableBody.innerHTML = '';

        rankings.negative.forEach((crypto, index) => {
            const row = document.createElement('tr');

            // Calculate sentiment bar width
            const barWidth = 100 - crypto.score;

            // Format change value
            const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
            const changeIcon = crypto.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            const changeValue = Math.abs(crypto.change).toFixed(1) + '%';

            row.innerHTML = `
                <td>${index + 1}</td>
                <td class="crypto-name">
                    <span>${crypto.name}</span>
                    <small>${crypto.symbol.toUpperCase()}</small>
                </td>
                <td>
                    <div class="sentiment-score">
                        <span>${crypto.score.toFixed(1)}%</span>
                        <div class="sentiment-indicator">
                            <div class="sentiment-bar sentiment-negative" style="width: ${barWidth}%"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="sentiment-change ${changeClass}">
                        <i class="fas ${changeIcon}"></i>
                        <span>${changeValue}</span>
                    </div>
                </td>
            `;

            negativeTableBody.appendChild(row);
        });
    }
}

// Update sentiment sources
function updateSentimentSources(sources) {
    const sourcesContainer = document.getElementById('sentimentSources');

    if (sourcesContainer) {
        sourcesContainer.innerHTML = '';

        // Add a counter for displayed sources
        let displayedCount = 0;

        // Add a header with source count
        const headerDiv = document.createElement('div');
        headerDiv.className = 'sources-header';
        headerDiv.innerHTML = `
            <h3>Sentiment Sources (${sources.length} total)</h3>
        `;
        sourcesContainer.appendChild(headerDiv);

        // Create a container for the source items
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'sentiment-sources-items';
        sourcesContainer.appendChild(itemsContainer);

        sources.forEach(source => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'sentiment-source-item';
            sourceItem.setAttribute('data-source-type', source.type);

            // Determine sentiment class
            let sentimentClass = 'neutral';
            if (source.sentiment >= 60) {
                sentimentClass = 'positive';
            } else if (source.sentiment <= 40) {
                sentimentClass = 'negative';
            }

            // Format the timestamp
            let formattedTimestamp = source.timestamp;
            try {
                const date = new Date(source.timestamp);
                if (!isNaN(date.getTime())) {
                    formattedTimestamp = date.toLocaleString();
                }
            } catch (e) {

            }

            // Prepare the source link
            let sourceLink = source.url || '#';
            let sourceLinkText = 'Read more';

            // Customize link text based on source type
            if (source.type === 'x') {
                sourceLinkText = 'View on X.com';
            } else if (source.type === 'reddit') {
                sourceLinkText = 'View on Reddit';
            } else if (source.type === 'news') {
                sourceLinkText = 'Read full article';
            }

            sourceItem.innerHTML = `
                <div class="source-header">
                    <span class="source-type ${source.type}">${source.type === 'x' ? 'X' : source.type.charAt(0).toUpperCase() + source.type.slice(1)}</span>
                    <span class="source-timestamp">${formattedTimestamp}</span>
                </div>
                <div class="source-content">
                    <div class="source-title">${source.title}</div>
                    <p class="source-text">${source.text}</p>
                    <a href="${sourceLink}" class="source-link" target="_blank" rel="noopener noreferrer">
                        ${sourceLinkText} <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
                <div class="source-sentiment ${sentimentClass}">
                    <i class="fas ${sentimentClass === 'positive' ? 'fa-thumbs-up' : sentimentClass === 'negative' ? 'fa-thumbs-down' : 'fa-minus'}"></i>
                    <span>Sentiment: ${source.sentiment.toFixed(1)}%</span>
                </div>
            `;

            itemsContainer.appendChild(sourceItem);
            displayedCount++;
        });

        // Add a message if no sources are available
        if (displayedCount === 0) {
            const noSourcesMsg = document.createElement('div');
            noSourcesMsg.className = 'no-sources-message';
            noSourcesMsg.innerHTML = '<p>No sentiment sources available. The system is collecting data from various sources. Please check back later.</p>';
            itemsContainer.appendChild(noSourcesMsg);
        }

        // Apply initial filtering
        filterSentimentSources();
    }
}

// Filter sentiment sources based on selected source type
function filterSentimentSources() {
    const sourceItems = document.querySelectorAll('.sentiment-source-item');
    let visibleCount = 0;

    sourceItems.forEach(item => {
        const sourceType = item.getAttribute('data-source-type');

        if (selectedSource === 'all' || sourceType === selectedSource) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    // Update the header to show how many sources are visible
    const headerElement = document.querySelector('.sources-header h3');
    if (headerElement) {
        const totalCount = sourceItems.length;
        if (selectedSource === 'all') {
            headerElement.textContent = `Sentiment Sources (${totalCount} total)`;
        } else {
            headerElement.textContent = `${selectedSource.charAt(0).toUpperCase() + selectedSource.slice(1)} Sources (${visibleCount} of ${totalCount})`;
        }
    }

    // Show a message if no sources are visible for the selected filter
    const itemsContainer = document.querySelector('.sentiment-sources-items');
    if (itemsContainer && visibleCount === 0) {
        // Check if we already have a no-sources message
        if (!itemsContainer.querySelector('.no-sources-message')) {
            const noSourcesMsg = document.createElement('div');
            noSourcesMsg.className = 'no-sources-message';
            noSourcesMsg.innerHTML = `<p>No ${selectedSource === 'all' ? 'sentiment' : selectedSource} sources available. The system is collecting data from various sources. Please check back later.</p>`;
            itemsContainer.appendChild(noSourcesMsg);
        }
    } else {
        // Remove any existing no-sources message
        const noSourcesMsg = itemsContainer.querySelector('.no-sources-message');
        if (noSourcesMsg) {
            noSourcesMsg.remove();
        }
    }
}

// Update last updated timestamp
function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('lastUpdated');

    if (lastUpdatedElement) {
        const now = new Date();
        lastUpdatedElement.textContent = now.toLocaleString();
    }
}

// Show loading spinner
function showLoading(element) {
    if (!element) return;

    // Save original content
    element.setAttribute('data-original-content', element.innerHTML);

    // Show loading spinner
    element.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
}

// Hide loading spinner
function hideLoading(element) {
    if (!element) return;

    // Remove loading spinner if it exists
    const spinner = element.querySelector('.loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// Show error message
function showError(element, message) {
    if (!element) return;

    element.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Show information message
function showMessage(element, message) {
    if (!element) return;

    // Clear any existing content
    element.innerHTML = '';

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = 'info-message';
    messageDiv.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <p>${message}</p>
    `;

    // Special handling for chart container
    if (element.classList.contains('chart-container')) {
        // Make sure the message is centered in the container
        messageDiv.style.position = 'absolute';
        messageDiv.style.top = '50%';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translate(-50%, -50%)';
        messageDiv.style.width = '80%';
        messageDiv.style.maxWidth = '500px';

        // Make sure the container has position relative
        element.style.position = 'relative';
    }

    // Add the message to the element
    element.appendChild(messageDiv);
}

// Add CSS for info messages
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .info-message {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background-color: rgba(0, 123, 255, 0.1);
            border-radius: 8px;
            margin: 10px 0;
            text-align: center;
        }

        .info-message i {
            font-size: 24px;
            color: #0d6efd;
            margin-right: 10px;
        }

        .info-message p {
            margin: 0;
            color: #0d6efd;
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);
});

// Update chart theme based on current theme
function updateSentimentChartTheme(theme) {
    if (sentimentTrendChart) {
        const isDark = theme === 'dark';
        const textColor = isDark ? '#e9ecef' : '#212529';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        // Update colors for datasets
        sentimentTrendChart.data.datasets[0].borderColor = isDark ? 'rgba(52, 211, 153, 1)' : 'rgba(16, 185, 129, 1)';
        sentimentTrendChart.data.datasets[0].backgroundColor = isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(16, 185, 129, 0.1)';

        // Update price dataset if it exists
        if (sentimentTrendChart.data.datasets.length > 1) {
            // Keep price line always red for maximum visibility
            sentimentTrendChart.data.datasets[1].borderColor = 'rgb(255, 0, 0)';
            sentimentTrendChart.data.datasets[1].backgroundColor = 'rgba(255, 0, 0, 0.1)';
            sentimentTrendChart.data.datasets[1].pointBackgroundColor = 'rgb(255, 0, 0)';
        }

        // Update scales
        sentimentTrendChart.options.scales.x.grid.color = gridColor;
        sentimentTrendChart.options.scales.x.ticks.color = textColor;
        sentimentTrendChart.options.scales.y.grid.color = gridColor;
        sentimentTrendChart.options.scales.y.ticks.color = textColor;
        sentimentTrendChart.options.scales.y.title.color = textColor;

        // Update price axis if it's displayed
        if (sentimentTrendChart.options.scales.y1.display) {
            // Keep price axis always red for maximum visibility
            sentimentTrendChart.options.scales.y1.grid.color = 'rgba(255, 0, 0, 0.1)';
            sentimentTrendChart.options.scales.y1.ticks.color = 'rgb(255, 0, 0)';
            sentimentTrendChart.options.scales.y1.title.color = 'rgb(255, 0, 0)';
            if (sentimentTrendChart.options.scales.y1.border) {
                sentimentTrendChart.options.scales.y1.border.color = 'rgb(255, 0, 0)';
            }

            // Check if all prices are the same and update the axis range
            const priceData = sentimentTrendChart.data.datasets.find(ds => ds.yAxisID === 'y1')?.data;
            if (priceData && priceData.length > 0) {
                const allSamePrice = priceData.every((val, _, arr) => val === arr[0]);
                if (allSamePrice) {
                    const price = priceData[0];
                    // Create a range of ±5% around the price
                    sentimentTrendChart.options.scales.y1.suggestedMin = price * 0.95;
                    sentimentTrendChart.options.scales.y1.suggestedMax = price * 1.05;
                }
            }
        }

        // Update legend
        sentimentTrendChart.options.plugins.legend.labels.color = textColor;

        // Apply changes
        sentimentTrendChart.update();
    }

    // Also update the gauge chart if it exists
    if (sentimentGaugeChart) {
        // Just redraw the chart - the colors are determined by the sentiment value
        sentimentGaugeChart.update();
    }
}

// Make sure the DOM is fully loaded before initializing
let retryCount = 0;
const MAX_RETRIES = 50; // Maximum number of retries (5 seconds total with 100ms intervals)

function ensureDOMLoaded() {
    // Check if the required elements exist
    const gaugeElement = document.getElementById('sentimentGauge');
    const trendChartElement = document.getElementById('sentimentTrendChart');

    if (!gaugeElement || !trendChartElement) {
        retryCount++;
        if (retryCount <= MAX_RETRIES) {

            // Try again after a short delay
            setTimeout(ensureDOMLoaded, 100);
            return;
        } else {

            // Initialize anyway, but the charts won't work
            initPage();
            return;
        }
    }

    initPage();
}

// Start the initialization process

if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', function() {

        setTimeout(ensureDOMLoaded, 500); // Add a small delay after DOM is loaded
    });
} else {

    setTimeout(ensureDOMLoaded, 500); // Add a small delay
}

// Listen for theme changes
document.addEventListener('themeChanged', (e) => {
    updateSentimentChartTheme(e.detail.theme);
});

// Format price based on value
function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) {
        return '0.00';
    }

    if (price >= 1000) {
        // For larger prices (BTC, ETH), show with 2 decimal places
        return price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    } else if (price >= 1) {
        // For medium prices, show with 4 decimal places
        return price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        });
    } else if (price >= 0.01) {
        // For small prices, show with 6 decimal places
        return price.toLocaleString(undefined, {
            minimumFractionDigits: 4,
            maximumFractionDigits: 6
        });
    } else {
        // For very small prices, show with 8 decimal places
        return price.toLocaleString(undefined, {
            minimumFractionDigits: 6,
            maximumFractionDigits: 8
        });
    }
}

// Format market cap value
function formatMarketCap(marketCap) {
    if (typeof marketCap !== 'number' || isNaN(marketCap)) {
        return '$0 USD';
    }

    // The market cap values are already in billions, so we need to adjust our thresholds
    if (marketCap >= 1000) {
        return `$${(marketCap / 1000).toFixed(2)} Trillion USD`;
    } else if (marketCap >= 1) {
        return `$${marketCap.toFixed(2)} Billion USD`;
    } else if (marketCap >= 0.001) {
        return `$${(marketCap * 1000).toFixed(2)} Million USD`;
    } else if (marketCap >= 0.000001) {
        return `$${(marketCap * 1000000).toFixed(2)} Thousand USD`;
    } else {
        return `$${marketCap.toFixed(2)} USD`;
    }
}

// Format volume value
function formatVolume(volume) {
    if (typeof volume !== 'number' || isNaN(volume)) {
        return '$0 USD';
    }

    // The volume values are already in billions, so we need to adjust our thresholds
    if (volume >= 1000) {
        return `$${(volume / 1000).toFixed(2)} Trillion USD`;
    } else if (volume >= 1) {
        return `$${volume.toFixed(2)} Billion USD`;
    } else if (volume >= 0.001) {
        return `$${(volume * 1000).toFixed(2)} Million USD`;
    } else if (volume >= 0.000001) {
        return `$${(volume * 1000000).toFixed(2)} Thousand USD`;
    } else {
        return `$${volume.toFixed(2)} USD`;
    }
}

// Setup chart resize observer to maintain consistent chart height
function setupChartResizeObserver() {
    // Wait for the chart to be created
    setTimeout(() => {
        const chartCanvas = document.getElementById('sentimentTrendChart');
        if (chartCanvas) {

            // Create a resize observer
            const resizeObserver = new ResizeObserver(() => {
                // If the chart exists, update it with minimal animation
                if (sentimentTrendChart) {
                    sentimentTrendChart.resize();
                    sentimentTrendChart.update({
                        duration: 0,
                        easing: 'linear'
                    });
                }
            });

            // Start observing the chart container
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                resizeObserver.observe(chartContainer);

            }
        }
    }, 1000); // Wait for 1 second to ensure the chart is created
}
