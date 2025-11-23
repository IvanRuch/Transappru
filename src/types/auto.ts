// Типы для AutoListScreen

export interface ManagerData {
  id?: string;
  mobile_phone?: string;
  email?: string;
  email_subject?: string;
  email_body?: string;
  whatapp_greetings?: string;
  name?: string;
}

export interface UserData {
  id: string;
  firm: string;
  inn: string;
  phone: string;
  phone_inn_confirmed?: number;
  user_confirmed?: number;
  manager_data?: ManagerData;
  notification_unviewed_count?: number;
  other_user_notification_unviewed_count?: number;
  debt_sum?: string;
}

export interface AutoItem {
  id: string;
  auto_number: string;
  auto_number_base?: string;
  auto_number_region_code?: string;
  sts?: string;
  marked?: boolean;
  
  // Пропуска
  check_passes_expared?: number;
  check_passes_string?: string;
  check_passes_year_propusktype?: string;
  check_passes_year_type_of_pass_string?: string;
  check_passes_year_cancelled?: number;
  check_passes_year_period_color?: string;
  check_passes_pass_end_left?: string;
  check_passes_pass_end_str?: string;
  check_passes_dat_cancel_year_str?: string;
  
  // Второй пропуск
  check_passes_another_year_propusktype?: string;
  check_passes_another_year_type_of_pass_string?: string;
  check_passes_another_pass_end_left?: string;
  check_passes_another_pass_end_str?: string;
  
  // Статус заявки
  status_header?: string;
  status_propusktype?: string;
  status_type_of_pass_string?: string;
  status_dat_issuance_str?: string;
  status_tab_show?: number;
  
  // Задолженность
  debt_sum?: string;
  
  // Штрафы
  check_fines_expared?: number;
  check_fines_color?: string;
  check_fines_string?: string;
  check_fines_tab_show?: number;
  check_fines_count?: number;
  check_fines_sum?: string;
  
  // Платные дороги
  check_avtodor_expared?: number;
  check_avtodor_color?: string;
  check_avtodor_string?: string;
  check_avtodor_tab_show?: number;
  
  // ОСАГО
  check_osago_expared?: number;
  check_osago_period_color?: string;
  check_osago_string?: string;
  check_osago_tab_show?: number;
  check_osago_date_to_left?: string;
  check_osago_date_to_str?: string;
  
  // Диагностическая карта
  check_diagnostic_card_expared?: number;
  check_diagnostic_card_period_color?: string;
  check_diagnostic_card_string?: string;
  check_diagnostic_card_tab_show?: number;
  check_diagnostic_card_date_to_left?: string;
  check_diagnostic_card_date_to_str?: string;
  
  // РНИС
  check_rnis_expared?: number;
  check_rnis_color?: string;
  check_rnis_tab_show?: number;
  check_rnis_reestr_color?: string;
  check_rnis_reestr_string?: string;
  check_rnis_telematics_color?: string;
  check_rnis_telematics_string?: string;
}

export interface OurService {
  id: string;
  name: string;
  header: string;
  description?: string;
}

export interface AutoListState {
  managerName: string;
  techSupportName: string;
  managerData: ManagerData;
  userData: UserData;
  userStr: string;
  userList: UserData[];
  userListEmptyStr: string;
  ourServicesList: OurService[];
  ourServicesVisible: boolean;
  otherUserList: UserData[];
  
  autoStr: string;
  autoCancelled: boolean;
  autoPassEnded: boolean;
  autoPassEnds: boolean;
  autoPassEndsUntilDate: string;
  autoList: AutoItem[];
  autoListCount: number;
  autoListFrom: number;
  indicator: boolean;
  markedCnt: number;
  
  userEditData: UserData;
  editUserButtonDisabled: boolean;
  editUserMode: string;
  editUserMsg: string;
  editUserVisible: boolean;
  
  modalViewContacts: boolean;
  findAutoVisible: boolean;
  modalSelectUserVisible: boolean;
  modalDebtInfoVisible: boolean;
  modalDelAutoVisible: boolean;
  modalAddAutoVisible: boolean;
  modalAddAutoButtonDisabled: boolean;
  
  autoNumberBase: string;
  autoNumberBaseOk: boolean;
  autoNumberRegionCode: string;
  autoNumberRegionCodeOk: boolean;
  sts: string;
  stsOk: boolean;
  stsByAutoNumberIndicator: boolean;
  
  onboardingExpired: number;
  modalAnnounceOurServicesVisible: boolean;
  menuLeftVisible: boolean;
}
