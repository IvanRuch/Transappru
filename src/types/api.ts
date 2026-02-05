export interface UserData {
  id?: number;
  phone?: string;
  email?: string;
  name?: string;
  phone_inn_confirmed?: number | string;
  user_confirmed?: number | string;
  [key: string]: any; // Allow other properties
}

export interface SessionData {
  user_data?: UserData;
  token?: string;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  status: string | number;
  message?: string;
  data?: T;
  session_data?: SessionData; // Sometimes it's at root, sometimes nested, based on index.tsx it looks like data.session_data
}
