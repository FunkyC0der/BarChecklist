import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import {
  Alert,
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Chat,
  Checkbox,
  Dock,
  DockItem,
  Indicator,
  Input,
  Join,
  Menu,
  MenuItem,
  MockupCode,
  Progress,
  RadialProgress,
  Radio,
  Range,
  Rating,
  Stat,
  StatDesc,
  StatTitle,
  StatValue,
  Status,
  Tab,
  Tabs,
  Textarea,
  Timeline,
  TimelineItem,
  Toggle,
  Tooltip,
  type DaisyColor,
  type DaisySize,
} from '@/components/ui';

const colors: DaisyColor[] = [
  'neutral',
  'primary',
  'secondary',
  'accent',
  'info',
  'success',
  'warning',
  'error',
];
const sizes: DaisySize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Card title={title} variant="border">
      <View style={{ gap: 14 }}>{children}</View>
    </Card>
  );
}

export function ThemeShowcase() {
  const [checked, setChecked] = useState(true);
  const [toggle, setToggle] = useState(true);
  const [rating, setRating] = useState(4);
  const [range, setRange] = useState(55);
  const [tab, setTab] = useState('Preview');
  const [email, setEmail] = useState('');

  return (
    <View style={{ gap: 20 }}>
      <Section title="daisyUI Cupcake 5.7.28 — Component Gallery">
        <AppText tone="muted">
          Web reference parity for colors, 2px borders, Cupcake radii and depth
          states.
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {colors.map((color) => (
            <Badge color={color} key={color}>
              {color}
            </Badge>
          ))}
        </View>
      </Section>
      <Section title="Button, badge and link states">
        {colors.map((color) => (
          <View
            key={color}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
          >
            <Button color={color}>{color}</Button>
            <Button color={color} variant="soft">
              soft
            </Button>
            <Button color={color} variant="outline">
              outline
            </Button>
            <Badge color={color} variant="soft">
              {color}
            </Badge>
          </View>
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {sizes.map((size) => (
            <Button key={size} size={size}>
              {size}
            </Button>
          ))}
          <Button shape="square">+</Button>
          <Button variant="ghost">ghost</Button>
          <Button variant="link">link</Button>
          <Button loading color="primary">
            loading
          </Button>
        </View>
      </Section>
      <Section title="Fields and selectors">
        <Input
          label="Email"
          onChangeText={setEmail}
          placeholder="name@bar.com"
          value={email}
        />
        <Input
          color="error"
          error="Приклад validator state"
          label="Помилка"
          value=""
        />
        <Textarea label="Повідомлення" placeholder="Напишіть щось…" value="" />
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          {sizes.map((size) => (
            <Checkbox
              checked={checked}
              color="primary"
              key={`check-${size}`}
              onValueChange={setChecked}
              size={size}
            />
          ))}
          {sizes.map((size) => (
            <Radio
              checked={size === 'md'}
              color="secondary"
              key={`radio-${size}`}
              onValueChange={() => undefined}
              size={size}
            />
          ))}
          {sizes.map((size) => (
            <Toggle
              checked={toggle}
              color="primary"
              key={`toggle-${size}`}
              onValueChange={setToggle}
              size={size}
            />
          ))}
        </View>
        <Range color="primary" onValueChange={setRange} value={range} />
        <Rating onValueChange={setRating} value={rating} />
      </Section>
      <Section title="Cards, tabs, joins and feedback">
        <Tabs>
          <Tab active={tab === 'Preview'} onPress={() => setTab('Preview')}>
            Preview
          </Tab>
          <Tab active={tab === 'Details'} onPress={() => setTab('Details')}>
            Details
          </Tab>
          <Tab active={tab === 'History'} onPress={() => setTab('History')}>
            History
          </Tab>
        </Tabs>
        <AppText>{tab} tab content</AppText>
        <Join>
          <Button shape="square">−</Button>
          <Button color="primary">Grouped action</Button>
          <Button shape="square">+</Button>
        </Join>
        <Alert
          action={
            <Button size="xs" variant="ghost">
              View
            </Button>
          }
          color="info"
        >
          There are 9 new messages
        </Alert>
        <Alert color="success" variant="outline">
          Verification process completed
        </Alert>
        <Alert color="warning" variant="dash">
          Click to verify your email
        </Alert>
        <Alert color="error" variant="soft">
          Access denied
        </Alert>
        <Tooltip content="Tooltip" open>
          <Button>Hover target</Button>
        </Tooltip>
      </Section>
      <Section title="Progress, stat, status and indicator">
        <Progress value={91} />
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 18 }}>
          <RadialProgress value={91} />
          <Stat>
            <StatTitle>September Revenue</StatTitle>
            <StatValue>$32,400</StatValue>
            <StatDesc>21% more than last month</StatDesc>
          </Stat>
          <Status color="success" />
        </View>
        <Indicator
          item={
            <Badge color="warning" size="xs">
              SALE
            </Badge>
          }
        >
          <Button>Starter plan</Button>
        </Indicator>
      </Section>
      <Section title="Content and navigation">
        <Chat
          avatar={<Avatar alt="Obi-Wan Kenobi" fallback="OW" />}
          footer="Delivered"
          header="Obi-Wan Kenobi · 12:45"
        >
          It&apos;s over Anakin
        </Chat>
        <Chat color="primary" footer="Seen at 12:46" placement="end">
          I have the high ground
        </Chat>
        <Menu>
          <MenuItem title>Admin panel</MenuItem>
          <MenuItem active>Databases</MenuItem>
          <MenuItem>Products</MenuItem>
          <MenuItem disabled>Settings</MenuItem>
        </Menu>
        <Timeline>
          <TimelineItem>First checklist created</TimelineItem>
          <TimelineItem>Team joined</TimelineItem>
          <TimelineItem>Shift completed</TimelineItem>
        </Timeline>
        <Dock>
          <DockItem active label="Today" />
          <DockItem label="Lists" />
          <DockItem label="Team" />
        </Dock>
      </Section>
      <Section title="Code mockup">
        <MockupCode
          lines={[
            { prefix: '$', text: 'npm i daisyui' },
            { text: 'installing...' },
            { text: 'Done!', tone: 'success' },
          ]}
        />
      </Section>
    </View>
  );
}
