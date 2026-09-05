import { AppText, EmptyState, Screen } from '@/components/ui';

type PlaceholderScreenProps = {
  description: string;
  title: string;
};

export function PlaceholderScreen({
  description,
  title,
}: PlaceholderScreenProps) {
  return (
    <Screen>
      <AppText as="h1" variant="title">
        {title}
      </AppText>
      <EmptyState description={description} title="Фундамент готовий" />
    </Screen>
  );
}
