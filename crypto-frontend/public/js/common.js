/**
 * Common JavaScript functionality for all pages
 */

document.addEventListener('DOMContentLoaded', function() {
    initSvgIcons();
    initThemeSwitcher();
    initNavigation();
});

/**
 * Initialize SVG icons throughout the page
 */
function initSvgIcons() {
    // Logo icon
    const logoIconElement = document.getElementById('logoIcon');
    if (logoIconElement) {
        logoIconElement.innerHTML = coinsIcon('logo-icon');
    }

    // Theme toggle icons
    const moonIconElement = document.getElementById('moonIcon');
    if (moonIconElement) {
        moonIconElement.innerHTML = moonIcon('theme-icon');
    }

    const sunIconElement = document.getElementById('sunIcon');
    if (sunIconElement) {
        sunIconElement.innerHTML = sunIcon('theme-icon');
    }

    // UI icons
    const listIconElement = document.getElementById('listIcon');
    if (listIconElement) {
        listIconElement.innerHTML = listIcon('ui-icon');
    }

    const searchIconElement = document.getElementById('searchIcon');
    if (searchIconElement) {
        searchIconElement.innerHTML = searchIcon('ui-icon');
    }

    // Social icons
    const githubLinkElement = document.getElementById('githubLink');
    if (githubLinkElement) {
        githubLinkElement.innerHTML = githubIcon('social-icon');
    }

    const xLinkElement = document.getElementById('xLink');
    if (xLinkElement) {
        xLinkElement.innerHTML = xIcon('social-icon');
    }

    const discordLinkElement = document.getElementById('discordLink');
    if (discordLinkElement) {
        discordLinkElement.innerHTML = discordIcon('social-icon');
    }
}

/**
 * Initialize theme switcher functionality
 */
function initThemeSwitcher() {
    // Add theme toggle button to header if it doesn't exist
    addThemeToggleButton();

    // Get theme from localStorage or use default
    const savedTheme = localStorage.getItem('theme') || 'dark';

    // Apply the theme
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Update the navbar
    updateNavbar(savedTheme);

    // Update the animated background
    updateAnimatedBackground(savedTheme);

    // Update all text elements to use theme colors
    updateTextElements(savedTheme);

    // Update charts if they exist
    updateCharts(savedTheme);

    // Dispatch a custom event for other scripts to listen for theme initialization
    document.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme: savedTheme }
    }));

    // Add event listener to theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Remove any existing event listeners to prevent duplicates
        const newThemeToggle = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(newThemeToggle, themeToggle);

        // Add the event listener to the new button
        newThemeToggle.addEventListener('click', function(e) {

            e.preventDefault();
            toggleTheme();
        });

    } else {

    }

    // Force a redraw of the page to ensure all theme variables are applied
    setTimeout(() => {
        document.body.style.display = 'none';
        document.body.offsetHeight; // Force a reflow
        document.body.style.display = '';

    }, 100);
}

/**
 * Add theme toggle button to the header if it doesn't exist
 */
function addThemeToggleButton() {
    // Check if theme toggle already exists
    if (document.getElementById('themeToggle')) {
        return;
    }

    // Find the header content div
    const headerContent = document.querySelector('.header-content');
    if (!headerContent) {

        return;
    }

    // Check if theme switcher container exists
    let themeSwitcher = headerContent.querySelector('.theme-switcher');

    // Create theme switcher if it doesn't exist
    if (!themeSwitcher) {
        themeSwitcher = document.createElement('div');
        themeSwitcher.className = 'theme-switcher';
        headerContent.appendChild(themeSwitcher);
    }

    // Create theme toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'themeToggle';
    toggleButton.className = 'theme-toggle';
    toggleButton.setAttribute('aria-label', 'Toggle theme');
    toggleButton.innerHTML = `
        <span id="moonIcon">${moonIcon('theme-icon')}</span>
        <span id="sunIcon">${sunIcon('theme-icon')}</span>
    `;

    // Add button to theme switcher
    themeSwitcher.appendChild(toggleButton);
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    // Update theme attribute
    document.documentElement.setAttribute('data-theme', newTheme);

    // Save theme preference
    localStorage.setItem('theme', newTheme);

    // Update charts if they exist
    updateCharts(newTheme);

    // Update all text elements to use theme colors
    updateTextElements(newTheme);

    // Update the animated background
    updateAnimatedBackground(newTheme);

    // Update the navbar
    updateNavbar(newTheme);

    // Update theme-specific elements
    updateThemeSpecificElements(newTheme);

    // Dispatch a custom event for other scripts to listen for theme changes
    // This should be done after all the updates to ensure the event handlers have the latest state
    document.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme: newTheme }
    }));

    // Force a complete redraw after a short delay
    setTimeout(() => {
        // Force a redraw of the page
        document.body.style.display = 'none';
        document.body.offsetHeight; // Force a reflow
        document.body.style.display = '';

        // Dispatch another themeChanged event after the redraw
        // This ensures that any components that need to update after the redraw can do so
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: newTheme }
        }));

    }, 100);
}

/**
 * Update theme-specific elements
 */
function updateThemeSpecificElements(theme) {
    const isDark = theme === 'dark';

    // Update sentiment tables if they exist
    const sentimentTables = document.querySelectorAll('.sentiment-table');
    sentimentTables.forEach(table => {
        // Reset any inline styles
        table.style.backgroundColor = '';
        table.style.color = '';

        // Force table headers to use theme colors
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
            header.style.backgroundColor = '';
            header.style.color = '';
        });

        // Force table cells to use theme colors
        const cells = table.querySelectorAll('td');
        cells.forEach(cell => {
            cell.style.color = '';
        });
    });

    // Update sentiment rankings headings
    const rankingsHeadings = document.querySelectorAll('.sentiment-rankings-panel h3');
    rankingsHeadings.forEach(heading => {
        heading.style.color = '';
    });
}

/**
 * Update the animated background based on theme
 */
function updateAnimatedBackground(theme) {
    const animatedBg = document.querySelector('.animated-bg');
    if (animatedBg) {
        // Reset any inline styles
        animatedBg.style.background = '';
        animatedBg.style.opacity = '';
    }
}

/**
 * Update navbar based on theme
 */
function updateNavbar(theme) {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        // Reset any inline styles
        navbar.style.backgroundColor = '';

        // Ensure navbar has the correct class
        if (theme === 'dark') {
            navbar.classList.add('navbar-dark');
            navbar.classList.remove('navbar-light');
        } else {
            navbar.classList.add('navbar-light');
            navbar.classList.remove('navbar-dark');
        }
    }
}

/**
 * Update text elements to use theme colors
 */
function updateTextElements(theme) {
    const isDark = theme === 'dark';

    // Force body to use theme variables
    document.body.style.backgroundColor = '';
    document.body.style.color = '';

    // Update all elements with inline styles that might override theme
    const elementsToReset = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'li', 'a',
        'button', 'input', 'select', 'textarea', 'label', 'table', 'th', 'td'
    ];

    // Create a selector for all these elements
    const selector = elementsToReset.join(', ');

    // Reset all these elements to use CSS variables
    document.querySelectorAll(selector).forEach(el => {
        el.style.color = '';
        if (el.style.backgroundColor) {
            el.style.backgroundColor = '';
        }
    });

    // Update specific components

    // Update cards
    document.querySelectorAll('.card').forEach(el => {
        el.style.backgroundColor = '';
        el.style.borderColor = '';
        el.style.color = '';
    });

    // Update card headers
    document.querySelectorAll('.card-header').forEach(el => {
        el.style.backgroundColor = '';
        el.style.color = '';
    });

    // Update card bodies
    document.querySelectorAll('.card-body').forEach(el => {
        el.style.backgroundColor = '';
        el.style.color = '';
    });

    // Update navbar
    document.querySelectorAll('.navbar').forEach(el => {
        el.style.backgroundColor = '';
    });

    // Update navbar links
    document.querySelectorAll('.nav-link').forEach(el => {
        el.style.color = '';
    });

    // Update app header
    document.querySelectorAll('.app-header').forEach(el => {
        el.style.backgroundColor = '';
        el.style.color = '';
    });

    // Update app footer
    document.querySelectorAll('.app-footer').forEach(el => {
        el.style.backgroundColor = '';
        el.style.color = '';
    });

    // Update buttons
    document.querySelectorAll('.btn').forEach(el => {
        // Only reset if not a specific button type that should keep its color
        if (!el.classList.contains('btn-primary') &&
            !el.classList.contains('btn-secondary') &&
            !el.classList.contains('btn-success') &&
            !el.classList.contains('btn-danger')) {
            el.style.backgroundColor = '';
            el.style.color = '';
        }
    });

    // Force a redraw of the page
    document.body.style.display = 'none';
    document.body.offsetHeight; // Force a reflow
    document.body.style.display = '';
}

/**
 * Update chart themes if charts exist on the page
 */
function updateCharts(theme) {
    // Check if we're on the normalized-trend page
    const isNormalizedTrendPage = window.location.pathname.includes('normalized-trend');

    // Update price chart if it exists (on index page) and we're not on the normalized-trend page
    if (!isNormalizedTrendPage && typeof priceChart !== 'undefined' && priceChart) {
        updatePriceChartTheme(theme);
    }

    // Update correlation chart if it exists (on correlation page)
    if (typeof correlationChart !== 'undefined' && correlationChart) {
        updateCorrelationChartTheme(theme);
    }

    // Update volatility chart if it exists (on volatility page)
    if (typeof volatilityChart !== 'undefined' && volatilityChart) {
        updateVolatilityChartTheme(theme);
    }

    // Update normalized trend chart if it exists (on normalized-trend page)
    if (typeof normalizedTrendChart !== 'undefined' && normalizedTrendChart) {
        updateNormalizedTrendChartTheme(theme);
    }

    // Update sentiment charts if they exist (on sentiment page)
    if (typeof sentimentTrendChart !== 'undefined' && sentimentTrendChart) {
        updateSentimentChartTheme(theme);
    }

    // Dispatch theme changed event for other components
    document.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme: theme }
    }));
}

/**
 * Update price chart theme (index page)
 */
function updatePriceChartTheme(theme) {
    const isDark = theme === 'dark';

    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e9ecef' : '#212529';

    if (priceChart) {
        priceChart.options.scales.x.grid.color = gridColor;
        priceChart.options.scales.y.grid.color = gridColor;
        priceChart.options.scales.x.ticks.color = textColor;
        priceChart.options.scales.y.ticks.color = textColor;
        priceChart.options.plugins.tooltip.backgroundColor = isDark ? '#2d2d2d' : '#ffffff';
        priceChart.options.plugins.tooltip.titleColor = isDark ? '#e9ecef' : '#212529';
        priceChart.options.plugins.tooltip.bodyColor = isDark ? '#e9ecef' : '#212529';
        priceChart.options.plugins.tooltip.borderColor = isDark ? '#3d3d3d' : '#e9ecef';
        priceChart.update();
    }
}

/**
 * Update correlation chart theme (correlation page)
 */
function updateCorrelationChartTheme(theme) {
    const isDark = theme === 'dark';

    if (correlationChart) {
        correlationChart.options.scales.x.ticks.color = isDark ? '#e9ecef' : '#212529';
        correlationChart.options.scales.y.ticks.color = isDark ? '#e9ecef' : '#212529';
        correlationChart.options.plugins.tooltip.backgroundColor = isDark ? '#2d2d2d' : '#ffffff';
        correlationChart.options.plugins.tooltip.titleColor = isDark ? '#e9ecef' : '#212529';
        correlationChart.options.plugins.tooltip.bodyColor = isDark ? '#e9ecef' : '#212529';
        correlationChart.update();
    }
}

/**
 * Update normalized trend chart theme (normalized-trend page)
 * Note: This function is now defined in normalized-trend.js
 * This is kept for backward compatibility
 */
function updateNormalizedTrendChartTheme(theme) {

    // Check if we're on the normalized-trend page
    if (window.location.pathname.includes('normalized-trend')) {

        return; // Let normalized-trend.js handle it
    }

    // For other pages that might use this function
    const isDark = theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e9ecef' : '#212529';

    if (typeof normalizedTrendChart !== 'undefined' && normalizedTrendChart) {

        try {
            // Update scales
            normalizedTrendChart.options.scales.x.grid.color = gridColor;
            normalizedTrendChart.options.scales.y.grid.color = gridColor;
            normalizedTrendChart.options.scales.x.ticks.color = textColor;
            normalizedTrendChart.options.scales.y.ticks.color = textColor;

            // Update scale titles
            if (normalizedTrendChart.options.scales.x.title) {
                normalizedTrendChart.options.scales.x.title.color = textColor;
            }
            if (normalizedTrendChart.options.scales.y.title) {
                normalizedTrendChart.options.scales.y.title.color = textColor;
            }

            // Update tooltip
            normalizedTrendChart.options.plugins.tooltip.backgroundColor = isDark ? '#2d2d2d' : '#ffffff';
            normalizedTrendChart.options.plugins.tooltip.titleColor = isDark ? '#e9ecef' : '#212529';
            normalizedTrendChart.options.plugins.tooltip.bodyColor = isDark ? '#e9ecef' : '#212529';
            normalizedTrendChart.options.plugins.tooltip.borderColor = isDark ? '#3d3d3d' : '#e9ecef';

            // Update legend
            if (normalizedTrendChart.options.plugins.legend && normalizedTrendChart.options.plugins.legend.labels) {
                normalizedTrendChart.options.plugins.legend.labels.color = textColor;
            }

            // Apply changes
            normalizedTrendChart.update();
        } catch (error) {

        }
    }
}

/**
 * Update sentiment chart theme (sentiment page)
 */
function updateSentimentChartTheme(theme) {
    const isDark = theme === 'dark';

    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e9ecef' : '#212529';

    if (sentimentTrendChart) {
        sentimentTrendChart.options.scales.x.grid.color = gridColor;
        sentimentTrendChart.options.scales.y.grid.color = gridColor;
        sentimentTrendChart.options.scales.x.ticks.color = textColor;
        sentimentTrendChart.options.scales.y.ticks.color = textColor;
        sentimentTrendChart.options.plugins.tooltip.backgroundColor = isDark ? '#2d2d2d' : '#ffffff';
        sentimentTrendChart.options.plugins.tooltip.titleColor = isDark ? '#e9ecef' : '#212529';
        sentimentTrendChart.options.plugins.tooltip.bodyColor = isDark ? '#e9ecef' : '#212529';
        sentimentTrendChart.options.plugins.tooltip.borderColor = isDark ? '#3d3d3d' : '#e9ecef';
        sentimentTrendChart.update();
    }

    // Update sentiment gauge if it exists
    if (typeof sentimentGauge !== 'undefined' && sentimentGauge) {
        // Update gauge colors based on theme
        const gaugeOptions = sentimentGauge.options;
        if (gaugeOptions && gaugeOptions.plugins && gaugeOptions.plugins.doughnutlabel) {
            gaugeOptions.plugins.doughnutlabel.labels.forEach(label => {
                if (label.font && label.font.color) {
                    label.font.color = textColor;
                }
            });
        }
        sentimentGauge.update();
    }
}

/**
 * Update volatility chart theme (volatility page)
 */
function updateVolatilityChartTheme(theme) {
    const isDark = theme === 'dark';

    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e9ecef' : '#212529';

    if (volatilityChart) {
        volatilityChart.options.scales.x.grid.color = gridColor;
        volatilityChart.options.scales.y.grid.color = gridColor;
        volatilityChart.options.scales.x.ticks.color = textColor;
        volatilityChart.options.scales.y.ticks.color = textColor;
        volatilityChart.options.plugins.tooltip.backgroundColor = isDark ? '#2d2d2d' : '#ffffff';
        volatilityChart.options.plugins.tooltip.titleColor = isDark ? '#e9ecef' : '#212529';
        volatilityChart.options.plugins.tooltip.bodyColor = isDark ? '#e9ecef' : '#212529';
        volatilityChart.options.plugins.tooltip.borderColor = isDark ? '#3d3d3d' : '#e9ecef';
        volatilityChart.update();
    }
}

/**
 * Initialize navigation highlighting
 */
function initNavigation() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-link');

    // Get the current page URL
    const currentPage = window.location.pathname;

    // Loop through each link and set the active class if it matches the current page
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}
