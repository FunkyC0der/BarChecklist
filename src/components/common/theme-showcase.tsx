import { useState } from 'react';

import { AppText, Badge, Button, Card, Input } from '@/components/ui';

export function ThemeShowcase() {
  const [email, setEmail] = useState('');
  const [checked, setChecked] = useState(true);

  return (
    <div className="flex flex-col gap-6">
      <Card title="daisyUI Cupcake">
        <AppText tone="muted">
          Реальні daisyUI 5 компоненти на темі cupcake.
        </AppText>
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

      <Card title="Form">
        <Input
          label="Email"
          onChangeText={setEmail}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
        <label className="label cursor-pointer justify-start gap-3">
          <input
            checked={checked}
            className="checkbox"
            onChange={(event) => setChecked(event.target.checked)}
            type="checkbox"
          />
          <span className="label-text">Прийняти запрошення</span>
        </label>
      </Card>
    </div>
  );
}
