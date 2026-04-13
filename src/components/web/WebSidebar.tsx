import React, { useState, useEffect, useCallback } from 'react';
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
import api from '../../services/api';
import {
  WEB_SIDEBAR_WIDTH_COLLAPSED,
  WEB_SIDEBAR_WIDTH_EXPANDED,
} from '../../utils/responsive';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserData {
  firm?: string;
  inn?: string;
  phone?: string;
  notification_unviewed_count?: number;
  other_user_notification_unviewed_count?: number;
}

interface OtherUser {
  inn: string;
  firm?: string;
  user_auto_count?: number;
  user_confirmed?: number | string;
  phone_inn_confirmed?: number | string;
  notification_unviewed_count?: number;
}

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
  const [switching,      setSwitching]      = useState(false);
  const [onboardingExpired, setOnboardingExpired] = useState<number | string>(1);

  // ── fetch sidebar data ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    try {
      const res = await api.post('/get-auto-list', { token, auto_list_limit: 0 });
      const d   = res.data;
      if (d.user_data) {
        setUserData(d.user_data);
        setOtherUserList(d.other_user_list || []);
        setOurServices(d.our_services_list || []);
      }
      if (d.onboarding_expired !== undefined) {
        setOnboardingExpired(d.onboarding_expired);
      }
    } catch (e) {
      // silent — sidebar is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── org switch ──────────────────────────────────────────────────────────────
  const switchOrg = useCallback(async (inn: string) => {
    if (switching) return;
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    setSwitching(true);
    try {
      await api.post('/set-active-user', { token, inn });
      await loadData();
      router.replace('/(authenticated)/auto-list' as any);
    } catch (e) {
      // ignore
    } finally {
      setSwitching(false);
    }
  }, [switching, loadData, router]);

  // ── active path helper ──────────────────────────────────────────────────────
  const isActive = (path: string) => pathname.startsWith(path);

  const notifBadge   = userData.notification_unviewed_count   || 0;
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
          path="/(authenticated)/pass"
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
        <NavItem
          icon={require('../../../assets/images/notification.png')}
          label="Уведомления"
          path="/(authenticated)/notifications"
          active={isActive('/(authenticated)/notifications')}
          expanded={expanded}
          badge={notifBadge}
        />
        <NavItem
          icon={require('../../../assets/images/notification.png')}
          label="Настройки уведомлений"
          path="/(authenticated)/notification-settings"
          active={isActive('/(authenticated)/notification-settings')}
          expanded={expanded}
        />

        <Divider expanded={expanded} />

        {/* ── Аккаунт ── */}
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
          path="/(authenticated)/inn"
          active={isActive('/(authenticated)/inn')}
          expanded={expanded}
        />
        <NavItem
          icon={require('../../../assets/images/menu_left_add.png')}
          label="Добавить аккаунт"
          path="/(authenticated)/inn"
          active={false}
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
            {otherUserList.map((org, i) => {
              const confirmed =
                (org.user_confirmed === 1 || org.user_confirmed === '1') &&
                (org.phone_inn_confirmed === 1 || org.phone_inn_confirmed === '1');
              return (
                <NavItem
                  key={org.inn || i}
                  icon={require('../../../assets/images/menu_left_other_user.png')}
                  label={org.firm || org.inn}
                  onPress={confirmed ? () => switchOrg(org.inn) : undefined}
                  active={false}
                  expanded={expanded}
                  badge={org.notification_unviewed_count}
                />
              );
            })}
          </>
        )}

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
});
