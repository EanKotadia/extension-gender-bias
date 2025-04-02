
export function getApiKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get("apiKey", (data) => {
            if (chrome.runtime.lastError) {
                console.error("Error retrieving API key:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
            }

            if (!data.apiKey) {
                const defaultApiKey = "KEY"; // Replace with your actual default key
                chrome.storage.local.set({ apiKey: defaultApiKey }, () => {
                    console.log("API Key initialized.");
                    resolve(defaultApiKey);
                });
            } else {
                resolve(data.apiKey);
            }
        });
    });
}
