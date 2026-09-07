# Епік 1. Cloud development preview

Статус: `DONE` — завершено 4 вересня 2026 року.

## Мета

Розгорнути поточний Web-фундамент у development cloud-середовищі та отримати стабільний EAS Hosting preview URL, підключений до окремого hosted Supabase development project.

## Результат

- Legacy hosted Supabase project: `bar-checklist`, ref `ujpbumiognmqmgvomvtm`, organization `cgdwshlajtsyovzqwiyu`, region `eu-west-1`.
- Legacy EAS project: `@krasdevs-team/bar-checklist`, ID `27f73b5c-895a-49af-b950-22d30ea1f2fd`.
- Stable development preview: https://bar-checklist--development.expo.app
- Auth confirmation увімкнено. Site URL — stable preview; allow-list містить stable URL, immutable EAS preview URLs і локальні `localhost`/`127.0.0.1` на порту `8081`.
- EAS `development` містить тільки hosted Supabase URL і publishable key; client secret/service-role key не додано.

## Scope

1. Перевірити EAS і Supabase авторизацію.
2. Створити або вибрати hosted Supabase development project.
3. Прив’язати локальну Supabase конфігурацію через project ref.
4. Перевірити migration history до push.
5. Виконати `supabase db push`.
6. Згенерувати hosted database types і порівняти їх з локальними.
7. Налаштувати Auth URLs для локального та EAS preview доменів.
8. Додати URL і publishable key в EAS environment `development`.
9. Переконатися, що secret/service-role key не доданий до клієнтського environment.
10. Зібрати production Web export.
11. Виконати EAS Hosting preview deployment.
12. Перевірити preview у браузері.

## Поза scope

- Production domain і production Supabase.
- CI/CD.
- Повний checklist CRUD.
- Реальні користувачі та beta-аналітика.
- iOS/Android builds.

## Перевірка

- Signup створює hosted Auth user і profile.
- Email confirmation працює відповідно до конфігурації.
- Sign-in/sign-out і session reload працюють на preview URL.
- Гість не отримує protected content.
- RLS не дозволяє прочитати чужі дані.
- Прямі URL та browser reload повертають застосунок, а не 404.
- Bundle не містить secret/service-role key.
- Локальні та hosted міграції не мають drift.

## Definition of Done

- [x] Є робочий `expo.app` development preview URL.
- [x] URL і параметри середовища задокументовані без секретів.
- [x] Пройдені lint, format check, typecheck, Jest, local pgTAP, hosted migration/type checks, hosted RLS/trigger pgTAP, Web export і browser QA auth/routes.
- [x] У master roadmap епік позначено `DONE`.

## Наступний gate

Після стабільного preview створити окремий implementation turn для епіка 2.
