document.addEventListener('DOMContentLoaded', function () {
    const highlightToggle = document.getElementById('highlightToggle');
    const fallbackToggle = document.getElementById('fallbackToggle');
    const apiStatus = document.getElementById('apiStatus');

    if (!highlightToggle || !fallbackToggle || !apiStatus) {
        console.error("Error: One or more popup elements not found.");
        return;
    }

    // Load current settings with error handling
    chrome.storage.local.get(['highlightEnabled', 'useFallback', 'apiKey'], function (result) {
        if (chrome.runtime.lastError) {
            console.error("Error retrieving settings:", chrome.runtime.lastError);
            return;
        }

        highlightToggle.checked = result.highlightEnabled ?? true; // Default: true
        fallbackToggle.checked = result.useFallback ?? true; // Default: true

        // Update API status UI
        if (result.apiKey) {
            apiStatus.textContent = 'API Status: Configured';
            apiStatus.style.color = '#4CAF50'; // Green
        } else {
            apiStatus.textContent = 'API Status: Not Configured';
            apiStatus.style.color = '#f44336'; // Red
        }
    });

    // Save highlight setting when toggled
    highlightToggle.addEventListener('change', function () {
        chrome.storage.local.set({ highlightEnabled: highlightToggle.checked }, function () {
            if (chrome.runtime.lastError) {
                console.error("Error saving highlightEnabled setting:", chrome.runtime.lastError);
            }
        });
    });

    // Save fallback setting when toggled
    fallbackToggle.addEventListener('change', function () {
        chrome.storage.local.set({ useFallback: fallbackToggle.checked }, function () {
            if (chrome.runtime.lastError) {
                console.error("Error saving useFallback setting:", chrome.runtime.lastError);
            }
        });
    });
});
