import {
  forwardRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { theme } from '@/constants/theme';

export type DaisyColor =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';
export type DaisySize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type DaisyVariant = 'default' | 'outline' | 'dash' | 'soft' | 'ghost';

type Tone = 'default' | 'muted' | DaisyColor;

const fieldHeight: Record<DaisySize, number> = theme.sizes.field;
const selectorSize: Record<DaisySize, number> = theme.sizes.selector;
const textSize: Record<DaisySize, number> = {
  xs: 12,
  sm: 14,
  md: 14,
  lg: 16,
  xl: 18,
};

export const daisyTokens = {
  border: theme.border,
  fieldHeight,
  radii: theme.radii,
  selectorSize,
  sourceVersion: theme.sourceVersion,
};

function color(name: keyof typeof theme.colors) {
  return `rgb(${theme.colors[name].rgb})`;
}

function alpha(name: keyof typeof theme.colors, opacity: number) {
  return `rgb(${theme.colors[name].rgb} / ${opacity})`;
}

function contentColor(name: DaisyColor) {
  return color(`${name}-content` as keyof typeof theme.colors);
}

function controlColor(name: DaisyColor | undefined, fallback = 'base-content') {
  return name ? color(name) : color(fallback as keyof typeof theme.colors);
}

function controlSurface(name: DaisyColor | undefined, variant: DaisyVariant) {
  if (variant === 'ghost') return 'transparent';
  if (variant === 'soft') return name ? alpha(name, 0.16) : color('base-200');
  if (variant === 'outline' || variant === 'dash') return 'transparent';
  return name ? color(name) : color('base-100');
}

function controlText(name: DaisyColor | undefined, variant: DaisyVariant) {
  if (variant === 'default' && name) return contentColor(name);
  return name ? color(name) : color('base-content');
}

const transition = {
  transitionProperty:
    'transform, opacity, background-color, border-color, box-shadow',
  transitionDuration: '120ms',
  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
} as const;

export type AppTextProps = ComponentProps<typeof Text> & {
  variant?: 'body' | 'caption' | 'heading' | 'label' | 'title';
  tone?: Tone;
};

export function AppText({
  className = '',
  variant = 'body',
  tone = 'default',
  style,
  ...props
}: AppTextProps) {
  const variantStyle: Record<
    NonNullable<AppTextProps['variant']>,
    TextStyle
  > = {
    body: { fontSize: 14, lineHeight: 21 },
    caption: { fontSize: 12, lineHeight: 18 },
    heading: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
    label: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
    title: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  };
  const toneStyle: Record<Tone, TextStyle> = {
    default: { color: color('base-content') },
    muted: { color: alpha('base-content', 0.6) },
    neutral: { color: color('neutral') },
    primary: { color: color('primary') },
    secondary: { color: color('secondary') },
    accent: { color: color('accent') },
    info: { color: color('info') },
    success: { color: color('success') },
    warning: { color: color('warning') },
    error: { color: color('error') },
  };
  return (
    <Text
      className={className}
      style={[variantStyle[variant], toneStyle[tone], style]}
      {...props}
    />
  );
}

export type ButtonProps = Omit<ComponentProps<typeof Pressable>, 'children'> & {
  children: ReactNode;
  color?: DaisyColor;
  loading?: boolean;
  shape?: 'default' | 'square' | 'circle';
  size?: DaisySize;
  variant?: DaisyVariant | 'link';
};

export function Button({
  children,
  color: tone,
  disabled = false,
  loading = false,
  shape = 'default',
  size = 'md',
  style,
  variant = 'default',
  ...props
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || loading;
  const isGhost = variant === 'ghost' || variant === 'link';
  const visualVariant: DaisyVariant = variant === 'link' ? 'ghost' : variant;
  const borderColor = isGhost
    ? 'transparent'
    : variant === 'default' && tone
      ? alpha(tone, 0.7)
      : alpha(tone ?? 'base-content', 0.2);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={shape === 'default' ? undefined : 8}
      onPressIn={(event) => {
        setPressed(true);
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        props.onPressOut?.(event);
      }}
      pressRetentionOffset={16}
      style={style}
      {...props}
    >
      <Animated.View
        style={[
          {
            alignItems: 'center',
            backgroundColor:
              variant === 'link'
                ? 'transparent'
                : controlSurface(tone, variant),
            borderColor,
            borderRadius: shape === 'circle' ? 999 : theme.radii.field,
            borderStyle: variant === 'dash' ? 'dashed' : 'solid',
            borderWidth: variant === 'link' ? 0 : theme.border,
            flexDirection: 'row',
            gap: 6,
            height: fieldHeight[size],
            justifyContent: 'center',
            minWidth: shape === 'default' ? undefined : fieldHeight[size],
            opacity: isDisabled ? 0.5 : 1,
            paddingHorizontal:
              shape === 'default' ? Math.max(10, fieldHeight[size] / 2 - 4) : 0,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            ...(variant === 'default' && tone
              ? {
                  boxShadow: `0 0.5px 0 0.5px rgb(255 255 255 / .06) inset, 0 3px 2px -2px ${alpha(tone, 0.3)}`,
                }
              : {}),
            ...transition,
          } as any,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={controlText(tone, visualVariant)}
            size="small"
          />
        ) : null}
        <AppText
          style={{
            color:
              variant === 'link'
                ? controlColor(tone)
                : controlText(tone, visualVariant),
            fontSize: textSize[size],
            fontWeight: '600',
            textDecorationLine: variant === 'link' ? 'underline' : 'none',
          }}
        >
          {children}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

export type CardProps = ComponentProps<typeof View> & {
  children: ReactNode;
  description?: string;
  size?: DaisySize;
  title?: string;
  variant?: 'border' | 'dash' | 'default';
};
export function Card({
  children,
  description,
  size = 'md',
  style,
  title,
  variant = 'border',
  ...props
}: CardProps) {
  const pad =
    size === 'xs'
      ? 12
      : size === 'sm'
        ? 16
        : size === 'lg'
          ? 28
          : size === 'xl'
            ? 32
            : 24;
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: color('base-100'),
          borderColor: color('base-300'),
          borderRadius: theme.radii.box,
          borderStyle: variant === 'dash' ? 'dashed' : 'solid',
          borderWidth: variant === 'default' ? 0 : theme.border,
          gap: 16,
          padding: pad,
        },
        style,
      ]}
    >
      {title || description ? (
        <View style={{ gap: 4 }}>
          {title ? <AppText variant="heading">{title}</AppText> : null}
          {description ? <AppText tone="muted">{description}</AppText> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

type FieldProps = {
  color?: DaisyColor | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  label?: string | undefined;
  size?: DaisySize | undefined;
  variant?: 'default' | 'ghost' | undefined;
};
export type InputProps = ComponentProps<typeof TextInput> & FieldProps;
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    color: tone,
    editable = true,
    error,
    helperText,
    label,
    onBlur,
    onFocus,
    size = 'md',
    style,
    variant = 'default',
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const active = error ? 'error' : tone;
  return (
    <View style={{ gap: 8 }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        placeholderTextColor={alpha('base-content', 0.4)}
        style={[
          {
            backgroundColor:
              variant === 'ghost' ? 'transparent' : color('base-100'),
            borderColor: focused
              ? controlColor(active)
              : alpha(active ?? 'base-content', 0.2),
            borderRadius: theme.radii.field,
            borderWidth: theme.border,
            color: color('base-content'),
            fontSize: textSize[size],
            height: fieldHeight[size],
            paddingHorizontal: Math.max(10, fieldHeight[size] / 2 - 4),
            opacity: editable ? 1 : 0.5,
            ...(focused
              ? {
                  outlineColor: controlColor(active),
                  outlineStyle: 'solid',
                  outlineWidth: 2,
                }
              : {}),
            ...transition,
          } as any,
          style,
        ]}
        {...props}
      />
      {error ? (
        <AppText
          accessibilityLiveRegion="polite"
          tone="error"
          variant="caption"
        >
          {error}
        </AppText>
      ) : helperText ? (
        <AppText tone="muted" variant="caption">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
});

export type TextareaProps = ComponentProps<typeof TextInput> & FieldProps;
export const Textarea = forwardRef<TextInput, TextareaProps>(function Textarea(
  { size = 'md', style, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      multiline
      size={size}
      style={[
        {
          height: Math.max(80, fieldHeight[size] * 2),
          paddingTop: 10,
          textAlignVertical: 'top',
        },
        style,
      ]}
      {...props}
    />
  );
});

export type BadgeProps = ComponentProps<typeof View> & {
  children?: ReactNode;
  color?: DaisyColor;
  size?: DaisySize;
  variant?: DaisyVariant;
};
export function Badge({
  children,
  color: tone,
  size = 'md',
  style,
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <View
      {...props}
      style={[
        {
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: controlSurface(tone, variant),
          borderColor:
            variant === 'ghost'
              ? 'transparent'
              : alpha(tone ?? 'base-content', 0.15),
          borderRadius: theme.radii.selector,
          borderStyle: variant === 'dash' ? 'dashed' : 'solid',
          borderWidth: theme.border,
          height: selectorSize[size],
          justifyContent: 'center',
          paddingHorizontal: selectorSize[size] / 2,
          ...transition,
        } as any,
        style,
      ]}
    >
      {children ? (
        <AppText
          style={{
            color: controlText(tone, variant),
            fontSize: textSize[size],
          }}
        >
          {children}
        </AppText>
      ) : null}
    </View>
  );
}

type CheckProps = {
  checked: boolean;
  color?: DaisyColor;
  disabled?: boolean;
  onValueChange?: (checked: boolean) => void;
  size?: DaisySize;
};
export function Checkbox({
  checked,
  color: tone = 'primary',
  disabled,
  onValueChange,
  size = 'md',
}: CheckProps) {
  const side = selectorSize[size];
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => onValueChange?.(!checked)}
    >
      <View
        style={
          {
            alignItems: 'center',
            backgroundColor: checked ? color(tone) : 'transparent',
            borderColor: checked ? color(tone) : alpha('base-content', 0.2),
            borderRadius: theme.radii.selector,
            borderWidth: theme.border,
            height: side,
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
            width: side,
            ...transition,
          } as any
        }
      >
        {checked ? (
          <AppText
            style={{
              color: contentColor(tone),
              fontSize: Math.max(10, side - 6),
              fontWeight: '800',
              lineHeight: side - 4,
            }}
          >
            ✓
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
export function Radio({
  checked,
  color: tone = 'primary',
  disabled,
  onValueChange,
  size = 'md',
}: CheckProps) {
  const side = selectorSize[size];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => onValueChange?.(true)}
    >
      <View
        style={
          {
            alignItems: 'center',
            borderColor: checked ? color(tone) : alpha('base-content', 0.2),
            borderRadius: 999,
            borderWidth: theme.border,
            height: side,
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
            width: side,
            ...transition,
          } as any
        }
      >
        {checked ? (
          <View
            style={{
              backgroundColor: color(tone),
              borderRadius: 999,
              height: side / 2,
              width: side / 2,
            }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
export function Toggle({
  checked,
  color: tone = 'primary',
  disabled,
  onValueChange,
  size = 'md',
}: CheckProps) {
  const h = selectorSize[size];
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => onValueChange?.(!checked)}
    >
      <View
        style={
          {
            backgroundColor: checked ? color(tone) : color('base-100'),
            borderColor: checked ? color(tone) : alpha('base-content', 0.35),
            borderRadius: 999,
            borderWidth: theme.border,
            height: h,
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
            padding: 2,
            width: h * 1.65,
            ...transition,
          } as any
        }
      >
        <Animated.View
          style={[
            {
              backgroundColor: checked
                ? contentColor(tone)
                : color('base-content'),
              borderRadius: 999,
              height: h - 6,
              transform: [{ translateX: checked ? h * 0.65 : 0 }],
              width: h - 6,
              ...transition,
            } as any,
          ]}
        />
      </View>
    </Pressable>
  );
}

export type RangeProps = {
  color?: DaisyColor;
  max?: number;
  min?: number;
  onValueChange?: (value: number) => void;
  size?: DaisySize;
  value: number;
};
export function Range({
  color: tone = 'primary',
  max = 100,
  min = 0,
  onValueChange,
  size = 'md',
  value,
}: RangeProps) {
  const [width, setWidth] = useState(1);
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const h = selectorSize[size];
  const update = (x: number) =>
    onValueChange?.(
      Math.round(min + Math.max(0, Math.min(1, x / width)) * (max - min)),
    );
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      onPress={(e) => update(e.nativeEvent.locationX)}
      style={{
        height: Math.max(24, h),
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <View
        style={{
          backgroundColor: alpha('base-content', 0.2),
          borderRadius: 999,
          height: Math.max(4, h / 3),
        }}
      >
        <View
          style={{
            backgroundColor: color(tone),
            borderRadius: 999,
            height: '100%',
            width: `${pct * 100}%`,
          }}
        />
        <View
          style={{
            backgroundColor: color(tone),
            borderRadius: 999,
            height: h,
            left: `${pct * 100}%`,
            marginLeft: -h / 2,
            position: 'absolute',
            top: -(h - Math.max(4, h / 3)) / 2,
            width: h,
          }}
        />
      </View>
    </Pressable>
  );
}

export type RatingProps = {
  color?: DaisyColor;
  max?: number;
  onValueChange?: (value: number) => void;
  readOnly?: boolean;
  size?: DaisySize;
  value: number;
};
export function Rating({
  color: tone = 'warning',
  max = 5,
  onValueChange,
  readOnly = false,
  size = 'md',
  value,
}: RatingProps) {
  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', gap: 2 }}
    >
      {Array.from({ length: max }, (_, index) => (
        <Pressable
          key={index}
          accessibilityRole="radio"
          accessibilityState={{ checked: index < value }}
          disabled={readOnly}
          onPress={() => onValueChange?.(index + 1)}
        >
          <AppText
            style={{
              color: index < value ? color(tone) : alpha('base-content', 0.18),
              fontSize: selectorSize[size],
              lineHeight: selectorSize[size],
            }}
          >
            ★
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
export function Mask({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { borderRadius: theme.radii.selector, overflow: 'hidden' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export type TabsProps = {
  children: ReactNode;
  size?: DaisySize;
  style?: 'box' | 'border' | 'lift';
};
export function Tabs({ children, size = 'md', style = 'box' }: TabsProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        alignSelf: 'flex-start',
        backgroundColor: style === 'box' ? color('base-200') : 'transparent',
        borderColor: color('base-300'),
        borderBottomWidth: style === 'border' ? theme.border : 0,
        borderRadius: theme.radii.field,
        flexDirection: 'row',
        padding: style === 'box' ? 4 : 0,
      }}
    >
      {children}
    </View>
  );
}
export function Tab({
  active,
  children,
  disabled,
  onPress,
  size = 'md',
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  size?: DaisySize;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      <View
        style={
          {
            alignItems: 'center',
            backgroundColor: active ? color('base-100') : 'transparent',
            borderRadius: theme.radii.field,
            height: fieldHeight[size],
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
            paddingHorizontal: 12,
            ...transition,
          } as any
        }
      >
        <AppText
          style={{
            color: active ? color('base-content') : alpha('base-content', 0.6),
            fontSize: textSize[size],
          }}
        >
          {children}
        </AppText>
      </View>
    </Pressable>
  );
}
export function Join({
  children,
  direction = 'horizontal',
}: {
  children: ReactNode;
  direction?: 'horizontal' | 'vertical';
}) {
  return (
    <View
      style={{
        alignItems: direction === 'horizontal' ? 'stretch' : undefined,
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
      }}
    >
      {children}
    </View>
  );
}

export function Alert({
  action,
  children,
  color: tone = 'info',
  direction = 'horizontal',
  variant = 'default',
}: {
  action?: ReactNode;
  children: ReactNode;
  color?: Exclude<DaisyColor, 'neutral' | 'primary' | 'secondary' | 'accent'>;
  direction?: 'horizontal' | 'vertical';
  variant?: 'default' | 'outline' | 'dash' | 'soft';
}) {
  const outlined = variant === 'outline' || variant === 'dash';
  return (
    <View
      accessibilityRole="alert"
      style={{
        alignItems: direction === 'horizontal' ? 'center' : undefined,
        backgroundColor: outlined
          ? 'transparent'
          : variant === 'soft'
            ? alpha(tone, 0.16)
            : color(tone),
        borderColor: color(tone),
        borderRadius: theme.radii.box,
        borderStyle: variant === 'dash' ? 'dashed' : 'solid',
        borderWidth: outlined ? theme.border : 0,
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
        gap: 12,
        justifyContent: 'space-between',
        padding: 16,
      }}
    >
      <AppText
        style={{
          color:
            outlined || variant === 'soft' ? color(tone) : contentColor(tone),
          fontWeight: '600',
        }}
      >
        {children}
      </AppText>
      {action}
    </View>
  );
}
export function Status({
  color: tone = 'success',
  size = 'md',
}: {
  color?: DaisyColor;
  size?: DaisySize;
}) {
  const side = Math.max(6, selectorSize[size] / 3);
  return (
    <View
      accessibilityLabel={tone}
      style={{
        backgroundColor: color(tone),
        borderRadius: 999,
        height: side,
        width: side,
      }}
    />
  );
}
export function Progress({
  color: tone = 'primary',
  max = 100,
  value,
}: {
  color?: DaisyColor;
  max?: number;
  value: number;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ max, now: value, min: 0 }}
      style={{
        backgroundColor: alpha('base-content', 0.2),
        borderRadius: theme.radii.selector,
        height: 8,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          backgroundColor: color(tone),
          height: '100%',
          width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`,
        }}
      />
    </View>
  );
}
export function RadialProgress({
  color: tone = 'primary',
  size = 80,
  thickness = 8,
  value,
}: {
  color?: DaisyColor;
  size?: number;
  thickness?: number;
  value: number;
}) {
  const progress = Math.max(0, Math.min(100, value));
  const progressAngle = progress * 3.6;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: value }}
      style={
        {
          alignItems: 'center',
          borderRadius: 999,
          // RN Web supports the exact conic fill used for daisyUI's radial
          // progress. Native keeps the same API and falls back to its ring.
          backgroundColor: alpha('base-content', 0.2),
          backgroundImage: `conic-gradient(${color(tone)} ${progressAngle}deg, transparent 0deg)`,
          height: size,
          justifyContent: 'center',
          width: size,
        } as any
      }
    >
      <View
        style={{
          borderRadius: 999,
          backgroundColor: color('base-100'),
          height: size - thickness * 2,
          width: size - thickness * 2,
        }}
      />
      <View style={{ alignItems: 'center', position: 'absolute' }}>
        <AppText style={{ fontSize: size / 4, fontWeight: '700' }}>
          {progress}%
        </AppText>
      </View>
    </View>
  );
}
export function Tooltip({
  children,
  content,
  open = false,
}: {
  children: ReactNode;
  content: ReactNode;
  open?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const visible = open || hovered;
  return (
    <View
      style={{ alignSelf: 'flex-start', position: 'relative' }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {children}
      {visible ? (
        <View
          style={{
            backgroundColor: color('neutral'),
            borderRadius: theme.radii.box,
            bottom: '100%',
            marginBottom: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            position: 'absolute',
            zIndex: 10,
          }}
        >
          <AppText
            style={{ color: color('neutral-content') }}
            variant="caption"
          >
            {content}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export function Avatar({
  alt,
  fallback,
  size = 40,
  source,
  status,
}: {
  alt: string;
  fallback?: string;
  size?: number;
  source?: ImageSourcePropType;
  status?: 'online' | 'offline';
}) {
  return (
    <View style={{ height: size, position: 'relative', width: size }}>
      {source ? (
        <Image
          accessibilityLabel={alt}
          source={source}
          style={{ borderRadius: size / 2, height: size, width: size }}
        />
      ) : (
        <View
          accessibilityLabel={alt}
          style={{
            alignItems: 'center',
            backgroundColor: color('base-300'),
            borderRadius: size / 2,
            height: size,
            justifyContent: 'center',
            width: size,
          }}
        >
          <AppText style={{ fontWeight: '700' }}>
            {fallback?.slice(0, 2).toUpperCase() ?? '?'}
          </AppText>
        </View>
      )}
      {status ? (
        <View
          style={{
            backgroundColor:
              status === 'online' ? color('success') : color('base-content'),
            borderColor: color('base-100'),
            borderRadius: 99,
            borderWidth: 2,
            bottom: 0,
            height: size / 4,
            position: 'absolute',
            right: 0,
            width: size / 4,
          }}
        />
      ) : null}
    </View>
  );
}
export function Chat({
  avatar,
  children,
  footer,
  header,
  placement = 'start',
  color: tone,
}: {
  avatar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  placement?: 'start' | 'end';
  color?: DaisyColor;
}) {
  const end = placement === 'end';
  return (
    <View
      style={{
        alignItems: end ? 'flex-end' : 'flex-start',
        flexDirection: 'row',
        gap: 8,
        justifyContent: end ? 'flex-end' : 'flex-start',
      }}
    >
      {!end ? avatar : null}
      <View
        style={{
          alignItems: end ? 'flex-end' : 'flex-start',
          gap: 3,
          maxWidth: '80%',
        }}
      >
        {header ? (
          <AppText tone="muted" variant="caption">
            {header}
          </AppText>
        ) : null}
        <View
          style={{
            backgroundColor: tone ? color(tone) : color('base-200'),
            borderRadius: theme.radii.box,
            padding: 12,
          }}
        >
          <AppText
            style={{ color: tone ? contentColor(tone) : color('base-content') }}
          >
            {children}
          </AppText>
        </View>
        {footer ? (
          <AppText tone="muted" variant="caption">
            {footer}
          </AppText>
        ) : null}
      </View>
      {end ? avatar : null}
    </View>
  );
}
export function Dock({
  children,
  size = 'md',
}: {
  children: ReactNode;
  size?: DaisySize;
}) {
  return (
    <View
      style={{
        backgroundColor: color('base-300'),
        flexDirection: 'row',
        height: fieldHeight[size],
        justifyContent: 'space-around',
        paddingTop: 4,
      }}
    >
      {children}
    </View>
  );
}
export function DockItem({
  active,
  children,
  label,
  onPress,
}: {
  active?: boolean;
  children?: ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        opacity: active ? 1 : 0.6,
      }}
    >
      {children}
      <AppText style={{ fontSize: 11, fontWeight: active ? '700' : '400' }}>
        {label}
      </AppText>
    </Pressable>
  );
}
export function Menu({
  children,
  direction = 'vertical',
  size = 'md',
}: {
  children: ReactNode;
  direction?: 'vertical' | 'horizontal';
  size?: DaisySize;
}) {
  return (
    <View
      accessibilityRole="menu"
      style={{
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
        gap: 2,
        padding: 6,
      }}
    >
      {children}
    </View>
  );
}
export function MenuItem({
  active,
  children,
  disabled,
  onPress,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  title?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled || title}
      onPress={onPress}
    >
      <View
        style={{
          backgroundColor: active ? color('base-200') : 'transparent',
          borderRadius: theme.radii.field,
          opacity: disabled ? 0.5 : 1,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <AppText
          tone={title ? 'muted' : 'default'}
          style={{ fontWeight: title ? '700' : '400' }}
        >
          {children}
        </AppText>
      </View>
    </Pressable>
  );
}
export function Timeline({ children }: { children: ReactNode }) {
  return <View style={{ gap: 0 }}>{children}</View>;
}
export function TimelineItem({
  children,
  marker,
  side = 'end',
}: {
  children: ReactNode;
  marker?: ReactNode;
  side?: 'start' | 'end';
}) {
  return (
    <View
      style={{
        flexDirection: side === 'end' ? 'row' : 'row-reverse',
        gap: 10,
        minHeight: 44,
      }}
    >
      <View style={{ alignItems: 'center', width: 20 }}>
        <View
          style={{
            backgroundColor: color('base-300'),
            flex: 1,
            position: 'absolute',
            top: 12,
            width: 2,
          }}
        />
        <View
          style={{
            backgroundColor: color('primary'),
            borderRadius: 99,
            height: 12,
            width: 12,
            zIndex: 1,
          }}
        >
          {marker}
        </View>
      </View>
      <View
        style={{
          backgroundColor: color('base-100'),
          borderColor: color('base-300'),
          borderRadius: theme.radii.box,
          borderWidth: theme.border,
          flex: 1,
          marginBottom: 12,
          padding: 10,
        }}
      >
        {typeof children === 'string' ? (
          <AppText>{children}</AppText>
        ) : (
          children
        )}
      </View>
    </View>
  );
}
export function Indicator({
  children,
  item,
  placement = 'top-end',
}: {
  children: ReactNode;
  item: ReactNode;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
}) {
  const [vertical = 'top', horizontal = 'end'] = placement.split('-');
  return (
    <View style={{ alignSelf: 'flex-start', position: 'relative' }}>
      <View
        style={
          {
            position: 'absolute',
            [vertical]: -8,
            [horizontal]: -8,
            zIndex: 1,
          } as any
        }
      >
        {item}
      </View>
      {children}
    </View>
  );
}
export function MockupCode({
  lines,
}: {
  lines: { prefix?: string; text: string; tone?: Tone }[];
}) {
  return (
    <View
      style={{
        backgroundColor: color('neutral'),
        borderRadius: theme.radii.box,
        gap: 4,
        padding: 20,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
        <View
          style={{
            backgroundColor: alpha('neutral-content', 0.35),
            borderRadius: 99,
            height: 10,
            width: 10,
          }}
        />
        <View
          style={{
            backgroundColor: alpha('neutral-content', 0.35),
            borderRadius: 99,
            height: 10,
            width: 10,
          }}
        />
        <View
          style={{
            backgroundColor: alpha('neutral-content', 0.35),
            borderRadius: 99,
            height: 10,
            width: 10,
          }}
        />
      </View>
      {lines.map((line, index) => (
        <View
          key={`${line.text}-${index}`}
          style={{ flexDirection: 'row', gap: 10 }}
        >
          <AppText
            style={{
              color: alpha('neutral-content', 0.6),
              fontFamily: 'monospace',
            }}
          >
            {line.prefix ?? '>'}
          </AppText>
          <AppText
            style={{
              color:
                line.tone && line.tone !== 'default' && line.tone !== 'muted'
                  ? color(line.tone)
                  : color('neutral-content'),
              fontFamily: 'monospace',
            }}
          >
            {line.text}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export function Loading({
  label = 'Завантаження…',
  size = 'md',
  style = 'spinner',
}: {
  label?: string;
  size?: DaisySize;
  style?: 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity';
}) {
  const indicator = fieldHeight[size] / 2;
  return (
    <View
      accessibilityRole="progressbar"
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
      }}
    >
      {style === 'dots' ? (
        <AppText style={{ color: color('base-content'), fontSize: indicator }}>
          •••
        </AppText>
      ) : (
        <ActivityIndicator
          color={color('base-content')}
          size={indicator >= 22 ? 'large' : 'small'}
        />
      )}
      {label ? <AppText tone="muted">{label}</AppText> : null}
    </View>
  );
}

export function Stat({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: color('base-100'),
        borderColor: color('base-300'),
        borderRadius: theme.radii.box,
        borderWidth: theme.border,
        padding: 16,
      }}
    >
      {children}
    </View>
  );
}
export function StatTitle({ children }: { children: ReactNode }) {
  return (
    <AppText tone="muted" variant="caption">
      {children}
    </AppText>
  );
}
export function StatValue({ children }: { children: ReactNode }) {
  return (
    <AppText style={{ fontSize: 30, fontWeight: '700', lineHeight: 36 }}>
      {children}
    </AppText>
  );
}
export function StatDesc({ children }: { children: ReactNode }) {
  return (
    <AppText tone="muted" variant="caption">
      {children}
    </AppText>
  );
}
