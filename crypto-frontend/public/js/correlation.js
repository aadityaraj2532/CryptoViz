// API_BASE_URL is imported from config.js

// Check if Chart.js is loaded
if (typeof Chart === 'undefined') {

    // Try to load Chart.js dynamically if not available
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.async = true;
    script.onload = function() {

        initPage();
    };
    script.onerror = function() {

        alert('Failed to load Chart.js library. Please refresh the page or check your internet connection.');
    };
    document.head.appendChild(script);
}

// Global variables
let correlationChart;
let selectedTimeRange = '7';

/**
 * Update correlation chart theme based on current theme
 */
function updateCorrelationChartTheme(theme) {
    if (!correlationChart) return;

    const isDark = theme === 'dark';
    const textColor = isDark ? '#e9ecef' : '#212529';
    const backgroundColor = isDark ? '#2d2d2d' : '#ffffff';
    const borderColor = isDark ? '#3d3d3d' : '#e9ecef';

    correlationChart.options.scales.x.ticks.color = textColor;
    correlationChart.options.scales.y.ticks.color = textColor;
    correlationChart.options.plugins.tooltip.backgroundColor = backgroundColor;
    correlationChart.options.plugins.tooltip.titleColor = textColor;
    correlationChart.options.plugins.tooltip.bodyColor = textColor;
    correlationChart.options.plugins.tooltip.borderColor = borderColor;
    correlationChart.update();
}

// Setup chart resize observer to maintain consistent chart height
function setupChartResizeObserver() {
    // Wait for the chart to be created
    setTimeout(() => {
        const chartCanvas = document.getElementById('correlationChart');
        if (chartCanvas) {

            // Create a resize observer
            const resizeObserver = new ResizeObserver(() => {
                // If the chart exists, update it with minimal animation
                if (correlationChart) {
                    correlationChart.resize();
                    correlationChart.update({
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

// Initialize the page when the DOM is fully loaded
function initPage() {

    try {
        addThemeToggleButton();
        setupTimeRangeButtons();
        fetchCorrelationData();
    } catch (error) {

    }
}

// Make sure the DOM is fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    // If DOMContentLoaded has already fired, run initPage immediately
    initPage();
}

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
                    fetchCorrelationData();
                } catch (error) {

                }
            });
        });
    } catch (error) {

    }
}

// Fetch correlation data from API
async function fetchCorrelationData() {
    const matrixElement = document.getElementById('correlationMatrix');
    const chartContainer = document.getElementById('correlationChartContainer');

    // Ensure the chart container has the canvas element
    if (chartContainer) {
        // Check if canvas exists
        let canvas = document.getElementById('correlationChart');
        if (!canvas) {

            // Create canvas if it doesn't exist
            canvas = document.createElement('canvas');
            canvas.id = 'correlationChart';
            canvas.width = 400;
            canvas.height = 200;

            // Clear the container first
            chartContainer.innerHTML = '';

            // Add canvas to container
            chartContainer.appendChild(canvas);

            // Add description text
            const description = document.createElement('div');
            description.className = 'text-center mt-3';
            description.innerHTML = '<small class="text-muted">Chart shows correlation between different cryptocurrencies</small>';
            chartContainer.appendChild(description);
        }
    }

    try {
        // Show loading indicators
        if (matrixElement) {
            showLoading(matrixElement);
        }

        if (chartContainer) {
            showLoading(chartContainer);
        }

        const response = await fetch(`${API_BASE_URL}/api/crypto/correlation?days=${selectedTimeRange}`);

        if (!response.ok) {
            const errorText = await response.text();

            // Try the test endpoint as a fallback

            try {
                const testResponse = await fetch(`${API_BASE_URL}/api/test/correlation`);
                if (testResponse.ok) {
                    const testData = await testResponse.json();

                    // Validate test data
                    if (testData && testData.correlation_matrix && Array.isArray(testData.correlation_matrix) &&
                        testData.correlation_matrix.length > 0 && testData.symbols && Array.isArray(testData.symbols)) {

                        // Process test data
                        processCorrelationData(testData);
                        return;
                    } else {
                        throw new Error('Invalid test data format');
                    }
                } else {
                    throw new Error(`Test endpoint failed with status: ${testResponse.status}`);
                }
            } catch (testError) {

                throw new Error(`API error: ${response.status}. Test endpoint also failed: ${testError.message}`);
            }
        }

        // Parse the JSON response
        let data;
        try {
            data = await response.json();

        } catch (jsonError) {

            throw new Error(`Failed to parse JSON response: ${jsonError.message}`);
        }

        // Process the data if valid
        processCorrelationData(data);

    } catch (error) {

        // Show error messages
        if (matrixElement) {
            showError(matrixElement, `Failed to load correlation data: ${error.message}`);
        }

        if (chartContainer) {
            showError(chartContainer, `Failed to load correlation data: ${error.message}`);
        }
    }
}

// Process correlation data and update UI
function processCorrelationData(data) {
    const matrixElement = document.getElementById('correlationMatrix');
    const chartContainer = document.getElementById('correlationChartContainer');

    // Validate data structure
    if (data && data.correlation_matrix && Array.isArray(data.correlation_matrix) &&
        data.correlation_matrix.length > 0 && data.symbols && Array.isArray(data.symbols) &&
        data.symbols.length > 0) {

        // Ensure matrix dimensions match symbols length
        if (data.correlation_matrix.length !== data.symbols.length) {

            // We'll continue anyway and handle this in the processing
        }

        // Check for NaN values in the matrix and replace them with null
        const cleanMatrix = [];

        // Ensure the matrix is properly formatted and handle NaN values
        for (let i = 0; i < data.correlation_matrix.length; i++) {
            const row = data.correlation_matrix[i];
            if (!Array.isArray(row)) {

                continue;
            }

            const cleanRow = [];
            for (let j = 0; j < row.length; j++) {
                let value = row[j];

                // Handle various forms of NaN
                if (value === "NaN" || value === "nan" || value === null ||
                    (typeof value === 'number' && isNaN(value)) ||
                    (typeof value === 'string' && isNaN(parseFloat(value)))) {
                    cleanRow.push(null);
                } else if (typeof value === 'string') {
                    // Try to convert string numbers to actual numbers
                    try {
                        cleanRow.push(parseFloat(value));
                    } catch (e) {

                        cleanRow.push(null);
                    }
                } else {
                    cleanRow.push(value);
                }
            }
            cleanMatrix.push(cleanRow);
        }

        // Update UI components
        updateCorrelationMatrix(cleanMatrix, data.symbols);

        // Update chart separately with error handling
        try {
            updateCorrelationChart(cleanMatrix, data.symbols);
        } catch (chartError) {

            if (chartContainer) {
                showError(chartContainer, `Error rendering chart: ${chartError.message}`);
            }
        }

        updateLastUpdated();

        // Explicitly clear any remaining loading overlays
        clearLoadingOverlays();
    } else {

        if (matrixElement) {
            showError(matrixElement, 'No correlation data available');
        }

        if (chartContainer) {
            showError(chartContainer, 'No correlation data available');
        }
    }
}

// Function to clear all loading overlays
function clearLoadingOverlays() {
    // Find all loading overlays in the document
    const overlays = document.querySelectorAll('.loading-overlay');

    // Remove each overlay
    overlays.forEach(overlay => {

        overlay.remove();
    });
}

// Update correlation matrix table
function updateCorrelationMatrix(correlationMatrix, symbols) {
    const matrixContainer = document.getElementById('correlationMatrix');
    if (!matrixContainer) {

        return;
    }

    // Validate inputs
    if (!correlationMatrix || !Array.isArray(correlationMatrix) || correlationMatrix.length === 0 ||
        !symbols || !Array.isArray(symbols) || symbols.length === 0) {
        showError(matrixContainer, 'Invalid correlation data for matrix display');
        return;
    }

    // Create table
    let tableHTML = '<table class="correlation-table">';

    // Header row
    tableHTML += '<tr><th></th>';
    symbols.forEach(symbol => {
        tableHTML += `<th>${String(symbol).toUpperCase()}</th>`;
    });
    tableHTML += '</tr>';

    // Data rows
    correlationMatrix.forEach((row, rowIndex) => {
        // Skip if rowIndex is out of bounds for symbols array
        if (rowIndex >= symbols.length) {

            return;
        }

        tableHTML += `<tr><th>${String(symbols[rowIndex]).toUpperCase()}</th>`;

        // Ensure row is an array
        if (!Array.isArray(row)) {

            // Add empty cells for this row
            for (let i = 0; i < symbols.length; i++) {
                tableHTML += `<td class="correlation-low">N/A</td>`;
            }
            tableHTML += '</tr>';
            return;
        }

        // Process each cell in the row
        for (let colIndex = 0; colIndex < symbols.length; colIndex++) {
            // Get value, handling case where row might be shorter than symbols array
            const value = colIndex < row.length ? row[colIndex] : null;

            // Check if value is null or NaN
            if (value === null || isNaN(value)) {
                tableHTML += `<td class="correlation-low">N/A</td>`;
                continue;
            }

            // Determine cell color class based on correlation value
            let colorClass = '';
            if (value > 0.7) {
                colorClass = 'correlation-high-positive';
            } else if (value > 0.3) {
                colorClass = 'correlation-medium-positive';
            } else if (value < -0.7) {
                colorClass = 'correlation-high-negative';
            } else if (value < -0.3) {
                colorClass = 'correlation-medium-negative';
            } else {
                colorClass = 'correlation-low';
            }

            // Highlight diagonal (self-correlation) differently
            if (rowIndex === colIndex) {
                colorClass = '';
            }

            try {
                tableHTML += `<td class="${colorClass}">${value.toFixed(2)}</td>`;
            } catch (e) {

                tableHTML += `<td class="correlation-low">Error</td>`;
            }
        }

        tableHTML += '</tr>';
    });

    tableHTML += '</table>';

    // Add legend
    tableHTML += `
        <div class="correlation-legend">
            <div class="legend-item">
                <div class="legend-color correlation-high-positive"></div>
                <span>Strong Positive (>0.7)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color correlation-medium-positive"></div>
                <span>Medium Positive (0.3-0.7)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color correlation-low"></div>
                <span>Low Correlation (-0.3-0.3)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color correlation-medium-negative"></div>
                <span>Medium Negative (-0.7--0.3)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color correlation-high-negative"></div>
                <span>Strong Negative (<-0.7)</span>
            </div>
        </div>
    `;

    matrixContainer.innerHTML = tableHTML;
}

// Update correlation heatmap chart
function updateCorrelationChart(correlationMatrix, symbols) {
    // Check if we have valid data
    if (!correlationMatrix || !symbols || correlationMatrix.length === 0 || symbols.length === 0) {

        const chartContainer = document.getElementById('correlationChartContainer');
        if (chartContainer) {
            showError(chartContainer, 'No valid correlation data available for chart');
        }
        return;
    }

    // Get the canvas element
    let canvas = document.getElementById('correlationChart');
    if (!canvas) {

        // Try to recreate the canvas
        const chartContainer = document.getElementById('correlationChartContainer');
        if (chartContainer) {

            // Create new canvas
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'correlationChart';
            newCanvas.width = 400;
            newCanvas.height = 200;

            // Clear container and add canvas
            chartContainer.innerHTML = '';
            chartContainer.appendChild(newCanvas);

            // Add description
            const description = document.createElement('div');
            description.className = 'text-center mt-3';
            description.innerHTML = '<small class="text-muted">Chart shows correlation between different cryptocurrencies</small>';
            chartContainer.appendChild(description);

            // Try again with the new canvas
            const recreatedCanvas = document.getElementById('correlationChart');
            if (!recreatedCanvas) {

                showError(chartContainer, 'Failed to create chart canvas');
                return;
            }

            canvas = recreatedCanvas;
        } else {

            return;
        }
    }

    // Get the 2D context
    try {

        const ctx = canvas.getContext('2d');
        if (!ctx) {

            // Log canvas properties for debugging

            return;
        }

        // Prepare data for heatmap
        const data = [];
        correlationMatrix.forEach((row, i) => {
            if (i < symbols.length) { // Make sure we have a matching symbol
                row.forEach((value, j) => {
                    // Skip null or NaN values
                    if (value === null || isNaN(value) || j >= symbols.length) {
                        return;
                    }

                    data.push({
                        x: symbols[j].toUpperCase(),
                        y: symbols[i].toUpperCase(),
                        v: value
                    });
                });
            }
        });

        // Check if we have any valid data points
        if (data.length === 0) {

            const chartContainer = document.getElementById('correlationChartContainer');
            if (chartContainer) {
                showError(chartContainer, 'No valid correlation data available for chart');
            }
            return;
        }

        // Destroy existing chart if it exists
        if (correlationChart) {
            try {
                correlationChart.destroy();
            } catch (e) {

            }
        }

        // Remove any loading overlays before creating the chart
        const chartContainer = document.getElementById('correlationChartContainer');
        if (chartContainer) {
            const existingOverlays = chartContainer.querySelectorAll('.loading-overlay, .error-overlay');
            existingOverlays.forEach(overlay => overlay.remove());
        }

        // Create new chart
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e9ecef' : '#212529';
        const backgroundColor = isDark ? '#2d2d2d' : '#ffffff';
        const borderColor = isDark ? '#3d3d3d' : '#e9ecef';

        correlationChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Correlation',
                    data: data,
                    backgroundColor: function(context) {
                        if (!context || !context.raw || context.raw.v === undefined) {
                            return 'rgba(200, 200, 200, 0.5)';
                        }

                        const value = context.raw.v;
                        const theme = document.documentElement.getAttribute('data-theme');

                        // Color scale based on theme and correlation value
                        if (theme === 'light') {
                            if (value < 0) {
                                // Red for negative correlations (light theme)
                                const alpha = Math.min(1, Math.abs(value));
                                return `rgba(239, 68, 68, ${alpha})`;
                            } else {
                                // Green for positive correlations (light theme)
                                const alpha = Math.min(1, value);
                                return `rgba(16, 185, 129, ${alpha})`;
                            }
                        } else {
                            if (value < 0) {
                                // Red for negative correlations (dark theme)
                                const alpha = Math.min(1, Math.abs(value));
                                return `rgba(248, 113, 113, ${alpha})`;
                            } else {
                                // Green for positive correlations (dark theme)
                                const alpha = Math.min(1, value);
                                return `rgba(52, 211, 153, ${alpha})`;
                            }
                        }
                    },
                    borderColor: borderColor,
                    borderWidth: 1,
                    pointRadius: 18,  // Reduced from 25 to 18 to give more space
                    pointHoverRadius: 22  // Reduced from 30 to 22
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'category',
                        position: 'top',
                        title: {
                            display: true,
                            text: 'Cryptocurrency',
                            color: textColor
                        },
                        ticks: {
                            color: textColor,
                            padding: 15,  // Add padding between labels and chart
                            maxRotation: 45,  // Rotate labels to prevent overlap
                            minRotation: 45,  // Ensure consistent rotation
                            font: {
                                size: 11  // Smaller font size
                            },
                            autoSkip: false  // Don't skip labels
                        },
                        grid: {
                            color: borderColor,
                            offset: true  // Offset grid lines to be between ticks
                        },
                        afterFit: function(scaleInstance) {
                            // Add more padding to accommodate rotated labels
                            scaleInstance.paddingTop = 25;  // Add padding at the top
                        }
                    },
                    y: {
                        type: 'category',
                        title: {
                            display: true,
                            text: 'Cryptocurrency',
                            color: textColor
                        },
                        ticks: {
                            color: textColor,
                            padding: 15,  // Add padding between labels and chart
                            font: {
                                size: 11  // Smaller font size
                            },
                            autoSkip: false  // Don't skip labels
                        },
                        grid: {
                            color: borderColor,
                            offset: true  // Offset grid lines to be between ticks
                        },
                        afterFit: function(scaleInstance) {
                            // Add more padding to accommodate labels
                            scaleInstance.paddingLeft = 25;  // Add padding on the left
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 30,
                        right: 30,
                        bottom: 30,
                        left: 30
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: backgroundColor,
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: borderColor,
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                const value = context.raw.v;
                                if (value === null || isNaN(value)) {
                                    return 'Correlation: N/A';
                                }
                                return `Correlation: ${value.toFixed(2)}`;
                            },
                            title: function(context) {
                                if (!context || !context[0] || !context[0].raw) {
                                    return 'Unknown';
                                }
                                return `${context[0].raw.y} vs ${context[0].raw.x}`;
                            }
                        }
                    }
                }
            }
        });

        // Set up resize observer to maintain chart dimensions
        setupChartResizeObserver();
    } catch (error) {

        const chartContainer = document.getElementById('correlationChartContainer');
        if (chartContainer) {
            showError(chartContainer, `Error creating chart: ${error.message}`);
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
    if (!element) {

        return;
    }

    // Special handling for chart container to preserve the canvas
    if (element.id === 'correlationChartContainer') {
        // Create a loading overlay instead of replacing content
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.id = 'chartLoadingOverlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-white">Loading correlation data...</p>
            </div>
        `;

        // Clear any existing overlays
        const existingOverlays = element.querySelectorAll('.loading-overlay, .error-overlay');
        existingOverlays.forEach(overlay => overlay.remove());

        // Add the new overlay
        element.appendChild(loadingOverlay);

        // Set a timeout to automatically remove the loading overlay after 10 seconds
        // This prevents the loading overlay from getting stuck
        setTimeout(() => {
            const overlay = document.getElementById('chartLoadingOverlay');
            if (overlay) {

                overlay.remove();
            }
        }, 10000);
    } else {
        // For other elements, replace the content
        element.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-white">Loading correlation data...</p>
            </div>
        `;
    }
}

// Show error message
function showError(element, message) {
    if (!element) {

        return;
    }

    // Special handling for chart container to preserve the canvas
    if (element.id === 'correlationChartContainer') {
        // Create an error overlay instead of replacing content
        const errorOverlay = document.createElement('div');
        errorOverlay.className = 'error-overlay';
        errorOverlay.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;

        // Clear any existing overlays
        const existingOverlays = element.querySelectorAll('.loading-overlay, .error-overlay');
        existingOverlays.forEach(overlay => overlay.remove());

        // Add the new overlay
        element.appendChild(errorOverlay);
    } else {
        // For other elements, replace the content
        element.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}
