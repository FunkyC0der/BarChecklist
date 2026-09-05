import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function Screen({ children, scroll = true }: ScreenProps) {
  const content = (
    <View className="mx-auto w-full max-w-5xl flex-1 gap-6 px-5 py-8 md:px-8">
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-base-200">
      {scroll ? (
        <ScrollView contentContainerClassName="min-h-full">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
