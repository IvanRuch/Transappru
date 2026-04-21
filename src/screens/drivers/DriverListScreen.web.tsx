/**
 * Web version of DriverListScreen — standalone sidebar route.
 *
 * Reuses `DriversTab` — the same component used as a tab inside AutoDetail
 * (CRUD over /get-driver-list, /add-user-driver, etc.). No business logic here.
 *
 * Does NOT wrap in `<WebAppLayout>` — the authenticated layout
 * (`_layout.web.tsx`) already provides it (see .claude/rules.md).
 *
 * TODO: the mobile counterpart is a 533-line class component that duplicates
 * all the logic already present in DriversTab. Follow-up task: extract
 * `useDriverList` hook + shared `<DriverCard>`, `<DriverEditModal>`,
 * `<DriverDeleteModal>` sub-components, then convert mobile to functional.
 */
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components/common';
import WebScreenContainer from '../../components/web/WebScreenContainer';
import { DriversTab } from '../auto/web/DriversTab';

export default function DriverListScreen() {
  const router = useRouter();

  const safeBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/main' as any);
  }, [router]);

  return (
    <View className="flex-1">
      <ScreenHeader title="Водители" onBack={safeBack} />
      <WebScreenContainer maxWidth={960}>
        <DriversTab />
      </WebScreenContainer>
    </View>
  );
}
