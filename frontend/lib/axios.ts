/**
 * Axios HTTP Client Configuration
 *
 * Pre-configured axios instance for API communication.
 * Handles authentication tokens and error responses.
 *
 * @module lib/axios
 */

import axios from "axios";

// Automatically determine API URL based on environment
const getApiUrl = () => {
  // If explicitly set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // For production build
  if (process.env.NODE_ENV === "production") {
    // Check if running on bgalin.ru
    if (
      typeof window !== "undefined" &&
      window.location.hostname === "bgalin.ru"
    ) {
      return "https://bgalin.ru/api";
    }
    return "http://localhost:3001/api";
  }

  // Development mode
  return "http://localhost:3001/api";
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/admin";
    }
    return Promise.reject(error);
  },
);

export default api;
