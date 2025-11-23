import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://transapp.ru/api/';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      responseType: 'json',
      timeout: 30000,
    });

    // Request interceptor (токен передается в body, не в headers)
    this.api.interceptors.request.use(
      async config => {
        // Токен передается в body запроса, не добавляем в headers
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor для обработки ошибок
    this.api.interceptors.response.use(
      response => response,
      async error => {
        if (error.response) {
          const { status, data } = error.response;
          
          // 401 Unauthorized - удаляем токен и редиректим на авторизацию
          if (status === 401) {
            console.log('API: 401 Unauthorized - clearing token');
            await AsyncStorage.removeItem('token');
            // Редирект на авторизацию будет обработан в компонентах через router
          }
          
          // 404 Not Found
          if (status === 404) {
            console.log('API: 404 Not Found -', error.config?.url);
          }
          
          // 500 Server Error
          if (status >= 500) {
            console.log('API: Server Error', status);
          }
          
          // Логируем детали ошибки
          console.log('API Error:', {
            url: error.config?.url,
            method: error.config?.method,
            status,
            data
          });
        } else if (error.request) {
          // Запрос был отправлен, но ответа не получено (сетевая ошибка)
          console.log('API: Network Error - no response received');
        } else {
          // Ошибка при настройке запроса
          console.log('API: Request Setup Error -', error.message);
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Методы для прямого доступа к axios методам (совместимость со старым кодом)
  get(url: string, config?: any) {
    return this.api.get(url, config);
  }

  post(url: string, data?: any, config?: any) {
    return this.api.post(url, data, config);
  }

  put(url: string, data?: any, config?: any) {
    return this.api.put(url, data, config);
  }

  delete(url: string, config?: any) {
    return this.api.delete(url, config);
  }
}

export default new ApiService();
