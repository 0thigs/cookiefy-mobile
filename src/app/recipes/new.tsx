import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
  Switch,
} from 'react-native';
import { z } from 'zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { listCategories, type Category } from '../../services/categories';
import { createRecipe, publishRecipe } from '../../services/recipes';
import { router } from 'expo-router';
import { colors } from '../../theme/colors';

const schema = z.object({
  title: z.string().min(2, 'Informe um título'),
  description: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  prepMinutes: z.string().optional(),
  cookMinutes: z.string().optional(),
  servings: z.string().optional(),
  nutrition: z
  .object({
    calories: z.string().optional(),   // kcal
    protein: z.string().optional(),    // g
    carbs: z.string().optional(),      // g
    fat: z.string().optional(),        // g
    fiber: z.string().optional(),      // g
    sodium: z.string().optional(),     // mg
  })
  .optional(),

  steps: z.array(
    z.object({
      text: z.string().min(1, 'Descreva o passo'),
      durationSec: z.string().optional(),
    })
  ).optional(),

  photos: z.array(
    z.object({
      url: z.string().url('URL inválida'),
      alt: z.string().optional(),
    })
  ).optional(),

  ingredients: z.array(
    z.object({
      name: z.string().min(1, 'Nome do ingrediente'),
      amount: z.string().optional(),
      unit: z.string().optional(),
    })
  ).optional(),

  categoriesIds: z.array(z.string()).optional(),
  publishNow: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

export default function NewRecipeScreen() {
  const [loadingCats, setLoadingCats] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      difficulty: 'MEDIUM',
      steps: [{ text: '', durationSec: '' }],
      photos: [{ url: '', alt: '' }],
      ingredients: [{ name: '', amount: '', unit: '' }],
      categoriesIds: [],
      nutrition: { calories: '', protein: '', carbs: '', fat: '', fiber: '', sodium: '' },
      publishNow: true,
    },
  });

  const steps = useFieldArray({ control, name: 'steps' });
  const photos = useFieldArray({ control, name: 'photos' });
  const ingredients = useFieldArray({ control, name: 'ingredients' });

  useEffect(() => {
    (async () => {
      try {
        const data = await listCategories();
        setCats(data);
      } finally {
        setLoadingCats(false);
      }
    })();
  }, []);

  function toggleCategory(id: string) {
    const current = new Set(getValues('categoriesIds') || []);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    setValue('categoriesIds', Array.from(current), { shouldValidate: true });
  }

  function toNum(s?: string) {
    if (!s) return undefined;
    const n = Number(String(s).replace(',', '.').trim());
    return Number.isFinite(n) ? n : undefined;
  }

  const onSubmit = handleSubmit(async (form) => {
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        difficulty: form.difficulty,
        prepMinutes: form.prepMinutes ? Number(form.prepMinutes) : undefined,
        cookMinutes: form.cookMinutes ? Number(form.cookMinutes) : undefined,
        servings: form.servings ? Number(form.servings) : undefined,
        nutrition: (() => {
          const obj: Record<string, number> = {};
          const c = toNum(form.nutrition?.calories);
          const p = toNum(form.nutrition?.protein);
          const cb = toNum(form.nutrition?.carbs);
          const f = toNum(form.nutrition?.fat);
          const fb = toNum(form.nutrition?.fiber);
          const s = toNum(form.nutrition?.sodium);
          if (c !== undefined) obj.calories = c;      // kcal
          if (p !== undefined) obj.protein = p;       // g
          if (cb !== undefined) obj.carbs = cb;       // g
          if (f !== undefined) obj.fat = f;           // g
          if (fb !== undefined) obj.fiber = fb;       // g
          if (s !== undefined) obj.sodium = s;        // mg
          return Object.keys(obj).length ? obj : undefined;
        })(),
        steps: (form.steps || [])
          .filter((s: any) => s.text.trim().length)
          .map((s: any, idx: number) => ({
            order: idx,
            text: s.text.trim(),
            durationSec: s.durationSec ? Number(s.durationSec) : null,
          })),
        photos: (form.photos || [])
          .filter((p: any) => p.url.trim().length)
          .map((p: any, idx: number) => ({
            url: p.url.trim(),
            alt: p.alt?.trim() || null,
            order: idx,
          })),
        ingredients: (form.ingredients || [])
          .filter((i: any) => i.name.trim().length)
          .map((i: any) => ({
            name: i.name.trim(),
            amount: i.amount ? Number(i.amount) : null,
            unit: i.unit?.trim() || null,
          })),
        categories: (form.categoriesIds || []).map((id: string) => ({ categoryId: id })),
      };

      const created = await createRecipe(payload);
      if (form.publishNow) {
        await publishRecipe(created.id);
      }

      Alert.alert('Sucesso', 'Receita criada!', [{ text: 'OK', onPress: () => router.replace('/') }]);
    } catch (e: any) {
      if (e?.message !== 'nutrition_invalid') {
        Alert.alert('Erro', e?.message ?? 'Não foi possível salvar a receita');
      }
    } finally {
      setSubmitting(false);
    }
  });

  const Chip = ({ selected, onPress, children }: any) => (
    <Pressable
      onPress={onPress}
      className={`px-3 py-2 mr-2 mb-2 rounded-full border ${selected ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}
    >
      <Text className={selected ? 'text-white' : 'text-gray-700'}>{children}</Text>
    </Pressable>
  );

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text className="mb-3 text-2xl font-bold text-center">Nova receita</Text>

      <Text className="mb-1 font-medium">Título *</Text>
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="px-4 py-3 mb-1 w-full rounded-lg border border-gray-300"
            placeholder="Ex.: Spaghetti Carbonara Clássico"
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.title && <Text className="mb-3 text-danger">{errors.title.message}</Text>}

      <Text className="mb-1 font-medium">Descrição</Text>
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="px-4 py-3 mb-3 w-full rounded-lg border border-gray-300"
            placeholder="Fale um pouco sobre a receita"
            value={value}
            onChangeText={onChange}
            multiline
          />
        )}
      />

      <Text className="mb-1 font-medium">Dificuldade</Text>
      <View className="flex-row mb-3">
        {(['EASY','MEDIUM','HARD'] as const).map((d) => (
          <Controller
            key={d}
            control={control}
            name="difficulty"
            render={({ field: { value, onChange } }) => (
              <Chip selected={value === d} onPress={() => onChange(d)}>
                {d === 'EASY' ? 'Fácil' : d === 'MEDIUM' ? 'Média' : 'Difícil'}
              </Chip>
            )}
          />
        ))}
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1 font-medium">Preparo (min)</Text>
          <Controller
            control={control}
            name="prepMinutes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="px-4 py-3 mb-3 w-full rounded-lg border border-gray-300"
                keyboardType="number-pad"
                placeholder="ex.: 10"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 font-medium">Cocção (min)</Text>
          <Controller
            control={control}
            name="cookMinutes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="px-4 py-3 mb-3 w-full rounded-lg border border-gray-300"
                keyboardType="number-pad"
                placeholder="ex.: 20"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 font-medium">Porções</Text>
          <Controller
            control={control}
            name="servings"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="px-4 py-3 mb-3 w-full rounded-lg border border-gray-300"
                keyboardType="number-pad"
                placeholder="ex.: 4"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>
      </View>

      <Text className="mb-2 text-lg font-semibold">Informações nutricionais (opcional)</Text>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1 font-medium">Calorias (kcal)</Text>
          <Controller
            control={control}
            name="nutrition.calories"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="px-4 py-3 mb-3 w-full rounded-lg border border-gray-300"
                placeholder="ex.: 450"
                keyboardType="number-pad"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>

        <View className="flex-1">
          <Text className="mb-1 font-medium">Proteína (g)</Text>
          <Controller
            control={control}
            name="nutrition.protein"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="px-4 py-3 mb-3 w-full rounded-lg border border-gray-300"
                placeholder="ex.: 20"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1 font-medium">Carboidratos (g)</Text>
          <Controller
            control={control}
            name="nutrition.carbs"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="px-4 py-3 mb-3 w-full rounded-lg border border-gray-300"
                placeholder="ex.: 55"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>

        <View className="flex-1">
          <Text className="mb-1 font-medium">Gorduras (g)</Text>
          <Controller
            control={control}
            name="nutrition.fat"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="px-4 py-3 mb-3 w-full rounded-lg border border-gray-300"
                placeholder="ex.: 12"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1 font-medium">Fibra (g)</Text>
          <Controller
            control={control}
            name="nutrition.fiber"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="px-4 py-3 mb-3 w-full rounded-lg border border-gray-300"
                placeholder="ex.: 5"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>

        <View className="flex-1">
          <Text className="mb-1 font-medium">Sódio (mg)</Text>
          <Controller
            control={control}
            name="nutrition.sodium"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="px-4 py-3 mb-3 w-full rounded-lg border border-gray-300"
                placeholder="ex.: 600"
                keyboardType="number-pad"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>
      </View>

      <Text className="mb-2 text-lg font-semibold">Ingredientes</Text>
      {ingredients.fields.map((f, idx) => (
        <View key={f.id} className="mb-2 rounded-xl border border-gray-200 p-3">
          <Text className="mb-1 font-medium">Nome</Text>
          <Controller
            control={control}
            name={`ingredients.${idx}.name` as const}
            render={({ field: { onChange, value } }) => (
              <TextInput className="px-3 py-2 mb-2 rounded-lg border border-gray-300" placeholder="Ex.: Tomate"
                value={value} onChangeText={onChange} />
            )}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1 font-medium">Quantidade</Text>
              <Controller
                control={control}
                name={`ingredients.${idx}.amount` as const}
                render={({ field: { onChange, value } }) => (
                  <TextInput className="px-3 py-2 rounded-lg border border-gray-300" keyboardType="decimal-pad"
                    placeholder="Ex.: 2" value={value} onChangeText={onChange} />
                )}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1 font-medium">Unidade</Text>
              <Controller
                control={control}
                name={`ingredients.${idx}.unit` as const}
                render={({ field: { onChange, value } }) => (
                  <TextInput className="px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Ex.: un, g, ml, xícara" value={value} onChangeText={onChange} />
                )}
              />
            </View>
          </View>
          <Pressable className="self-end mt-2 px-3 py-1 rounded-lg border border-gray-300"
            onPress={() => ingredients.remove(idx)}>
            <Text className="text-gray-600">Remover</Text>
          </Pressable>
        </View>
      ))}
      <Pressable className="items-center py-2 mb-4 rounded-lg border border-gray-300"
        onPress={() => ingredients.append({ name: '', amount: '', unit: '' })}>
        <Text className="font-medium text-gray-700">Adicionar ingrediente</Text>
      </Pressable>

      <Text className="mb-2 text-lg font-semibold">Modo de preparo</Text>
      {steps.fields.map((f, idx) => (
        <View key={f.id} className="mb-2 rounded-xl border border-gray-200 p-3">
          <Text className="mb-1 font-medium">Passo {idx + 1}</Text>
          <Controller
            control={control}
            name={`steps.${idx}.text` as const}
            render={({ field: { onChange, value } }) => (
              <TextInput className="px-3 py-2 mb-2 rounded-lg border border-gray-300"
                placeholder="Descreva o passo" value={value} onChangeText={onChange} multiline />
            )}
          />
          <Text className="mb-1 font-medium">Duração (segundos, opcional)</Text>
          <Controller
            control={control}
            name={`steps.${idx}.durationSec` as const}
            render={({ field: { onChange, value } }) => (
              <TextInput className="px-3 py-2 rounded-lg border border-gray-300"
                keyboardType="number-pad" placeholder="Ex.: 60" value={value} onChangeText={onChange} />
            )}
          />
          <Pressable className="self-end mt-2 px-3 py-1 rounded-lg border border-gray-300"
            onPress={() => steps.remove(idx)}>
            <Text className="text-gray-600">Remover</Text>
          </Pressable>
        </View>
      ))}
      <Pressable className="items-center py-2 mb-4 rounded-lg border border-gray-300"
        onPress={() => steps.append({ text: '', durationSec: '' })}>
        <Text className="font-medium text-gray-700">Adicionar passo</Text>
      </Pressable>

      <Text className="mb-2 text-lg font-semibold">Fotos (URL pública)</Text>
      {photos.fields.map((f, idx) => (
        <View key={f.id} className="mb-2 rounded-xl border border-gray-200 p-3">
          <Text className="mb-1 font-medium">URL</Text>
          <Controller
            control={control}
            name={`photos.${idx}.url` as const}
            render={({ field: { onChange, value } }) => (
              <TextInput className="px-3 py-2 mb-2 rounded-lg border border-gray-300"
                placeholder="https://..." value={value} onChangeText={onChange} autoCapitalize="none" />
            )}
          />
          <Text className="mb-1 font-medium">Alt (opcional)</Text>
          <Controller
            control={control}
            name={`photos.${idx}.alt` as const}
            render={({ field: { onChange, value } }) => (
              <TextInput className="px-3 py-2 rounded-lg border border-gray-300"
                placeholder="Descrição da imagem" value={value} onChangeText={onChange} />
            )}
          />
          <Pressable className="self-end mt-2 px-3 py-1 rounded-lg border border-gray-300"
            onPress={() => photos.remove(idx)}>
            <Text className="text-gray-600">Remover</Text>
          </Pressable>
        </View>
      ))}
      <Pressable className="items-center py-2 mb-4 rounded-lg border border-gray-300"
        onPress={() => photos.append({ url: '', alt: '' })}>
        <Text className="font-medium text-gray-700">Adicionar foto</Text>
      </Pressable>

      <Text className="mb-1 font-medium">Categorias</Text>
      <View className="flex-row flex-wrap mb-3">
        {loadingCats ? (
          <ActivityIndicator />
        ) : (
          cats.map((c) => (
            <Controller
              key={c.id}
              control={control}
              name="categoriesIds"
              render={({ field: { value } }) => (
                <Pressable onPress={() => toggleCategory(c.id)} className="mr-2 mb-2">
                  <View
                    className={`px-3 py-2 rounded-full border ${
                      value?.includes(c.id)
                        ? 'bg-primary border-primary'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={value?.includes(c.id) ? 'text-white' : 'text-gray-700'}>
                      {c.name}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          ))
        )}
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <Text className="font-medium">Publicar agora</Text>
        <Controller
          control={control}
          name="publishNow"
          render={({ field: { value, onChange } }) => (
            <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
          )}
        />
      </View>

      {errors.root && <Text className="mb-2 text-danger">{String(errors.root.message)}</Text>}

      <Pressable
        onPress={onSubmit}
        disabled={submitting}
        className="items-center py-3 rounded-lg bg-primary"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-semibold text-white">Salvar receita</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        className="items-center py-3 mt-3 rounded-lg border border-gray-300"
      >
        <Text className="font-semibold text-gray-700">Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}
