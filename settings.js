export let settings = {
    apiKey: "",
    cacheExpiration: 24, // Hours
    highlightEnabled: true,
    toxicityThreshold: 0.7,
    identityThreshold: 0.5,
    insultThreshold: 0.6
};

export let biasCache = {};

// Load settings from chrome.storage.local
export function loadSettings() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([
            "apiKey",
            "cacheExpiration",
            "highlightEnabled",
            "biasCache",
            "toxicityThreshold",
            "identityThreshold",
            "insultThreshold"
        ], function (result) {
            if (chrome.runtime.lastError) {
                console.error("Error retrieving settings:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
            }

            settings.apiKey = result.apiKey || "";
            settings.cacheExpiration = result.cacheExpiration || 24;
            settings.highlightEnabled = result.highlightEnabled ?? true;
            settings.toxicityThreshold = result.toxicityThreshold ?? 0.7;
            settings.identityThreshold = result.identityThreshold ?? 0.5;
            settings.insultThreshold = result.insultThreshold ?? 0.6;
            biasCache = result.biasCache || {};

            console.log("Settings loaded:", settings);
            resolve();
        });
    });
}
