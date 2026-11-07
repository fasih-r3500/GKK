import { Tabs } from 'expo-router';
import React from 'react';

import { BRAND_GREEN } from './brand';

type TabIconProps = {
  color: string;
  size: number;
};

export type TabIcon = React.ComponentType<TabIconProps>;
export type AppTab = {
  name: string;
  title: string;
  Icon: TabIcon;
};

type AppTabsProps = {
  tabs: readonly AppTab[];
};

/**
 * The single bottom tab bar implementation for the app.
 *
 * Each surface passes its own tab list, so the customer and chef tab bars stay different
 * without either screen knowing how navigation is drawn.
 */
export function AppTabs({ tabs }: AppTabsProps) {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_GREEN,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
        },
        tabBarLabelStyle: {
          fontFamily: 'Garet-Book',
          fontSize: 11,
        },
      }}
    >
      {tabs.map(({ name, title, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarAccessibilityLabel: title,
            tabBarIcon: ({ color, size }) => (
              <Icon color={color as string} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
