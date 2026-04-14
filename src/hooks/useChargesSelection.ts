import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ChargeItem } from '../types/charges';

type ChargeFilterType = 'all' | 'gibdd' | 'paidRoads' | 'fssp' | 'fns';

export type { ChargeFilterType };

interface ChargesData {
  loading: boolean;
  refreshing: boolean;
  autoCharges: Record<string, { charges: ChargeItem[] }>;
  otherCharges: ChargeItem[];
  refresh: () => Promise<any>;
  getAutosWithFines: () => any[];
  loadAutoFines: (autoId: string) => Promise<void>;
  loadingAutoFines: Record<string, boolean>;
  backgroundLoading: boolean;
}

const COLLAPSED_LIMIT = 5;

/**
 * Shared charges-screen logic: filtering, selection, group expand/collapse, payment navigation.
 * Receives the data from `useCharges` hook to avoid creating it twice.
 */
export function useChargesSelection(chargesData: ChargesData) {
  const router = useRouter();
  const {
    loading, refreshing, autoCharges, otherCharges, refresh,
    getAutosWithFines, loadAutoFines, loadingAutoFines, backgroundLoading,
  } = chargesData;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [refreshBlockedMessage, setRefreshBlockedMessage] = useState<string | null>(null);
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<ChargeFilterType>('all');

  const autosWithFines = getAutosWithFines();

  // ── Charge type classification ──────────────────────────────────────────────
  const getChargeType = useCallback((charge: ChargeItem): ChargeFilterType => {
    if (charge.is_platon === '1' || charge.is_platon === 1) return 'paidRoads';
    if (charge.is_to_fssp === '1' || charge.is_to_fssp === 1) return 'fssp';
    return 'gibdd';
  }, []);

  // ── Filtered data ───────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (activeFilter === 'all') {
      return { autos: autosWithFines, other: otherCharges };
    }
    const filteredAutos = autosWithFines
      .map(auto => {
        const group = autoCharges[auto.auto_number];
        if (!group) return null;
        const filteredCharges = group.charges.filter(c => getChargeType(c) === activeFilter);
        if (filteredCharges.length === 0) return null;
        return { ...auto, filteredCharges };
      })
      .filter(Boolean) as any[];
    const filteredOther = otherCharges.filter(c => getChargeType(c) === activeFilter);
    return { autos: filteredAutos, other: filteredOther };
  }, [autosWithFines, otherCharges, autoCharges, activeFilter, getChargeType]);

  // ── Clean up stale selections after data refresh ────────────────────────────
  useEffect(() => {
    if (loading || refreshing || backgroundLoading) return;
    if (selectedCharges.size === 0) return;

    const allCurrentIds = new Set<string>();
    Object.values(autoCharges).forEach(g => g.charges.forEach(c => allCurrentIds.add(c.id)));
    otherCharges.forEach(c => allCurrentIds.add(c.id));

    setSelectedCharges(prev => {
      const next = new Set<string>();
      let changed = false;
      prev.forEach(id => {
        if (allCurrentIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [autoCharges, otherCharges, loading, refreshing, backgroundLoading]);

  // ── Enrich charge with auto number ──────────────────────────────────────────
  const enrichCharge = useCallback((charge: ChargeItem, autoNumber?: string) => ({
    ...charge,
    _auto_number: autoNumber,
  }), []);

  // ── Navigate to charge detail ───────────────────────────────────────────────
  const handleChargePress = useCallback((charge: ChargeItem) => {
    let autoNumber: string | undefined;
    Object.entries(autoCharges).forEach(([num, group]) => {
      if (group.charges.some(c => c.id === charge.id)) autoNumber = num;
    });
    router.push({
      pathname: '/auto-fine' as any,
      params: { fine_data: JSON.stringify(enrichCharge(charge, autoNumber)) },
    });
  }, [autoCharges, router, enrichCharge]);

  // ── Refresh with rate-limit message ─────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    const result = await refresh();
    if (result?.blocked) {
      setRefreshBlockedMessage(`Подождите ${result.remainingSeconds} сек.`);
      setTimeout(() => setRefreshBlockedMessage(null), 3000);
    }
  }, [refresh]);

  // ── Group expand/collapse + lazy-load ───────────────────────────────────────
  const toggleGroup = useCallback(async (autoId: string) => {
    const isExpanding = !expandedGroups[autoId];
    setExpandedGroups(prev => ({ ...prev, [autoId]: isExpanding }));
    if (isExpanding && !autoCharges[autoId]) {
      await loadAutoFines(autoId);
    }
  }, [expandedGroups, autoCharges, loadAutoFines]);

  // ── Single charge selection ─────────────────────────────────────────────────
  const toggleSelection = useCallback((charge: ChargeItem) => {
    setSelectedCharges(prev => {
      const next = new Set(prev);
      if (next.has(charge.id)) next.delete(charge.id);
      else next.add(charge.id);
      return next;
    });
  }, []);

  // ── Group selection ─────────────────────────────────────────────────────────
  const toggleGroupSelection = useCallback((charges: ChargeItem[]) => {
    setSelectedCharges(prev => {
      const next = new Set(prev);
      const allSelected = charges.every(c => next.has(c.id));
      if (allSelected) charges.forEach(c => next.delete(c.id));
      else charges.forEach(c => next.add(c.id));
      return next;
    });
  }, []);

  // ── Selected amount ─────────────────────────────────────────────────────────
  const selectedAmount = useMemo(() => {
    let sum = 0;
    Object.values(autoCharges).forEach(group => {
      group.charges.forEach(c => { if (selectedCharges.has(c.id)) sum += parseFloat(c.sum || '0'); });
    });
    otherCharges.forEach(c => { if (selectedCharges.has(c.id)) sum += parseFloat(c.sum || '0'); });
    return sum;
  }, [selectedCharges, autoCharges, otherCharges]);

  // ── Navigate to payment ─────────────────────────────────────────────────────
  const handlePaySelected = useCallback(() => {
    if (selectedCharges.size === 0) return;
    const chargesToPay: any[] = [];
    Object.entries(autoCharges).forEach(([autoNumber, group]) => {
      group.charges.forEach(c => {
        if (selectedCharges.has(c.id)) chargesToPay.push(enrichCharge(c, autoNumber));
      });
    });
    otherCharges.forEach(c => {
      if (selectedCharges.has(c.id)) chargesToPay.push(enrichCharge(c));
    });

    if (chargesToPay.length === 1) {
      router.push({ pathname: 'fine-payment-confirm' as any, params: { fine_data: JSON.stringify(chargesToPay[0]) } });
    } else {
      router.push({ pathname: 'fine-payment-confirm' as any, params: { charges: JSON.stringify(chargesToPay) } });
    }
  }, [selectedCharges, autoCharges, otherCharges, router, enrichCharge]);

  return {
    // Filter
    activeFilter,
    setActiveFilter,
    filteredData,
    getChargeType,
    // Selection
    selectedCharges,
    selectedAmount,
    toggleSelection,
    toggleGroupSelection,
    // Groups
    expandedGroups,
    toggleGroup,
    // Refresh
    refreshBlockedMessage,
    handleRefresh,
    // Actions
    enrichCharge,
    handleChargePress,
    handlePaySelected,
    // Constants
    COLLAPSED_LIMIT,
  };
}
