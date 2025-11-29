import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from 'react-native';
import { BottomNavBar } from '../components/BottomNavBar';
import { useNavigation } from '../hooks/useNavigation';
import {
    addItemToList,
    clearCheckedItems,
    deleteItem,
    getShoppingList,
    toggleItemChecked,
    updateItem,
    type ShoppingListItem,
} from '../services/shopping-list';
import { colors } from '../theme/colors';

export default function ShoppingListScreen() {
  const { handleTabPress } = useNavigation();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('shoppingList');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('un');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadList();
  }, []);

  async function loadList() {
    setLoading(true);
    try {
      const data = await getShoppingList();
      setItems(data.items || []);
    } catch (error: any) {
      Alert.alert(t('common.error'), t('common.unknown'));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(itemId: string) {
    try {
      await toggleItemChecked(itemId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
        )
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), t('common.unknown'));
    }
  }

  async function handleDelete(itemId: string) {
    Alert.alert(
      t('common.confirm'),
      t('common.confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(itemId);
              setItems((prev) => prev.filter((item) => item.id !== itemId));
            } catch (error: any) {
              Alert.alert(t('common.error'), t('common.unknown'));
            }
          },
        },
      ]
    );
  }

  async function handleClearChecked() {
    const checkedCount = items.filter((i) => i.isChecked).length;
    if (checkedCount === 0) {
      Alert.alert(t('common.error'), t('shoppingList.empty'));
      return;
    }

    Alert.alert(
      t('common.confirm'),
      t('shoppingList.clearConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clear'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCheckedItems();
              setItems((prev) => prev.filter((item) => !item.isChecked));
            } catch (error: any) {
              Alert.alert(t('common.error'), t('common.unknown'));
            }
          },
        },
      ]
    );
  }

  function openAddModal() {
    setEditingItem(null);
    setNote('');
    setAmount('');
    setUnit('un');
    setShowAddModal(true);
  }

  function openEditModal(item: ShoppingListItem) {
    setEditingItem(item);
    setNote(item.note || '');
    setAmount(String(item.amount || ''));
    setUnit(item.unit || 'un');
    setShowAddModal(true);
  }

  async function handleSave() {
    if (saving) return; 

    const trimmedNote = note.trim();
    const trimmedUnit = unit.trim();

    if (!trimmedNote) {
      Alert.alert(t('common.error'), t('common.required'));
      return;
    }

    if (!trimmedUnit) {
      Alert.alert(t('common.error'), t('common.required'));
      return;
    }

    if (trimmedUnit.length > 10) {
      Alert.alert(t('common.error'), t('common.error'));
      return;
    }

  const allowedPattern = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s\-\/,.]+$/;
    if (!allowedPattern.test(trimmedNote)) {
      Alert.alert(t('common.error'), t('common.error'));
      return;
    }

    if (!allowedPattern.test(trimmedUnit)) {
      Alert.alert(t('common.error'), t('common.error'));
      return;
    }

    if (!/^[0-9]+$/.test(amount)) {
      Alert.alert(t('common.error'), t('common.error'));
      return;
    }
    const numAmount = parseInt(amount, 10);
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('common.error'), t('common.error'));
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await updateItem(editingItem.id, {
          note: trimmedNote,
          amount: numAmount,
          unit: trimmedUnit,
        });
        setItems((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? { ...item, note: trimmedNote, amount: numAmount, unit: trimmedUnit }
              : item
          )
        );
      } else {
        const newItem = await addItemToList({
          note: trimmedNote,
          amount: numAmount,
          unit: trimmedUnit,
        });
        setItems((prev) => [...prev, newItem]);
      }
      setShowAddModal(false);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('common.unknown'));
    } finally {
      setSaving(false);
    }
  }

  const uncheckedItems = items.filter((i) => !i.isChecked);
  const checkedItems = items.filter((i) => i.isChecked);

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-gray-600">{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pt-12 pb-6 bg-primary">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-white">{t('shoppingList.title')}</Text>
            <Text className="mt-1 text-white/80">
              {uncheckedItems.length} {uncheckedItems.length === 1 ? t('shoppingList.item') : t('shoppingList.items')}
            </Text>
          </View>
          <Pressable
            onPress={handleClearChecked}
            className="p-3 rounded-full bg-white/20"
            disabled={checkedItems.length === 0}
          >
            <Ionicons name="trash-outline" size={24} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Lista */}
      <ScrollView className="flex-1 px-6 py-4">
        {items.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Ionicons name="cart-outline" size={64} color={colors.muted} />
            <Text className="mt-4 text-lg font-semibold text-gray-900">
              {t('shoppingList.empty')}
            </Text>
            <Text className="mt-2 text-center text-gray-600">
              {t('shoppingList.emptyDesc')}
            </Text>
          </View>
        ) : (
          <>
            {/* Itens pendentes */}
            {uncheckedItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={openEditModal}
              />
            ))}

            {/* Itens marcados */}
            {checkedItems.length > 0 && (
              <>
                <View className="flex-row items-center my-4">
                  <View className="flex-1 h-px bg-gray-300" />
                  <Text className="px-3 text-sm text-gray-500">{t('shoppingList.bought')}</Text>
                  <View className="flex-1 h-px bg-gray-300" />
                </View>
                {checkedItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={openEditModal}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Pressable
        onPress={openAddModal}
        className="absolute items-center justify-center w-16 h-16 rounded-full shadow-lg bottom-32 right-6 bg-primary"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={32} color="white" />
      </Pressable>

      {showAddModal && (
        <View
          className="absolute inset-0 bg-black/50"
          style={{ zIndex: 100 }}
        >
          <Pressable
            className="flex-1"
            onPress={() => setShowAddModal(false)}
          />
          <View className="p-6 bg-white rounded-t-3xl">
            <Text className="mb-4 text-xl font-bold text-gray-900">
              {editingItem ? t('common.edit') : t('common.add')}
            </Text>

            <Text className="mb-2 text-sm font-medium text-gray-700">{t('shoppingList.itemLabel')}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('shoppingList.itemPlaceholder')}
              className="px-4 py-3 mb-4 border border-gray-300 rounded-lg"
            />

            <View className="flex-row mb-4 space-x-4">
              <View className="flex-1">
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  {t('shoppingList.quantity')}
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    setAmount(cleaned);
                  }}
                  placeholder="1"
                  keyboardType="number-pad"
                  className="px-4 py-3 border border-gray-300 rounded-lg"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-2 text-sm font-medium text-gray-700">{t('shoppingList.unit')}</Text>
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="kg"
                  className="px-4 py-3 border border-gray-300 rounded-lg"
                />
              </View>
            </View>

            <View className="flex-row space-x-3">
              <Pressable
                onPress={() => setShowAddModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg"
              >
                <Text className="font-semibold text-center text-gray-700">
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                className="flex-1 py-3 rounded-lg bg-primary"
              >
                <Text className="font-semibold text-center text-white">
                  {editingItem ? t('common.save') : t('common.add')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

function ItemRow({
  item,
  onToggle,
  onDelete,
  onEdit,
}: {
  item: ShoppingListItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: ShoppingListItem) => void;
}) {
  const { t } = useTranslation();
  const displayName =
    item.ingredient?.name || item.note || t('shoppingList.unnamedItem');
  const displayAmount = `${item.amount} ${item.unit}`;

  return (
    <View className="flex-row items-center py-3 border-b border-gray-200">
      <Pressable onPress={() => onToggle(item.id)} className="mr-3">
        <Ionicons
          name={item.isChecked ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={item.isChecked ? colors.primary : colors.muted}
        />
      </Pressable>

      <Pressable onPress={() => onEdit(item)} className="flex-1">
        <Text
          className={`text-base ${
            item.isChecked ? 'line-through text-gray-400' : 'text-gray-900'
          }`}
        >
          {displayName}
        </Text>
        <Text className="text-sm text-gray-500">{displayAmount}</Text>
        {item.recipe && (
          <Text className="text-xs text-gray-400">
            {t('shoppingList.from')}: {item.recipe.title}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => onDelete(item.id)} className="p-2">
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </Pressable>
    </View>
  );
}
