import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  
  getProfile: () =>
    api.get('/api/auth/me'),
};

// Issues/Complaints
export const issuesAPI = {
  getAdminIssues: (params?: { status?: string; category?: string }) =>
    api.get('/api/issues/admin/all', { params }),
  
  getIssueById: (id: string) =>
    api.get(`/api/issues/${id}`),
  
  updateIssueStatus: (id: string, status: 'open' | 'in_progress' | 'resolved') =>
    api.patch(`/api/issues/admin/${id}/status`, { status }),
};

// Query Logs
export const queryAPI = {
  getUnansweredQueries: (params?: { sortBy?: 'askCount' | 'recent' }) =>
    api.get('/api/admin/queries/unanswered', { params }),
  
  getAllQueries: (params?: { answered?: boolean }) =>
    api.get('/api/admin/queries/all', { params }),
  
  getQueryById: (id: string) =>
    api.get(`/api/admin/queries/${id}`),
  
  markQueryAsAnswered: (id: string) =>
    api.patch(`/api/admin/queries/${id}/resolve`),
  
  deleteQuery: (id: string) =>
    api.delete(`/api/admin/queries/${id}`),
};

// Files (existing endpoint)
export const filesAPI = {
  uploadFile: (formData: FormData) =>
    api.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  getFiles: () =>
    api.get('/api/files'),
  
  deleteFile: (id: string) =>
    api.delete(`/api/files/${id}`),
};

export default api;
