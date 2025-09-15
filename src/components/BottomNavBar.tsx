import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type NavItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  activeTab?: string;
  onTabPress?: (tabId: string) => void;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Início',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    id: 'search',
    label: 'Buscar',
    icon: 'search-outline',
    activeIcon: 'search',
  },
  {
    id: 'favorites',
    label: 'Favoritos',
    icon: 'heart-outline',
    activeIcon: 'heart',
  },
  {
    id: 'profile',
    label: 'Perfil',
    icon: 'person-outline',
    activeIcon: 'person',
  },
];

export function BottomNavBar({ activeTab = 'home', onTabPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="px-4 py-2 bg-white border-t border-gray-200"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <View className="flex-row justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const iconName = isActive ? item.activeIcon : item.icon;
          const textColor = isActive ? colors.primary : colors.muted;

          return (
            <Pressable
              key={item.id}
              onPress={() => onTabPress?.(item.id)}
              className="flex-1 items-center py-2"
            >
              <Ionicons
                name={iconName}
                size={24}
                color={textColor}
              />
              <Text
                className="mt-1 text-sm"
                style={{ color: textColor }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
