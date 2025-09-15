import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Props = {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function EmptyState({
  title,
  description,
  icon = 'restaurant-outline'
}: Props) {
  return (
    <View className="flex-1 justify-center items-center px-8 py-12">
      <View className="items-center">
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
          <Ionicons
            name={icon}
            size={40}
            color={colors.muted}
          />
        </View>

        <Text className="text-lg font-semibold text-gray-900 mb-2 text-center">
          {title}
        </Text>

        <Text className="text-sm text-gray-500 text-center leading-5">
          {description}
        </Text>
      </View>
    </View>
  );
}
