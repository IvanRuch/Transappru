export interface ChargeItem {
  id: string;
  uin: string;
  user_id: string;
  user_auto: string | null;
  dat: string;
  code: string;
  description: string;
  sum: string;
  full_sum?: string;
  is_paid: string | number;
  is_platon?: string | number;
  is_to_fssp?: string | number;
  to_fssp_at?: string;
  discount_percent?: string;
  discount_date_end?: string;
  discount_time_left?: string;
  discount_str?: string;
  offense_at?: string;
  offence_place?: string;
  vendor?: string;
  comment?: string;
  iou_dt?: string;
}

export interface ChargesData {
  auto_charges: ChargeItem[];
  other_charges: ChargeItem[];
}

export interface ChargesByAuto {
  [grz: string]: {
    autoId: string;
    grz: string;
    charges: ChargeItem[];
  };
}
