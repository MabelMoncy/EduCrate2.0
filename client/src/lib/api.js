const API_URL = '/api';

/**
 * Reads the csrf_token from document.cookie.
 * The csrf_token cookie is set by the server on login (httpOnly: false)
 * so JavaScript can read it here and echo it as the X-CSRF-Token header.
 */
const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

/**
 * Builds JSON request headers.
 * When csrf:true, attaches the X-CSRF-Token header required for state-changing requests.
 * No longer reads localStorage or attaches Authorization: Bearer — auth is via httpOnly cookie.
 */
const jsonHeaders = ({ csrf = false } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Token'] = getCsrfToken();
  return headers;
};

const readErrorMessage = async (response, fallback) => {
  let message = fallback;
  try {
    const errorData = await response.json();
    message = errorData.message || message;
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
    headers: jsonHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to fetch resources'));
  }

  return response.json();
};

export const uploadResource = async (formData) => {
  const response = await fetch(`${API_URL}/resources`, {
    method: 'POST',
    // Do NOT set Content-Type — let browser set multipart/form-data with boundary
    headers: { 'X-CSRF-Token': getCsrfToken() },
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to upload resource'));
  }

  return response.json();
};

export const deleteResource = async (id) => {
  const response = await fetch(`${API_URL}/resources/${id}`, {
    method: 'DELETE',
    headers: jsonHeaders({ csrf: true }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to delete resource'));
  }

  return response.json();
};

export const updateResourcePin = async (id, isPinned) => {
  const response = await fetch(`${API_URL}/resources/${id}/pin`, {
    method: 'PATCH',
    headers: jsonHeaders({ csrf: true }),
    credentials: 'include',
    body: JSON.stringify({ isPinned }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to update pinned status'));
  }

  return response.json();
};

export const getResourceFileUrl = async (id, { attachment = false } = {}) => {
  const queryParams = new URLSearchParams();
  if (attachment) queryParams.set('attachment', 'true');

  const response = await fetch(`${API_URL}/resources/${id}/file-url?${queryParams.toString()}`, {
    method: 'GET',
    headers: jsonHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to prepare file link'));
  }

  return response.json();
};

export const loginAdmin = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method:      'POST',
    headers:     jsonHeaders(),   // no CSRF needed — login route is exempt
    credentials: 'include',
    body:        JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to log in'));
  }

  // Server response is now { user } only — NO token in body (H2)
  return response.json();
};

export const logoutAdmin = async () => {
  await fetch(`${API_URL}/auth/logout`, {
    method:      'POST',
    headers:     jsonHeaders({ csrf: true }),
    credentials: 'include',
  });
};
