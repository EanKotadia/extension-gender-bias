# Bias Detector Chrome Extension

## Overview
The **Bias Detector Chrome Extension** is a tool designed to analyze and detect potential gender bias in online news articles and social media content. It helps users identify biased language and provides insights into the portrayal of different genders in online media.

## Features
- **Real-time Bias Detection**: Analyzes web pages for potentially biased language.
- **Gender Bias Analysis**: Highlights words and phrases that may indicate gender bias.
- **Customizable Settings**: Users can adjust sensitivity levels and toggle detection features.
- **Seamless Integration**: Works on any webpage with minimal disruption to user experience.
- **Lightweight & Fast**: Runs efficiently as a Chrome extension without affecting browser performance.

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/bias-detector-extension.git
   ```
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right corner).
4. Click **Load unpacked** and select the project folder.
5. The extension will be added to your browser.

## How It Works
1. The **content script** scans the webpage for biased language.
2. The **background service worker** processes flagged terms and fetches additional data if needed.
3. The extension **highlights biased text** and provides explanations via a popup.

## Technologies Used
- **JavaScript**: Core functionality and logic.
- **Chrome Extensions API**: For content scripts, background processing, and UI interactions.
