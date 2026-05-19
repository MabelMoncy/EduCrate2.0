// Public API — no auth headers required
const API_URL = '/api';

export const getResources = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const url = `${API_URL}/resources${queryParams ? `?${queryParams}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    let message = 'Failed to fetch resources';
    try {
      const err = await response.json();
      message = err.message || message;
    } catch (_) {
      // Keep the default message when the server does not return JSON.
    }
    throw new Error(`${message} (status: ${response.status})`);
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
    let message = 'Failed to upload resource';
    try {
      const errorData = await response.json();
      message = errorData.message || message;
    } catch (_) {
      // Keep the default message when the server does not return JSON.
    }
    throw new Error(`${message} (status: ${response.status})`);
  }

  return response.json();
};

export const deleteResource = async (id) => {
  const response = await fetch(`${API_URL}/resources/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    let message = 'Failed to delete resource';
    try {
      const errorData = await response.json();
      message = errorData.message || message;
    } catch (_) {
      // Keep the default message when the server does not return JSON.
    }
    throw new Error(`${message} (status: ${response.status})`);
  }

  return response.json();
};

export const updateResourcePin = async (id, isPinned) => {
  const response = await fetch(`${API_URL}/resources/${id}/pin`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isPinned }),
  });

  if (!response.ok) {
    let message = 'Failed to update pinned status';
    try {
      const errorData = await response.json();
      message = errorData.message || message;
    } catch (_) {
      // Keep the default message when the server does not return JSON.
    }
    throw new Error(`${message} (status: ${response.status})`);
  }

  return response.json();
};

export const getResourceFileUrl = async (id, { attachment = false } = {}) => {
  const queryParams = new URLSearchParams();
  if (attachment) queryParams.set('attachment', 'true');

  const response = await fetch(`${API_URL}/resources/${id}/file-url?${queryParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    let message = 'Failed to prepare file link';
    try {
      const errorData = await response.json();
      message = errorData.message || message;
    } catch (_) {
      // Keep the default message when the server does not return JSON.
    }
    throw new Error(`${message} (status: ${response.status})`);
  }

  return response.json();
};
