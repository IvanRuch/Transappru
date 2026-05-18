export type TelematicsState = 'never' | 'stale' | 'active';

export interface RnisStatus {
  registered: boolean;
  registeredAt: string | null;
  telematics: TelematicsState;
  lastTransmissionAt: string | null;
}

/**
 * Interprets raw fields from /get-auto-check-rnis (or /check-rnis) response.
 *
 * Backend may return numeric fields as strings ('1', '0') or numbers (1, 0).
 * All comparisons use String() coercion to handle both forms.
 *
 * Returns null when registrationOk is absent (data not found in RNIS).
 * When registered === false, telematics block should not be shown.
 *
 * Three-way telematics logic (mirrors legacy transappweb/src/Auto.js:881-913):
 *   telematicsOk='0' + telematics_date='0'   → 'never'  ("не поступали")
 *   telematicsOk='0' + telematics_date!='0'  → 'stale'  ("более суток назад")
 *   telematicsOk!='0'                        → 'active' ("передаётся")
 */
export function getRnisStatus(data: {
  registrationOk?: string | number;
  rnis_registered?: string | null;
  telematicsOk?: string | number;
  telematics_date?: string | number | null;
} | null | undefined): RnisStatus | null {
  if (data == null || typeof data.registrationOk === 'undefined') {
    return null;
  }

  const registered = String(data.registrationOk) === '1';
  const registeredAt = data.rnis_registered ?? null;

  if (!registered) {
    return { registered: false, registeredAt: null, telematics: 'never', lastTransmissionAt: null };
  }

  const telOk = String(data.telematicsOk ?? '');
  const telDate = data.telematics_date != null ? String(data.telematics_date) : '0';

  let telematics: TelematicsState;
  let lastTransmissionAt: string | null = null;

  if (telOk === '0') {
    if (telDate !== '0') {
      telematics = 'stale';
      lastTransmissionAt = telDate;
    } else {
      telematics = 'never';
    }
  } else {
    telematics = 'active';
    if (telDate !== '0') {
      lastTransmissionAt = telDate;
    }
  }

  return { registered, registeredAt, telematics, lastTransmissionAt };
}
