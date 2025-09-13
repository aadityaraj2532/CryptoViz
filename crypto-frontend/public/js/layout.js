/**
 * Common layout functionality for header and footer
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize header and footer functionality
    initHeaderAndFooter();

    // Add direct event listener to theme toggle button
    setupThemeToggle();
});

/**
 * Initialize header and footer functionality
 */
function initHeaderAndFooter() {
    
    // Apply current theme to header and footer
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateHeaderFooterStyles(currentTheme);

    // Listen for theme changes
    document.addEventListener('themeChanged', function(e) {
        
        updateHeaderFooterStyles(e.detail.theme);
    });
}

/**
 * Setup theme toggle button
 */
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {

        // Remove any existing event listeners to prevent duplicates
        const newThemeToggle = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(newThemeToggle, themeToggle);

        // Add direct event listener
        newThemeToggle.addEventListener('click', function(e) {
            
            e.preventDefault();

            // Get current theme
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            // Update theme attribute
            document.documentElement.setAttribute('data-theme', newTheme);

            // Save theme preference
            localStorage.setItem('theme', newTheme);

            // Dispatch theme changed event
            document.dispatchEvent(new CustomEvent('themeChanged', {
                detail: { theme: newTheme }
            }));

            // Force a redraw
            document.body.style.display = 'none';
            document.body.offsetHeight; // Force a reflow
            document.body.style.display = '';
        });
    } else {
        
    }
}

/**
 * Update header and footer styles based on theme
 */
function updateHeaderFooterStyles(theme) {
    
    const isDark = theme === 'dark';

    // Force header and footer to use theme colors
    const header = document.querySelector('.app-header');
    const footer = document.querySelector('.app-footer');

    if (header) {
        
        // Reset any inline styles
        header.style.backgroundColor = '';

        // Force a redraw
        header.style.display = 'none';
        header.offsetHeight; // Force a reflow
        header.style.display = '';

        // Set the background color explicitly with !important
        header.setAttribute('style', `background-color: var(--card-bg) !important; transition: background-color 0.3s ease;`);
    }

    if (footer) {
        
        // Reset any inline styles
        footer.style.backgroundColor = '';

        // Force a redraw
        footer.style.display = 'none';
        footer.offsetHeight; // Force a reflow
        footer.style.display = '';

        // Set the background color explicitly with !important
        footer.setAttribute('style', `background-color: var(--card-bg) !important; transition: background-color 0.3s ease;`);
    }

    // Update card headers
    const cardHeaders = document.querySelectorAll('.card-header');
    cardHeaders.forEach(header => {
        header.style.backgroundColor = '';
        header.style.color = '';
    });

    // Update card bodies
    const cardBodies = document.querySelectorAll('.card-body');
    cardBodies.forEach(body => {
        body.style.backgroundColor = '';
        body.style.color = '';
    });

    // Update chart titles
    const chartTitles = document.querySelectorAll('.crypto-info h2');
    chartTitles.forEach(title => {
        title.style.color = '';
    });
}
