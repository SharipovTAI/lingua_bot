# Черновой контракт API

Версия 0.1.0. Основа: `/api/v1/`. Формат: JSON, UTF-8. Пути заканчиваются `/`.
Контракт подготовлен бэкендом для обсуждения с фронтендером; совместное согласование
ещё не проводилось. Готовые операции и будущая логика разделены ниже.

## Работает на неделе 1

### GET /health/

Проверяет сервер и выполняет `SELECT 1` в SQLite. Ответ 200:

```json
{"status":"ok","service":"linguabot-backend","version":"0.1.0","database":"sqlite","stage":"week-1"}
```

При недоступности БД: HTTP 503, `{"status":"error","database":"unavailable"}`.

### GET /scenarios/

Ответ 200 — массив записей из SQLite. Например, после `seed_scenarios`:

```json
[{"id":1,"slug":"introduction","title":"Знакомство","description":"Представиться и рассказать о себе."}]
```

Это пример одной записи, фактически команда заполняет пять. Идентификаторы нужно
брать из ответа, а не фиксировать в React. Каталог пока не имеет пагинации.

## Будущие операции

**Сейчас все операции этой таблицы возвращают HTTP 501.** Никакие пользовательские
данные не сохраняются и ИИ не вызывается. Примеры успешных ответов ниже — проектные.

| Метод | Путь | Планируемая неделя | Тело запроса |
|---|---|---:|---|
| POST | `/auth/register/` | 2 | `email`, `password` |
| POST | `/auth/login/` | 2 | `email`, `password` |
| GET, PATCH | `/profile/` | 2 | Для PATCH: `level`, `goal`, `language` |
| GET, POST | `/conversations/` | 2 | Для POST: `scenario_id` |
| GET | `/conversations/{id}/messages/` | 2 | — |
| POST | `/conversations/{id}/messages/` | 3 | `content` |
| GET | `/exercises/` | 4 | — |
| POST | `/exercises/{id}/attempts/` | 4 | `answer` |
| GET | `/statistics/` | 4 | — |

Фактический ответ заглушки:

```json
{"error":{"code":"not_implemented","message":"Черновой контракт API. Реализация запланирована.","planned_week":2}}
```

### Предлагаемые форматы следующей недели

Регистрация и вход: `{"email":"student@example.com","password":"example-password"}`.
Предлагаемый ответ входа: `{"token":"...","user":{"id":1,"email":"student@example.com"}}`.
Формат передачи токена и механизм регистрации уточняются на неделе 2; сейчас токены не выдаются.

Профиль: `{"level":"A1","goal":"Общение в путешествиях","language":"en"}`.
Уровни: A1, A2, B1, B2, C1. В первой версии язык `en`.

Создание диалога: `{"scenario_id":1}`. Предлагаемый ответ 201:
`{"id":1,"scenario_id":1,"created_at":"2026-11-02T10:00:00+05:00"}`.

Сообщение: `{"content":"I am go to cafe"}`. Предлагаемый ответ недели 3:

```json
{
  "user_message":{"id":1,"role":"user","content":"I am go to cafe"},
  "assistant_message":{"id":2,"role":"assistant","content":"What would you like to order?"},
  "feedback":[{"original":"I am go","corrected":"I am going","explanation":"После am нужна форма с -ing."}]
}
```

Список сообщений предлагается возвращать массивом в порядке `created_at`, затем `id`.
Будущая статистика: `{"completed_exercises":0,"correct_attempts":0,"total_attempts":0,"words_count":0}`.
Процент ошибок не рассчитывается до определения методики.

Планируемые ошибки: 400 — неверные данные, 401 — нет авторизации, 404 — запись не найдена,
502 — ошибка поставщика ИИ, 504 — превышено время ожидания. Они пока не реализованы
для будущих операций. Текущий 501 нельзя трактовать как успешный ответ.

## Подключение React

Сервер: `http://127.0.0.1:8000`. CORS разрешён для `http://localhost:5173`
и `http://localhost:3000`; иной адрес задаётся через `CORS_ALLOWED_ORIGINS` в `.env`.

```javascript
const response = await fetch('http://127.0.0.1:8000/api/v1/scenarios/');
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const scenarios = await response.json();
```

Ключ Apimira на фронтенд не передаётся. Swagger расположен по `/api/docs/`.
