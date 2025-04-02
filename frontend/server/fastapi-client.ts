import axios from 'axios';
import { config } from './config';

// Create an Axios instance for FastAPI
const fastApiClient = axios.create({
  baseURL: config.fastApiUrl,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Forward requests to the FastAPI backend
 * @param endpoint - The FastAPI endpoint to call (without leading slash)
 * @param method - HTTP method to use (GET, POST, etc.)
 * @param data - Optional data to send with the request
 * @param params - Optional query parameters
 * @returns Promise with the FastAPI response
 */
export async function callFastApi(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  params?: any
) {
  try {
    const response = await fastApiClient.request({
      url: endpoint,
      method,
      data,
      params,
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`FastAPI request failed: ${method} ${endpoint}`, error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}