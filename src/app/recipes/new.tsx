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
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { listCategories, type Category } from '../../services/categories';
import { createRecipe, publishRecipe } from '../../services/recipes';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '../../theme/colors';

const MAX_INT64_STR = '9223372036854775807';
const nonNegativeNumericString = z
  .string()
  .optional()
  .refine(
    (v) => {
      if (v == null || String(v).trim() === '') return true;
      const t = String(v).trim();
      const n = Number(t.replace(',', '.'));
      if (!Number.isFinite(n) || n < 0) return false;
      return true;
    },
    { message: 'Valor não pode ser negativo' }
  )
  .refine(
    (v) => {
      if (v == null || String(v).trim() === '') return true;
      const t = String(v).trim();
      const intPart = t.split(/[.,]/)[0].replace(/\D/g, '');
      if (intPart.length === 0) return true;
      if (intPart.length > 19) return false;
      if (intPart.length < 19) return true;
      return intPart <= MAX_INT64_STR;
    },
    { message: 'Valor excede o máximo permitido' }
  );

const schema = z.object({
  title: z.string().min(2, 'Informe um título'),
  description: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  prepMinutes: nonNegativeNumericString,
  cookMinutes: nonNegativeNumericString,
  servings: nonNegativeNumericString,
  nutrition: z
    .object({
      calories: nonNegativeNumericString, // kcal
      protein: nonNegativeNumericString, // g
      carbs: nonNegativeNumericString, // g
      fat: nonNegativeNumericString, // g
      fiber: nonNegativeNumericString, // g
      sodium: nonNegativeNumericString, // mg
    })
    .optional(),

  steps: z
    .array(
      z.object({
        text: z.string().min(1, 'Descreva o passo'),
        durationSec: nonNegativeNumericString,
      })
    )
    .optional(),

  photos: z
    .array(
      z.object({
        url: z.string().url('URL inválida'),
        alt: z.string().optional(),
      })
    )
    .optional(),

  ingredients: z
    .array(
      z.object({
        name: z.string().min(1, 'Nome do ingrediente'),
        amount: nonNegativeNumericString,
        unit: z.string().optional(),
      })
    )
    .optional(),

  categoriesIds: z.array(z.string()).optional(),
  publishNow: z.boolean().default(true),
});
type SchemaInput = z.input<typeof schema>;
type SchemaOutput = z.output<typeof schema>;

export default function NewRecipeScreen() {
  const [loadingCats, setLoadingCats] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<SchemaInput, any, SchemaOutput>({
    resolver: zodResolver(schema),
    mode: 'onChange',
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

  const { draftId, recipeId } = useLocalSearchParams<{ draftId?: string; recipeId?: string }>();

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

  // Se estiver editando um rascunho ou receita publicada, carregar valores
  useEffect(() => {
    async function loadDraft() {
      if (!draftId && !recipeId) return;
      try {
        const svc = await import('../../services/recipes');
        const d = draftId
          ? await svc.getDraftDetail(String(draftId))
          : await svc.getRecipeDetail(String(recipeId));
        // Mapear RecipeDetail -> valores do form (string)
        reset({
          title: d.title ?? '',
          description: d.description ?? '',
          difficulty: d.difficulty ?? 'MEDIUM',
          prepMinutes: d.prepMinutes != null ? String(d.prepMinutes) : '',
          cookMinutes: d.cookMinutes != null ? String(d.cookMinutes) : '',
          servings: d.servings != null ? String(d.servings) : '',
          nutrition: {
            calories: d.nutrition?.calories != null ? String(d.nutrition.calories) : '',
            protein: d.nutrition?.protein != null ? String(d.nutrition.protein) : '',
            carbs: d.nutrition?.carbs != null ? String(d.nutrition.carbs) : '',
            fat: d.nutrition?.fat != null ? String(d.nutrition.fat) : '',
            fiber: d.nutrition?.fiber != null ? String(d.nutrition.fiber) : '',
            sodium: d.nutrition?.sodium != null ? String(d.nutrition.sodium) : '',
          },
          steps: (d.steps || [])
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((s) => ({
              text: s.text,
              durationSec: s.durationSec != null ? String(s.durationSec) : '',
            })),
          photos: (d.photos || [])
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((p) => ({ url: p.url, alt: p.alt ?? '' })),
          ingredients: (d.ingredients || []).map((i) => ({
            name: i.name,
            amount: i.amount != null ? String(i.amount) : '',
            unit: i.unit ?? '',
          })),
          categoriesIds: (d.categories || []).map((c) => c.id),
          publishNow: false,
        } as any);
      } catch (e) {
        // ignore para não travar a tela
      }
    }
    loadDraft();
  }, [draftId, recipeId, reset]);

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

  // Sanitização de inputs numéricos
  const sanitizeInt = (text: string) => (text || '').replace(/[^\d]/g, '');
  const sanitizeDec = (text: string) => {
    const t = (text || '').replace(/[^0-9,\.]/g, '').replace(/\./g, ',');
    let seen = false;
    return t
      .split('')
      .filter((ch) => {
        if (ch === ',') {
          if (seen) return false;
          seen = true;
          return true;
        }
        return true;
      })
      .join('');
  };

  const onSubmit = handleSubmit(async (form) => {
  console.log('onSubmit chamado, form válido');
    setSubmitting(true);
    try {
      console.log('Form submit:', form);
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
          if (c !== undefined) obj.calories = c; // kcal
          if (p !== undefined) obj.protein = p; // g
          if (cb !== undefined) obj.carbs = cb; // g
          if (f !== undefined) obj.fat = f; // g
          if (fb !== undefined) obj.fiber = fb; // g
          if (s !== undefined) obj.sodium = s; // mg
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

      if (draftId) {
        const { updateRecipe, publishRecipe } = await import('../../services/recipes');
        console.log('Update draft payload:', payload);
        await updateRecipe(String(draftId), payload as any);
        if (form.publishNow) {
          await publishRecipe(String(draftId));
        }
        Alert.alert(
          'Sucesso',
          form.publishNow ? 'Receita atualizada e publicada!' : 'Rascunho atualizado!',
          [{ text: 'OK', onPress: () => router.replace('/settings') }]
        );
      } else if (recipeId) {
        const { updateRecipe } = await import('../../services/recipes');
        console.log('Update recipe payload:', payload);
        await updateRecipe(String(recipeId), payload as any);
        Alert.alert('Sucesso', 'Receita atualizada!', [
          { text: 'OK', onPress: () => router.replace('/settings') },
        ]);
      } else {
        const { createRecipe, publishRecipe } = await import('../../services/recipes');
        console.log('Create recipe payload:', payload);
        const created = await createRecipe(payload as any);
        console.log('Create recipe response:', created);
        if (form.publishNow) {
          await publishRecipe(created.id);
        }
        Alert.alert('Sucesso', 'Receita criada!', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
      }
    } catch (e: any) {
      console.log('Erro ao salvar receita:', e);
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
      className={`mb-2 mr-2 rounded-full border px-3 py-2 ${selected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`}>
      <Text className={selected ? 'text-white' : 'text-gray-700'}>{children}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Text className="mb-3 text-center text-2xl font-bold">Nova receita</Text>

      <Text className="mb-1 font-medium">Título *</Text>
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="mb-1 w-full rounded-lg border border-gray-300 px-4 py-3"
            placeholder="Ex.: Spaghetti Carbonara Clássico"
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.title && <Text className="text-danger mb-3">{errors.title.message}</Text>}

      <Text className="mb-1 font-medium">Descrição</Text>
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, value } }) => (
          <TextInput
            className="mb-3 w-full rounded-lg border border-gray-300 px-4 py-3"
            placeholder="Fale um pouco sobre a receita"
            value={value}
            onChangeText={onChange}
            multiline
          />
        )}
      />

      <Text className="mb-1 font-medium">Dificuldade</Text>
      <View className="mb-3 flex-row">
        {(['EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
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
                className={`mb-1 w-full rounded-lg border px-4 py-3 ${errors.prepMinutes ? 'border-red-500' : 'border-gray-300'}`}
                keyboardType="number-pad"
                placeholder="ex.: 10"
                value={value}
                onChangeText={(t) => onChange(sanitizeInt(t))}
              />
            )}
          />
          {errors.prepMinutes && (
            <Text className="mb-2 text-xs text-red-600">{String(errors.prepMinutes.message)}</Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="mb-1 font-medium">Cocção (min)</Text>
          <Controller
            control={control}
            name="cookMinutes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={`mb-1 w-full rounded-lg border px-4 py-3 ${errors.cookMinutes ? 'border-red-500' : 'border-gray-300'}`}
                keyboardType="number-pad"
                placeholder="ex.: 20"
                value={value}
                onChangeText={(t) => onChange(sanitizeInt(t))}
              />
            )}
          />
          {errors.cookMinutes && (
            <Text className="mb-2 text-xs text-red-600">{String(errors.cookMinutes.message)}</Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="mb-1 font-medium">Porções</Text>
          <Controller
            control={control}
            name="servings"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={`mb-1 w-full rounded-lg border px-4 py-3 ${errors.servings ? 'border-red-500' : 'border-gray-300'}`}
                keyboardType="number-pad"
                placeholder="ex.: 4"
                value={value}
                onChangeText={(t) => onChange(sanitizeInt(t))}
              />
            )}
          />
          {errors.servings && (
            <Text className="mb-2 text-xs text-red-600">{String(errors.servings.message)}</Text>
          )}
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
                className={`mb-1 w-full rounded-lg border px-4 py-3 ${errors.nutrition?.calories ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="ex.: 450"
                keyboardType="number-pad"
                value={value}
                onChangeText={(t) => onChange(sanitizeInt(t))}
              />
            )}
          />
          {errors.nutrition?.calories && (
            <Text className="mb-2 text-xs text-red-600">
              {String(errors.nutrition.calories.message)}
            </Text>
          )}
        </View>

        <View className="flex-1">
          <Text className="mb-1 font-medium">Proteína (g)</Text>
          <Controller
            control={control}
            name="nutrition.protein"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={`mb-1 w-full rounded-lg border px-4 py-3 ${errors.nutrition?.protein ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="ex.: 20"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={(t) => onChange(sanitizeDec(t))}
              />
            )}
          />
          {errors.nutrition?.protein && (
            <Text className="mb-2 text-xs text-red-600">
              {String(errors.nutrition.protein.message)}
            </Text>
          )}
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
                className={`mb-1 w-full rounded-lg border px-4 py-3 ${errors.nutrition?.carbs ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="ex.: 55"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={(t) => onChange(sanitizeDec(t))}
              />
            )}
          />
          {errors.nutrition?.carbs && (
            <Text className="mb-2 text-xs text-red-600">
              {String(errors.nutrition.carbs.message)}
            </Text>
          )}
        </View>

        <View className="flex-1">
          <Text className="mb-1 font-medium">Gorduras (g)</Text>
          <Controller
            control={control}
            name="nutrition.fat"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={`mb-1 w-full rounded-lg border px-4 py-3 ${errors.nutrition?.fat ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="ex.: 12"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={(t) => onChange(sanitizeDec(t))}
              />
            )}
          />
          {errors.nutrition?.fat && (
            <Text className="mb-2 text-xs text-red-600">
              {String(errors.nutrition.fat.message)}
            </Text>
          )}
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
                className="mb-3 w-full rounded-lg border border-gray-300 px-4 py-3"
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
                className="mb-3 w-full rounded-lg border border-gray-300 px-4 py-3"
                placeholder="ex.: 600"
                keyboardType="number-pad"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>
      </View>

      <Text className="mb-2 text-lg font-semibold">Ingredientes *</Text>
      {ingredients.fields.map((f, idx) => (
        <View key={f.id} className="mb-2 rounded-xl border border-gray-200 p-3">
          <Text className="mb-1 font-medium">Nome</Text>
          <Controller
            control={control}
            name={`ingredients.${idx}.name` as const}
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="mb-2 rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Ex.: Tomate"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          {errors.ingredients?.[idx]?.name && (
            <Text className="mt-1 text-xs text-red-600">
              {String(errors.ingredients[idx]?.name?.message)}
            </Text>
          )}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1 font-medium">Quantidade</Text>
              <Controller
                control={control}
                name={`ingredients.${idx}.amount` as const}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className={`rounded-lg border px-3 py-2 ${errors.ingredients?.[idx]?.amount ? 'border-red-500' : 'border-gray-300'}`}
                    keyboardType="decimal-pad"
                    placeholder="Ex.: 2"
                    value={value}
                    onChangeText={(t) => onChange(sanitizeDec(t))}
                  />
                )}
              />
              {errors.ingredients?.[idx]?.amount && (
                <Text className="mt-1 text-xs text-red-600">
                  {String(errors.ingredients[idx]?.amount?.message)}
                </Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="mb-1 font-medium">Unidade</Text>
              <Controller
                control={control}
                name={`ingredients.${idx}.unit` as const}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="Ex.: un, g, ml, xícara"
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>
          </View>
          <Pressable
            className="mt-2 self-end rounded-lg border border-gray-300 px-3 py-1"
            onPress={() => ingredients.remove(idx)}>
            <Text className="text-gray-600">Remover</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        className="mb-4 items-center rounded-lg border border-gray-300 py-2"
        onPress={() => ingredients.append({ name: '', amount: '', unit: '' })}>
        <Text className="font-medium text-gray-700">Adicionar ingrediente</Text>
      </Pressable>

      <Text className="mb-2 text-lg font-semibold">Modo de preparo *</Text>
      {steps.fields.map((f, idx) => (
        <View key={f.id} className="mb-2 rounded-xl border border-gray-200 p-3">
          <Text className="mb-1 font-medium">Passo {idx + 1}</Text>
          <Controller
            control={control}
            name={`steps.${idx}.text` as const}
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="mb-2 rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Descreva o passo"
                value={value}
                onChangeText={onChange}
                multiline
              />
            )}
          />
          {errors.steps?.[idx]?.text && (
            <Text className="mt-1 text-xs text-red-600">
              {String(errors.steps[idx]?.text?.message)}
            </Text>
          )}
          <Text className="mb-1 font-medium">Duração (segundos, opcional)</Text>
          <Controller
            control={control}
            name={`steps.${idx}.durationSec` as const}
            render={({ field: { onChange, value } }) => (
              <TextInput
                className={`rounded-lg border px-3 py-2 ${errors.steps?.[idx]?.durationSec ? 'border-red-500' : 'border-gray-300'}`}
                keyboardType="number-pad"
                placeholder="Ex.: 60"
                value={value}
                onChangeText={(t) => onChange(sanitizeInt(t))}
              />
            )}
          />
          {errors.steps?.[idx]?.durationSec && (
            <Text className="mt-1 text-xs text-red-600">
              {String(errors.steps[idx]?.durationSec?.message)}
            </Text>
          )}
          <Pressable
            className="mt-2 self-end rounded-lg border border-gray-300 px-3 py-1"
            onPress={() => steps.remove(idx)}>
            <Text className="text-gray-600">Remover</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        className="mb-4 items-center rounded-lg border border-gray-300 py-2"
        onPress={() => steps.append({ text: '', durationSec: '' })}>
        <Text className="font-medium text-gray-700">Adicionar passo</Text>
      </Pressable>

      <Text className="mb-2 text-lg font-semibold">Fotos (URL pública) *</Text>
      {photos.fields.map((f, idx) => (
        <View key={f.id} className="mb-2 rounded-xl border border-gray-200 p-3">
          <Text className="mb-1 font-medium">URL</Text>
          <Controller
            control={control}
            name={`photos.${idx}.url` as const}
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="mb-2 rounded-lg border border-gray-300 px-3 py-2"
                placeholder="https://..."
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
              />
            )}
          />
          {errors.photos?.[idx]?.url && (
            <Text className="mt-1 text-xs text-red-600">
              {String(errors.photos[idx]?.url?.message)}
            </Text>
          )}
          <Text className="mb-1 font-medium">Alt (opcional)</Text>
          <Controller
            control={control}
            name={`photos.${idx}.alt` as const}
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Descrição da imagem"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Pressable
            className="mt-2 self-end rounded-lg border border-gray-300 px-3 py-1"
            onPress={() => photos.remove(idx)}>
            <Text className="text-gray-600">Remover</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        className="mb-4 items-center rounded-lg border border-gray-300 py-2"
        onPress={() => photos.append({ url: '', alt: '' })}>
        <Text className="font-medium text-gray-700">Adicionar foto</Text>
      </Pressable>

      <Text className="mb-1 font-medium">Categorias</Text>
      <View className="mb-3 flex-row flex-wrap">
        {loadingCats ? (
          <ActivityIndicator />
        ) : (
          cats.map((c) => (
            <Controller
              key={c.id}
              control={control}
              name="categoriesIds"
              render={({ field: { value } }) => (
                <Pressable onPress={() => toggleCategory(c.id)} className="mb-2 mr-2">
                  <View
                    className={`rounded-full border px-3 py-2 ${
                      value?.includes(c.id)
                        ? 'border-primary bg-primary'
                        : 'border-gray-300 bg-white'
                    }`}>
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

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-medium">Publicar agora</Text>
        <Controller
          control={control}
          name="publishNow"
          render={({ field: { value, onChange } }) => (
            <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
          )}
        />
      </View>

      {errors.root && <Text className="text-danger mb-2">{String(errors.root.message)}</Text>}

      <Pressable
        onPress={() => {
          console.log('Botão Salvar receita clicado');
          onSubmit();
          setTimeout(() => {
            // @ts-ignore
            if (Object.keys(errors).length > 0) {
              console.log('Erros de validação do formulário:', errors);
            }
          }, 100);
        }}
        disabled={submitting}
        className="items-center rounded-lg bg-primary py-3">
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-semibold text-white">Salvar receita</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        className="mt-3 items-center rounded-lg border border-gray-300 py-3">
        <Text className="font-semibold text-gray-700">Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}
