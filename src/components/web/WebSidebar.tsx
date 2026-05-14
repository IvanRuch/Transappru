import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
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
import { InviteUserModal } from '../user';
import { ContactsModal } from '../auto/modals';
import { useUserData } from '../../contexts/UserDataContext';

// ─── Types ──────────────────────────────────────────────────────────────────

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

  // Shared snapshot (single source of truth on web). The Context is
  // mounted by app/(authenticated)/_layout.web.tsx and is also consumed
  // by useAutoData in AutoListScreen.web — both surfaces see the same
  // userData / otherUserList / autoListCount / ourServicesList /
  // onboardingExpired without duplicate /get-auto-list requests. See
  // ADR-020.
  const {
    userData,
    otherUserList,
    autoListCount,
    ourServicesList,
    onboardingExpired,
    updateUserData,
    optimisticOrgSwap,
  } = useUserData();

  // Local UI-only state (not shared with screens).
  const [loading,        setLoading]        = useState(true);
  const [servicesOpen,   setServicesOpen]   = useState(false);
  // INN currently being switched to (null = idle). Drives per-row spinner.
  const [switchingInn,   setSwitchingInn]   = useState<string | null>(null);
  const [rnisModalOpen,  setRnisModalOpen]  = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [inviteOpen,     setInviteOpen]     = useState(false);
  const [contactsOpen,   setContactsOpen]   = useState(false);

  // ── refresh triggers ────────────────────────────────────────────────────────
  // The Context handles the fetch + in-flight dedup + AbortController. The
  // sidebar only owns *when* to refresh — keeping these triggers here means
  // unrelated layouts on web don't have to know about them.
  const refresh = useCallback(async () => {
    await updateUserData();
    setLoading(false);
  }, [updateUserData]);

  // Refetch on mount and whenever the user navigates between routes — keeps
  // `other_user_list[].notification_unviewed_count` fresh.
  useEffect(() => { refresh(); }, [refresh, pathname]);

  // Refetch when the browser tab regains focus. Catches the common case
  // where the user switched to another tab, received a notification on
  // another device, then came back — without this the badge would stay
  // stale until the next navigation.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refresh]);

  // ── org switch ──────────────────────────────────────────────────────────────
  // Delegates to shared util (src/utils/switchOrganization.ts) so mobile
  // (useAutoActions) and web sidebar stay in lockstep.
  //
  // UX note: the backend tends to serialise requests per session, so the
  // sidebar's `/get-auto-list` fetch ends up queued behind AutoListScreen's
  // full fetch — meaning the footer would keep showing the previous org
  // for several seconds after the fleet already rendered. To fix this we
  // do an **optimistic swap** the moment `/set-current-inn` succeeds:
  //   - the clicked org moves from `otherUserList` into `userData`
  //   - the previously-current org takes its place in `otherUserList`
  // The real refetch still runs in the background so any drifted fields
  // get reconciled. Optimistic-swap logic is encapsulated in the
  // Context (see UserDataContext.optimisticOrgSwap) so both this sidebar
  // and any future consumer apply the same algorithm.
  const switchOrg = useCallback(async (inn: string) => {
    if (switchingInn) return;

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

      optimisticOrgSwap(inn);
      // Background sync — Context.updateUserData dedupes against any
      // in-flight call so we don't queue duplicate requests.
      void updateUserData();
      router.replace('/(authenticated)/auto-list' as any);
    } finally {
      setSwitchingInn(null);
    }
  }, [switchingInn, optimisticOrgSwap, updateUserData, router]);

  // ── active path helper ──────────────────────────────────────────────────────
  const isActive = (path: string) => pathname.startsWith(path);

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
        {servicesOpen && ourServicesList.map(svc => (
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

        {/* ── Организации (single-select radio list) ──
             Current org is the first row (filled radio, non-interactive);
             all other orgs the user has access to follow below as switch
             targets. Presenting them as one radio group makes the
             "which org am I in" question immediately obvious. */}
        {!!userData.inn && (
          <>
            <Divider expanded={expanded} />
            {expanded && (
              <Text style={styles.orgSectionLabel}>Организации</Text>
            )}
            <OrgListItem
              key={`current-${userData.inn}`}
              org={{
                inn: userData.inn,
                firm: userData.firm,
                // Backend omits `user_auto_count` for the active org
                // (see comment on `autoListCount` declaration above).
                // Use the top-level `auto_list_count` — same source the
                // main screen reads.
                user_auto_count: autoListCount,
                notification_unviewed_count: userData.notification_unviewed_count,
                user_confirmed: 1,
                phone_inn_confirmed: 1,
              }}
              compact={!expanded}
              current
              onPress={() => {}}
            />
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
          // Opens InviteUserModal in place — no route change. Direct URL
          // navigation to `/invite-user` still works for legacy bookmarks.
          onPress={() => setInviteOpen(true)}
          active={inviteOpen}
          expanded={expanded}
        />
        <NavItem
          icon={require('../../../assets/images/menu_contacts_2.png')}
          label="Обратная связь"
          onPress={() => setContactsOpen(true)}
          expanded={expanded}
        />

        {/* Bottom padding so last item isn't hidden */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Footer: session identity only ──
           Organization info has moved into the radio list above. The
           footer now shows just the user's phone (session-scoped, the
           one constant across org switches) so the sidebar still
           answers "who is logged in on this machine" at a glance. */}
      {loading ? (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#B8B8B8" />
        </View>
      ) : (
        expanded && !!userData.phone && (
          <View style={styles.footer}>
            <Text style={styles.footerPhone}>+{userData.phone}</Text>
          </View>
        )
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

      {/* Invite-a-friend modal — on submit returns a pre-composed message
          that the user can copy to clipboard. */}
      <InviteUserModal
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      {/* Contacts modal — manager + tech support, with phone/email/WhatsApp/
          Telegram actions. Same modal AutoListScreen uses on mobile/web,
          fed from /get-auto-list payload that loadData() already pulls. */}
      <ContactsModal
        visible={contactsOpen}
        managerData={userData.manager_data || {}}
        techSupportData={userData.tech_support_data}
        techSupportName={userData.tech_support_data?.name}
        userId={userData.id}
        userInn={userData.inn}
        onClose={() => setContactsOpen(false)}
        onContactPhone={(phone) => {
          if (!phone || phone === '+7' || phone.length < 5) return;
          Linking.openURL(`tel:${phone}`).catch(() => {});
        }}
        onContactEmail={(email, subject, body) => {
          if (!email) return;
          const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          Linking.openURL(url).catch(() => {});
        }}
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
