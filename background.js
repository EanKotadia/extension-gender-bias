import { settings, biasCache, loadSettings } from "./settings.js";

// Load settings at startup
await loadSettings();

// Initialize API key on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get("apiKey", (data) => {
        if (!data.apiKey) {
            chrome.storage.local.set({ apiKey: "DEFAULT_API_KEY" }, () => {
                console.log("API Key initialized.");
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

                chrome.scripting.executeScript({ target: { tabId: tabId }, files: ["content.js"] })
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
        Object.assign(biasCache, request.cache);
        chrome.storage.local.set({ biasCache });
        return true;
    }
});
