import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// Create Axios instance
const Api: AxiosInstance = axios.create({
  baseURL: "https://transapp.ru/api/",
  responseType: "json",
  timeout: 15000, // 15 seconds global timeout
});

// Request Interceptor
Api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Log the request
    if (__DEV__) {
      console.log(`⬆️ [API] ${config.method?.toUpperCase()} ${config.url}`, config.data ? config.data : '');
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ [API] Request Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
Api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log the response
    if (__DEV__) {
      // Скрываем большие данные для определенных эндпоинтов
      if (response.config.url?.includes('get-user-agreement-and-privacy-policy')) {
        console.log(`⬇️ [API] ${response.status} ${response.config.url} (Data hidden: too large)`);
      } else {
        console.log(`⬇️ [API] ${response.status} ${response.config.url}`, response.data);
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    // Обработка 401 Unauthorized (Сессия прервана менеджером или токен истек)
    if (error.response?.status === 401) {
      console.warn('🔒 [API] 401 Unauthorized detected. Clearing session...');
      
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('last_sent_fcm_token');
        // Редирект на корневой экран (Auth)
        router.replace('/');
      } catch (e) {
        console.error('Error clearing session data:', e);
      }
    }

    // Log the error response
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(
        `❌ [API] Error ${error.response.status} ${error.config?.url}:`,
        error.response.data
      );
    } else if (error.request) {
      // The request was made but no response was received
      console.error(`❌ [API] No response from ${error.config?.url}:`, error.message);
      // Выводим детали ошибки для диагностики Network Error
      if (__DEV__) {
          console.log('Error details:', error.toJSON ? error.toJSON() : error);
      }
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('❌ [API] Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default Api;
