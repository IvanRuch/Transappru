export interface AutoGranted {
  granted: string;       // "0" | "1"
  auto_number: string;
  id: string;            // user_auto id
}

export interface NotificationTypeGranted {
  granted: string;       // "0" | "1" — master toggle
  notification_type: string;
  header: string;
  auto_granted: AutoGranted[];
}

export interface NotificationGrantedResponse {
  notification_granted_list: NotificationTypeGranted[];
  token: string;
  auth_required?: number;
}
