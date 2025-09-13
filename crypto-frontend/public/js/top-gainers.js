// Configuration
const API_BASE_URL = 'http://127.0.0.1:5000'; // Production backend URL

// Global variables
let topGainersChart;
let chartResizeObserver = null;
let topGainersData = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {

    // Make sure Chart.js is loaded
    if (typeof Chart === 'undefined') {

        // Try to load Chart.js dynamically if it's not already loaded
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        chartScript.onload = initializePage;
        chartScript.onerror = () => {

            // Still try to initialize the page without charts
            initializePage();
        };
        document.head.appendChild(chartScript);
    } else {
        // Chart.js is already loaded, proceed with initialization
        initializePage();
    }
});

// Function to initialize the page components
function initializePage() {

    // Make sure the chart container and canvas exist
    ensureChartElementsExist();

    // Make sure the table elements exist
    ensureTableElementsExist();

    // Initialize search functionality
    initSearch();

    // Initialize refresh button
    initRefreshButton();

    // Set up chart resize observer for stability
    setupChartResizeObserver();

    // Load top gainers data
    loadTopGainersData();

    // Set up auto-refresh every 5 minutes
    setInterval(() => {
        loadTopGainersData();
    }, 5 * 60 * 1000);

}

// Ensure chart elements exist in the DOM
function ensureChartElementsExist() {

    // Find or create chart container
    let chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) {

        // Find the chart panel
        const chartPanel = document.querySelector('.top-gainers-chart-panel .card-body');
        if (chartPanel) {
            // Create chart container
            chartContainer = document.createElement('div');
            chartContainer.className = 'chart-container';
            chartPanel.appendChild(chartContainer);
        } else {

            return;
        }
    }

    // Find or create canvas element
    let chartCanvas = document.getElementById('topGainersChart');
    if (!chartCanvas) {

        // Create canvas element
        chartCanvas = document.createElement('canvas');
        chartCanvas.id = 'topGainersChart';
        chartCanvas.width = 800;
        chartCanvas.height = 400;
        chartContainer.appendChild(chartCanvas);
    }

}

// Ensure table elements exist in the DOM
function ensureTableElementsExist() {

    // Find or create table container
    let tablePanel = document.querySelector('.top-gainers-table-panel');
    if (!tablePanel) {

        // Find the main container
        const mainContainer = document.querySelector('.container .row');
        if (mainContainer) {
            // Create column
            const col = document.createElement('div');
            col.className = 'col-12';

            // Create card
            tablePanel = document.createElement('div');
            tablePanel.className = 'card top-gainers-table-panel';

            // Create card header
            const cardHeader = document.createElement('div');
            cardHeader.className = 'card-header';
            cardHeader.innerHTML = `
                <div class="d-flex justify-content-between align-items-center flex-wrap">
                    <h2>Top Gainers (24h)</h2>
                    <div class="table-controls">
                        <div class="input-group">
                            <input type="text" id="searchGainers" class="form-control" placeholder="Search cryptocurrency...">
                            <span class="input-group-text" id="searchIcon"></span>
                        </div>
                    </div>
                </div>
            `;

            // Create card body
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';

            // Add elements to DOM
            tablePanel.appendChild(cardHeader);
            tablePanel.appendChild(cardBody);
            col.appendChild(tablePanel);
            mainContainer.appendChild(col);

            // Initialize search functionality
            setTimeout(initSearch, 100);
        } else {

            return;
        }
    }

    // Find or create table responsive container
    let tableResponsive = tablePanel.querySelector('.card-body .table-responsive');
    if (!tableResponsive) {

        const cardBody = tablePanel.querySelector('.card-body');
        if (cardBody) {
            tableResponsive = document.createElement('div');
            tableResponsive.className = 'table-responsive';
            cardBody.appendChild(tableResponsive);
        } else {

            return;
        }
    }

    // Find or create table
    let table = tableResponsive.querySelector('table.gainers-table');
    if (!table) {

        table = document.createElement('table');
        table.className = 'table gainers-table';

        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>#</th>
                <th>Cryptocurrency</th>
                <th>Price (USD)</th>
                <th>24h Change</th>
                <th>Market Cap</th>
                <th>Volume (24h)</th>
            </tr>
        `;

        // Create table body
        const tbody = document.createElement('tbody');
        tbody.id = 'gainersTableBody';

        // Add initial loading state
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="loading-spinner">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p>Loading data...</p>
                    </div>
                </td>
            </tr>
        `;

        // Add elements to DOM
        table.appendChild(thead);
        table.appendChild(tbody);
        tableResponsive.appendChild(table);
    }

    // Find or create table body
    let tableBody = document.getElementById('gainersTableBody');
    if (!tableBody) {

        tableBody = document.createElement('tbody');
        tableBody.id = 'gainersTableBody';

        // Add initial loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="loading-spinner">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p>Loading data...</p>
                    </div>
                </td>
            </tr>
        `;

        // Add to table
        if (table) {
            // Remove any existing tbody
            const existingTbody = table.querySelector('tbody');
            if (existingTbody) {
                existingTbody.remove();
            }

            table.appendChild(tableBody);
        }
    }

}

// Initialize search functionality
function initSearch() {
    const searchInput = document.getElementById('searchGainers');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            filterGainersTable(searchTerm);
        });
    }
}

// Filter the gainers table based on search term
function filterGainersTable(searchTerm) {
    const rows = document.querySelectorAll('#gainersTableBody tr');

    rows.forEach(row => {
        // Skip loading or error rows
        if (row.classList.contains('loading-row') || row.classList.contains('error-row')) {
            return;
        }

        const cryptoName = row.querySelector('.crypto-name')?.textContent.toLowerCase() || '';

        if (cryptoName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Initialize refresh button
function initRefreshButton() {
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            // Show loading state
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing...';

            // Trigger data update
            fetch(`${API_BASE_URL}/api/top-gainers/update?force=true`)
                .then(response => response.json())
                .then(data => {

                    if (data.status === 'success') {

                        // Reload the data
                        loadTopGainersData();
                    }
                })
                .catch(error => {

                    showError(document.querySelector('.top-gainers-overview-panel .card-body'), 'Failed to refresh data');
                })
                .finally(() => {
                    // Reset button state
                    setTimeout(() => {
                        refreshButton.disabled = false;
                        refreshButton.innerHTML = '<span id="refreshIcon"></span> Refresh Data';
                        // Re-add the refresh icon
                        document.getElementById('refreshIcon').innerHTML = refreshIcon('ui-icon');
                    }, 1000);
                });
        });
    }
}

// Load top gainers data from API
function loadTopGainersData() {

    // Make sure all required elements exist
    ensureChartElementsExist();
    ensureTableElementsExist();

    // Get container elements with null checks
    const overviewPanel = document.querySelector('.top-gainers-overview-panel .card-body');
    const chartContainer = document.querySelector('.chart-container');
    const tableBody = document.getElementById('gainersTableBody');

    // Show loading spinners
    if (overviewPanel) showLoading(overviewPanel);
    if (chartContainer) showLoading(chartContainer);
    if (tableBody) showLoading(tableBody);

    // Initialize stats with default values
    if (overviewPanel) {
        const totalGainersEl = document.getElementById('totalGainers');
        const averageGainEl = document.getElementById('averageGain');
        const highestGainEl = document.getElementById('highestGain');
        const lastUpdatedEl = document.getElementById('lastUpdated');

        if (totalGainersEl) totalGainersEl.textContent = '-';
        if (averageGainEl) averageGainEl.textContent = '-';
        if (highestGainEl) highestGainEl.textContent = '-';
        if (lastUpdatedEl) lastUpdatedEl.textContent = '-';
    }

    // Fetch top gainers data
    fetch(`${API_BASE_URL}/api/top-gainers`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch top gainers data: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {

            // Store the data globally (with null check)
            topGainersData = (data && data.data) ? data.data : [];

            // Update UI with the data
            if (overviewPanel) {
                updateTopGainersOverview(topGainersData, data.last_updated);
                hideLoading(overviewPanel);
            }

            if (chartContainer) {
                updateTopGainersChart(topGainersData.slice(0, 10)); // Show top 10 in chart
                hideLoading(chartContainer);
            }

            // Always update the table, even if tableBody is null (updateTopGainersTable will handle this)
            updateTopGainersTable(topGainersData);
            if (tableBody) {
                hideLoading(tableBody);
            }
        })
        .catch(error => {

            // Hide loading spinners
            if (overviewPanel) {
                hideLoading(overviewPanel);
                showError(overviewPanel, 'Failed to load top gainers data');
            }

            if (chartContainer) {
                hideLoading(chartContainer);
                showError(chartContainer, 'Failed to load chart data');
            }

            // Always update the table with an error message
            if (tableBody) {
                hideLoading(tableBody);

                // Show error in table
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">
                            <div class="alert alert-danger" role="alert">
                                <p>Failed to load top gainers data: ${error.message}</p>
                                <button class="btn btn-sm btn-outline-danger mt-2" onclick="loadTopGainersData()">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-clockwise" viewBox="0 0 16 16">
                                        <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                                    </svg>
                                    Try Again
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                // If tableBody is null, try to create it and show error
                ensureTableElementsExist();
                const newTableBody = document.getElementById('gainersTableBody');
                if (newTableBody) {
                    newTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center">
                                <div class="alert alert-danger" role="alert">
                                    <p>Failed to load top gainers data: ${error.message}</p>
                                    <button class="btn btn-sm btn-outline-danger mt-2" onclick="loadTopGainersData()">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-clockwise" viewBox="0 0 16 16">
                                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                                        </svg>
                                        Try Again
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }
        });
}

// Update top gainers overview panel
function updateTopGainersOverview(data, lastUpdated) {
    // Calculate statistics
    const totalGainers = data.length;

    // Calculate average gain
    const totalGain = data.reduce((sum, item) => sum + (item.percent_change_24h || 0), 0);
    const averageGain = totalGainers > 0 ? totalGain / totalGainers : 0;

    // Find highest gain (with fallback if data is empty)
    const highestGain = data.length > 0 ?
        Math.max(...data.map(item => item.percent_change_24h || 0)) : 0;

    // Update UI elements (with null checks)
    const totalGainersEl = document.getElementById('totalGainers');
    const averageGainEl = document.getElementById('averageGain');
    const highestGainEl = document.getElementById('highestGain');
    const lastUpdatedEl = document.getElementById('lastUpdated');

    // Only update elements if they exist
    if (totalGainersEl) totalGainersEl.textContent = totalGainers;
    if (averageGainEl) averageGainEl.textContent = `${averageGain.toFixed(2)}%`;
    if (highestGainEl) highestGainEl.textContent = `${highestGain.toFixed(2)}%`;
    if (lastUpdatedEl) lastUpdatedEl.textContent = formatTimestamp(lastUpdated);
}

// Update top gainers chart
function updateTopGainersChart(data) {

    // Make sure Chart.js is loaded
    if (typeof Chart === 'undefined') {

        setTimeout(() => updateTopGainersChart(data), 500); // Try again in 500ms
        return;
    }

    // Get the chart element
    const chartElement = document.getElementById('topGainersChart');
    if (!chartElement) {

        // Try again in 500ms - the DOM might not be fully loaded
        setTimeout(() => updateTopGainersChart(data), 500);
        return;
    }

    // Check if data is empty
    if (!data || data.length === 0) {

        // If chart already exists, clear it
        if (topGainersChart) {
            try {
                topGainersChart.data.labels = [];
                topGainersChart.data.datasets[0].data = [];
                topGainersChart.update();
            } catch (error) {

                topGainersChart = null; // Reset chart if there's an error
            }
        }

        // Show a message in the chart container
        const chartContainer = chartElement.parentElement;
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="alert alert-warning text-center" style="margin: 2rem;">
                    <p>No data available to display chart</p>
                </div>
            `;
        }

        return;
    }

    try {
        // Prepare chart data with null checks
        const labels = data.map(item => (item.symbol || '').toUpperCase());
        const percentChanges = data.map(item => item.percent_change_24h || 0);

        // Generate colors based on the percent change values
        const colors = percentChanges.map(value => {
            // Use a gradient from green (high) to lighter green (lower)
            const intensity = Math.min(100, value * 2) / 100; // Scale to 0-1 range
            return `rgba(75, 192, 75, ${0.5 + intensity * 0.5})`; // Adjust opacity based on value
        });

        // Create or update chart
        if (topGainersChart) {

            try {
                topGainersChart.data.labels = labels;
                topGainersChart.data.datasets[0].data = percentChanges;
                topGainersChart.data.datasets[0].backgroundColor = colors;
                topGainersChart.update();
            } catch (error) {

                topGainersChart = null; // Reset chart if there's an error
                // Try to create a new chart
                setTimeout(() => updateTopGainersChart(data), 100);
            }
        } else {

            try {
                // Make sure the canvas is clean
                const chartContainer = chartElement.parentElement;
                if (chartContainer) {
                    chartContainer.innerHTML = '';
                    const newCanvas = document.createElement('canvas');
                    newCanvas.id = 'topGainersChart';
                    newCanvas.width = 800;
                    newCanvas.height = 400;
                    chartContainer.appendChild(newCanvas);

                    // Get the new canvas element
                    const newChartElement = document.getElementById('topGainersChart');
                    if (!newChartElement) {

                        return;
                    }

                    const ctx = newChartElement.getContext('2d');
                    if (!ctx) {

                        return;
                    }

                    // Create new chart
                    topGainersChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: '24h Price Change (%)',
                                data: percentChanges,
                                backgroundColor: colors,
                                borderColor: 'rgba(75, 192, 75, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            return `${context.dataset.label}: ${context.raw.toFixed(2)}%`;
                                        },
                                        title: function(context) {
                                            if (!context || !context[0]) return '';
                                            const index = context[0].dataIndex;
                                            if (index < 0 || index >= data.length) return '';
                                            return `${data[index].name || ''} (${(data[index].symbol || '').toUpperCase()})`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Price Change (%)'
                                    },
                                    ticks: {
                                        callback: function(value) {
                                            return value + '%';
                                        }
                                    }
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Cryptocurrency'
                                    }
                                }
                            }
                        }
                    });

                }
            } catch (error) {

            }
        }
    } catch (error) {

    }
}

// Update top gainers table
function updateTopGainersTable(data) {

    // Make sure the table elements exist
    ensureTableElementsExist();

    // Get the table body element
    const tableBody = document.getElementById('gainersTableBody');
    if (!tableBody) {

        return;
    }

    try {
        // Clear existing content
        tableBody.innerHTML = '';

        // Check if data is empty or invalid
        if (!data || data.length === 0) {

            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">
                    <div class="alert alert-warning" role="alert">
                        <p>No top gainers data available</p>
                        <button class="btn btn-sm btn-outline-warning mt-2" onclick="loadTopGainersData()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-clockwise" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                            </svg>
                            Try Again
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }

        // Add rows for each cryptocurrency
        data.forEach((crypto, index) => {
            try {
                const row = document.createElement('tr');

                // Get values with null checks
                const rank = crypto.rank || index + 1;
                const name = crypto.name || 'Unknown';
                const symbol = (crypto.symbol || 'N/A').toUpperCase();
                const price = crypto.price || 0;
                const percentChange = crypto.percent_change_24h || 0;
                const marketCap = crypto.market_cap || 0;
                const volume = crypto.volume_24h || 0;

                // Format market cap and volume
                const formattedMarketCap = formatCurrency(marketCap);
                const formattedVolume = formatCurrency(volume);

                // Create row content
                row.innerHTML = `
                    <td>${rank}</td>
                    <td>
                        <div class="crypto-name">
                            <div class="crypto-name-content">
                                <span>${name}</span>
                                <small>${symbol}</small>
                            </div>
                        </div>
                    </td>
                    <td>${formatCurrency(price)}</td>
                    <td>
                        <div class="price-change positive">
                            <span>+${percentChange.toFixed(2)}%</span>
                        </div>
                    </td>
                    <td>${formattedMarketCap}</td>
                    <td>${formattedVolume}</td>
                `;

                tableBody.appendChild(row);
            } catch (error) {

            }
        });

    } catch (error) {

        // Show error message in table
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="alert alert-danger" role="alert">
                        <p>Error updating table: ${error.message}</p>
                        <button class="btn btn-sm btn-outline-danger mt-2" onclick="loadTopGainersData()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-clockwise" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                            </svg>
                            Try Again
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Set up chart resize observer
function setupChartResizeObserver() {
    // Check if ResizeObserver is supported
    if (typeof ResizeObserver === 'undefined') {

        return;
    }

    // Disconnect any existing observer
    if (chartResizeObserver) {
        try {
            chartResizeObserver.disconnect();
        } catch (error) {

        }
    }

    try {
        // Find the chart container
        const chartContainer = document.querySelector('.chart-container');
        if (!chartContainer) {

            setTimeout(setupChartResizeObserver, 1000);
            return;
        }

        // Create a new observer
        chartResizeObserver = new ResizeObserver(entries => {
            try {
                if (topGainersChart && typeof topGainersChart.resize === 'function') {
                    topGainersChart.resize();
                    topGainersChart.update({
                        duration: 0,
                        easing: 'linear'
                    });
                }
            } catch (error) {

            }
        });

        // Start observing
        chartResizeObserver.observe(chartContainer);

    } catch (error) {

    }
}

// Helper function to format currency values
function formatCurrency(value) {
    if (value === undefined || value === null) {
        return 'N/A';
    }

    // For top-gainers, the market cap and volume values are in their raw form (not in billions)
    if (value >= 1e12) {
        return `$${(value / 1e12).toFixed(2)} Trillion USD`;
    } else if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(2)} Billion USD`;
    } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(2)} Million USD`;
    } else if (value >= 1e3) {
        return `$${(value / 1e3).toFixed(2)} Thousand USD`;
    } else if (value >= 1) {
        return `$${value.toFixed(2)} USD`;
    } else {
        return `$${value.toFixed(6)} USD`;
    }
}

// Helper function to format timestamps
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';

    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Helper function to show loading spinner
function showLoading(container) {
    if (!container) return;

    // For the overview panel, we need to handle it differently to preserve the stat elements
    if (container.closest('.top-gainers-overview-panel')) {
        // Add loading spinner without replacing the entire content
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-spinner';
        loadingSpinner.style.position = 'absolute';
        loadingSpinner.style.top = '0';
        loadingSpinner.style.left = '0';
        loadingSpinner.style.width = '100%';
        loadingSpinner.style.height = '100%';
        loadingSpinner.style.display = 'flex';
        loadingSpinner.style.alignItems = 'center';
        loadingSpinner.style.justifyContent = 'center';
        loadingSpinner.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        loadingSpinner.style.zIndex = '10';

        loadingSpinner.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="ms-2 text-white">Loading data...</p>
        `;

        // Make sure container has position relative for absolute positioning
        container.style.position = 'relative';
        container.appendChild(loadingSpinner);
        return;
    }

    // For the chart container, we need special handling
    if (container.classList.contains('chart-container')) {
        // Save the canvas element if it exists
        const canvas = container.querySelector('#topGainersChart');

        // Add loading spinner without replacing the entire content
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-spinner';
        loadingSpinner.style.position = 'absolute';
        loadingSpinner.style.top = '0';
        loadingSpinner.style.left = '0';
        loadingSpinner.style.width = '100%';
        loadingSpinner.style.height = '100%';
        loadingSpinner.style.display = 'flex';
        loadingSpinner.style.alignItems = 'center';
        loadingSpinner.style.justifyContent = 'center';
        loadingSpinner.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        loadingSpinner.style.zIndex = '10';

        loadingSpinner.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="ms-2 text-white">Loading chart data...</p>
        `;

        // Make sure container has position relative for absolute positioning
        container.style.position = 'relative';

        // Clear the container but keep track of whether we had a canvas
        container.innerHTML = '';
        container.appendChild(loadingSpinner);

        // If we had a canvas, add it back
        if (canvas) {
            container.appendChild(canvas);
        } else {
            // Create a new canvas
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'topGainersChart';
            newCanvas.width = 800;
            newCanvas.height = 400;
            newCanvas.style.display = 'none'; // Hide it until data is loaded
            container.appendChild(newCanvas);
        }

        return;
    }

    // For the table body, we need special handling
    if (container.id === 'gainersTableBody') {
        // Show loading spinner in a single row
        container.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="loading-spinner py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Loading top gainers data...</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // For other containers, save original content
    container.dataset.originalContent = container.innerHTML;

    // Show loading spinner
    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p>Loading data...</p>
        </div>
    `;
}

// Helper function to hide loading spinner
function hideLoading(container) {
    if (!container) return;

    // For the overview panel, we need to handle it differently to preserve the stat elements
    if (container.closest('.top-gainers-overview-panel')) {
        // Just remove the loading spinner
        const spinner = container.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
        return;
    }

    // For the chart container, we need special handling
    if (container.classList.contains('chart-container')) {
        // Just remove the loading spinner without restoring original content
        // This is because the chart will be redrawn by updateTopGainersChart
        const spinner = container.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }

        // Make sure the canvas element exists
        if (!container.querySelector('#topGainersChart')) {
            const canvas = document.createElement('canvas');
            canvas.id = 'topGainersChart';
            canvas.width = 800;
            canvas.height = 400;
            container.appendChild(canvas);
        }

        return;
    }

    // For the table body, we need special handling
    if (container.id === 'gainersTableBody') {
        // The table content will be updated by updateTopGainersTable
        // We don't need to do anything here
        return;
    }

    // For other containers, restore original content if available
    if (container.dataset.originalContent) {
        container.innerHTML = container.dataset.originalContent;
        delete container.dataset.originalContent;
    }
}

// Helper function to show error message
function showError(container, message) {
    if (!container) return;

    // For the overview panel, we need to handle it differently to preserve the stat elements
    if (container.closest('.top-gainers-overview-panel')) {
        // Remove any existing loading spinner
        const spinner = container.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }

        // Remove any existing error message
        const existingError = container.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Create error message overlay
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.position = 'absolute';
        errorMessage.style.top = '0';
        errorMessage.style.left = '0';
        errorMessage.style.width = '100%';
        errorMessage.style.height = '100%';
        errorMessage.style.display = 'flex';
        errorMessage.style.flexDirection = 'column';
        errorMessage.style.alignItems = 'center';
        errorMessage.style.justifyContent = 'center';
        errorMessage.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
        errorMessage.style.zIndex = '10';
        errorMessage.style.padding = '1rem';

        errorMessage.innerHTML = `
            <svg class="text-danger mb-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="2em" height="2em">
                <path fill="currentColor" d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/>
            </svg>
            <p class="text-danger">${message}</p>
        `;

        // Make sure container has position relative for absolute positioning
        container.style.position = 'relative';
        container.appendChild(errorMessage);
        return;
    }

    // For the chart container, we need special handling
    if (container.classList.contains('chart-container')) {
        // Remove any existing loading spinner
        const spinner = container.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }

        // Remove any existing error message
        const existingError = container.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Save the canvas element if it exists
        const canvas = container.querySelector('#topGainersChart');

        // Create error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.style.position = 'absolute';
        errorMessage.style.top = '0';
        errorMessage.style.left = '0';
        errorMessage.style.width = '100%';
        errorMessage.style.height = '100%';
        errorMessage.style.display = 'flex';
        errorMessage.style.flexDirection = 'column';
        errorMessage.style.alignItems = 'center';
        errorMessage.style.justifyContent = 'center';
        errorMessage.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
        errorMessage.style.zIndex = '10';
        errorMessage.style.padding = '1rem';

        errorMessage.innerHTML = `
            <svg class="text-danger mb-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="2em" height="2em">
                <path fill="currentColor" d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/>
            </svg>
            <p class="text-danger">${message}</p>
            <button class="btn btn-outline-danger mt-3" onclick="location.reload()">Reload Page</button>
        `;

        // Make sure container has position relative for absolute positioning
        container.style.position = 'relative';

        // Clear the container but keep track of whether we had a canvas
        container.innerHTML = '';
        container.appendChild(errorMessage);

        // If we had a canvas, add it back (but hidden)
        if (canvas) {
            canvas.style.display = 'none';
            container.appendChild(canvas);
        } else {
            // Create a new canvas (hidden)
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'topGainersChart';
            newCanvas.width = 800;
            newCanvas.height = 400;
            newCanvas.style.display = 'none';
            container.appendChild(newCanvas);
        }

        return;
    }

    // For other containers, replace the entire content
    container.innerHTML = `
        <div class="error-message">
            <svg class="text-danger mb-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="2em" height="2em">
                <path fill="currentColor" d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/>
            </svg>
            <p>${message}</p>
            <button class="btn btn-outline-danger mt-3" onclick="location.reload()">Reload Page</button>
        </div>
    `;
}

// Helper function for refresh icon
function refreshIcon(className) {
    return `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1em" height="1em">
        <path fill="currentColor" d="M463.5 224H472c13.3 0 24-10.7 24-24V72c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1c-87.5 87.5-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8H463.5z"/>
    </svg>`;
}
