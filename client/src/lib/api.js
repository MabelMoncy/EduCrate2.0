const API_URL = import.meta.env.VITE_API_URL || '/api';

let authTokenProvider = null;

export const setAuthTokenProvider = (provider) => {
  authTokenProvider = provider;
};

const authHeaders = async () => {
  if (!authTokenProvider) return {};
  const token = await authTokenProvider();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Reads the csrf_token from document.cookie.
 * The csrf_token cookie is set by the server on login (httpOnly: false)
 * so JavaScript can read it here and echo it as the X-CSRF-Token header.
 */
export const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

/**
 * Builds JSON request headers.
 * When csrf:true, attaches the X-CSRF-Token header required for state-changing requests.
 * No longer reads localStorage or attaches Authorization: Bearer — auth is via httpOnly cookie.
 */
const jsonHeaders = async ({ csrf = false, auth = true } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Token'] = getCsrfToken();
  if (auth) Object.assign(headers, await authHeaders());
  return headers;
};

/**
 * Reads the error detail from a failed response for internal logging only.
 * Never returns values that are shown directly in the UI.
 */
const readErrorDetail = async (response, fallback) => {
  let message = fallback;
  try {
    const errorData = await response.json();
    message = errorData.message || errorData.error || message;
  } catch (_error) {
    // Keep the default message when the server does not return JSON.
  }
  return `${message} (status: ${response.status})`;
};

export const getResources = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const url = `${API_URL}/resources${queryParams ? `?${queryParams}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: await jsonHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response, 'Failed to fetch resources');
    if (import.meta.env.DEV) console.error('[api] getResources:', detail);
    throw new Error('Unable to load resources. Please try again.');
  }

  return response.json();
};

export const uploadResource = async (formData) => {
  const response = await fetch(`${API_URL}/resources`, {
    method: 'POST',
    // Do NOT set Content-Type — let browser set multipart/form-data with boundary
    headers: {
      'X-CSRF-Token': getCsrfToken(),
      ...(await authHeaders()),
    },
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response, 'Failed to upload resource');
    if (import.meta.env.DEV) console.error('[api] uploadResource:', detail);
    throw new Error('Upload failed. Please try again.');
  }

  return response.json();
};

export const deleteResource = async (id) => {
  const response = await fetch(`${API_URL}/resources/${id}`, {
    method: 'DELETE',
    headers: await jsonHeaders({ csrf: true, auth: false }),
    credentials: 'include',
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response, 'Failed to delete resource');
    if (import.meta.env.DEV) console.error('[api] deleteResource:', detail);
    throw new Error('Could not delete resource. Please try again.');
  }

  return response.json();
};

export const updateResourcePin = async (id, isPinned) => {
  const response = await fetch(`${API_URL}/resources/${id}/pin`, {
    method: 'PATCH',
    headers: await jsonHeaders({ csrf: true, auth: false }),
    credentials: 'include',
    body: JSON.stringify({ isPinned }),
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response, 'Failed to update pinned status');
    if (import.meta.env.DEV) console.error('[api] updateResourcePin:', detail);
    throw new Error('Could not update resource. Please try again.');
  }

  return response.json();
};

export const getResourceFileUrl = async (id, { attachment = false } = {}) => {
  const queryParams = new URLSearchParams();
  if (attachment) queryParams.set('attachment', 'true');

  const response = await fetch(`${API_URL}/resources/${id}/file-url?${queryParams.toString()}`, {
    method: 'GET',
    headers: await jsonHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response, 'Failed to prepare file link');
    if (import.meta.env.DEV) console.error('[api] getResourceFileUrl:', detail);
    throw new Error('Could not open file. Please try again.');
  }

  return response.json();
};

export const loginAdmin = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: await jsonHeaders({ auth: false }),   // no CSRF needed — login route is exempt
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    // Login errors are intentionally shown to the user (e.g. "Invalid credentials").
    // We read the server message but never expose the HTTP status code.
    let message = 'Unable to sign in. Please check your credentials.';
    try {
      const errorData = await response.json();
      if (errorData.message) message = errorData.message;
    } catch (_error) { /* keep default */ }
    if (import.meta.env.DEV) console.error('[api] loginAdmin: status', response.status);
    throw new Error(message);
  }

  // Server response is now { user } only — NO token in body (H2)
  return response.json();
};

export const logoutAdmin = async () => {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: await jsonHeaders({ csrf: true, auth: false }),
    credentials: 'include',
  });
};
