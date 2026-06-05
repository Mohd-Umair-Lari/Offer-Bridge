const OFFER_BRIDGE_API = 'https://gozivo.in/api/extension/draft';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'SEND_DRAFT') return;

  fetch(OFFER_BRIDGE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message.payload),
  })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.draftId) {
        sendResponse({ success: true, draftId: data.draftId });
      } else {
        sendResponse({ success: false, error: data.message || 'Unknown error' });
      }
    })
    .catch(err => {
      sendResponse({ success: false, error: err.message });
    });

  return true;
});
