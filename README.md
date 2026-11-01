# LinguaBot — бэкенд первой недели

Учебный проект по практике УрФУ. Исполнитель: Шарипов Тимур Илгизович.
Отчётный период: 26.10–01.11.2026.

## Что сделано

- Каркас Django + Django REST Framework, база SQLite.
- Модели и миграция: профиль, сценарий, диалог, сообщение, упражнение, попытка, слово.
- Проверка сервера и соединения с БД: `GET /api/v1/health/`.
- Чтение справочника сценариев из базы: `GET /api/v1/scenarios/`.
- Swagger: `/api/docs/`, схема OpenAPI: `/api/schema/`.
- CORS для React на `localhost:5173` и `localhost:3000`.
- Отдельная команда для проверки доступа к Apimira.
- 11 автоматических тестов без обращений к платному API.

В первую неделю входит только подготовка основы. Регистрация, вход, пользовательские
диалоги и упражнения ещё не работают: соответствующие адреса возвращают HTTP 501.
Они нужны для обсуждения контракта с фронтендером. Контракт пока не согласован с командой.
Пять сценариев в базе — справочник, а не готовый ИИ-чат.

## Запуск на Windows

Нужен Python 3.12 или новее. Проект проверен на Python 3.14.

```powershell
git clone https://github.com/SharipovTAI/lingua_bot.git
cd lingua_bot
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_scenarios
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Открыть http://127.0.0.1:8000/. Без ключа работают сервер, база, справочник и документация.
`seed_scenarios` можно запускать повторно: записи обновляются без дублирования.
SQLite-файл создаётся миграцией; его не нужно скачивать из GitHub.

На Linux/macOS вместо `.\.venv\Scripts\python.exe` используйте `.venv/bin/python`.

## Проверка Apimira

Впишите ключ в локальный `.env` после `APIMIRA_API_KEY=`. Модель для начальной проверки:
`deepseek/deepseek-v4-flash`. Адрес: `https://apimira.com/v1`.

```powershell
.\.venv\Scripts\python.exe manage.py check_ai --confirm-paid-request
```

Команда делает **один платный запрос** с текстом `Reply with only: OK` и сохраняет
обезличенный результат в `.runtime/ai_probe.json`. Ключ и тело ошибок не печатаются.
Команда не повторяет запрос автоматически. Открытие страниц и тесты не расходуют токены.

`APIMIRA_MAX_TOKENS` ограничивается в коде значением 200 и передаётся как
`max_completion_tokens`. Это запрашиваемый лимит, а не гарантия списания:
если провайдер сообщает больше выходных токенов, поле `limit_verified` будет `false`.
В первой проверке наблюдалось такое расхождение. Реальные списания смотрите в кабинете
Apimira; для регулярной работы стоит установить денежный лимит ключа у провайдера.
Цены и доступность моделей могут меняться.

Можно хранить настройки за пределами проекта и задать путь через `LINGUABOT_ENV_FILE`.
`.env`, `.runtime`, SQLite и виртуальное окружение исключены через `.gitignore`.

## Проверки

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test -v 2
.\.venv\Scripts\python.exe manage.py spectacular --file docs/openapi.yaml --validate
```

## Документы

- [Черновой контракт API и примеры JSON](docs/api-contract.md)
- [Схема данных](docs/database.md)
- [Схема OpenAPI](docs/openapi.yaml)
- [Итоги первой недели](docs/week-1.md)

Структура: `config/` — настройки и адреса; `learning/models.py` — модели;
`learning/views.py` — готовые операции и заглушки; `learning/services.py` — проверка ИИ;
`learning/management/commands/` — команды; `learning/tests.py` — тесты.

Это локальный сервер разработки. Перед внешним развёртыванием потребуются отдельные
настройки безопасности и аутентификация. Секрет Django для локальной разработки
не подходит для развёртывания: при `DJANGO_DEBUG=false` задайте `DJANGO_SECRET_KEY`.

## Первичные источники

- https://docs.djangoproject.com/en/5.2/
- https://www.django-rest-framework.org/
- https://drf-spectacular.readthedocs.io/
- https://apimira.com/docs
- https://apimira.com/models
