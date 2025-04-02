// background.js - Restructured for Manifest V3
let settings = {
    apiKey: "",
    cacheExpiration: 24, // Hours
    highlightEnabled: true,
    useFallback: true,
    toxicityThreshold: 0.7,
    identityThreshold: 0.5,
    insultThreshold: 0.6
};

let biasCache = {};

// Load settings from chrome.storage.local
function loadSettings() {
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
function saveSetting(key, value) {
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

// Initialize extension
function initialize() {
    loadSettings()
        .then(() => {
            console.log("Background service worker initialized successfully");
        })
        .catch(error => {
            console.error("Error initializing background service worker:", error);
        });
}

// Call initialization
initialize();

// Initialize API key on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get("apiKey", (data) => {
        if (!data.apiKey) {
            // Using your provided API key as the default
            const defaultApiKey = "AIzaSyBiyGVo8nRwozOSvOod-Csj3fAX__VhYq0";
            chrome.storage.local.set({ apiKey: defaultApiKey }, () => {
                console.log("API Key initialized.");
                settings.apiKey = defaultApiKey;
            });
        }
    });
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
        Object.keys(changes).forEach(key => {
            settings[key] = changes[key].newValue;
        });
        console.log("Settings Updated:", settings);
    }
});

// Inject CSS and JS into valid pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        chrome.tabs.get(tabId, (updatedTab) => {
            if (updatedTab && updatedTab.url && /^https?:/.test(updatedTab.url) &&
                !updatedTab.url.startsWith("chrome://") && !updatedTab.url.startsWith("about:")) {

                // Inject CSS and JS
                chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ["content.css"] })
                    .catch(err => console.error("Error injecting CSS:", err));

                chrome.scripting.executeScript({ target: { tabId: tabId }, files: ["bias-data.js", "content.js"] })
                    .catch(err => console.error("Error injecting script:", err));
            }
        });
    }
});

// Handle messaging with content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSettings") {
        sendResponse({ settings, biasCache });
        return true;
    }

    if (request.action === "updateCache") {
        // Add timestamp to each cache entry
        for (const key in request.cache) {
            request.cache[key].timestamp = Date.now();
        }
        Object.assign(biasCache, request.cache);
        chrome.storage.local.set({ biasCache });
        sendResponse({ success: true });
        return true;
    }

    if (request.action === "checkApiKey") {
        sendResponse({
            hasApiKey: !!settings.apiKey,
            apiKey: settings.apiKey
        });
        return true;
    }

    if (request.action === "saveApiKey") {
        saveSetting("apiKey", request.apiKey)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error }));
        return true;
    }
});