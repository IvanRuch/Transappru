/**
 * Client wrapper for the data-quality monitoring backend (ADR-012).
 *
 * Endpoints live on the payment-service (Litestar) — `Api.payment` axios
 * instance routes to `https://payment.transapp.ru/api/...` in prod and
 * to local docker dev URLs from `services/api.ts`.
 *
 * Used by:
 *   - `DataIssueReportButton`         → `reportDataIssue()`
 *   - `useSystemNotice`               → `fetchSystemNotice()`
 */

import { Platform } from 'react-native';

import Api from './api';
import type { ProviderId } from '../constants/providerLabels';

export type SystemNoticeSource = 'admin' | 'auto';

export interface SystemNoticeItem {
  category: ProviderId;
  message: string;
  source: SystemNoticeSource;
  /** ISO 8601 string from backend `created_at`. */
  since: string;
}

interface SystemNoticeResponse {
  notices: SystemNoticeItem[];
}

export interface ReportDataIssueInput {
  user_id: number;
  auto_id: number;
  category: ProviderId;
  comment?: string | null;
  fcm_token?: string | null;
}

interface ReportDataIssueResponse {
  id: number;
  notice_triggered: boolean;
}

/** Best-effort platform tag, matches backend Literal in
 *  `payment-service/app/schemas/data_issues.py`. */
function detectPlatform(): 'mobile_ios' | 'mobile_android' | 'web' {
  if (Platform.OS === 'ios') return 'mobile_ios';
  if (Platform.OS === 'android') return 'mobile_android';
  return 'web';
}

/**
 * POST a single complaint. Returns the issue id and whether it tripped
 * the auto-banner threshold (≥3 distinct user_ids in 6h for the same
 * category). Throws if the backend rejects (e.g. 409 — same user has
 * an open complaint for this auto/category).
 */
export async function reportDataIssue(
  input: ReportDataIssueInput,
): Promise<ReportDataIssueResponse> {
  const body = {
    user_id: input.user_id,
    auto_id: input.auto_id,
    category: input.category,
    comment: input.comment ?? null,
    fcm_token: input.fcm_token ?? null,
    platform: detectPlatform(),
  };
  const res = await Api.payment.post('/data-issues/report', body);
  return res.data as ReportDataIssueResponse;
}

/**
 * GET the currently active system notices. Polled by `useSystemNotice`;
 * cheap response (server-side it's a single SELECT on a partial-indexed
 * table). Returns `[]` when nothing is active.
 */
export async function fetchSystemNotice(): Promise<SystemNoticeItem[]> {
  const res = await Api.payment.get('/system-notice');
  const body = res.data as SystemNoticeResponse | null | undefined;
  return body?.notices ?? [];
}
