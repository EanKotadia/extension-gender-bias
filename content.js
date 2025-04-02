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

async function checkBiasPerspective(text) {
    if (text.trim().length < 10) return [];

    const textHash = hashString(text);
    if (biasCache[textHash]) {
        return biasCache[textHash].isBiased ? [{
            term: text,
            info: biasCache[textHash]
        }] : [];
    }

    if (!settings.apiKey) {
        console.warn("No API key set for Perspective API");
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
        return processBiasData(data, text, textHash);

    } catch (error) {
        console.error("Error checking bias with Perspective API or timeout:", error);
        // Fallback to alternative method if API fails or times out
        return checkBiasFallback(text);
    }
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

    // Cache the result
    biasCache[textHash] = { isBiased, suggestions, biasTypes };

    return isBiased ? [{ term: originalText, info: biasCache[textHash] }] : [];
}

// Fallback method for bias checking if Perspective API fails
function checkBiasFallback(text) {
    const results = [];
    const genderBiasResult = checkForGenderBias(text);

    if (genderBiasResult.length > 0) {
        results.push({
            term: text,
            info: {
                isBiased: true,
                suggestions: genderBiasResult.map(result =>
                    `Replace "${result.biased}" with ${result.neutral.join(", ")}.`
                ),
                biasTypes: ["gender-biased language"]
            }
        });
    } else {
        results.push({
            term: text,
            info: {
                isBiased: false,
                suggestions: ["No bias detected in the fallback check. Consider reviewing manually."],
                biasTypes: []
            }
        });
    }

    console.log("Using fallback analysis due to API failure or timeout.");
    return results;
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
