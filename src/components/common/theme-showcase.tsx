import { useState } from 'react';

import { Alert, Badge, Button, Card, Input } from '@/components/ui';

export function ThemeShowcase() {
  const [email, setEmail] = useState('');
  const [checked, setChecked] = useState(true);
  const [activeTab, setActiveTab] = useState('today');

  return (
    <div className="flex flex-col gap-6">
      <Card title="daisyUI Cupcake">
        <p className="text-base-content/60">
          Реальні daisyUI 5 компоненти на темі cupcake.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge>neutral</Badge>
          <Badge color="primary">primary</Badge>
          <Badge color="secondary">secondary</Badge>
          <Badge color="accent">accent</Badge>
          <Badge color="info">info</Badge>
          <Badge color="success">success</Badge>
          <Badge color="warning">warning</Badge>
          <Badge color="error">error</Badge>
        </div>
      </Card>

      <Card bodyClassName="gap-0 p-0" title="Tabs">
        <div className="p-4 text-sm text-base-content/60">
          {activeTab === 'today'
            ? 'Сьогодні'
            : activeTab === 'checklists'
              ? 'Чеклісти'
              : activeTab === 'history'
                ? 'Історія'
                : 'Команда'}
        </div>
        <div className="tabs tabs-lift w-full tabs-bottom" role="tablist">
          {(
            [
              ['today', 'Сьогодні'],
              ['checklists', 'Чеклісти'],
              ['history', 'Історія'],
              ['team', 'Команда'],
            ] as const
          ).map(([id, label]) => (
            <button
              className={
                activeTab === id
                  ? 'tab h-12 min-h-12 flex-1 tab-active'
                  : 'tab h-12 min-h-12 flex-1'
              }
              key={id}
              onClick={() => setActiveTab(id)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button color="primary">Primary</Button>
          <Button color="secondary">Secondary</Button>
          <Button color="error">Error</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Loading</Button>
        </div>
      </Card>

      <Card title="Alert">
        <Alert color="warning">Потрібна конфігурація Supabase</Alert>
      </Card>

      <Card title="Form">
        <Input
          label="Email"
          onChangeText={setEmail}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
        <fieldset className="fieldset">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              checked={checked}
              className="checkbox"
              onChange={(event) => setChecked(event.target.checked)}
              type="checkbox"
            />
            Прийняти запрошення
          </label>
        </fieldset>
      </Card>
    </div>
  );
}
