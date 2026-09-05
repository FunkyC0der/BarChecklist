# Епік 9. Mobile beta та release readiness

Статус: `DEFERRED`.

## Мета

Перевірити iOS/Android збірки з обмеженою групою користувачів і підготувати доказову основу для окремого рішення про App Store та Google Play release.

## Залежності

- Епік 8 завершений.
- Apple/Google accounts і договори готові.

## Рішення перед стартом

- TestFlight/Internal Testing групи.
- Privacy disclosures і data safety answers.
- Support contact та incident process.
- Release cadence і versioning.
- Чи потрібні crash reporting та мінімальна telemetry.

## Scope

1. Підготувати beta build profiles і versioning.
2. Провести privacy/security review мобільної конфігурації.
3. Підготувати TestFlight та Google Play Internal Testing metadata.
4. Розгорнути збірки обмеженій групі.
5. Перевірити install/update/session/deep-link flows.
6. Зібрати platform-specific feedback і crash reports.
7. Виправити blocker/high mobile issues.
8. Повторити regression на Web, iOS та Android.
9. Підготувати release checklist, store assets і тексти лише після стабільної beta.
10. Провести окремий go/no-go review для production stores.

## Поза scope

- Автоматичний production release без окремого підтвердження.
- Нові product features під час stabilization.

## Перевірка

- Install та update не втрачають session/data.
- Core flow працює на погодженій device matrix.
- Немає blocker/security/data-loss проблем.
- Privacy declarations відповідають фактичній поведінці застосунку.
- Web та mobile використовують сумісну backend schema.

## Definition of Done

- Mobile beta завершена й задокументована.
- Release checklist готовий.
- Production store release залишається окремим явно погодженим кроком.
