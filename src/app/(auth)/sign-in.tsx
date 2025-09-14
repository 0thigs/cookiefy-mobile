import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { router } from 'expo-router';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Sua senha deve conter pelo menos 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

export default function SignIn() {
  const { signIn } = useAuth();
  const { register, setValue, handleSubmit, formState } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setServerError(e?.message ?? 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  });

  const hasPwdError = !!formState.errors.password?.message;

  return (
    <View className="flex-1 px-6 pt-8 bg-white">
      <Text className="mb-2 text-3xl font-bold text-center">Bem-vindo de volta!</Text>
      <Text className="mb-8 text-center text-gray-500">Entre em sua conta para continuar</Text>

      <Text className="mb-1 font-medium">Email</Text>
      <TextInput
        className="px-4 py-3 mb-1 w-full rounded-lg border border-gray-300"
        placeholder="Insira seu email"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(t) => setValue('email', t, { shouldValidate: true })}
        {...register('email')}
      />
      {formState.errors.email && <Text className="mb-3 text-danger">{formState.errors.email.message}</Text>}

      <Text className="mb-1 font-medium">Senha</Text>
      <View className={`w-full rounded-lg px-4 flex-row items-center mb-1 ${hasPwdError ? 'border-2 border-danger' : 'border border-gray-300'}`}>
        <TextInput
          className="flex-1 py-3"
          placeholder="Insira sua senha"
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
        {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Entrar</Text>}
      </Pressable>

      <View className="flex-row justify-center mt-6">
        <Text className="text-gray-600">Não tem uma conta? </Text>
        <Pressable onPress={() => router.push('/(auth)/sign-up')}>
          <Text className="text-primary">Criar conta</Text>
        </Pressable>
      </View>

      <Text className="mt-8 text-xs text-center text-gray-400">
        Ao continuar, você concorda com nossos <Text className="text-primary">Termos de Uso</Text> e <Text className="text-primary">Política de Privacidade</Text>
      </Text>
    </View>
  );
}
