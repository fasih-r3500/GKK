// services/locationService.ts
import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
}

export class LocationService {
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to find nearby kitchens.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  static async getCurrentLocation(): Promise<UserLocation | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get address
      const addressData = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = addressData[0];

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address 
          ? `${address.name || ''}, ${address.street || ''}, ${address.subregion || ''}`
          : undefined,
        city: address?.city || address?.region || undefined,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not fetch your location. Please try again.');
      return null;
    }
  }

  // Calculate distance between two coordinates (in kilometers)
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private static toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  // Sort chefs by distance from user location
  static sortChefsByDistance(
    chefs: any[],
    userLat: number,
    userLon: number
  ): any[] {
    return chefs
      .map(chef => ({
        ...chef,
        distance: chef.latitude && chef.longitude
          ? this.calculateDistance(userLat, userLon, chef.latitude, chef.longitude)
          : null,
      }))
      .sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
  }

  // Filter chefs within a certain radius (in km)
  static filterChefsByRadius(
    chefs: any[],
    userLat: number,
    userLon: number,
    radiusKm: number
  ): any[] {
    return chefs.filter(chef => {
      if (!chef.latitude || !chef.longitude) return false;
      const distance = this.calculateDistance(userLat, userLon, chef.latitude, chef.longitude);
      return distance <= radiusKm;
    });
  }
}