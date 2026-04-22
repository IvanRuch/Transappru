/**
 * Fine / charge data as returned by the backend and shuttled between
 * screens via JSON-encoded route params.
 *
 * All fields are optional because endpoints vary: `/get-driver-list` and
 * the autos feed return a richer shape than, e.g., what fine-payment-success
 * needs. Screens must guard each access.
 */
export interface FineData {
  /** "1" or 1 when paid, "0"/0 otherwise. Backend is inconsistent. */
  is_paid?: string | number;
  /** Indicates a PLATON (paid-road) fine — separate UI / API flow. */
  is_platon?: string | number;
  /** Postponed to ФССП indicator. */
  is_to_fssp?: string | number;

  /** Date of violation, e.g. "01.01.2026". */
  dat?: string;
  /** КоАП article code. */
  code?: string;
  description?: string;
  /** Optional violation place text. */
  offence_place?: string;
  /** Optional comment (rarely populated). */
  comment?: string;

  /** Unique postanovlenie identifier. */
  uin?: string;

  /** Amount currently due (post-discount if a discount is live). */
  sum?: string;
  /** Amount without any discount. */
  full_sum?: string;
  discount_percent?: string;
  discount_time_left?: string;
  discount_date_end?: string;
  discount_str?: string;

  /** Payment recipient / operator name. */
  vendor?: string;

  /** Transfer-to-bailiff timestamp. */
  to_fssp_at?: string;

  /**
   * Carry-through of the auto plate when this fine is displayed outside
   * its auto context (e.g. unified charges feed). Some endpoints use
   * `_auto_number`, others `user_auto.auto_number`.
   */
  _auto_number?: string;
  user_auto?: {
    auto_number?: string;
  };

  /** Catch-all for legacy fields we don't use yet. */
  [key: string]: unknown;
}
