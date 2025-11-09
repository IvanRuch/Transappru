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

    // Request interceptor для добавления токена
    this.api.interceptors.request.use(
      async config => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers['token'] = token;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor для обработки ошибок
    this.api.interceptors.response.use(
      response => response,
      error => {
        // TODO: Обработка ошибок (logout на 401, показ сообщений и т.д.)
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
