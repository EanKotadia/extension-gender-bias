document.addEventListener('DOMContentLoaded', function () {
    const highlightToggle = document.getElementById('highlightToggle');
    const fallbackToggle = document.getElementById('fallbackToggle');
    const apiStatus = document.getElementById('apiStatus');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyButton = document.getElementById('saveApiKey');

    if (!highlightToggle || !fallbackToggle || !apiStatus || !apiKeyInput || !saveApiKeyButton) {
        console.error("Error: One or more popup elements not found.");
        return;
    }

    // Check API key status
    chrome.runtime.sendMessage({ action: "checkApiKey" }, function (response) {
        if (chrome.runtime.lastError) {
            console.error("Error checking API key:", chrome.runtime.lastError);
            apiStatus.textContent = 'API Status: Error';
            apiStatus.style.color = '#f44336'; // Red
            return;
        }

        if (response && response.hasApiKey) {
            apiKeyInput.value = response.apiKey;
            apiStatus.textContent = 'API Status: Configured';
            apiStatus.style.color = '#4CAF50'; // Green

            // Test API key validity
            testApiKey(response.apiKey);
        } else {
            apiStatus.textContent = 'API Status: Not Configured';
            apiStatus.style.color = '#f44336'; // Red
        }
    });

    // Load current settings with error handling
    chrome.storage.local.get(['highlightEnabled', 'useFallback'], function (result) {
        if (chrome.runtime.lastError) {
            console.error("Error retrieving settings:", chrome.runtime.lastError);
            return;
        }

        highlightToggle.checked = result.highlightEnabled ?? true; // Default: true
        fallbackToggle.checked = result.useFallback ?? true; // Default: true
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

    // Save API key button handler
    saveApiKeyButton.addEventListener('click', function () {
        const newApiKey = apiKeyInput.value.trim();

        if (!newApiKey) {
            apiStatus.textContent = 'API Status: Please Enter a Key';
            apiStatus.style.color = '#f44336'; // Red
            return;
        }

        apiStatus.textContent = 'API Status: Saving...';
        apiStatus.style.color = '#FFA000'; // Amber

        chrome.runtime.sendMessage({
            action: "saveApiKey",
            apiKey: newApiKey
        }, function (response) {
            if (chrome.runtime.lastError || !response || !response.success) {
                apiStatus.textContent = 'API Status: Save Failed';
                apiStatus.style.color = '#f44336'; // Red
                return;
            }

            apiStatus.textContent = 'API Status: Testing Key...';
            testApiKey(newApiKey);
        });
    });

    // Function to test API key validity
    function testApiKey(apiKey) {
        // Simple test text to check if API key works
        const testText = "This is a test.";

        fetch(`https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                comment: { text: testText },
                languages: ["en"],
                requestedAttributes: {
                    TOXICITY: {}
                }
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error("API key test failed:", data.error);
                    apiStatus.textContent = 'API Status: Invalid Key';
                    apiStatus.style.color = '#f44336'; // Red
                } else {
                    console.log("API key test successful");
                    apiStatus.textContent = 'API Status: Working';
                    apiStatus.style.color = '#4CAF50'; // Green
                }
            })
            .catch(error => {
                console.error("Error testing API key:", error);
                apiStatus.textContent = 'API Status: Error';
                apiStatus.style.color = '#f44336'; // Red
            });
    }
});