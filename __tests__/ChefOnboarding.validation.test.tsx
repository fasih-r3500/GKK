import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChefOnboarding from '../components/chef/ChefOnboarding';

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

describe('ChefOnboarding progress and validation', () => {
  it('shows progress and blocks empty kitchen name with a helpful error', async () => {
    const { getByText, queryByLabelText, getByLabelText } = await render(
      <ChefOnboarding userId="u1" onComplete={() => {}} />
    );

    // Progress heading on step 1.
    expect(getByText('STEP 1 OF 3')).toBeTruthy();
    expect(getByText('2 steps to go')).toBeTruthy();

    // Try to continue with an empty name -> blocked, stays on step 1 with an error.
    await fireEvent.press(getByLabelText('Continue to where you cook'));
    expect(
      getByText(/Please add your kitchen name/)
    ).toBeTruthy();
    // Still on step 1 (location address input not present).
    expect(queryByLabelText('Kitchen address, required')).toBeNull();
    expect(getByText('STEP 1 OF 3')).toBeTruthy();
  });

  it('advances step 1 only when a valid name is entered', async () => {
    const { getByText, getByLabelText, queryByLabelText } = await render(
      <ChefOnboarding userId="u1" onComplete={() => {}} />
    );

    await fireEvent.changeText(getByLabelText('Kitchen name, required'), 'A');
    await fireEvent.press(getByLabelText('Continue to where you cook'));
    // Too short -> still blocked with the short-name error.
    expect(getByText(/That name looks too short/)).toBeTruthy();
    expect(queryByLabelText('Kitchen address, required')).toBeNull();

    await fireEvent.changeText(getByLabelText('Kitchen name, required'), 'Ammi Kitchen');
    await fireEvent.press(getByLabelText('Continue to where you cook'));
    // Now on step 2.
    expect(getByText('STEP 2 OF 3')).toBeTruthy();
    expect(getByLabelText('Kitchen address, required')).toBeTruthy();
  });
});
