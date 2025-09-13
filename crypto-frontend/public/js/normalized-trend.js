// API_BASE_URL is imported from config.js
const apiUrl = API_BASE_URL + "/api/crypto";

// Add global variables
let selectedTimeRange = '24h'; // Default to 24 hours
let zeroBasedChart = null; // Chart with zero-based normalization
let minMaxChart = null; // Chart with min-max normalization

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize time range buttons
    setupTimeRangeButtons();

    // Set initial last updated text
    updateLastUpdatedText();

    // Fetch data and render charts
    fetchAllCryptosData();

    // Listen for theme changes
    document.addEventListener('themeChanged', function(e) {
        const theme = e.detail.theme;

        // Update zero-based chart theme
        if (zeroBasedChart) {
            updateChartTheme(zeroBasedChart, theme);
        }

        // Update min-max chart theme
        if (minMaxChart) {
            updateChartTheme(minMaxChart, theme);
        }

        // Update other elements on the page
        updatePageElements();
    });

    // Setup chart resize observers
    // Wait for the charts to be created
    setTimeout(() => {
        // Setup observer for zero-based chart
        const zeroBasedCanvas = document.getElementById('zeroBasedChart');
        if (zeroBasedCanvas) {
            const zeroBasedObserver = new ResizeObserver(() => {
                if (zeroBasedChart) {
                    zeroBasedChart.resize();
                    zeroBasedChart.update({
                        duration: 0,
                        easing: 'linear'
                    });
                }
            });
            zeroBasedObserver.observe(zeroBasedCanvas);
        }

        // Setup observer for min-max chart
        const minMaxCanvas = document.getElementById('minMaxChart');
        if (minMaxCanvas) {
            const minMaxObserver = new ResizeObserver(() => {
                if (minMaxChart) {
                    minMaxChart.resize();
                    minMaxChart.update({
                        duration: 0,
                        easing: 'linear'
                    });
                }
            });
            minMaxObserver.observe(minMaxCanvas);
        }
    }, 1000);
});

// Update fetchHistoricalData to accept a time range
async function fetchHistoricalData(symbol, timeRange) {
    const response = await fetch(`${apiUrl}/${symbol}/history`);
    const data = await response.json();

    // Filter data based on the selected time range
    const currentTime = new Date();
    let cutoffTime;

    if (timeRange === '24h') {
        cutoffTime = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
    } else if (timeRange === '7d') {
        cutoffTime = new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '1m') {
        cutoffTime = new Date(currentTime.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredTimestamps = [];
    const filteredPrices = [];

    for (let i = 0; i < data.timestamps.length; i++) {
        const timestamp = new Date(data.timestamps[i]);
        if (timestamp >= cutoffTime && timestamp <= currentTime) { // Ensure timestamps are within the range
            filteredTimestamps.push(data.timestamps[i]);
            filteredPrices.push(data.prices[i]);
        }
    }

    return { symbol, timestamps: filteredTimestamps, prices: filteredPrices };
}

// Add event listeners for time range selection
function setupTimeRangeButtons() {
    const timeRangeButtons = document.querySelectorAll('.time-range-button');
    timeRangeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const timeRange = this.getAttribute('data-range');
            if (timeRange !== selectedTimeRange) {
                selectedTimeRange = timeRange;

                // Update active button
                timeRangeButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                // Fetch data and update charts
                fetchAllCryptosData();

                // Update last updated text
                updateLastUpdatedText();
            }
        });
    });
}

// Update the last updated text
function updateLastUpdatedText() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        const now = new Date();
        lastUpdatedElement.textContent = now.toLocaleString();
    }
}

// Update fetchAllCryptosData to pass the selected time range
async function fetchAllCryptosData() {
    // Exclude USDT and USDC from the normalized chart
    const cryptos = ['btc', 'eth', 'xrp', 'bnb', 'sol', 'doge', 'trx', 'ada']; // List of top cryptos excluding stablecoins
    const cryptoDataPromises = cryptos.map(symbol => fetchHistoricalData(symbol, selectedTimeRange));

    try {
        const allCryptoData = await Promise.all(cryptoDataPromises);

        // Process the data for both charts
        const processedData = processChartData(allCryptoData);

        // Render both charts with different normalization methods
        renderZeroBasedChart(processedData);
        renderMinMaxChart(processedData);
    } catch (error) {
        console.error("Error fetching or rendering chart data:", error);
    }
}

// Process chart data to prepare for rendering
function processChartData(cryptoData) {
    // Create a complete set of timestamps from all cryptocurrencies
    // This ensures we have all possible timestamps across all cryptos
    const allTimestamps = new Set();
    cryptoData.forEach(crypto => {
        crypto.timestamps.forEach(timestamp => {
            allTimestamps.add(timestamp);
        });
    });

    // Convert to array and sort chronologically
    const labels = Array.from(allTimestamps).sort();

    // Process data for each cryptocurrency
    const processedCryptos = cryptoData.map(crypto => {
        // Create a map of timestamp to price for this cryptocurrency
        const priceMap = {};
        for (let i = 0; i < crypto.timestamps.length; i++) {
            priceMap[crypto.timestamps[i]] = crypto.prices[i];
        }

        // Create an array of prices for all timestamps, interpolating missing values
        const interpolatedPrices = [];
        for (let i = 0; i < labels.length; i++) {
            const timestamp = labels[i];
            if (priceMap[timestamp] !== undefined) {
                // Use actual price if available
                interpolatedPrices.push(priceMap[timestamp]);
            } else {
                // Find nearest available prices before and after this timestamp
                let beforeTimestamp = null;
                let afterTimestamp = null;

                // Find the nearest timestamp before
                for (let j = i - 1; j >= 0; j--) {
                    if (priceMap[labels[j]] !== undefined) {
                        beforeTimestamp = labels[j];
                        break;
                    }
                }

                // Find the nearest timestamp after
                for (let j = i + 1; j < labels.length; j++) {
                    if (priceMap[labels[j]] !== undefined) {
                        afterTimestamp = labels[j];
                        break;
                    }
                }

                // Interpolate based on available data
                if (beforeTimestamp && afterTimestamp) {
                    // Linear interpolation between two points
                    const beforePrice = priceMap[beforeTimestamp];
                    const afterPrice = priceMap[afterTimestamp];
                    const beforeTime = new Date(beforeTimestamp).getTime();
                    const afterTime = new Date(afterTimestamp).getTime();
                    const currentTime = new Date(timestamp).getTime();

                    const ratio = (currentTime - beforeTime) / (afterTime - beforeTime);
                    const interpolatedPrice = beforePrice + ratio * (afterPrice - beforePrice);
                    interpolatedPrices.push(interpolatedPrice);
                } else if (beforeTimestamp) {
                    // Use the last known price if we only have data before
                    interpolatedPrices.push(priceMap[beforeTimestamp]);
                } else if (afterTimestamp) {
                    // Use the next known price if we only have data after
                    interpolatedPrices.push(priceMap[afterTimestamp]);
                } else {
                    // This should not happen if we have any data points
                    interpolatedPrices.push(null);
                }
            }
        }

        return {
            symbol: crypto.symbol,
            interpolatedPrices
        };
    });

    return {
        labels,
        processedCryptos
    };
}

// Render the zero-based normalization chart (0 to Max)
function renderZeroBasedChart(data) {
    const { labels, processedCryptos } = data;

    const datasets = processedCryptos.map(crypto => {
        const interpolatedPrices = crypto.interpolatedPrices;

        // Now normalize the interpolated prices with zero-based method
        const validPrices = interpolatedPrices.filter(price => price !== null);
        // Use 0 as the minimum price for all cryptocurrencies for better relative comparison
        const minPrice = 0;
        const maxPrice = Math.max(...validPrices);

        // Normalize the data to a range between 0 and 100
        const normalizedPrices = interpolatedPrices.map(price =>
            price !== null ? ((price - minPrice) / (maxPrice - minPrice)) * 100 : null
        );

        // Get the base color for this cryptocurrency
        const baseColor = getColorForSymbol(crypto.symbol);

        // Create a semi-transparent version for hover effects
        const rgbValues = baseColor.match(/\d+/g);
        const hoverColor = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.8)`;

        return {
            label: crypto.symbol.toUpperCase(),
            data: normalizedPrices,
            borderColor: baseColor,
            backgroundColor: 'rgba(0, 0, 0, 0)', // No fill
            borderWidth: 3.5, // Slightly thicker lines for better visibility
            pointRadius: 0, // No points on the line by default
            pointHoverRadius: 6, // Larger points on hover for better visibility
            pointHoverBackgroundColor: hoverColor,
            pointHoverBorderColor: baseColor,
            pointHoverBorderWidth: 2,
            fill: false, // Disable filling below the line
            tension: 0.1, // Slight curve for smoother lines
            spanGaps: true, // Connect lines across null values
            borderDash: [], // No dashed lines needed as stablecoins are excluded
        };
    });

    const canvas = document.getElementById('zeroBasedChart');

    if (!canvas) {
        console.error("Could not find zero-based chart canvas");
        return;
    }

    // Get theme colors for chart
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = currentTheme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e9ecef' : '#212529';

    // If chart already exists, update it
    if (zeroBasedChart) {
        try {
            zeroBasedChart.data.labels = labels;
            zeroBasedChart.data.datasets = datasets;

            // Ensure y-axis range is maintained (90-100 for zero-based chart)
            zeroBasedChart.options.scales.y.min = 90;
            zeroBasedChart.options.scales.y.max = 100;
            zeroBasedChart.options.scales.y.beginAtZero = false;

            // Ensure spanGaps is enabled
            zeroBasedChart.options.spanGaps = true;

            // Update with animation duration of 0 for smoother transitions
            zeroBasedChart.update({
                duration: 300,
                easing: 'easeOutQuad'
            });
            return;
        } catch (error) {
            console.error("Error updating zero-based chart, recreating it:", error);
            // Destroy the chart if it exists but has errors
            zeroBasedChart.destroy();
            zeroBasedChart = null;
        }
    }

    // Create new chart if it doesn't exist or was destroyed
    if (!zeroBasedChart) {
        const ctx = canvas.getContext('2d');
        zeroBasedChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                spanGaps: true, // Connect lines across null values
                elements: {
                    line: {
                        tension: 0.1 // Slight curve for smoother lines
                    },
                    point: {
                        radius: 0, // Hide points by default
                        hoverRadius: 5 // Show points on hover
                    }
                },
                scales: {
                    x: {
                        type: 'category',
                        title: {
                            display: true,
                            text: 'Time',
                            color: textColor
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12,
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    y: {
                        min: 90,
                        max: 100,
                        beginAtZero: false, // Start y-axis at 90
                        suggestedMin: 90, // Suggest minimum value
                        suggestedMax: 100, // Suggest maximum value
                        title: {
                            display: true,
                            text: 'Normalized Price (90 - 100)',
                            color: textColor
                        },
                        ticks: {
                            callback: function (value) {
                                return value.toFixed(2); // Format ticks to 2 decimal places
                            },
                            color: textColor,
                            stepSize: 2, // Create ticks at 90, 92, 94, 96, 98, 100
                            precision: 0 // Ensure whole numbers for major ticks
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (tooltipItem) {
                                return `${tooltipItem.dataset.label}: ${tooltipItem.raw.toFixed(2)}`;
                            },
                        },
                        backgroundColor: isDark ? 'rgba(45, 45, 45, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: isDark ? '#e9ecef' : '#212529',
                        bodyColor: isDark ? '#e9ecef' : '#212529',
                        borderColor: isDark ? '#3d3d3d' : '#e9ecef',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        boxWidth: 10,
                        boxHeight: 10,
                        boxPadding: 3,
                        usePointStyle: true,
                    },
                    legend: {
                        position: 'top',
                        align: 'center',
                        labels: {
                            color: textColor,
                            padding: 15,
                            usePointStyle: false, // Use line style instead of points for better color visibility
                            boxWidth: 30, // Wider box to show the line color better
                            boxHeight: 3, // Thinner height to match line appearance
                            font: {
                                size: 13,
                                weight: 'bold'
                            },
                            filter: function(item) {
                                // Custom filter to add spacing between legend items
                                return item;
                            },
                            generateLabels: function(chart) {
                                // Simply return the dataset labels
                                return chart.data.datasets.map((dataset, i) => ({
                                    text: dataset.label,
                                    fillStyle: dataset.borderColor,
                                    strokeStyle: dataset.borderColor,
                                    lineWidth: 2,
                                    hidden: !chart.isDatasetVisible(i),
                                    index: i,
                                    datasetIndex: i
                                }));
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                },
            },
        });
    }
}

// Render the min-max normalization chart (Min to Max)
function renderMinMaxChart(data) {
    const { labels, processedCryptos } = data;

    const datasets = processedCryptos.map(crypto => {
        const interpolatedPrices = crypto.interpolatedPrices;

        // Now normalize the interpolated prices with min-max method
        const validPrices = interpolatedPrices.filter(price => price !== null);
        const minPrice = Math.min(...validPrices);
        const maxPrice = Math.max(...validPrices);

        // Normalize the data to a range between 0 and 100
        const normalizedPrices = interpolatedPrices.map(price =>
            price !== null ? ((price - minPrice) / (maxPrice - minPrice)) * 100 : null
        );

        // Get the base color for this cryptocurrency
        const baseColor = getColorForSymbol(crypto.symbol);

        // Create a semi-transparent version for hover effects
        const rgbValues = baseColor.match(/\d+/g);
        const hoverColor = `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, 0.8)`;

        return {
            label: crypto.symbol.toUpperCase(),
            data: normalizedPrices,
            borderColor: baseColor,
            backgroundColor: 'rgba(0, 0, 0, 0)', // No fill
            borderWidth: 3.5, // Slightly thicker lines for better visibility
            pointRadius: 0, // No points on the line by default
            pointHoverRadius: 6, // Larger points on hover for better visibility
            pointHoverBackgroundColor: hoverColor,
            pointHoverBorderColor: baseColor,
            pointHoverBorderWidth: 2,
            fill: false, // Disable filling below the line
            tension: 0.1, // Slight curve for smoother lines
            spanGaps: true, // Connect lines across null values
            borderDash: [], // No dashed lines needed as stablecoins are excluded
        };
    });

    const canvas = document.getElementById('minMaxChart');

    if (!canvas) {
        console.error("Could not find min-max chart canvas");
        return;
    }

    // Get theme colors for chart
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isDark = currentTheme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e9ecef' : '#212529';

    // If chart already exists, update it
    if (minMaxChart) {
        try {
            minMaxChart.data.labels = labels;
            minMaxChart.data.datasets = datasets;

            // Ensure y-axis range is maintained
            minMaxChart.options.scales.y.min = 0;
            minMaxChart.options.scales.y.max = 100;
            minMaxChart.options.scales.y.beginAtZero = true;

            // Ensure spanGaps is enabled
            minMaxChart.options.spanGaps = true;

            // Update with animation duration of 0 for smoother transitions
            minMaxChart.update({
                duration: 300,
                easing: 'easeOutQuad'
            });
            return;
        } catch (error) {
            console.error("Error updating min-max chart, recreating it:", error);
            // Destroy the chart if it exists but has errors
            minMaxChart.destroy();
            minMaxChart = null;
        }
    }

    // Create new chart if it doesn't exist or was destroyed
    if (!minMaxChart) {
        const ctx = canvas.getContext('2d');
        minMaxChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                spanGaps: true, // Connect lines across null values
                elements: {
                    line: {
                        tension: 0.1 // Slight curve for smoother lines
                    },
                    point: {
                        radius: 0, // Hide points by default
                        hoverRadius: 5 // Show points on hover
                    }
                },
                scales: {
                    x: {
                        type: 'category',
                        title: {
                            display: true,
                            text: 'Time',
                            color: textColor
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12,
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        beginAtZero: true, // Force y-axis to start at zero
                        suggestedMin: 0, // Suggest minimum value
                        suggestedMax: 100, // Suggest maximum value
                        title: {
                            display: true,
                            text: 'Normalized Price (0 - 100)',
                            color: textColor
                        },
                        ticks: {
                            callback: function (value) {
                                return value.toFixed(2); // Format ticks to 2 decimal places
                            },
                            color: textColor,
                            stepSize: 20, // Create ticks at 0, 20, 40, 60, 80, 100
                            precision: 0 // Ensure whole numbers for major ticks
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (tooltipItem) {
                                return `${tooltipItem.dataset.label}: ${tooltipItem.raw.toFixed(2)}`;
                            },
                        },
                        backgroundColor: isDark ? 'rgba(45, 45, 45, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: isDark ? '#e9ecef' : '#212529',
                        bodyColor: isDark ? '#e9ecef' : '#212529',
                        borderColor: isDark ? '#3d3d3d' : '#e9ecef',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        boxWidth: 10,
                        boxHeight: 10,
                        boxPadding: 3,
                        usePointStyle: true,
                    },
                    legend: {
                        position: 'top',
                        align: 'center',
                        labels: {
                            color: textColor,
                            padding: 15,
                            usePointStyle: false, // Use line style instead of points for better color visibility
                            boxWidth: 30, // Wider box to show the line color better
                            boxHeight: 3, // Thinner height to match line appearance
                            font: {
                                size: 13,
                                weight: 'bold'
                            },
                            filter: function(item) {
                                // Custom filter to add spacing between legend items
                                return item;
                            },
                            generateLabels: function(chart) {
                                // Simply return the dataset labels
                                return chart.data.datasets.map((dataset, i) => ({
                                    text: dataset.label,
                                    fillStyle: dataset.borderColor,
                                    strokeStyle: dataset.borderColor,
                                    lineWidth: 2,
                                    hidden: !chart.isDatasetVisible(i),
                                    index: i,
                                    datasetIndex: i
                                }));
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                },
            },
        });
    }
}

// Get color for each cryptocurrency based on its symbol
// Using more distinct and easily distinguishable colors
function getColorForSymbol(symbol) {
    const colors = {
        btc: 'rgb(247, 147, 26)',     // Bitcoin Orange
        eth: 'rgb(35, 56, 204)',      // Ethereum Deep Blue
        usdt: 'rgb(39, 174, 96)',     // Tether Green
        xrp: 'rgb(0, 65, 153)',       // XRP Dark Blue
        bnb: 'rgb(243, 186, 47)',     // Binance Yellow
        sol: 'rgb(137, 72, 239)',     // Solana Purple
        usdc: 'rgb(0, 123, 255)',     // USDC Blue
        doge: 'rgb(255, 105, 180)',   // Dogecoin Hot Pink
        trx: 'rgb(220, 20, 60)',      // TRON Crimson Red
        ada: 'rgb(0, 176, 185)',      // Cardano Teal
    };

    // If we need to add more cryptocurrencies in the future, here are additional distinct colors:
    const extendedColors = {
        dot: 'rgb(230, 0, 122)',     // Polkadot Pink
        link: 'rgb(43, 109, 176)',   // Chainlink Navy
        matic: 'rgb(130, 71, 229)',  // Polygon Purple
        avax: 'rgb(232, 65, 66)',    // Avalanche Red
        shib: 'rgb(255, 128, 0)',    // Shiba Inu Orange
        ltc: 'rgb(191, 191, 191)',   // Litecoin Silver
        atom: 'rgb(70, 118, 253)',   // Cosmos Blue
        uni: 'rgb(255, 0, 122)',     // Uniswap Pink
        xlm: 'rgb(20, 20, 20)',      // Stellar Black
        algo: 'rgb(0, 200, 140)'     // Algorand Green
    };

    // Combine both color sets
    const allColors = {...colors, ...extendedColors};

    return allColors[symbol] || 'rgb(200, 200, 200)'; // Default grey if not found
}

// Update page elements based on current theme
function updatePageElements() {
    // Update time range buttons
    const timeRangeButtons = document.querySelectorAll('.time-range-btn');
    timeRangeButtons.forEach(button => {
        button.style.color = '';
        button.style.backgroundColor = '';
        button.style.borderColor = '';
    });

    // Update card elements
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.backgroundColor = '';
        card.style.color = '';
        card.style.borderColor = '';
    });

    // Update explanation text
    const explanationText = document.querySelectorAll('.chart-explanation');
    explanationText.forEach(element => {
        element.style.color = '';
        element.style.backgroundColor = '';
    });
}

// Update chart theme based on current theme
function updateChartTheme(chart, theme) {
    if (!chart) {
        return;
    }

    const isDark = theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e9ecef' : '#212529';

    try {
        // Update scales
        chart.options.scales.x.grid.color = gridColor;
        chart.options.scales.y.grid.color = gridColor;
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.y.ticks.color = textColor;

        // Ensure y-axis range is maintained during theme changes
        // For zero-based chart, use 90-100 range
        if (chart === zeroBasedChart) {
            chart.options.scales.y.min = 90;
            chart.options.scales.y.max = 100;
            chart.options.scales.y.beginAtZero = false;
        } else {
            // For min-max chart, keep the full 0-100 range
            chart.options.scales.y.min = 0;
            chart.options.scales.y.max = 100;
            chart.options.scales.y.beginAtZero = true;
        }

        // Ensure spanGaps is enabled
        chart.options.spanGaps = true;

        // Update scale titles if they exist
        if (chart.options.scales.x.title) {
            chart.options.scales.x.title.color = textColor;
        }
        if (chart.options.scales.y.title) {
            chart.options.scales.y.title.color = textColor;
        }

        // Update tooltip
        chart.options.plugins.tooltip.backgroundColor = isDark ? '#2d2d2d' : '#ffffff';
        chart.options.plugins.tooltip.titleColor = isDark ? '#e9ecef' : '#212529';
        chart.options.plugins.tooltip.bodyColor = isDark ? '#e9ecef' : '#212529';
        chart.options.plugins.tooltip.borderColor = isDark ? '#3d3d3d' : '#e9ecef';

        // Update legend if it exists
        if (chart.options.plugins.legend && chart.options.plugins.legend.labels) {
            chart.options.plugins.legend.labels.color = textColor;

            // Make sure the legend style is consistent
            chart.options.plugins.legend.labels.usePointStyle = false;
            chart.options.plugins.legend.labels.boxWidth = 30;
            chart.options.plugins.legend.labels.boxHeight = 3;
        }

        // Apply changes
        chart.update();
    } catch (error) {
        console.error("Error updating chart theme:", error);
    }
}
