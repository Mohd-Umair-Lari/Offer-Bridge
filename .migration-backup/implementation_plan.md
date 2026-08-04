# Chrome Extension Crawler (Price & Offer Extractor)

This plan outlines the architecture for building a Chrome Extension that mimics tools like "Price History". Since backend headless browsers (Playwright/Puppeteer) are frequently blocked by Amazon and Flipkart's anti-bot mechanisms, this extension will run directly in the user's authenticated browser session. This completely bypasses bot detection because the extraction happens on the client side.

## User Review Required

> [!IMPORTANT]
> **Data Transfer Method:** To seamlessly move the extracted data from Amazon to Offer-Bridge, I propose that the extension will inject a "Send to Offer-Bridge" button on Amazon/Flipkart product pages. When clicked, the extension will extract the price and offers, temporarily save this to your database via an API, and then redirect the user to the `New Request` page on Offer-Bridge with the data pre-filled. Do you approve of this user flow?

> [!NOTE]
> **LLM Usage for Best Offer calculation:** The extension will extract raw text (e.g., "Flat INR 1500 Off on HDFC"). To calculate the "Best Offer", we will send this raw text to your existing backend, where we will use an LLM API (if you have one configured) or basic regex to find the highest discount. Do you have an OpenAI/Gemini API key available for parsing the offers, or should I write standard regex rules to find the numbers?

## Proposed Changes

We will create a new folder `chrome-extension` in the root of the project to house the extension code.

### Extension Files
#### [NEW] chrome-extension/manifest.json
The Chrome extension manifest file (V3) requiring permissions for `activeTab`, `scripting`, and host permissions for `*://*.amazon.in/*` and `*://*.flipkart.com/*`.

#### [NEW] chrome-extension/content.js
This script will be injected into Amazon and Flipkart pages. 
- It will read the DOM to extract the product price (`.a-price-whole`, etc.).
- It will find and extract the text for Credit Card discounts (e.g. from the offers section).
- It will inject a floating "Create Offer-Bridge Request" button on the screen.

#### [NEW] chrome-extension/background.js
A service worker that handles communication between the content script and your Offer-Bridge backend.

### Offer-Bridge Backend
#### [NEW] src/app/api/extension/draft/route.js
A new Next.js API route that the Chrome extension will `POST` the scraped data to. It will save the raw data in MongoDB (creating a temporary "draft") and return a `draftId`. 

### Offer-Bridge Frontend
#### [MODIFY] src/components/buyer/NewRequest.jsx
Update the `NewRequest` form so that if a `?draftId=...` is present in the URL, it fetches the scraped data (Price, Offers) from the backend and auto-fills the "Amount" and "Discount" input fields.

## Verification Plan

### Manual Verification
1. I will write the extension files in the `chrome-extension` folder.
2. I will ask you to load this folder into Chrome (`chrome://extensions/` -> Developer Mode -> Load Unpacked).
3. You will go to an Amazon product page and click the newly injected "Offer-Bridge" button.
4. We will verify that it extracts the correct price and redirects you back to your `localhost` Offer-Bridge app with the fields successfully populated.
