// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Pin: undefined;
  Inn: { user_data: any };
  Main: undefined;
  AutoList: undefined;
  Auto: { auto_id: number };
  AutoDriver: { auto_id: number };
  AutoFine: { auto_id: number };
  Pass: { pass_id: number };
  PassYaMap: { pass_id: number };
  User: undefined;
  OurServices: undefined;
  DriverList: undefined;
  NotificationList: undefined;
  InviteUser: undefined;
  DelUser: undefined;
};
