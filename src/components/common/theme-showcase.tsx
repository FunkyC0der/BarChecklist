import { useState } from 'react';

import {
  Alert,
  AppText,
  Badge,
  Button,
  EmptyState,
  Icon,
  IconButton,
  IconTile,
  ListRow,
  Sheet,
  Skeleton,
  TaskMarker,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';

const dockClassName = cn(
  'dock dock-sm',
  'inset-x-3 w-auto',
  'bottom-[max(0.75rem,env(safe-area-inset-bottom))]',
  'h-14 rounded-full border-0 bg-base-200 p-1 pb-1 shadow-sm',
  '[&>*]:mb-0 [&>*]:rounded-full [&>*]:after:hidden',
);

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const;

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <AppText as="h2" variant="overline">
        {title}
      </AppText>
      {children}
    </section>
  );
}

export function ThemeShowcase() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cadence, setCadence] = useState<'daily' | 'weekly'>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const toast = useToast();

  const toggleWeekday = (day: number) => {
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  return (
    <div className="flex max-w-full flex-col gap-8 overflow-x-hidden pb-32">
      <AppText variant="display">UI Style Guide</AppText>
      <AppText variant="caption">
        daisyUI 5 cupcake — мобільна design-система Bar Checklist
      </AppText>

      <Section title="Dock">
        <div className="relative h-20 rounded-box bg-base-200">
          <nav aria-label="Демо dock" className={cn(dockClassName, 'absolute')}>
            <button
              className="dock-active bg-primary text-primary-content"
              type="button"
            >
              <Icon className="size-6" name="sun" />
              <span className="dock-label">Сьогодні</span>
            </button>
            <button type="button">
              <Icon className="size-6" name="clipboard-list" />
              <span className="dock-label">Чеклісти</span>
            </button>
            <button type="button">
              <Icon className="size-6" name="clock" />
              <span className="dock-label">Історія</span>
            </button>
            <button type="button">
              <Icon className="size-6" name="users" />
              <span className="dock-label">Команда</span>
            </button>
          </nav>
        </div>
      </Section>

      <Section title="Toolbar + display">
        <div className="overflow-hidden rounded-box border border-base-300">
          <div className="sticky top-0 z-20 flex h-14 items-center justify-between bg-base-100/90 px-4 backdrop-blur">
            <div />
            <div className="flex items-center rounded-full bg-base-200">
              <IconButton icon="more-horizontal" label="Ще" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 px-4 pt-2 pb-3">
            <h1 className="text-3xl font-bold tracking-tight">Чеклісти</h1>
            <Badge size="sm" soft>
              12 / 20
            </Badge>
          </div>
        </div>
      </Section>

      <Section title="ListRow">
        <ul className="list rounded-box border border-base-300">
          <ListRow
            leading={<IconTile icon="clipboard-list" />}
            meta={<span>5 задач</span>}
            title="Відкриття зміни"
            trailing={
              <Icon className="text-base-content/40" name="chevron-right" />
            }
          />
          <ListRow
            leading={<TaskMarker />}
            meta={
              <>
                <Icon className="size-4" name="calendar" />
                <span>Щодня</span>
                <Icon className="size-4" name="repeat" />
              </>
            }
            title="Увімкнути світло"
            trailing={
              <IconButton
                className="touch-none"
                icon="grip-vertical"
                label="Перетягнути"
              />
            }
          />
          <ListRow
            leading={
              <span className="avatar avatar-placeholder">
                <span>ОК</span>
              </span>
            }
            title="Олена"
            trailing={
              <Badge color="primary" size="sm" soft>
                Owner
              </Badge>
            }
          />
        </ul>
      </Section>

      <Section title="Chips">
        <div className="flex flex-wrap gap-2">
          <input
            aria-label="Щодня"
            checked={cadence === 'daily'}
            className="btn rounded-full btn-sm"
            name="cadence-demo"
            onChange={() => setCadence('daily')}
            type="radio"
          />
          <input
            aria-label="Щотижня"
            checked={cadence === 'weekly'}
            className="btn rounded-full btn-sm"
            name="cadence-demo"
            onChange={() => setCadence('weekly')}
            type="radio"
          />
        </div>
        {cadence === 'weekly' ? (
          <div className="flex justify-between">
            {weekdayLabels.map((label, index) => {
              const day = index + 1;
              return (
                <input
                  aria-label={label}
                  checked={weekdays.includes(day)}
                  className="btn btn-circle btn-sm"
                  key={label}
                  onChange={() => toggleWeekday(day)}
                  type="checkbox"
                />
              );
            })}
          </div>
        ) : null}
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button color="primary">Primary</Button>
          <Button size="lg" variant="soft">
            Soft
          </Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Loading</Button>
        </div>
      </Section>

      <Section title="Sheet">
        <Button onClick={() => setSheetOpen(true)}>Відкрити Sheet</Button>
        <Sheet
          description="Демо bottom sheet з grab-handle та X."
          onClose={() => setSheetOpen(false)}
          open={sheetOpen}
          title="Помити посуд"
        >
          <p className="py-4 text-sm text-base-content/60">
            Контент sheet для create/edit/confirm.
          </p>
        </Sheet>
      </Section>

      <Section title="Fab">
        <div className="relative h-24 rounded-box bg-base-200">
          <div
            className={cn(
              'fab absolute right-4 z-30',
              'bottom-[calc(4.5rem+max(0.75rem,env(safe-area-inset-bottom)))]',
            )}
          >
            <button
              aria-label="Додати"
              className="btn btn-circle btn-lg btn-primary"
              type="button"
            >
              <Icon name="plus" />
            </button>
          </div>
        </div>
      </Section>

      <Section title="States">
        <Skeleton rows={2} />
        <EmptyState
          description="Створіть перший чекліст для команди."
          icon="clipboard-list"
          title="Ще немає чеклістів"
        />
        <Alert color="error">Не вдалося зберегти зміни</Alert>
        <Button onClick={() => toast('Збережено')}>Показати toast</Button>
      </Section>
    </div>
  );
}
