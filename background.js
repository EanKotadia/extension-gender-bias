import { settings, biasCache, loadSettings, saveSetting } from "./settings.js";


// Load settings at startup
await loadSettings();

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