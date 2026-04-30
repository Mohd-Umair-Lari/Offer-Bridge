// Centralized API helper — all MongoDB calls go through here
const TOKEN_KEY = 'gz-token';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export const api = {
  // Auth
  login:    (email, password)                 => request('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email, password }) }),
  register: (email, password, fullName, role) => request('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'register', email, password, fullName, role }) }),
  me:       ()                                => request('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'me' }), headers: { Authorization: `Bearer ${getToken()}` } }),

  // Data
  fetchAll:  ()                => request('/api/data?type=all'),
  fetch:     (type)            => request(`/api/data?type=${type}`),
  create:    (type, data)      => request('/api/data', { method: 'POST', body: JSON.stringify({ type, ...data }) }),
  update:    (type, id, data)  => request('/api/data', { method: 'PATCH', body: JSON.stringify({ type, id, ...data }) }),
  remove:    (type, id)        => request(`/api/data?type=${type}&id=${id}`, { method: 'DELETE' }),

  // Payment portal
  initiatePayment: (request_id, offer_id)       => request('/api/payment', { method: 'POST', body: JSON.stringify({ request_id, offer_id }) }),
  confirmPayment:  (tx_id, upi_ref)             => request('/api/payment', { method: 'PUT',  body: JSON.stringify({ tx_id, upi_ref }) }),
  submitTracking:  (tx_id, tracking_id, courier)=> request('/api/payment/tracking', { method: 'POST', body: JSON.stringify({ tx_id, tracking_id, courier }) }),
  getTransactions: (userId)                     => request(`/api/payment?userId=${userId}`),
  runRefundCheck:  ()                           => request('/api/payment/refund-check'),

  // Notifications
  getNotifications: (limit = 20) => request(`/api/notifications?limit=${limit}`),
  markNotifRead:    (id)          => request('/api/notifications', { method: 'PATCH', body: JSON.stringify({ id }) }),
  markAllRead:      ()            => request('/api/notifications', { method: 'PATCH', body: JSON.stringify({ markAllRead: true }) }),
};
