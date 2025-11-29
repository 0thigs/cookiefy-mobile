import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
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

export function BottomNavBar({ activeTab = 'home', onTabPress }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const NAV_ITEMS: NavItem[] = [
    {
      id: 'home',
      label: t('tabs.home'),
      icon: 'home-outline',
      activeIcon: 'home',
    },
    {
      id: 'search',
      label: t('tabs.search'),
      icon: 'search-outline',
      activeIcon: 'search',
    },
    {
      id: 'shoppingList',
      label: t('tabs.shoppingList'),
      icon: 'cart-outline',
      activeIcon: 'cart',
    },
    {
      id: 'favorites',
      label: t('tabs.favorites'),
      icon: 'heart-outline',
      activeIcon: 'heart',
    },
    {
      id: 'profile',
      label: t('tabs.profile'),
      icon: 'person-outline',
      activeIcon: 'person',
    },
  ];

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

