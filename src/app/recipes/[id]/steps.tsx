import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '../../../theme/colors';
import { useNavigation } from '../../../hooks/useNavigation';
import { BottomNavBar } from '../../../components/BottomNavBar';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Step {
  order: number;
  text: string;
  durationSec?: number;
  photoUrl?: string;
}

interface RecipeStepsProps {
  steps: Step[];
  recipeTitle: string;
}

export default function RecipeStepsScreen() {
  const { steps: stepsParam, title } = useLocalSearchParams<{ 
    steps: string; 
    title: string; 
  }>();
  
  const { handleTabPress } = useNavigation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  
  // Parse dos steps do parâmetro
  const steps: Step[] = stepsParam ? JSON.parse(stepsParam) : [];
  
  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  function goToNextStep() {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }

  function goToPreviousStep() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }

  function goToStep(stepIndex: number) {
    setCurrentStepIndex(stepIndex);
  }

  function formatDuration(seconds?: number) {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}min` : null;
  }

  if (!currentStep) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="restaurant-outline" size={64} color={colors.muted} />
          <Text className="mt-4 text-lg font-semibold text-gray-900">
            Nenhum passo encontrado
          </Text>
          <Text className="mt-2 text-center text-gray-600">
            Esta receita não possui passos de preparo.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="px-6 py-3 mt-6 rounded-lg bg-primary"
          >
            <Text className="font-semibold text-white">Voltar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center p-4 pt-12 bg-white border-b border-gray-200">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
          <Text className="ml-2 text-lg font-semibold text-primary">Voltar</Text>
        </Pressable>
        
        <View className="flex-1 mx-4">
          <Text className="text-sm font-medium text-center text-gray-600" numberOfLines={1}>
            {title}
          </Text>
        </View>
        
        <View className="w-16" />
      </View>

      {/* Progress Bar */}
      <View className="px-4 py-3 bg-gray-50">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-sm font-medium text-gray-700">
            Passo {currentStepIndex + 1} de {totalSteps}
          </Text>
          <Text className="text-sm text-gray-500">
            {Math.round(progress)}%
          </Text>
        </View>
        <View className="h-2 bg-gray-200 rounded-full">
          <View 
            className="h-2 rounded-full transition-all duration-300 bg-primary"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Step Image */}
        {currentStep.photoUrl && (
          <View className="mb-6">
            <Image
              source={{ uri: currentStep.photoUrl }}
              style={{ 
                width: screenWidth, 
                height: screenHeight * 0.3,
                maxHeight: 300
              }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Step Content */}
        <View className="px-6 pb-6">
          {/* Step Number and Duration */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center">
              <View className="justify-center items-center w-12 h-12 rounded-full bg-primary">
                <Text className="text-lg font-bold text-white">
                  {currentStepIndex + 1}
                </Text>
              </View>
              <Text className="ml-4 text-xl font-bold text-gray-900">
                Passo {currentStepIndex + 1}
              </Text>
            </View>
            
            {formatDuration(currentStep.durationSec) && (
              <View className="flex-row items-center px-3 py-1 bg-gray-100 rounded-full">
                <Ionicons name="time-outline" size={16} color={colors.muted} />
                <Text className="ml-1 text-sm font-medium text-gray-700">
                  {formatDuration(currentStep.durationSec)}
                </Text>
              </View>
            )}
          </View>

          {/* Step Text */}
          <View className="mb-8">
            <Text className="text-lg leading-7 text-gray-800">
              {currentStep.text}
            </Text>
          </View>

          {/* Step Navigation Dots */}
          {totalSteps > 1 && (
            <View className="flex-row justify-center mb-8">
              {steps.map((_, index) => (
                <Pressable
                  key={index}
                  onPress={() => goToStep(index)}
                  className={`w-3 h-3 rounded-full mx-1 ${
                    index === currentStepIndex 
                      ? 'bg-primary' 
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View className="flex-row justify-between items-center p-6 bg-white border-t border-gray-200">
        <Pressable
          onPress={goToPreviousStep}
          disabled={currentStepIndex === 0}
          className={`flex-row items-center px-6 py-3 rounded-lg ${
            currentStepIndex === 0 
              ? 'bg-gray-100' 
              : 'bg-gray-200'
          }`}
        >
          <Ionicons 
            name="chevron-back" 
            size={20} 
            color={currentStepIndex === 0 ? colors.muted : colors.primary} 
          />
          <Text className={`ml-2 font-semibold ${
            currentStepIndex === 0 ? 'text-gray-400' : 'text-primary'
          }`}>
            Anterior
          </Text>
        </Pressable>

        {currentStepIndex === totalSteps - 1 ? (
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center px-6 py-3 rounded-lg bg-primary"
          >
            <Text className="font-semibold text-white">Finalizar</Text>
            <Ionicons name="checkmark" size={20} color="white" className="ml-2" />
          </Pressable>
        ) : (
          <Pressable
            onPress={goToNextStep}
            className="flex-row items-center px-6 py-3 rounded-lg bg-primary"
          >
            <Text className="font-semibold text-white">Próximo</Text>
            <Ionicons name="chevron-forward" size={20} color="white" className="ml-2" />
          </Pressable>
        )}
      </View>
      <BottomNavBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}
