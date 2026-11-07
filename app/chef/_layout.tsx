import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { AppTabs } from '../../components/navigation/AppTabs';
import { chefTabs } from '../../components/navigation/tabs';

export default function ChefLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <AppTabs tabs={chefTabs} />
    </>
  );
}
