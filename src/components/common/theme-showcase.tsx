import { View } from 'react-native';

import { AppText, Card } from '@/components/ui';

const swatches = [
  {
    background: 'bg-primary',
    content: 'text-primary-content',
    label: 'primary',
  },
  {
    background: 'bg-secondary',
    content: 'text-secondary-content',
    label: 'secondary',
  },
  { background: 'bg-accent', content: 'text-accent-content', label: 'accent' },
  {
    background: 'bg-neutral',
    content: 'text-neutral-content',
    label: 'neutral',
  },
  {
    background: 'bg-base-100',
    content: 'text-base-content',
    label: 'base-100',
  },
  {
    background: 'bg-base-200',
    content: 'text-base-content',
    label: 'base-200',
  },
  {
    background: 'bg-base-300',
    content: 'text-base-content',
    label: 'base-300',
  },
  { background: 'bg-info', content: 'text-info-content', label: 'info' },
  {
    background: 'bg-success',
    content: 'text-success-content',
    label: 'success',
  },
  {
    background: 'bg-warning',
    content: 'text-warning-content',
    label: 'warning',
  },
  { background: 'bg-error', content: 'text-error-content', label: 'error' },
] as const;

export function ThemeShowcase() {
  return (
    <Card
      description="Semantic background/content pairs із daisyUI Cupcake 5.7.x."
      title="Cupcake UI kit"
    >
      <View className="flex-row flex-wrap gap-3">
        {swatches.map((swatch) => (
          <View
            key={swatch.label}
            className={`${swatch.background} min-w-36 flex-1 rounded-selector border border-base-content/10 p-4`}
          >
            <AppText className={`font-semibold ${swatch.content}`}>
              {swatch.label}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}
