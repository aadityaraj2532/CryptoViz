/**
 * Configuration file for CryptoViz frontend
 * 
 * This file contains global configuration settings for the application,
 * including API endpoints and other environment-specific variables.
 */

// Determine the API base URL based on the current environment
const API_BASE_URL = determineApiBaseUrl();

/**
 * Determines the appropriate API base URL based on the current environment
 * 
 * @returns {string} The base URL for API requests
 */
function determineApiBaseUrl() {
    return 'http://127.0.0.1:5000';
}
