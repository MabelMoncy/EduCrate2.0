const API_URL = '/api';
const AUTH_STORAGE_KEY = 'educrate_admin_auth';

const getStoredToken = () => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored)?.token : null;
  } catch (_error) {
    return null;
  }
};

const jsonHeaders = ({ auth = false } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getStoredToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
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
    headers: jsonHeaders({ auth: true }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to delete resource'));
  }

  return response.json();
};

export const updateResourcePin = async (id, isPinned) => {
  const response = await fetch(`${API_URL}/resources/${id}/pin`, {
    method: 'PATCH',
    headers: jsonHeaders({ auth: true }),
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
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to prepare file link'));
  }

  return response.json();
};

export const loginAdmin = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method:  'POST',
    headers: jsonHeaders(),
    body:    JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to log in'));
  }

  return response.json();
};
