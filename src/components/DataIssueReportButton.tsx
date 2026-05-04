/**
 * Per-category "Report a problem" button on the auto detail screen
 * (ADR-012). Tapping opens a modal with an optional comment textarea
 * and a submit button. On submit:
 *   - reads cached `user_id` (set by `useAutoData` after `/get-auto-list`),
 *   - tries to attach the current FCM token if push permission exists,
 *   - POSTs to `/payment-api/data-issues/report`,
 *   - shows success / 409 (already-open) / generic error message.
 *
 * The icon is `MaterialCommunityIcons name="account-alert"` from
 * `@expo/vector-icons` — silhouette + circled exclamation mark, matching
 * what the product owner asked for. Vector + already in deps, no PNG
 * assets to ship.
 */

import React, { useCallback, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  PROVIDER_LABELS,
  type ProviderId,
} from '../constants/providerLabels';
import { reportDataIssue } from '../services/dataIssues';
import { getCachedUserId } from '../utils/userIdCache';

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'duplicate' }      // 409 — open complaint exists
  | { kind: 'no_user_id' }     // user_id not cached yet (edge case)
  | { kind: 'error'; message: string };

interface Props {
  /** Provider category being reported on. */
  category: ProviderId;
  /** Auto's legacy id (`user_auto.id`). Required — button is hidden
   *  when missing. */
  autoId: number | null | undefined;
  /** Optional override of the displayed label for testing. */
  testID?: string;
}

const COMMENT_MAX = 2000;

/**
 * Best-effort retrieval of the current FCM token. Returns null on any
 * platform-specific failure (permission denied, web SW not registered,
 * native module not initialised, …) — the backend treats null as
 * "do not include this user in the recovery push fan-out" by design.
 */
async function tryGetFCMToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const { getFCMToken } = await import('../services/firebaseWeb');
      return await getFCMToken();
    }
    // Native: lazy import so the web bundle never pulls in
    // @react-native-firebase/messaging.
    const messaging = (await import('@react-native-firebase/messaging')).default;
    return await messaging().getToken();
  } catch {
    return null;
  }
}

export function DataIssueReportButton({ category, autoId, testID }: Props) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  const label = PROVIDER_LABELS[category];

  const reset = useCallback(() => {
    setComment('');
    setState({ kind: 'idle' });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // Defer reset until the modal animation finishes so the user
    // doesn't see the form clear before the close animation.
    setTimeout(reset, 250);
  }, [reset]);

  const submit = useCallback(async () => {
    if (!autoId) return;
    setState({ kind: 'submitting' });

    const userId = await getCachedUserId();
    if (userId === null) {
      setState({ kind: 'no_user_id' });
      return;
    }

    const fcmToken = await tryGetFCMToken();
    const trimmedComment = comment.trim();

    try {
      await reportDataIssue({
        user_id: userId,
        auto_id: autoId,
        category,
        comment: trimmedComment.length > 0 ? trimmedComment : null,
        fcm_token: fcmToken,
      });
      setState({ kind: 'success' });
    } catch (err: unknown) {
      // Axios shape — see services/api.ts interceptors.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setState({ kind: 'duplicate' });
      } else {
        setState({
          kind: 'error',
          message: 'Не удалось отправить сообщение. Попробуйте позже.',
        });
      }
    }
  }, [autoId, category, comment]);

  if (!autoId) return null;

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel={`Сообщить о проблеме с данными: ${label}`}
        hitSlop={8}
        testID={testID ?? 'data-issue-report-button'}
      >
        <MaterialCommunityIcons name="account-alert" size={22} color="#FFC107" />
        <Text style={styles.iconButtonText}>Сообщить о проблеме</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal} accessibilityViewIsModal>
            <Text style={styles.title}>Сообщить о проблеме</Text>
            <Text style={styles.subtitle}>
              Категория: <Text style={styles.subtitleBold}>{label}</Text>
            </Text>

            {state.kind === 'success' ? (
              <Text style={styles.statusOk}>
                Спасибо! Мы получили ваше сообщение и проверяем данные.
              </Text>
            ) : state.kind === 'duplicate' ? (
              <Text style={styles.statusInfo}>
                По этой категории у вас уже есть открытая жалоба — мы
                работаем над ней.
              </Text>
            ) : state.kind === 'no_user_id' ? (
              <Text style={styles.statusError}>
                Не удалось определить пользователя. Откройте список авто и
                попробуйте ещё раз.
              </Text>
            ) : state.kind === 'error' ? (
              <Text style={styles.statusError}>{state.message}</Text>
            ) : (
              <>
                <Text style={styles.label}>
                  Опишите проблему (необязательно)
                </Text>
                <TextInput
                  value={comment}
                  onChangeText={t =>
                    setComment(t.length <= COMMENT_MAX ? t : t.slice(0, COMMENT_MAX))
                  }
                  multiline
                  numberOfLines={4}
                  maxLength={COMMENT_MAX}
                  placeholder="Например: «должен быть штраф, в приложении не вижу»"
                  placeholderTextColor="#A0A0A0"
                  style={styles.textarea}
                  editable={state.kind !== 'submitting'}
                  testID="data-issue-comment-input"
                />
              </>
            )}

            <View style={styles.actions}>
              {state.kind === 'success' || state.kind === 'duplicate' ? (
                <Pressable
                  onPress={close}
                  style={[styles.button, styles.buttonPrimary]}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonPrimaryText}>Закрыть</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={close}
                    style={[styles.button, styles.buttonSecondary]}
                    accessibilityRole="button"
                    disabled={state.kind === 'submitting'}
                  >
                    <Text style={styles.buttonSecondaryText}>Отмена</Text>
                  </Pressable>
                  <Pressable
                    onPress={submit}
                    style={[
                      styles.button,
                      styles.buttonPrimary,
                      state.kind === 'submitting' && styles.buttonDisabled,
                    ]}
                    accessibilityRole="button"
                    disabled={state.kind === 'submitting'}
                    testID="data-issue-submit-button"
                  >
                    <Text style={styles.buttonPrimaryText}>
                      {state.kind === 'submitting' ? 'Отправляем…' : 'Отправить'}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default DataIssueReportButton;

const styles = StyleSheet.create({
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  iconButtonText: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  subtitleBold: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  label: {
    fontSize: 13,
    color: '#313131',
    marginBottom: 6,
  },
  textarea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1A1A1A',
    textAlignVertical: 'top',
    backgroundColor: '#FAFAFA',
  },
  statusOk: {
    fontSize: 14,
    color: '#1F7A1F',
    marginBottom: 8,
  },
  statusInfo: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
  },
  statusError: {
    fontSize: 14,
    color: '#A02222',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  buttonPrimary: {
    backgroundColor: '#FFC107',
  },
  buttonPrimaryText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  buttonSecondaryText: {
    color: '#3A3A3A',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
