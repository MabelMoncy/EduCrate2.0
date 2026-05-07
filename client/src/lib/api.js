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
    } catch (_) {}
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
    } catch (_) {}
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
    } catch (_) {}
    throw new Error(`${message} (status: ${response.status})`);
  }

  return response.json();
};
