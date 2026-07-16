import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';

// The base URL can be configured via environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5099/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120 seconds timeout for AI generation
});

// Response Interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data; // Only return the data payload
  },
  (error: AxiosError) => {
    // Log error to an external monitoring service if applicable
    console.error('API Error:', error);

    // Format a standard error message
    let errorMessage = 'An unexpected error occurred.';
    
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      const data = error.response.data as any;
      errorMessage = data?.message || data?.error || `Server Error: ${error.response.status}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response from server. Please check your network connection.';
    } else {
      // Something happened in setting up the request
      errorMessage = error.message;
    }

    return Promise.reject(new Error(errorMessage));
  }
);
