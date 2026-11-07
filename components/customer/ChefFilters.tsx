import { ChevronDown } from 'lucide-react-native';
import React, { memo, useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export type ChefSort = 'distance' | 'rating' | 'name';

type ChefFiltersProps = {
  radiusFilter: number | null;
  sortBy: ChefSort;
  onSelectRadius: (radius: number | null) => void;
  onSelectSort: (sort: ChefSort) => void;
};

const RADIUS_OPTIONS: readonly (number | null)[] = [5, 10, 20, null];

const SORT_OPTIONS: readonly { value: ChefSort; label: string }[] = [
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' },
  { value: 'name', label: 'Name (A-Z)' },
];

function ChefFiltersBase({
  radiusFilter,
  sortBy,
  onSelectRadius,
  onSelectSort,
}: ChefFiltersProps) {
  // Dropdown state is local so opening a menu does not re-render the kitchen list.
  const [showRadiusDropdown, setShowRadiusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const toggleRadiusDropdown = useCallback(() => {
    setShowRadiusDropdown((open) => !open);
    setShowSortDropdown(false);
  }, []);

  const toggleSortDropdown = useCallback(() => {
    setShowSortDropdown((open) => !open);
    setShowRadiusDropdown(false);
  }, []);

  const sortLabel = sortBy === 'distance' ? 'Distance' : sortBy === 'rating' ? 'Rating' : 'Name';

  return (
    <View className="flex-row gap-x-3">
      {/* Radius Filter */}
      <View className="flex-1">
        <TouchableOpacity
          className="flex-row items-center justify-between bg-gray-100 rounded-xl px-4 py-2.5"
          onPress={toggleRadiusDropdown}
        >
          <Text className="text-sm text-gray-700">
            Within: {radiusFilter ? `${radiusFilter}km` : 'All'}
          </Text>
          <ChevronDown size={16} color="#666" />
        </TouchableOpacity>

        {showRadiusDropdown && (
          <View className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
            {RADIUS_OPTIONS.map((radius) => (
              <TouchableOpacity
                key={radius ?? 'all'}
                className={`px-4 py-3 border-b border-gray-100 ${
                  radiusFilter === radius ? 'bg-green-50' : ''
                }`}
                onPress={() => {
                  onSelectRadius(radius);
                  setShowRadiusDropdown(false);
                }}
              >
                <Text className={`text-sm ${
                  radiusFilter === radius
                    ? 'text-green-600 font-heavy'
                    : 'text-gray-700'
                }`}>
                  {radius ? `${radius}km` : 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Sort Filter */}
      <View className="flex-1">
        <TouchableOpacity
          className="flex-row items-center justify-between bg-gray-100 rounded-xl px-4 py-2.5"
          onPress={toggleSortDropdown}
        >
          <Text className="text-sm text-gray-700">Sort: {sortLabel}</Text>
          <ChevronDown size={16} color="#666" />
        </TouchableOpacity>

        {showSortDropdown && (
          <View className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                className={`px-4 py-3 border-b border-gray-100 ${
                  sortBy === option.value ? 'bg-green-50' : ''
                }`}
                onPress={() => {
                  onSelectSort(option.value);
                  setShowSortDropdown(false);
                }}
              >
                <Text className={`text-sm ${
                  sortBy === option.value
                    ? 'text-green-600 font-heavy'
                    : 'text-gray-700'
                }`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/** Search filters. Memoised so their dropdown state stays out of the kitchen list render. */
export const ChefFilters = memo(ChefFiltersBase);
