export interface ContactData {
  id: string;
  fio: string;
  email: string;
  phone: string;     // backend stores digits only, UI shows with '+'
  position: string;
}

export interface UserData {
  firm?: string;
  inn?: string;
  [key: string]: any;
}

export const EMPTY_CONTACT: ContactData = {
  id: '', fio: '', email: '', phone: '', position: '',
};
