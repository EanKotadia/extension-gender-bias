// Add this to the top of content.js or create a new file called bias-data.js and import it
const genderBiasedWords = [
    {
        biased: "mankind",
        neutral: ["humanity", "humankind", "people"],
        category: "gender"
    },
    {
        biased: "chairman",
        neutral: ["chairperson", "chair"],
        category: "gender"
    },
    {
        biased: "policeman",
        neutral: ["police officer"],
        category: "gender"
    },
    {
        biased: "fireman",
        neutral: ["firefighter"],
        category: "gender"
    },
    {
        biased: "stewardess",
        neutral: ["flight attendant"],
        category: "gender"
    },
    {
        biased: "mailman",
        neutral: ["mail carrier", "postal worker"],
        category: "gender"
    },
    {
        biased: "businessman",
        neutral: ["businessperson", "professional"],
        category: "gender"
    },
    {
        biased: "congresswoman",
        neutral: ["member of congress", "representative"],
        category: "gender"
    },
    {
        biased: "congressman",
        neutral: ["member of congress", "representative"],
        category: "gender"
    },
    {
        biased: "salesgirl",
        neutral: ["salesperson", "sales associate"],
        category: "gender"
    },
    {
        biased: "salesman",
        neutral: ["salesperson", "sales associate"],
        category: "gender"
    }
];
// Global variables
let settings = {
    apiKey: "",
    highlightEnabled: true,
    useFallback: true,
    toxicityThreshold: 0.7,
    identityThreshold: 0.5,
    insultThreshold: 0.6
};
let biasCache = {};

// Load settings when content script starts
loadSettings().then(startObserving);

// Load settings from background script
function loadSettings() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
            if (response && response.settings) {
                settings = response.settings;
                biasCache = response.biasCache || {};
                console.log("Settings loaded in content script:", settings);
            } else {
                console.error("Failed to load settings from background");
            }
            resolve();
        });
    });
}

// Function to start observing the page
function startObserving() {
    // Create observer for text input fields
    const inputObserver = new MutationObserver(handleMutations);

    // Observe document for added nodes
    inputObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Process existing input fields
    processExistingElements();
}

// Process text input fields already on the page
function processExistingElements() {
    const textInputs = document.querySelectorAll('input[type="text"], textarea');
    textInputs.forEach(input => {
        if (!input.hasAttribute('bias-detector-processed')) {
            attachEventListeners(input);
            input.setAttribute('bias-detector-processed', 'true');
        }
    });
}

// Handle DOM mutations
function handleMutations(mutations) {
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if the node is a text input or textarea
                    if ((node.tagName === 'INPUT' && node.type === 'text') || node.tagName === 'TEXTAREA') {
                        attachEventListeners(node);
                        node.setAttribute('bias-detector-processed', 'true');
                    }

                    // Check for inputs within the added node
                    const textInputs = node.querySelectorAll('input[type="text"], textarea');
                    textInputs.forEach(input => {
                        if (!input.hasAttribute('bias-detector-processed')) {
                            attachEventListeners(input);
                            input.setAttribute('bias-detector-processed', 'true');
                        }
                    });
                }
            });
        }
    });
}

// Attach event listeners to input elements
function attachEventListeners(element) {
    element.addEventListener('blur', handleInputBlur);
    element.addEventListener('input', handleInput);
}

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Handle input events with debouncing
const handleInput = debounce(function (event) {
    if (!settings.highlightEnabled) return;

    const text = event.target.value;
    if (text.length > 10) { // Only check if there's meaningful content
        checkBiasPerspective(text).then(results => {
            if (results.length > 0 && results[0].info.isBiased) {
                highlightElement(event.target);
            } else {
                removeHighlight(event.target);
            }
        });
    }
}, 1000); // Wait 1 second after typing stops

// Handle input blur events
async function handleInputBlur(event) {
    if (!settings.highlightEnabled) return;

    const text = event.target.value;
    if (text.trim().length < 10) {
        removeHighlight(event.target);
        return;
    }

    const results = await checkBiasPerspective(text);
    if (results.length > 0 && results[0].info.isBiased) {
        highlightElement(event.target);

        // Show bias information tooltip
        const biasInfo = results[0].info;
        showBiasTooltip(event.target, biasInfo);
    } else {
        removeHighlight(event.target);
    }
}

// Function to highlight biased text elements
function highlightElement(element) {
    element.classList.add('bias-highlight');
}

// Function to remove highlight
function removeHighlight(element) {
    element.classList.remove('bias-highlight');

    // Remove tooltip if it exists
    const tooltip = document.getElementById('bias-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// Show bias tooltip near the element
function showBiasTooltip(element, biasInfo) {
    // Remove existing tooltip if any
    const existingTooltip = document.getElementById('bias-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'bias-tooltip';
    tooltip.className = 'bias-tooltip';

    // Create tooltip content
    let tooltipContent = '<h4>Potential Bias Detected</h4>';
    tooltipContent += `<p>Types: ${biasInfo.biasTypes.join(', ')}</p>`;
    tooltipContent += '<h5>Suggestions:</h5><ul>';

    biasInfo.suggestions.forEach(suggestion => {
        tooltipContent += `<li>${suggestion}</li>`;
    });

    tooltipContent += '</ul>';
    tooltipContent += '<span class="close-tooltip">×</span>';

    tooltip.innerHTML = tooltipContent;

    // Position tooltip near the element
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;

    // Add tooltip to page
    document.body.appendChild(tooltip);

    // Add event listener to close button
    const closeButton = tooltip.querySelector('.close-tooltip');
    closeButton.addEventListener('click', () => {
        tooltip.remove();
    });

    // Auto-close after 10 seconds
    setTimeout(() => {
        if (document.getElementById('bias-tooltip')) {
            tooltip.remove();
        }
    }, 10000);
}

async function checkBiasPerspective(text) {
    if (text.trim().length < 10) return [];

    const textHash = hashString(text);
    if (biasCache[textHash]) {
        return biasCache[textHash].isBiased ? [{
            term: text,
            info: biasCache[textHash]
        }] : [];
    }

    if (!settings.apiKey && !settings.useFallback) {
        console.warn("No API key set for Perspective API and fallback is disabled");
        return [];
    }

    if (!settings.apiKey) {
        console.warn("No API key set for Perspective API, using fallback");
        return checkBiasFallback(text);
    }

    const timeout = 5000; // Timeout in milliseconds (5 seconds)

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("API request timed out")), timeout)
    );

    try {
        const response = await Promise.race([
            fetch(`https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${settings.apiKey}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    comment: { text },
                    languages: ["en"],
                    requestedAttributes: {
                        IDENTITY_ATTACK: {},
                        TOXICITY: {},
                        SEVERE_TOXICITY: {},
                        INSULT: {},
                        THREAT: {},
                        PROFANITY: {}
                    }
                })
            }),
            timeoutPromise // If this wins, the API request will be considered as failed
        ]);

        const data = await response.json();

        // Check if API returned an error
        if (data.error) {
            console.error("Perspective API error:", data.error);
            // Use fallback if API returns an error
            return settings.useFallback ? checkBiasFallback(text) : [];
        }

        const results = processBiasData(data, text, textHash);

        // Update cache in background script
        updateCache({
            [textHash]: biasCache[textHash]
        });

        return results;

    } catch (error) {
        console.error("Error checking bias with Perspective API or timeout:", error);
        // Fallback to alternative method if API fails or times out
        return settings.useFallback ? checkBiasFallback(text) : [];
    }
}

// Update the bias cache in background script
function updateCache(newCacheData) {
    chrome.runtime.sendMessage({
        action: "updateCache",
        cache: newCacheData
    });
}

// Process the bias data
function processBiasData(data, originalText, textHash) {
    let isBiased = false;
    let suggestions = [];
    let biasTypes = [];

    if (data.attributeScores) {
        // Get threshold values from settings (or use defaults)
        const toxicityThreshold = settings.toxicityThreshold || 0.7;
        const identityThreshold = settings.identityThreshold || 0.5;
        const insultThreshold = settings.insultThreshold || 0.6;

        const scores = {
            identity: data.attributeScores.IDENTITY_ATTACK?.summaryScore?.value || 0,
            toxicity: data.attributeScores.TOXICITY?.summaryScore?.value || 0,
            severeToxicity: data.attributeScores.SEVERE_TOXICITY?.summaryScore?.value || 0,
            insult: data.attributeScores.INSULT?.summaryScore?.value || 0,
            threat: data.attributeScores.THREAT?.summaryScore?.value || 0,
            profanity: data.attributeScores.PROFANITY?.summaryScore?.value || 0,
        };

        if (scores.identity > identityThreshold) {
            isBiased = true;
            biasTypes.push("identity-based language");
            suggestions.push("Consider using more inclusive, identity-neutral language.");
        }

        if (scores.toxicity > toxicityThreshold || scores.severeToxicity > 0.5) {
            isBiased = true;
            biasTypes.push("potentially toxic language");
            suggestions.push("Review this text for potentially harmful content.");
        }

        if (scores.insult > insultThreshold) {
            isBiased = true;
            biasTypes.push("insulting language");
            suggestions.push("Consider rephrasing to avoid language that could be perceived as insulting.");
        }

        if (scores.threat > 0.5) {
            isBiased = true;
            biasTypes.push("threatening language");
            suggestions.push("This language may be perceived as threatening.");
        }

        if (scores.profanity > 0.7) {
            isBiased = true;
            biasTypes.push("profanity");
            suggestions.push("Consider using more professional language.");
        }
    }

    // Check for gender-biased terms in the original text
    const genderBiasResults = checkForGenderBias(originalText);
    if (genderBiasResults.length > 0) {
        isBiased = true;
        biasTypes.push("gender-biased language");
        genderBiasResults.forEach(result => {
            const alternativesText = result.neutral.join(", ");
            suggestions.push(`Replace "${result.biased}" with ${alternativesText}.`);
        });
    }

    // Cache the result with timestamp
    biasCache[textHash] = {
        isBiased,
        suggestions,
        biasTypes,
        timestamp: Date.now()
    };

    return isBiased ? [{ term: originalText, info: biasCache[textHash] }] : [];
}

// Fallback method for bias checking if Perspective API fails
function checkBiasFallback(text) {
    const textHash = hashString(text);
    const genderBiasResult = checkForGenderBias(text);

    let result;

    if (genderBiasResult.length > 0) {
        result = {
            term: text,
            info: {
                isBiased: true,
                suggestions: genderBiasResult.map(result =>
                    `Replace "${result.biased}" with ${result.neutral.join(", ")}.`
                ),
                biasTypes: ["gender-biased language"],
                timestamp: Date.now()
            }
        };
    } else {
        // If no bias detected in fallback, don't mark as biased
        result = {
            term: text,
            info: {
                isBiased: false,
                suggestions: [],
                biasTypes: [],
                timestamp: Date.now()
            }
        };
    }

    // Cache the result
    biasCache[textHash] = result.info;

    // Update cache in background
    updateCache({
        [textHash]: result.info
    });

    return result.info.isBiased ? [result] : [];
}

// Gender bias check function
function checkForGenderBias(text) {
    const results = [];
    const words = text.split(/\b/); // Split by word boundaries

    for (const word of words) {
        const lowerWord = word.toLowerCase().trim();
        if (!lowerWord) continue;

        for (const term of genderBiasedWords) {
            const biasedLower = term.biased.toLowerCase();
            if (lowerWord === biasedLower ||
                lowerWord === biasedLower + "s" || // Handle plurals
                lowerWord === biasedLower + "'s") { // Handle possessives
                results.push({
                    biased: word,
                    neutral: term.neutral,
                    category: term.category
                });
                break;
            }
        }
    }

    return results;
}

// Hash function for caching results
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}