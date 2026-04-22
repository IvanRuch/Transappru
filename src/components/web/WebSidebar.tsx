import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../../services/api';
import { openAddAutoModalIfMounted } from '../../screens/auto/AutoListScreen.web';
import {
  WEB_SIDEBAR_WIDTH_COLLAPSED,
  WEB_SIDEBAR_WIDTH_EXPANDED,
} from '../../utils/responsive';
import { showAlert } from '../../utils/alert';
import { switchOrganization as switchOrganizationRequest } from '../../utils/switchOrganization';
import { navigateToInn as navigateToInnRequest } from '../../utils/navigateToInn';
import { OrgListItem, type OrgListItemData } from '../sidebar';
import { RnisCheckModal, AddAccountModal } from '../inn';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserData {
  firm?: string;
  inn?: string;
  phone?: string;
  user_auto_count?: number | string;
  notification_unviewed_count?: number;
  other_user_notification_unviewed_count?: number;
  manager_data?: { mobile_phone?: string };
}

type OtherUser = OrgListItemData;

interface OurService {
  id: string;
  header: string;
}

interface WebSidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

// ─── Single nav item ─────────────────────────────────────────────────────────

interface NavItemProps {
  icon: any;
  label: string;
  path?: string;
  onPress?: () => void;
  active?: boolean;
  expanded: boolean;
  badge?: number;
  indent?: boolean;
}

function NavItem({ icon, label, path, onPress, active, expanded, badge, indent }: NavItemProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const handlePress = useCallback(() => {
    if (onPress) { onPress(); return; }
    if (path) router.push(path as any);
  }, [onPress, path]);

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.navItem,
        indent && styles.navItemIndent,
        active  && styles.navItemActive,
        hovered && !active && styles.navItemHovered,
      ]}
    >
      <View style={styles.navItemIconWrap}>
        <Image source={icon} style={styles.navIcon} resizeMode="contain" />
        {!!badge && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
          </View>
        )}
      </View>
      {expanded && (
        <Text
          style={[styles.navLabel, active && styles.navLabelActive]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider({ expanded }: { expanded: boolean }) {
  return (
    <View style={styles.divider}>
      {expanded && <View style={styles.dividerLine} />}
      {!expanded && <View style={[styles.dividerLine, { marginHorizontal: 8 }]} />}
    </View>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function WebSidebar({ expanded, onToggle }: WebSidebarProps) {
  const router     = useRouter();
  const pathname   = usePathname();

  const [userData,       setUserData]       = useState<UserData>({});
  const [otherUserList,  setOtherUserList]  = useState<OtherUser[]>([]);
  const [ourServices,    setOurServices]    = useState<OurService[]>([]);
  const [servicesOpen,   setServicesOpen]   = useState(false);
  const [loading,        setLoading]        = useState(true);
  // INN currently being switched to (null = idle). Drives per-row spinner.
  const [switchingInn,   setSwitchingInn]   = useState<string | null>(null);
  const [onboardingExpired, setOnboardingExpired] = useState<number | string>(1);
  const [rnisModalOpen,  setRnisModalOpen]  = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);

  // ── fetch sidebar data ──────────────────────────────────────────────────────
  // `abortRef` implements "latest wins": if a new trigger (mount / pathname /
  // visibility / post-switch) fires while an old `/get-auto-list` is still
  // pending, the old request is aborted and the fresh one takes its place.
  // This way a slow backend never blocks the user for 30s — as soon as they
  // act again, the stale call is cancelled. Also cleans up on unmount.
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.post(
        '/get-auto-list',
        { token, auto_list_limit: 0 },
        { signal: controller.signal },
      );
      // If a newer request was started meanwhile, discard this response.
      if (controller.signal.aborted) return;

      const d = res.data;
      if (d.user_data) {
        setUserData(d.user_data);
        setOtherUserList(d.other_user_list || []);
        setOurServices(d.our_services_list || []);
      }
      if (d.onboarding_expired !== undefined) {
        setOnboardingExpired(d.onboarding_expired);
      }
    } catch (e) {
      // Ignore aborts (expected when a fresh trigger supersedes us).
      // All other errors are silent — sidebar is non-critical.
      if (axios.isCancel(e)) return;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }, []);

  // Abort any in-flight request on unmount so we don't touch state on a
  // dead component and don't waste bandwidth.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Refetch on mount and whenever the user navigates between routes — keeps
  // `other_user_list[].notification_unviewed_count` fresh. Since `loadData`
  // has a stable identity (useCallback with no deps), the effect re-fires
  // purely on `pathname` changes after the initial mount.
  useEffect(() => { loadData(); }, [loadData, pathname]);

  // Refetch when the browser tab regains focus. Catches the common case
  // where the user switched to another tab, received a notification on
  // another device, then came back — without this the badge would stay
  // stale until the next navigation.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [loadData]);

  // ── org switch ──────────────────────────────────────────────────────────────
  // Delegates to shared util (src/utils/switchOrganization.ts) so mobile
  // (useAutoActions) and web sidebar stay in lockstep.
  //
  // UX note: the backend tends to serialise requests per session, so the
  // sidebar's own `/get-auto-list` fetch ends up queued behind AutoListScreen's
  // full fetch + its own `updateUserDataOnly` — meaning the footer would keep
  // showing the previous org for several seconds after the fleet already
  // rendered. To fix this we do an **optimistic swap** the moment
  // `/set-current-inn` succeeds:
  //   - the clicked org moves from `otherUserList` into `userData`
  //   - the previously-current org takes its place in `otherUserList`
  //   - the user's phone stays (it belongs to the session, not the org)
  // The real refetch still runs in the background so any drifted fields
  // (user_auto_count on the swapped-back entry, etc.) get reconciled.
  const switchOrg = useCallback(async (inn: string) => {
    if (switchingInn) return;

    const previousUser = userData;
    const targetOrg = otherUserList.find(o => o.inn === inn);

    setSwitchingInn(inn);
    try {
      const result = await switchOrganizationRequest(inn);
      if (result.status === 'auth_required') {
        router.replace('/' as any);
        return;
      }
      if (result.status === 'error') {
        showAlert('Ошибка', result.message);
        return;
      }

      if (targetOrg) {
        setUserData({
          ...previousUser,
          firm: targetOrg.firm,
          inn: targetOrg.inn,
          user_auto_count: targetOrg.user_auto_count,
          notification_unviewed_count: targetOrg.notification_unviewed_count,
        });
        setOtherUserList(prev => {
          const withoutTarget = prev.filter(o => o.inn !== inn);
          if (!previousUser.inn) return withoutTarget;
          const previousAsOther: OrgListItemData = {
            inn: previousUser.inn,
            firm: previousUser.firm,
            user_auto_count: previousUser.user_auto_count,
            user_confirmed: 1,
            phone_inn_confirmed: 1,
            notification_unviewed_count: previousUser.notification_unviewed_count,
          };
          return [previousAsOther, ...withoutTarget];
        });
      }

      loadData(); // background sync — latest-wins via AbortController
      router.replace('/(authenticated)/auto-list' as any);
    } finally {
      setSwitchingInn(null);
    }
  }, [switchingInn, userData, otherUserList, loadData, router]);

  // ── active path helper ──────────────────────────────────────────────────────
  const isActive = (path: string) => pathname.startsWith(path);

  const otherBadge   = userData.other_user_notification_unviewed_count || 0;

  const sidebarWidth = expanded ? WEB_SIDEBAR_WIDTH_EXPANDED : WEB_SIDEBAR_WIDTH_COLLAPSED;

  return (
    <View style={[styles.sidebar, { width: sidebarWidth }]}>

      {/* ── Top: logo + toggle ─────────────────────────────────── */}
      <Pressable onPress={onToggle} style={styles.logoRow}>
        <Image
          source={require('../../../assets/images/menu_left.png')}
          style={styles.logoIcon}
          resizeMode="contain"
        />
        {expanded && (
          <Text style={styles.logoText} numberOfLines={1}>TransApp</Text>
        )}
      </Pressable>

      {/* ── Scrollable nav ─────────────────────────────────────── */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Основные разделы ── */}
        <NavItem
          icon={require('../../../assets/images/sel_menu_pass_2.png')}
          label="Мой автопарк"
          path="/(authenticated)/auto-list"
          active={isActive('/(authenticated)/auto-list') || isActive('/(authenticated)/auto/')}
          expanded={expanded}
        />
        <NavItem
          icon={require('../../../assets/images/tab_passes_2.png')}
          label="Пропуск"
          onPress={() => {
            // Matches mobile: "Пропуск в Москву" in bottom bar opens AddAutoModal
            if (!openAddAutoModalIfMounted()) {
              // Not on auto-list yet — navigate there, modal will open via param
              router.push('/(authenticated)/auto-list' as any);
            }
          }}
          active={isActive('/(authenticated)/pass')}
          expanded={expanded}
        />
        <NavItem
          icon={require('../../../assets/images/menu_charges_2.png')}
          label="Начисления"
          path="/(authenticated)/charges"
          active={isActive('/(authenticated)/charges')}
          expanded={expanded}
        />
        <Divider expanded={expanded} />

        {/* ── Услуги / инструменты ── */}

        {/* Наши услуги — раскрывается */}
        <NavItem
          icon={require('../../../assets/images/menu_left_our_services.png')}
          label={expanded ? (servicesOpen ? 'Наши услуги ▲' : 'Наши услуги ▼') : ''}
          onPress={() => setServicesOpen(v => !v)}
          active={false}
          expanded={expanded}
        />
        {servicesOpen && ourServices.map(svc => (
          <NavItem
            key={svc.id}
            icon={require('../../../assets/images/menu_left_our_services.png')}
            label={svc.header}
            onPress={() => {
              router.push({
                pathname: '/(authenticated)/services' as any,
                params: { service_data: JSON.stringify(svc) },
              });
            }}
            active={false}
            expanded={expanded}
            indent
          />
        ))}

        <NavItem
          icon={require('../../../assets/images/menu_left_check_rnis.png')}
          label="Проверить в РНИС"
          // Opens `RnisCheckModal` in place — no route change. Direct navigation
          // to `/inn?check_rnis=1` still works if someone bookmarks the URL.
          onPress={() => setRnisModalOpen(true)}
          active={rnisModalOpen}
          expanded={expanded}
        />
        <NavItem
          icon={require('../../../assets/images/menu_left_add.png')}
          label="Добавить аккаунт"
          // Opens `AddAccountModal` in place — no route change. Direct
          // navigation to `/inn` with user_data still works if someone
          // bookmarks the URL.
          onPress={() => setAddAccountOpen(true)}
          active={addAccountOpen}
          expanded={expanded}
        />
        <NavItem
          icon={require('../../../assets/images/menu_left_driver_list.png')}
          label="Список водителей"
          path="/(authenticated)/drivers"
          active={isActive('/(authenticated)/drivers')}
          expanded={expanded}
        />
        {(onboardingExpired === 0 || onboardingExpired === '0') && (
          <NavItem
            icon={require('../../../assets/images/menu_left_onboarding.png')}
            label="Как работать"
            path="/onboarding"
            active={isActive('/onboarding')}
            expanded={expanded}
          />
        )}

        {/* ── Другие организации ── */}
        {otherUserList.length > 0 && (
          <>
            <Divider expanded={expanded} />
            {expanded && (
              <Text style={styles.orgSectionLabel}>Организации</Text>
            )}
            {otherUserList.map((org, i) => (
              <OrgListItem
                key={org.inn || i}
                org={org}
                compact={!expanded}
                disabled={switchingInn !== null && switchingInn !== org.inn}
                loading={switchingInn === org.inn}
                onPress={switchOrg}
              />
            ))}
          </>
        )}

        <Divider expanded={expanded} />

        {/* ── Аккаунт ── bottom-pinned; user-related shortcuts sit at the
             end of the sidebar, classic "profile at the bottom" pattern. */}
        <NavItem
          icon={require('../../../assets/images/menu_user_2.png')}
          label="Профиль"
          path="/user"
          active={isActive('/user')}
          expanded={expanded}
        />
        <NavItem
          icon={require('../../../assets/images/menu_invite_user_2.png')}
          label="Пригласить друга"
          path="/invite-user"
          active={isActive('/invite-user')}
          expanded={expanded}
        />
        <NavItem
          icon={require('../../../assets/images/menu_contacts_2.png')}
          label="Обратная связь"
          path="/(authenticated)/contacts"
          active={isActive('/(authenticated)/contacts')}
          expanded={expanded}
        />

        {/* Bottom padding so last item isn't hidden */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Footer: current org ────────────────────────────────── */}
      {loading ? (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#B8B8B8" />
        </View>
      ) : (
        <View style={styles.footer}>
          {!!otherBadge && otherBadge > 0 && (
            <View style={[styles.badge, { marginBottom: 4, alignSelf: 'flex-start', marginLeft: 8 }]}>
              <Text style={styles.badgeText}>{otherBadge}</Text>
            </View>
          )}
          {expanded ? (
            <>
              <Text style={styles.footerFirm} numberOfLines={2}>{userData.firm || '—'}</Text>
              <Text style={styles.footerInn}>ИНН: {userData.inn || '—'}</Text>
              {!!userData.phone && (
                <Text style={styles.footerPhone}>+{userData.phone}</Text>
              )}
            </>
          ) : (
            <Image
              source={require('../../../assets/images/menu_left_other_user.png')}
              style={styles.navIcon}
              resizeMode="contain"
            />
          )}
        </View>
      )}

      {/* RNIS check modal — sidebar-owned since that's the only entry point. */}
      <RnisCheckModal
        visible={rnisModalOpen}
        onClose={() => setRnisModalOpen(false)}
      />

      {/* Add-account modal — fed with the current session's user snapshot
          so the hook can switch back to it after a successful bind. */}
      <AddAccountModal
        visible={addAccountOpen}
        userData={{
          inn: userData.inn || '',
          manager_data: userData.manager_data,
        }}
        onClose={() => setAddAccountOpen(false)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 44;
const ACTIVE_BG   = '#F0F0F0';
const HOVER_BG    = '#F7F7F7';
const ACTIVE_BAR  = '#3A3A3A';
const LABEL_COLOR = '#3A3A3A';
const DIVIDER_CLR = '#E0E0E0';

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: DIVIDER_CLR,
    flexDirection: 'column',
    // full height — parent must be flex:1
  },

  // ── Logo row ──────────────────────────────────────────────
  logoRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER_CLR,
    // cursor pointer via web CSS injected by RN-Web
  },
  logoIcon: {
    width: 28,
    height: 28,
  },
  logoText: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },

  // ── Scroll area ────────────────────────────────────────────
  scroll: {
    flex: 1,
  },

  // ── Nav items ──────────────────────────────────────────────
  navItem: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginHorizontal: 4,
    marginVertical: 1,
    borderRadius: 8,
    // cursor:pointer is applied automatically by react-native-web for Pressable
  },
  navItemIndent: {
    paddingLeft: 28,
  },
  navItemActive: {
    backgroundColor: ACTIVE_BG,
    borderLeftWidth: 3,
    borderLeftColor: ACTIVE_BAR,
    paddingLeft: 9,   // compensate 3px border
  },
  navItemHovered: {
    backgroundColor: HOVER_BG,
  },
  navItemIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navIcon: {
    width: 24,
    height: 24,
  },
  navLabel: {
    marginLeft: 10,
    fontSize: 13,
    color: LABEL_COLOR,
    flex: 1,
  },
  navLabelActive: {
    fontWeight: '600',
    color: '#1A1A1A',
  },

  // ── Badge ──────────────────────────────────────────────────
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EE505A',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Divider ────────────────────────────────────────────────
  divider: {
    marginVertical: 6,
    paddingHorizontal: 8,
  },
  dividerLine: {
    height: 1,
    backgroundColor: DIVIDER_CLR,
  },

  // ── Org section label ──────────────────────────────────────
  orgSectionLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },

  // ── Footer ─────────────────────────────────────────────────
  footer: {
    borderTopWidth: 1,
    borderTopColor: DIVIDER_CLR,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footerFirm: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  footerInn: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  footerPhone: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
});
