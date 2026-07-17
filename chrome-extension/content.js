(function () {
  if (document.getElementById('ob-extension-btn')) return;

  const OFFER_BRIDGE_URL = 'https://offer-bridge.vercel.app';

  function getMerchant() {
    const h = location.hostname;
    if (h.includes('amazon')) return 'amazon';
    if (h.includes('flipkart')) return 'flipkart';
    return null;
  }

  function extractAmazonData() {
    const title =
      document.getElementById('productTitle')?.innerText?.trim() ||
      document.querySelector('h1 span')?.innerText?.trim() ||
      document.title;

    const priceEl =
      document.querySelector('.a-price .a-offscreen') ||
      document.getElementById('priceblock_ourprice') ||
      document.getElementById('priceblock_dealprice') ||
      document.querySelector('[data-a-color="price"] .a-offscreen');

    const rawPrice = priceEl?.innerText || '';
    const price = parseInt(rawPrice.replace(/[₹,\s]/g, ''), 10) || 0;

    const offerEls = [
      ...document.querySelectorAll('[data-testid="offer-display"] li'),
      ...document.querySelectorAll('.bank-offer-text'),
      ...document.querySelectorAll('#sopp_feature_div li'),
      ...document.querySelectorAll('#mir-layout-DELIVERY_BLOCK li'),
      ...document.querySelectorAll('.a-section.a-spacing-base li span'),
    ];

    const rawOffers = [];
    const seen = new Set();
    offerEls.forEach(el => {
      const text = el.innerText?.replace(/\s+/g, ' ').trim();
      if (text && text.length > 10 && !seen.has(text.slice(0, 40))) {
        if (/(bank|credit|debit|hdfc|icici|sbi|axis|kotak|rbl|cashback|instant discount|off)/i.test(text)) {
          seen.add(text.slice(0, 40));
          rawOffers.push(text.slice(0, 280));
        }
      }
    });

    if (rawOffers.length === 0) {
      const bodyText = document.body.innerText;
      const bankMatches = bodyText.match(/Bank Offer[^.\n]{20,250}/gi) || [];
      bankMatches.forEach(m => {
        const t = m.replace(/\s+/g, ' ').trim();
        if (!seen.has(t.slice(0, 40))) { seen.add(t.slice(0, 40)); rawOffers.push(t.slice(0, 280)); }
      });
    }

    const image = document.getElementById('landingImage')?.src ||
      document.querySelector('#imgBlkFront')?.src || '';

    return { title, price, image, rawOffers: rawOffers.slice(0, 15) };
  }

  function extractFlipkartData() {
    const title =
      document.querySelector('.B_NuCI')?.innerText?.trim() ||
      document.querySelector('h1 span')?.innerText?.trim() ||
      document.title;

    const priceEl =
      document.querySelector('._30jeq3') ||
      document.querySelector('.Nx9b7S') ||
      document.querySelector('._16Jk6d');
    const rawPrice = priceEl?.innerText || '';
    const price = parseInt(rawPrice.replace(/[₹,\s]/g, ''), 10) || 0;

    const offerEls = [
      ...document.querySelectorAll('._2dPmuJ li'),
      ...document.querySelectorAll('.F3bfQp li'),
      ...document.querySelectorAll('._1CV3Ko li'),
      ...document.querySelectorAll('li._3WdkBX'),
    ];

    const rawOffers = [];
    const seen = new Set();
    offerEls.forEach(el => {
      const text = el.innerText?.replace(/\s+/g, ' ').trim();
      if (text && text.length > 10 && !seen.has(text.slice(0, 40))) {
        if (/(bank|credit|debit|hdfc|icici|sbi|axis|kotak|rbl|cashback|instant discount|off)/i.test(text)) {
          seen.add(text.slice(0, 40));
          rawOffers.push(text.slice(0, 280));
        }
      }
    });

    if (rawOffers.length === 0) {
      const bodyText = document.body.innerText;
      const bankMatches = bodyText.match(/Bank Offer[^.\n]{20,250}/gi) || [];
      bankMatches.forEach(m => {
        const t = m.replace(/\s+/g, ' ').trim();
        if (!seen.has(t.slice(0, 40))) { seen.add(t.slice(0, 40)); rawOffers.push(t.slice(0, 280)); }
      });
    }

    const image = document.querySelector('._396cs4 img')?.src ||
      document.querySelector('._2amPTt img')?.src || '';

    return { title, price, image, rawOffers: rawOffers.slice(0, 15) };
  }

  function injectButton() {
    const merchant = getMerchant();
    if (!merchant) return;

    const btn = document.createElement('div');
    btn.id = 'ob-extension-btn';
    btn.innerHTML = `
      <style>
        #ob-extension-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        #ob-main-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(124,58,237,0.5);
          transition: all 0.2s;
          white-space: nowrap;
        }
        #ob-main-btn:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(124,58,237,0.65); }
        #ob-main-btn:active { transform: scale(0.97); }
        #ob-main-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        #ob-toast {
          position: absolute;
          bottom: 60px;
          right: 0;
          background: #1e1b4b;
          color: white;
          border: 1px solid rgba(124,58,237,0.4);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          min-width: 240px;
          max-width: 300px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          display: none;
          animation: obSlideIn 0.2s ease;
        }
        @keyframes obSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        #ob-toast.show { display: block; }
        .ob-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
      <div id="ob-toast"></div>
      <button id="ob-main-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
        Send to Offer-Bridge
      </button>
    `;

    document.body.appendChild(btn);

    const mainBtn = document.getElementById('ob-main-btn');
    const toast = document.getElementById('ob-toast');

    function showToast(msg, isError = false) {
      toast.innerHTML = msg;
      toast.style.borderColor = isError ? 'rgba(239,68,68,0.4)' : 'rgba(124,58,237,0.4)';
      toast.classList.add('show');
      if (!msg.includes('spinner')) setTimeout(() => toast.classList.remove('show'), 4000);
    }

    mainBtn.addEventListener('click', async () => {
      mainBtn.disabled = true;
      mainBtn.innerHTML = '<span class="ob-spinner"></span> Extracting...';
      showToast('⏳ Reading product data from this page...');

      let data;
      try {
        data = merchant === 'amazon' ? extractAmazonData() : extractFlipkartData();
      } catch (e) {
        mainBtn.disabled = false;
        mainBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Send to Offer-Bridge';
        showToast('❌ Could not read page data. Try refreshing the product page.', true);
        return;
      }

      if (!data.price || data.price === 0) {
        mainBtn.disabled = false;
        mainBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Send to Offer-Bridge';
        showToast('⚠️ Could not detect the price. Make sure you are on the main product page.', true);
        return;
      }

      showToast(`✅ Found: <strong>${data.title?.slice(0, 50) || 'Product'}...</strong><br>₹${data.price?.toLocaleString('en-IN')}<br>📤 Sending to Offer-Bridge...`);
      mainBtn.innerHTML = '<span class="ob-spinner"></span> Sending...';

      chrome.runtime.sendMessage({
        action: 'SEND_DRAFT',
        payload: {
          productUrl: location.href,
          merchant,
          title: data.title,
          price: data.price,
          image: data.image,
          rawOffers: data.rawOffers,
        },
      }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          mainBtn.disabled = false;
          mainBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Send to Offer-Bridge';
          showToast('❌ Could not reach Offer-Bridge. Check your internet and try again.', true);
          return;
        }
        showToast('🚀 Redirecting to Offer-Bridge...');
        setTimeout(() => {
          window.open(`${OFFER_BRIDGE_URL}?draftId=${response.draftId}`, '_blank');
          mainBtn.disabled = false;
          mainBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Send to Offer-Bridge';
        }, 800);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
