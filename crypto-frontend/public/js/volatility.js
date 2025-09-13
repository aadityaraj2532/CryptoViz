// API_BASE_URL is imported from config.js

// Global variables
let volatilityChart;
let selectedTimeRange = '7'; // Match the data-days attribute in the HTML

// Function to check if all required elements exist
function checkRequiredElements() {

    const elements = [
        { id: 'volatilityTable', parent: 'main', type: 'div', className: 'card-body' },
        { id: 'volatilityTableBody', parent: 'volatilityTable', type: 'tbody', className: '' },
        { id: 'volatilityChart', parent: 'volatilityChartContainer', type: 'canvas', className: '' },
        { id: 'volatilityChartContainer', parent: 'main', type: 'div', className: 'chart-container' },
        { id: 'lastUpdated', parent: 'main', type: 'span', className: 'text-muted' }
    ];

    let allFound = true;
    elements.forEach(item => {
        let element = document.getElementById(item.id);
        if (element) {

        } else {

            allFound = false;

            // Try to create the element as a fallback
            tryCreateElement(item);
        }
    });

    return allFound;
}

// Function to try to create an element if it doesn't exist
function tryCreateElement(item) {

    // Check if the element already exists (might have been created since we checked)
    if (document.getElementById(item.id)) {

        return;
    }

    // Find the parent element
    let parent;
    if (item.parent === 'main') {
        parent = document.querySelector('main');
        if (!parent) {
            // If main not found, try to find the main content area
            parent = document.querySelector('.container') || document.body;

        }
    } else {
        parent = document.getElementById(item.parent);

        // If parent not found, try to find a suitable container
        if (!parent) {
            if (item.id === 'volatilityTableBody') {
                // For table body, try to find any table
                const tables = document.querySelectorAll('table');
                if (tables.length > 0) {
                    parent = tables[0];

                }
            } else if (item.id === 'volatilityChart') {
                // For chart, try to find any chart container or card body
                parent = document.querySelector('.chart-container') ||
                         document.querySelector('.card-body');

            }
        }
    }

    if (!parent) {

        // Last resort: use body as parent
        parent = document.body;

    }

    // Create the element
    const element = document.createElement(item.type);
    element.id = item.id;
    if (item.className) {
        element.className = item.className;
    }

    // Special handling for specific elements
    if (item.id === 'volatilityTableBody') {
        // Create a table if it doesn't exist
        let table = parent.querySelector('table');
        if (!table) {
            // If parent is already a table, use it
            if (parent.tagName === 'TABLE') {
                table = parent;
            } else {
                table = document.createElement('table');
                table.className = 'volatility-table';
                parent.appendChild(table);
            }
        }

        // Create a thead if it doesn't exist
        let thead = table.querySelector('thead');
        if (!thead) {
            thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>#</th>
                    <th>Cryptocurrency</th>
                    <th>Price</th>
                    <th>Volatility</th>
                    <th>Max Drawdown</th>
                    <th>Volatility Level</th>
                </tr>
            `;
            table.appendChild(thead);
        }

        // Append the tbody
        table.appendChild(element);
    } else if (item.id === 'volatilityChart') {
        // For chart, make sure it's a canvas
        element.width = 400;
        element.height = 200;

        // If parent is volatilityChartContainer but doesn't exist yet, create it
        if (item.parent === 'volatilityChartContainer' && !document.getElementById('volatilityChartContainer')) {
            const container = document.createElement('div');
            container.id = 'volatilityChartContainer';
            container.className = 'chart-container';

            // Find a suitable parent for the container
            const cardBody = document.querySelector('.card-body');
            if (cardBody) {
                cardBody.appendChild(container);
                container.appendChild(element);
            } else {
                parent.appendChild(container);
                container.appendChild(element);
            }
        } else {
            parent.appendChild(element);
        }
    } else {
        // For other elements, just append to parent
        parent.appendChild(element);
    }

}

// Initialize the page when the DOM is fully loaded
function initPage() {

    try {
        // Get the current URL and pathname
        const currentUrl = window.location.href;
        const currentPath = window.location.pathname;

        // Check if we're on the volatility page
        // We'll check both the pathname and the full URL to be safe
        const isVolatilityPage =
            currentPath.includes('volatility') ||
            currentPath.endsWith('volatility.html') ||
            currentUrl.includes('volatility');

        if (isVolatilityPage) {

            // Check if all required elements exist
            const elementsExist = checkRequiredElements();
            if (!elementsExist) {

                // Try again after a short delay
                setTimeout(checkRequiredElements, 1000);
            }

            setupTimeRangeButtons();
            fetchVolatilityData();
        } else {

        }
    } catch (error) {

    }
}

// Make sure the DOM is fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {

        // Add a longer delay to ensure all elements are fully loaded
        setTimeout(initPage, 1000);
    });
} else {
    // If DOMContentLoaded has already fired, run initPage with a delay

    setTimeout(initPage, 1000);
}

// Also add a window load event handler for extra safety
window.addEventListener('load', () => {

    // If the page hasn't been initialized yet, do it now
    if (!document.getElementById('volatilityTableBody') || !document.getElementById('volatilityChart')) {

        setTimeout(initPage, 500);
    }
});

// Set up time range buttons
function setupTimeRangeButtons() {
    try {
        const buttons = document.querySelectorAll('.time-range-button');
        if (!buttons || buttons.length === 0) {

            return;
        }

        buttons.forEach(button => {
            if (!button) return;

            button.addEventListener('click', (event) => {
                try {
                    // Update active button
                    buttons.forEach(btn => {
                        if (btn) btn.classList.remove('active');
                    });

                    if (event.target) {
                        event.target.classList.add('active');

                        // Update selected time range
                        if (event.target.dataset && event.target.dataset.days) {
                            selectedTimeRange = event.target.dataset.days;
                        }
                    }

                    // Fetch new data
                    fetchVolatilityData();
                } catch (error) {

                }
            });
        });
    } catch (error) {

    }
}

// Fetch volatility data from API
async function fetchVolatilityData() {
    try {
        const volatilityTable = document.getElementById('volatilityTable');
        const chartContainer = document.getElementById('volatilityChartContainer');

        if (volatilityTable) {
            showLoading(volatilityTable);
        }

        if (chartContainer) {
            showLoading(chartContainer);
        }

        const response = await fetch(`${API_BASE_URL}/api/crypto/volatility?days=${selectedTimeRange}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
         // Log the response for debugging

        if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
            updateVolatilityTable(data.data);
            updateVolatilityChart(data.data);
            updateLastUpdated();
        } else {
            if (volatilityTable) {
                showError(volatilityTable, 'No volatility data available');
            }
            if (chartContainer) {
                showError(chartContainer, 'No volatility data available');
            }
        }
    } catch (error) {

        const volatilityTable = document.getElementById('volatilityTable');
        const chartContainer = document.getElementById('volatilityChartContainer');

        if (volatilityTable) {
            showError(volatilityTable, 'Failed to load volatility data');
        }
        if (chartContainer) {
            showError(chartContainer, 'Failed to load volatility data');
        }
    }
}

// Update volatility table with data
function updateVolatilityTable(data) {
    // Try to get the table body element multiple times with a delay if needed
    let attempts = 0;
    const maxAttempts = 3;

    function tryUpdate() {
        const tableBody = document.getElementById('volatilityTableBody');
        if (!tableBody) {

            // Try to create the element
            tryCreateElement({
                id: 'volatilityTableBody',
                parent: 'volatilityTable',
                type: 'tbody',
                className: ''
            });

            // Try again after a delay if we haven't exceeded max attempts
            if (++attempts < maxAttempts) {
                setTimeout(tryUpdate, 500);
                return;
            } else {

                return;
            }
        }

        // Clear the table body
        tableBody.innerHTML = '';

        data.forEach((crypto, index) => {
            const row = document.createElement('tr');

            // Check if crypto has all required properties
            if (!crypto || !crypto.symbol || !crypto.name || crypto.price === undefined ||
                crypto.volatility === undefined || crypto.max_drawdown === undefined) {

                return;
            }

            // Determine volatility level class
            let volatilityClass = 'volatility-low';
            if (crypto.volatility > 5) {
                volatilityClass = 'volatility-high';
            } else if (crypto.volatility > 2) {
                volatilityClass = 'volatility-medium';
            }

            // Calculate volatility bar width as percentage (max 100%)
            const maxVolatility = 10; // Assuming 10% is the max for scaling
            const barWidth = Math.min(100, (crypto.volatility / maxVolatility) * 100);

            // Format values safely
            const formattedPrice = isNaN(crypto.price) ? 'N/A' :
                `$${crypto.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}`;
            const formattedVolatility = isNaN(crypto.volatility) ? 'N/A' : `${crypto.volatility.toFixed(2)}%`;
            const formattedDrawdown = isNaN(crypto.max_drawdown) ? 'N/A' : `${crypto.max_drawdown.toFixed(2)}%`;

            row.innerHTML = `
                <td>${index + 1}</td>
                <td class="crypto-name">
                    <span>${crypto.name}</span>
                    <small>${crypto.symbol.toUpperCase()}</small>
                </td>
                <td>${formattedPrice}</td>
                <td>${formattedVolatility}</td>
                <td>${formattedDrawdown}</td>
                <td>
                    <div class="volatility-indicator">
                        <div class="volatility-bar ${volatilityClass}" style="width: ${barWidth}%"></div>
                    </div>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }

    // Start the update process
    tryUpdate();
}

// Setup chart resize observer to maintain consistent chart height
function setupChartResizeObserver() {
    // Wait for the chart to be created
    setTimeout(() => {
        const chartCanvas = document.getElementById('volatilityChart');
        if (chartCanvas) {

            // Create a resize observer
            const resizeObserver = new ResizeObserver(() => {
                // If the chart exists, update it with minimal animation
                if (volatilityChart) {
                    volatilityChart.resize();
                    volatilityChart.update({
                        duration: 0,
                        easing: 'linear'
                    });
                }
            });

            // Start observing the chart canvas
            resizeObserver.observe(chartCanvas);
        }
    }, 500);
}

// Update volatility chart
function updateVolatilityChart(data) {
    // Try to get the chart element multiple times with a delay if needed
    let attempts = 0;
    const maxAttempts = 3;

    function tryUpdate() {
        const chartElement = document.getElementById('volatilityChart');
        if (!chartElement) {

            // Try to create the element
            tryCreateElement({
                id: 'volatilityChart',
                parent: 'volatilityChartContainer',
                type: 'canvas',
                className: ''
            });

            // Try again after a delay if we haven't exceeded max attempts
            if (++attempts < maxAttempts) {
                setTimeout(tryUpdate, 500);
                return;
            } else {

                return;
            }
        }

        try {
            const ctx = chartElement.getContext('2d');
            if (!ctx) {

                return;
            }

            // Prepare data for chart
            const labels = [];
            const volatilityData = [];
            const drawdownData = [];

            // Safely extract data and filter out invalid entries
            data.forEach(crypto => {
                if (!crypto || !crypto.symbol || crypto.volatility === undefined || crypto.max_drawdown === undefined) {
                    return;
                }

                labels.push(crypto.symbol.toUpperCase());
                volatilityData.push(isNaN(crypto.volatility) ? 0 : crypto.volatility);
                drawdownData.push(isNaN(crypto.max_drawdown) ? 0 : Math.abs(crypto.max_drawdown));
            });

            // Destroy existing chart if it exists
            if (volatilityChart) {
                try {
                    volatilityChart.destroy();
                } catch (e) {

                }
            }

            // Get theme colors
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#e9ecef' : '#212529';
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

            // Remove any loading overlays
            const chartContainer = document.getElementById('volatilityChartContainer');
            if (chartContainer) {
                const loadingOverlays = chartContainer.querySelectorAll('.loading-overlay');
                loadingOverlays.forEach(overlay => overlay.remove());
            }

            // Create new chart
            volatilityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Volatility (%)',
                            data: volatilityData,
                            backgroundColor: isDark ? 'rgba(52, 211, 153, 0.7)' : 'rgba(16, 185, 129, 0.7)',
                            borderColor: isDark ? 'rgba(52, 211, 153, 1)' : 'rgba(16, 185, 129, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Max Drawdown (%)',
                            data: drawdownData,
                            backgroundColor: isDark ? 'rgba(248, 113, 113, 0.7)' : 'rgba(239, 68, 68, 0.7)',
                            borderColor: isDark ? 'rgba(248, 113, 113, 1)' : 'rgba(239, 68, 68, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Percentage (%)',
                                color: textColor
                            },
                            ticks: {
                                color: textColor
                            },
                            grid: {
                                color: gridColor
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Cryptocurrency',
                                color: textColor
                            },
                            ticks: {
                                color: textColor
                            },
                            grid: {
                                color: gridColor
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: textColor
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.raw.toFixed(2)}%`;
                                }
                            }
                        }
                    }
                }
            });

            // Set up resize observer to maintain chart dimensions
            setupChartResizeObserver();
        } catch (error) {

        }
    }

    // Start the update process
    tryUpdate();
}

// Update last updated timestamp
function updateLastUpdated() {
    // Try to get the element multiple times with a delay if needed
    let attempts = 0;
    const maxAttempts = 3;

    function tryUpdate() {
        try {
            const lastUpdatedElement = document.getElementById('lastUpdated');
            if (lastUpdatedElement) {
                const now = new Date();
                lastUpdatedElement.textContent = now.toLocaleString();
            } else {

                // Try to create the element
                tryCreateElement({
                    id: 'lastUpdated',
                    parent: 'main',
                    type: 'span',
                    className: 'text-muted'
                });

                // Try again after a delay if we haven't exceeded max attempts
                if (++attempts < maxAttempts) {
                    setTimeout(tryUpdate, 300);
                    return;
                }
            }
        } catch (error) {

        }
    }

    // Start the update process
    tryUpdate();
}

// Show loading spinner
function showLoading(element) {
    if (!element) {

        return;
    }

    // Special handling for volatilityTable to preserve the table structure
    if (element.id === 'volatilityTable') {
        const tableBody = element.querySelector('#volatilityTableBody');
        if (tableBody) {
            // Only replace the tbody content, not the entire table
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="loading-spinner">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-2">Loading volatility data...</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
    }

    // Special handling for chart container to preserve the canvas
    if (element.id === 'volatilityChartContainer') {
        // Create a loading overlay instead of replacing content
        let loadingOverlay = element.querySelector('.loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.className = 'loading-overlay';
            element.appendChild(loadingOverlay);
        }

        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading chart data...</p>
            </div>
        `;
        return;
    }

    // Default behavior for other elements
    element.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading data...</p>
        </div>
    `;
}

// Show error message
function showError(element, message) {
    if (!element) {

        return;
    }

    // Special handling for volatilityTable to preserve the table structure
    if (element.id === 'volatilityTable') {
        const tableBody = element.querySelector('#volatilityTableBody');
        if (tableBody) {
            // Only replace the tbody content, not the entire table
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>${message}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
    }

    // Special handling for chart container to preserve the canvas
    if (element.id === 'volatilityChartContainer') {
        // Remove any existing loading overlays
        const existingLoadingOverlays = element.querySelectorAll('.loading-overlay');
        existingLoadingOverlays.forEach(overlay => overlay.remove());

        // Create an error overlay instead of replacing content
        let errorOverlay = element.querySelector('.error-overlay');
        if (!errorOverlay) {
            errorOverlay = document.createElement('div');
            errorOverlay.className = 'error-overlay';
            element.appendChild(errorOverlay);
        }

        errorOverlay.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
        return;
    }

    // Default behavior for other elements
    element.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Fetch single cryptocurrency volatility data
async function fetchSingleCryptoVolatility(symbol) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/crypto/${symbol}/volatility?days=${selectedTimeRange}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        return data;
    } catch (error) {

        return null;
    }
}

/**
 * Update volatility chart theme based on current theme
 */
function updateVolatilityChartTheme(theme) {
    if (!volatilityChart) return;

    const isDark = theme === 'dark';
    const textColor = isDark ? '#e9ecef' : '#212529';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    // Update colors for datasets
    volatilityChart.data.datasets[0].backgroundColor = isDark ? 'rgba(52, 211, 153, 0.7)' : 'rgba(16, 185, 129, 0.7)';
    volatilityChart.data.datasets[0].borderColor = isDark ? 'rgba(52, 211, 153, 1)' : 'rgba(16, 185, 129, 1)';
    volatilityChart.data.datasets[1].backgroundColor = isDark ? 'rgba(248, 113, 113, 0.7)' : 'rgba(239, 68, 68, 0.7)';
    volatilityChart.data.datasets[1].borderColor = isDark ? 'rgba(248, 113, 113, 1)' : 'rgba(239, 68, 68, 1)';

    // Update scales
    volatilityChart.options.scales.x.title.color = textColor;
    volatilityChart.options.scales.x.ticks.color = textColor;
    volatilityChart.options.scales.x.grid.color = gridColor;
    volatilityChart.options.scales.y.title.color = textColor;
    volatilityChart.options.scales.y.ticks.color = textColor;
    volatilityChart.options.scales.y.grid.color = gridColor;

    // Update legend
    if (volatilityChart.options.plugins.legend) {
        volatilityChart.options.plugins.legend.labels.color = textColor;
    }

    // Apply changes
    volatilityChart.update();
}

// Create returns distribution chart for a specific cryptocurrency
function createReturnsDistributionChart(symbol, returnsData) {
    const chartElement = document.getElementById('returnsDistributionChart');
    if (!chartElement) {

        return;
    }

    try {
        const ctx = chartElement.getContext('2d');
        if (!ctx) {

            return;
        }

        // Calculate bins for histogram
        const min = Math.min(...returnsData);
        const max = Math.max(...returnsData);
        const binCount = 20;
        const binSize = (max - min) / binCount;

        // Create bins
        const bins = Array(binCount).fill(0);
        const binLabels = [];

        // Calculate bin labels
        for (let i = 0; i < binCount; i++) {
            const binStart = min + i * binSize;
            const binEnd = binStart + binSize;
            binLabels.push(`${binStart.toFixed(1)}% to ${binEnd.toFixed(1)}%`);
        }

        // Count values in each bin
        returnsData.forEach(value => {
            const binIndex = Math.min(binCount - 1, Math.floor((value - min) / binSize));
            bins[binIndex]++;
        });

        // Get theme colors
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e9ecef' : '#212529';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const barColor = isDark ? 'rgba(52, 211, 153, 0.7)' : 'rgba(16, 185, 129, 0.7)';
        const borderColor = isDark ? 'rgba(52, 211, 153, 1)' : 'rgba(16, 185, 129, 1)';

        // Create chart
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: 'Frequency',
                    data: bins,
                    backgroundColor: barColor,
                    borderColor: borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Frequency',
                            color: textColor
                        },
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Daily Returns (%)',
                            color: textColor
                        },
                        ticks: {
                            maxRotation: 90,
                            minRotation: 45,
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: `${symbol.toUpperCase()} Daily Returns Distribution`,
                        color: textColor
                    }
                }
            }
        });
    } catch (error) {

    }
}
