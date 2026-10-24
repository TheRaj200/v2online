import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://v2-backend-zflw.onrender.com/api';

// Backend server origin for uploaded files (/uploads/...) — API URL se '/api' hata kar
export const FILE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token automatically to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('v2online_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle global 401 unauthorized errors (expired / invalid / suspended session)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      const isPublicPage = path.includes('/login') || path.includes('/register');
      localStorage.removeItem('v2online_token');
      localStorage.removeItem('v2online_user');
      if (!isPublicPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
