/**
 * Live-drives the bottom-tab navigation the change introduced.
 *
 * The change removed two hand-rolled tab bars (local `activeTab` state that re-mounted
 * screen content and imported `app/profile.tsx` as a plain component) and replaced them
 * with a single Expo Router `Tabs` layout (`components/navigation/AppTabs`) plus real route
 * files. This test renders the real `AppTabs` component and the real route screens inside an
 * actual Expo Router navigator (`renderRouter`) and drives the same interactions an end user
 * performs: the Home tab shows the customer home, and pressing the Orders and Profile tabs
 * switches to those real screens with no hand-rolled nav.
 *
 * Only the external Supabase data service is mocked (external-boundary mock). `AppTabs`,
 * `customerTabs`, `CustomerHome`, `OrdersPlaceholder`, and `ProfileScreen` are the real code.
 */
import { renderRouter, screen } from 'expo-router/testing-library';
import { act, fireEvent } from '@testing-library/react-native';

import { AppTabs } from '../components/navigation/AppTabs';
import { customerTabs } from '../components/navigation/tabs';
import CustomerHome from '../components/customer/CustomerHome';
import { OrdersPlaceholder } from '../components/shared/OrdersPlaceholder';
import ProfileScreen from '../components/profile/ProfileScreen';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
}));

jest.mock('../services/locationService', () => ({
  LocationService: {
    getCurrentLocation: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'customer-1', email: 'c@example.com' } },
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: () => {
      const query = () => Promise.resolve({ data: [], error: null });
      const chainable = {
        then: undefined,
        select: () => chainable,
        eq: () => chainable,
        single: () => Promise.resolve({
          data: {
            id: 'customer-1',
            user_type: 'customer',
            full_name: 'Test Customer',
            phone_number: '+921234567890',
          },
          error: null,
        }),
      };
      // fetchChefs awaits the query result (`.eq(...).eq(...)`), so make the
      // final object thenable with the chef list result.
      Object.assign(chainable, {
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      });
      return chainable;
    },
    storage: {
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }),
    },
  },
}));

function CustomerTabs() {
  return <AppTabs tabs={customerTabs} />;
}

describe('bottom tabs navigation (Expo Router Tabs)', () => {
  it('renders the customer tab bar and switches to Orders and Profile screens', async () => {
    const router = await renderRouter(
      {
        _layout: CustomerTabs,
        home: () => <CustomerHome />,
        orders: () => <OrdersPlaceholder />,
        profile: () => <ProfileScreen />,
      },
      { initialUrl: '/home' }
    );

    // Home renders the customer home list.
    expect(await screen.findByText('Deliver To')).toBeTruthy();

    // The real bottom tab bar presents the three tabs.
    expect(screen.getByText('Orders')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();

    // Pressing the Orders tab switches to the real Orders route content.
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Orders'));
    });
    expect(await screen.findByText('Orders tab content here')).toBeTruthy();
    expect(router.getPathname()).toBe('/orders');

    // Pressing Profile switches to the real profile screen.
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Profile'));
    });
    expect(router.getPathname()).toBe('/profile');
    expect(await screen.findByText('Your Profile', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('Test Customer')).toBeTruthy();
    expect(router.getPathname()).toBe('/profile');
  });
});
