import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChefOnboarding from '../components/chef/ChefOnboarding';

// Mock the network/service boundaries; the component logic under test is pure React state.
jest.mock('../services/locationService', () => ({
  LocationService: {
    getCurrentLocation: jest.fn(),
    requestPermissions: jest.fn(),
  },
}));

jest.mock('../supabase', () => ({
  supabase: {
    storage: { from: () => ({ upload: jest.fn() }) },
    from: () => ({ update: () => ({ eq: () => Promise.resolve({}) }) }),
  },
}));

import { LocationService } from '../services/locationService';

const mockedGetLocation = LocationService.getCurrentLocation as jest.Mock;

describe('ChefOnboarding location step', () => {
  beforeEach(() => {
    mockedGetLocation.mockReset();
  });

  it('preserves a manually typed address when geocode returns an unusable address', async () => {
    // Simulate: getCurrentLocation succeeds (returns coords) but reverse geocode
    // has no addressData[0] -> address is " ,  ,  " style junk -> tidyText leaves commas/spaces.
    mockedGetLocation.mockResolvedValueOnce({
      latitude: 24.86,
      longitude: 67.0,
      address: ', , ',
    });

    const { getByLabelText, getByText, queryByText } = await render(
      <ChefOnboarding userId="u1" onComplete={() => {}} />
    );

    // Fill required kitchen name so step 1 validation passes.
    await fireEvent.changeText(
      getByLabelText('Kitchen name, required'),
      'Ammi Kitchen'
    );

    // Navigate to step 2 (location).
    await fireEvent.press(getByLabelText('Continue to where you cook'));

    // Type an address manually.
    const addressInput = getByLabelText('Kitchen address, required');
    await fireEvent.changeText(addressInput, 'House 12, Street 4, Clifton');
    expect(addressInput.props.value).toBe('House 12, Street 4, Clifton');

    // Tap "Use my current location".
    await fireEvent.press(getByLabelText('Use my current location'));

    await waitFor(() => {
      // Should NOT show the green "found" confirmation.
      expect(queryByText(/We found your location/)).toBeNull();
    });

    // Should show the "failed" message instead.
    expect(getByText(/We could not find your location/)).toBeTruthy();

    // The manually typed address must be preserved, not wiped to ''.
    expect(getByLabelText('Kitchen address, required').props.value).toBe(
      'House 12, Street 4, Clifton'
    );
  });

  it('fills the address when geocode returns a usable address', async () => {
    mockedGetLocation.mockResolvedValueOnce({
      latitude: 24.86,
      longitude: 67.0,
      address: '12, Main Street, Clifton',
    });

    const { getByLabelText, getByText } = await render(
      <ChefOnboarding userId="u1" onComplete={() => {}} />
    );

    await fireEvent.changeText(
      getByLabelText('Kitchen name, required'),
      'Ammi Kitchen'
    );
    await fireEvent.press(getByLabelText('Continue to where you cook'));
    await fireEvent.press(getByLabelText('Use my current location'));

    await waitFor(() => {
      expect(getByText(/We found your location/)).toBeTruthy();
    });

    expect(getByLabelText('Kitchen address, required').props.value).toBe(
      '12, Main Street, Clifton'
    );
  });
});
