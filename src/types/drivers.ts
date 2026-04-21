export interface DriverData {
  id: string;
  /** Driver license number — 10 digits. */
  vu: string;
  /** Driver license issue date — DD.MM.YYYY. */
  vu_reg: string;
  /** Last name. Required. */
  name_f: string;
  /** First name. Required. */
  name_i: string;
  /** Middle name (patronymic). Optional. */
  name_o: string;
}

export const EMPTY_DRIVER: DriverData = {
  id: '',
  vu: '',
  vu_reg: '',
  name_f: '',
  name_i: '',
  name_o: '',
};
