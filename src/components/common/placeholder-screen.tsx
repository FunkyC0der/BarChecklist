import { EmptyState, Page, type IconName } from '@/components/ui';

type PlaceholderScreenProps = {
  description: string;
  icon: IconName;
  title: string;
};

export function PlaceholderScreen({
  description,
  icon,
  title,
}: PlaceholderScreenProps) {
  return (
    <Page title={title}>
      <EmptyState description={description} icon={icon} title="Скоро" />
    </Page>
  );
}
