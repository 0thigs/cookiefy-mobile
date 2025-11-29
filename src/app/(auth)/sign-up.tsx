import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';

export default function SignUp() {
  const { t } = useTranslation();
  const { signUp } = useAuth();

  const schema = useMemo(() => z.object({
    name: z.string().min(2, t('auth.invalidName')),
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(6, t('auth.passwordMinLength')),
  }), [t]);

  type FormData = z.infer<typeof schema>;

  const { register, setValue, handleSubmit, formState } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setServerError(null);
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (e: any) {
      setServerError(e?.message ?? t('auth.registerError'));
    } finally {
      setLoading(false);
    }
  });

  const hasPwdError = !!formState.errors.password?.message;

  return (
    <View className="flex-1 px-6 pt-8 bg-white">
      <Text className="mb-2 text-3xl font-bold text-center">{t('auth.createAccountTitle')}</Text>
      <Text className="mb-8 text-center text-gray-500">{t('auth.joinCommunity')}</Text>

      <Text className="mb-1 font-medium">{t('auth.fullName')}</Text>
      <TextInput
        className="px-4 py-3 mb-1 w-full rounded-lg border border-gray-300 text-gray-900"
        placeholder={t('auth.fullNamePlaceholder')}
        onChangeText={(t) => setValue('name', t, { shouldValidate: true })}
        {...register('name')}
      />
      {formState.errors.name && <Text className="mb-3 text-danger">{formState.errors.name.message}</Text>}

      <Text className="mb-1 font-medium">{t('auth.email')}</Text>
      <TextInput
        className="px-4 py-3 mb-1 w-full rounded-lg border border-gray-300 text-gray-900"
        placeholder={t('auth.emailPlaceholder')}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={(t) => setValue('email', t, { shouldValidate: true })}
        {...register('email')}
      />
      {formState.errors.email && <Text className="mb-3 text-danger">{formState.errors.email.message}</Text>}

      <Text className="mb-1 font-medium">{t('auth.password')}</Text>
      <View className={`w-full rounded-lg px-4 flex-row items-center mb-1 ${hasPwdError ? 'border-2 border-danger' : 'border border-gray-300'}`}>
        <TextInput
          className="flex-1 py-3 text-gray-900"
          placeholder={t('auth.passwordPlaceholder')}
          secureTextEntry={!show}
          onChangeText={(t) => setValue('password', t, { shouldValidate: true })}
          {...register('password')}
        />
        <Pressable onPress={() => setShow((s) => !s)}>
          <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
        </Pressable>
      </View>
      {formState.errors.password && <Text className="mb-3 text-danger">{formState.errors.password.message}</Text>}

      {serverError && <Text className="mb-3 text-danger">{serverError}</Text>}

      <Pressable onPress={onSubmit} disabled={loading} className="items-center py-3 rounded-lg bg-primary">
        {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">{t('auth.createAccount')}</Text>}
      </Pressable>

      <View className="flex-row justify-center mt-6">
        <Text className="text-gray-600">{t('auth.hasAccount')} </Text>
        <Pressable onPress={() => router.push('/(auth)/sign-in')}>
          <Text className="text-primary">{t('auth.signIn')}</Text>
        </Pressable>
      </View>

      <Text className="mt-8 text-xs text-center text-gray-400">
        {t('auth.agreeTerms')} <Text className="text-primary">{t('auth.termsOfUse')}</Text> {t('common.and')} <Text className="text-primary">{t('auth.privacyPolicy')}</Text>
      </Text>
    </View>
  );
}
