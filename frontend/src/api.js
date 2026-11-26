const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:4000');

const defaultWsUrl = () => {
  if (!import.meta.env.PROD) return 'ws://localhost:4000';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
};

export const WS_URL = import.meta.env.VITE_WS_URL || defaultWsUrl();

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export function signup(email, password) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: { email, password },
  });
}

export function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function fetchUsers(token) {
  return request('/api/users', { token });
}

export function fetchMessages(token, peerId) {
  return request(`/api/messages/${peerId}`, { token });
}
