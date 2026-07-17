# Offer-Bridge Chrome Extension

Injects a **"Send to Offer-Bridge"** floating button on Amazon.in and Flipkart.com product pages. When clicked, it reads the live DOM for price and bank/card offers, sends them to your Offer-Bridge backend (via Groq LLM for offer parsing), and redirects you to the New Request form — pre-filled.

## How to Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select this folder: `c:\Users\umair\projects\Offer-Bridge\chrome-extension`
5. The extension is now active ✅

## How It Works

1. Go to any Amazon.in or Flipkart.com product page
2. A floating **"Send to Offer-Bridge"** button appears at the bottom-right
3. Click it — the extension reads the product title, price, and all bank/card offer text directly from the page DOM
4. This data is sent to `https://offer-bridge.vercel.app/api/extension/draft`
5. The backend runs it through **Groq LLM (llama3-8b-8192)** to find the best card offer
6. A draft is saved to MongoDB (expires in 30 minutes)
7. You are redirected to `https://offer-bridge.vercel.app?draftId=...`
8. The New Request form auto-fills with title, price, and best card offer

## Required Environment Variable

Add to your `.env` on the production server:

```
GROQ_API_KEY=gsk_xxxxxxxxxxxx
```

Get a free key at: https://console.groq.com

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Chrome Extension Manifest V3 |
| `content.js` | Injected into Amazon/Flipkart — reads DOM, shows button |
| `background.js` | Service worker — POSTs data to Offer-Bridge API |
| `popup.html` | Shown when you click the extension icon in the toolbar |
