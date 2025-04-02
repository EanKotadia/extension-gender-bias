export let settings = {
    apiKey: "",
    cacheExpiration: 24, // Hours
    highlightEnabled: true,
    useFallback: true,
    toxicityThreshold: 0.7,
    identityThreshold: 0.5,
    insultThreshold: 0.6
};

export let biasCache = {};

// Load settings from chrome.storage.local
export async function loadSettings() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([
            "apiKey",
            "cacheExpiration",
            "highlightEnabled",
            "useFallback",
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
            settings.useFallback = result.useFallback ?? true;
            settings.toxicityThreshold = result.toxicityThreshold ?? 0.7;
            settings.identityThreshold = result.identityThreshold ?? 0.5;
            settings.insultThreshold = result.insultThreshold ?? 0.6;
            biasCache = result.biasCache || {};

            // Clean up expired cache entries
            cleanExpiredCache();

            console.log("Settings loaded:", settings);
            resolve(settings);
        });
    });
}

function cleanExpiredCache() {
    const now = Date.now();
    const expirationMs = settings.cacheExpiration * 60 * 60 * 1000; // Convert hours to milliseconds

    let hasChanges = false;
    Object.keys(biasCache).forEach(key => {
        if (biasCache[key].timestamp && (now - biasCache[key].timestamp) > expirationMs) {
            delete biasCache[key];
            hasChanges = true;
        }
    });

    if (hasChanges) {
        chrome.storage.local.set({ biasCache });
    }
}

// Save a specific setting
export function saveSetting(key, value) {
    return new Promise((resolve, reject) => {
        const data = {};
        data[key] = value;
        settings[key] = value;

        chrome.storage.local.set(data, function () {
            if (chrome.runtime.lastError) {
                console.error(`Error saving ${key} setting:`, chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
            }
            resolve();
        });
    });
}