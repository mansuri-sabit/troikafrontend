import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error);
    
    // Handle specific error types
    if (error.code === 'ERR_NETWORK') {
      console.error('🚫 CORS/Network Error - Check backend server and CORS configuration');
    } else if (error.response?.status === 401) {
      console.error('🔐 Authentication Error - Token may be invalid');
    } else if (error.response?.status === 403) {
      console.error('🚫 Authorization Error - Insufficient permissions');
    } else if (error.response?.status === 404) {
      console.error('🔍 Not Found Error - Endpoint does not exist');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => {
    console.log('🔑 Attempting login...');
    return api.post('/login', credentials);
  },
  logout: () => {
    console.log('👋 Logging out...');
    return api.get('/logout');
  },
  register: (userData) => {
    console.log('📝 Registering user...');
    return api.post('/register', userData);
  },
};

// Admin API - Updated with better error handling
export const adminAPI = {
  getDashboard: () => {
    console.log('📊 Fetching admin dashboard...');
    return api.get('/admin');
  },
  getProjects: () => {
    console.log('📁 Fetching admin projects...');
    return api.get('/admin/projects');
  },
  createProject: (projectData) => {
    console.log('➕ Creating new project...');
    return api.post('/admin/projects', projectData);
  },
  updateProject: (projectId, projectData) => {
    console.log(`✏️ Updating project ${projectId}...`);
    return api.put(`/admin/projects/${projectId}`, projectData);
  },
  deleteProject: (projectId) => {
    console.log(`🗑️ Deleting project ${projectId}...`);
    return api.delete(`/admin/projects/${projectId}`);
  },
  getUsers: () => {
    console.log('👥 Fetching admin users...');
    return api.get('/admin/users');
  },
  deleteUser: (userId) => {
    console.log(`🗑️ Deleting user ${userId}...`);
    return api.delete(`/admin/users/${userId}`);
  },
  // Add logout method for admin
  logout: () => {
    console.log('👋 Admin logging out...');
    return api.get('/logout');
  },
};

// User API
export const userAPI = {
  getDashboard: () => {
    console.log('🏠 Fetching user dashboard...');
    return api.get('/user/dashboard');
  },
  getProject: (projectId) => {
    console.log(`📁 Fetching project ${projectId}...`);
    return api.get(`/user/project/${projectId}`);
  },
  uploadPDF: (projectId, file) => {
    console.log(`📄 Uploading PDF to project ${projectId}...`);
    const formData = new FormData();
    formData.append('pdf', file);
    return api.post(`/user/project/${projectId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Chat API
export const chatAPI = {
  sendMessage: (projectId, message) => {
    console.log(`💬 Sending message to project ${projectId}...`);
    return api.post(`/user/chat/${projectId}/message`, { message });
  },
  getChatHistory: (projectId) => {
    console.log(`📜 Fetching chat history for project ${projectId}...`);
    return api.get(`/user/chat/${projectId}/history`);
  },
};

// Health check API
export const healthAPI = {
  check: () => {
    console.log('🏥 Checking server health...');
    return api.get('/health');
  },
  corsTest: () => {
    console.log('🌐 Testing CORS...');
    return api.get('/cors-test');
  },
};

// Helper function to test API connectivity
export const testConnection = async () => {
  try {
    console.log('🔍 Testing API connection...');
    const response = await healthAPI.check();
    console.log('✅ API connection successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ API connection failed:', error);
    return false;
  }
};

// Helper function to test CORS
export const testCORS = async () => {
  try {
    console.log('🌐 Testing CORS configuration...');
    const response = await healthAPI.corsTest();
    console.log('✅ CORS test successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ CORS test failed:', error);
    return false;
  }
};

export default api;
