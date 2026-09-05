# Епік 8. iOS та Android foundation

Статус: `SUPERSEDED` — Expo native не виконується. Capacitor/iOS свідомо відкладено; native — окремий епік після Web MVP.

## Мета

Додати нативні development builds iOS/Android до перевіреної кодової бази, зберігаючи спільні UI primitives, бізнес-логіку, типи та Supabase contract.

## Залежності

- Епік 7 завершений.
- Підтверджено стабільну Web behavior і schema.

## Рішення перед стартом

- Постійні iOS bundle identifier та Android package name.
- Apple Developer і Google Play organization/accounts.
- Мінімальні підтримувані OS versions.
- Device matrix для тестування.
- Universal/deep link domains.
- Політика зберігання session у SecureStore.

## Scope

1. Провести аудит DOM/browser-only залежностей.
2. Виділити platform storage adapter для Supabase Auth.
3. Додати Expo SecureStore для native session storage.
4. Перевірити Web localStorage behavior після абстракції.
5. Додати `expo-dev-client`.
6. Налаштувати identifiers, schemes і EAS Build profiles.
7. Створити development builds iOS та Android.
8. Перевірити safe areas, keyboard, tabs, forms і responsive layout.
9. Перевірити auth confirmation/deep links.
10. Перевірити Realtime reconnect, foreground/background і session refresh.
11. Виправити platform differences без fork бізнес-логіки.

## Поза scope

- Store production release.
- Push notifications, якщо вони не затверджені окремим епіком.
- Native-only функції, яких немає у Web MVP.

## Перевірка

- Web regression залишається green.
- iOS та Android development builds встановлюються на пристрої.
- Session persistence працює після restart застосунку.
- Auth deep links працюють.
- Core flow відповідає стабільній Web behavior.
- Cupcake UI доступний на підтримуваних розмірах екрана.

## Definition of Done

- Є перевірені iOS/Android development builds.
- Немає критичних platform-specific дефектів.
- Спільна бізнес-логіка не продубльована.

## Наступний gate

Перед зовнішнім mobile beta створити окремий release-readiness plan.
