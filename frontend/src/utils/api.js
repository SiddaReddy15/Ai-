const API_URL = `${window.location.protocol}//${window.location.hostname}:5000`; // Dynamic backend host resolution for external device support

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  async get(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return this.handleResponse(response);
  },

  async post(endpoint, body) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    return this.handleResponse(response);
  },

  async put(endpoint, body) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    return this.handleResponse(response);
  },

  async delete(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return this.handleResponse(response);
  },

  async handleResponse(response) {
    // If authorization failed or token expired (401 or 410)
    if (response.status === 401 || response.status === 410) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if on a protected route
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      const data = await response.json();
      throw new Error(data.error || 'Unauthorized access');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    return data;
  }
};
