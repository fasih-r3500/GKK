import { Heart, Home, ShoppingBag, User } from 'lucide-react-native';

import type { AppTab } from './AppTabs';

/** Tabs shown on the customer surface. */
export const customerTabs: readonly AppTab[] = [
  { name: 'home', title: 'Home', Icon: Home },
  { name: 'orders', title: 'Orders', Icon: Heart },
  { name: 'profile', title: 'Profile', Icon: User },
];

/** Tabs shown on the chef surface. The first screen of this group is `/chef`. */
export const chefTabs: readonly AppTab[] = [
  { name: 'index', title: 'Home', Icon: Home },
  { name: 'orders', title: 'Orders', Icon: ShoppingBag },
  { name: 'profile', title: 'Profile', Icon: User },
];
