import { EmptyState, Screen } from '@/components/ui';

type PlaceholderScreenProps = {
  description: string;
  title: string;
};

export function PlaceholderScreen({
  description,
  title,
}: PlaceholderScreenProps) {
  return (
    <Screen inset>
      <h1 className="sr-only">{title}</h1>
      <EmptyState
        bordered={false}
        description={description}
        title="Фундамент готовий"
      />
    </Screen>
  );
}
