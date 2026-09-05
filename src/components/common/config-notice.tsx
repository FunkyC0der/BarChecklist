import { AppText, Card } from '@/components/ui';

export function ConfigNotice({ message }: { message: string }) {
  return (
    <Card title="Потрібна конфігурація Supabase">
      <AppText>{message}</AppText>
      <AppText tone="muted" variant="caption">
        Скопіюйте `.env.example` у `.env.local` і додайте локальні або hosted
        development значення.
      </AppText>
    </Card>
  );
}
