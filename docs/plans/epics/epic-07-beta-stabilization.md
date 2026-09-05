# Епік 7. Beta fixes та production hardening

Статус: `PLANNED`.

## Мета

Виправити проблеми, підтверджені реальними користувачами, стабілізувати schema та UX і підготувати Web-продукт до рішення про ширший запуск та мобільну реалізацію.

## Залежності

- Епік 6 завершений.
- Є структурований beta issue backlog.

## Принцип планування

Цей епік не деталізується остаточно наперед. Після beta створюється окремий execution plan на основі фактичних проблем, згрупованих за severity та першопричиною.

## Scope

1. Тріажити issues: security/data loss → blockers → core UX → performance → polish.
2. Відтворити кожну критичну проблему в development.
3. Додати regression test до виправлення, де це практично.
4. Виправити permission/RLS проблеми.
5. Виправити timezone/DST і Realtime race conditions.
6. Виправити UX, що блокує core flow.
7. Оптимізувати підтверджені повільні queries та indexes.
8. Провести безпечні data migrations, якщо потрібні.
9. Повторити beta regression з affected teams.
10. Зафіксувати стабільний database contract і API behavior.
11. Провести фінальний Web security/quality review.

## Поза scope

- Непідтверджені speculative features.
- Великий редизайн без beta-доказів.
- Native-specific UX.

## Перевірка

- Усі critical/high issues закриті або мають письмово прийнятий risk.
- Regression tests відтворюють ключові beta-помилки.
- Міграції проходять на копії beta-like даних.
- Core flow стабільний у development і beta environments.
- Schema та permission model готові стати базою native clients.

## Definition of Done

- Web MVP стабілізований після реального використання.
- Немає відкритих blocker/security/data-loss проблем.
- Прийнято окреме рішення про старт native foundation.

## Наступний gate

Епік 8 стартує тільки після формального mobile go-ahead.
