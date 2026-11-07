import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { AppTabs } from '../../components/navigation/AppTabs';
import { customerTabs } from '../../components/navigation/tabs';

export default function CustomerLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <AppTabs tabs={customerTabs} />
    </>
  );
}
