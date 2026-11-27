from collections import Counter
from datetime import timedelta

from django.utils import timezone
from .models import (
    AchievementAward,
    Attempt,
    Conversation,
    Message,
    PlacementResult,
    Profile,
    VocabularyWord,
    WordReview,
)
from .practice import due_words, practice_state

# code, title, condition, metric, target
ACHIEVEMENTS = [
    ("first-word", "Первое слово", "Добавить одно слово.", "words", 1),
    ("ten-words", "Коллекционер", "Собрать 10 слов.", "words", 10),
    ("twenty-five-words", "Словарный запас", "Собрать 25 слов.", "words", 25),
    ("fifty-words", "Своя библиотека", "Собрать 50 слов.", "words", 50),
    ("first-exercise", "Первый шаг", "Отправить ответ на упражнение.", "attempts", 1),
    ("ten-attempts", "В ритме", "Выполнить 10 попыток упражнений.", "attempts", 10),
    ("fifty-attempts", "Практик", "Выполнить 50 попыток упражнений.", "attempts", 50),
    (
        "ten-mastered",
        "Умею решать",
        "Верно решить 10 разных упражнений.",
        "completed",
        10,
    ),
    ("first-review", "Вспомнить всё", "Повторить одно слово.", "reviews", 1),
    ("ten-reviews", "Хорошая память", "Повторить слова 10 раз.", "reviews", 10),
    ("fifty-reviews", "Долгая память", "Повторить слова 50 раз.", "reviews", 50),
    (
        "first-message",
        "Начало разговора",
        "Отправить первую реплику ИИ.",
        "messages",
        1,
    ),
    ("ten-messages", "Собеседник", "Отправить 10 реплик ИИ.", "messages", 10),
    ("fifty-messages", "Разговорился", "Отправить 50 реплик ИИ.", "messages", 50),
    (
        "all-scenarios",
        "В любой ситуации",
        "Отправить реплику во всех 10 сценариях.",
        "scenarios",
        10,
    ),
    ("three-days", "Привычка", "Заниматься 3 дня подряд.", "streak", 3),
    ("seven-days", "Неделя практики", "Заниматься 7 дней подряд.", "streak", 7),
    ("placement", "Точка старта", "Завершить входной тест.", "placement", 1),
    (
        "accuracy",
        "Точный ответ",
        "Получить 80% верных ответов минимум за 10 попыток.",
        "accuracy",
        80,
    ),
    (
        "three-languages",
        "Три языка",
        "Выполнить упражнение, тест или диалог на каждом из трёх языков.",
        "languages",
        3,
    ),
]


def activity_summary(sources):
    today = timezone.localdate()
    by_day = {}
    last = None
    kinds = ["attempt", "review", "word", "placement", "conversation", "message"]
    for kind, queryset in sources.items():
        for stamp in queryset.values_list("created_at", flat=True):
            if stamp is None:
                continue
            day = timezone.localtime(stamp).date()
            by_day.setdefault(day, Counter())[kind] += 1
            if last is None or stamp > last:
                last = stamp
    cursor = today if today in by_day else today - timedelta(days=1)
    streak = 0
    while cursor in by_day:
        streak += 1
        cursor -= timedelta(days=1)
    week = []
    labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        week.append(
            {
                "key": str(day),
                "label": labels[day.weekday()],
                "count": sum(by_day.get(day, {}).values()),
                "isToday": offset == 0,
            }
        )
    counts = {kind: by_day.get(today, {}).get(kind, 0) for kind in kinds}
    return {
        "today": counts,
        "todayTotal": sum(counts.values()),
        "week": week,
        "weekTotal": sum(day["count"] for day in week),
        "streak": streak,
        "lastActive": last.isoformat() if last else None,
    }


def statistics(user):
    profile, _ = Profile.objects.get_or_create(user=user)
    language = profile.language
    attempts = Attempt.objects.filter(user=user, exercise__language=language)
    words = VocabularyWord.objects.filter(user=user, language=language)
    reviews = WordReview.objects.filter(user=user, word__language=language)
    placements = PlacementResult.objects.filter(user=user, language=language)
    conversations = Conversation.objects.filter(user=user, language=language)
    messages = Message.objects.filter(
        conversation__user=user, conversation__language=language, role="user"
    )
    activity = activity_summary(
        {
            "attempt": attempts,
            "review": reviews,
            "word": words,
            "placement": placements,
            "conversation": conversations,
            "message": messages,
        }
    )
    total, correct = attempts.count(), attempts.filter(is_correct=True).count()
    completed = (
        attempts.filter(is_correct=True).values("exercise_id").distinct().count()
    )
    accuracy = round(correct / total * 100, 1) if total else 0.0
    by_kind = {}
    for kind in ["grammar", "vocabulary"]:
        group = attempts.filter(exercise__kind=kind)
        by_kind[kind] = {
            "attempts": group.count(),
            "correct": group.filter(is_correct=True).count(),
        }
    studied = set(
        Attempt.objects.filter(user=user).values_list("exercise__language", flat=True)
    )
    studied.update(
        PlacementResult.objects.filter(user=user).values_list("language", flat=True)
    )
    studied.update(
        Message.objects.filter(conversation__user=user, role="user").values_list(
            "conversation__language", flat=True
        )
    )
    metrics = {
        "words": words.count(),
        "attempts": total,
        "completed": completed,
        "reviews": reviews.count(),
        "messages": messages.count(),
        "scenarios": messages.values("conversation__scenario_id").distinct().count(),
        "streak": activity["streak"],
        "placement": int(placements.exists()),
        "accuracy": accuracy if total >= 10 else 0,
        "languages": len(studied),
    }
    unlocked = {
        item.code: item
        for item in AchievementAward.objects.filter(user=user, language=language)
    }
    achievements = []
    for index, (code, title, description, metric, target) in enumerate(ACHIEVEMENTS):
        value = metrics[metric]
        if value >= target and code not in unlocked:
            unlocked[code], _ = AchievementAward.objects.get_or_create(
                user=user, language=language, code=code
            )
        award = unlocked.get(code)
        achievements.append(
            {
                "id": code,
                "title": title,
                "description": description,
                "value": value,
                "target": target,
                "unlocked": bool(award),
                "unlocked_at": award.unlocked_at.isoformat() if award else None,
                "accent": ["mint", "blue", "purple", "orange"][index % 4],
                "difficulty": "начальное"
                if target <= 3
                else "среднее"
                if target <= 10
                else "сложное",
            }
        )
    placement = placements.order_by("-created_at", "-id").first()
    from .serializers import PlacementData

    today = activity["today"]
    daily_tasks = [
        {
            "id": "attempts",
            "title": "Выполнить 3 упражнения",
            "to": "/exercises",
            "count": today["attempt"],
            "target": 3,
            "xp": 20,
        },
        {
            "id": "reviews",
            "title": "Повторить 3 слова",
            "to": "/dictionary",
            "count": today["review"],
            "target": 3,
            "xp": 20,
        },
        {
            "id": "word",
            "title": "Добавить слово в словарь",
            "to": "/dictionary",
            "count": today["word"],
            "target": 1,
            "xp": 10,
        },
    ]
    _, topics = practice_state(user)
    topic_names = {
        "be": "формы глагола «быть»",
        "present-simple": "настоящее время",
        "past-simple": "прошедшее время",
        "present-perfect": "завершённые действия",
        "articles": "артикли",
        "cases": "падежи",
        "word-order": "порядок слов",
        "vocabulary": "лексика",
        "aspect": "вид глагола",
        "gender": "род",
        "conditionals": "условные конструкции",
        "animals": "животные",
    }
    failed = sorted(topics)[:3]
    focus = ", ".join(topic_names.get(topic, topic) for topic in failed)
    plan = [
        {
            "title": f"Практика уровня {profile.level}",
            "description": f"Цель: {profile.goal or 'регулярное общение'}. Выполните три рекомендованных задания. Темы повторения: {focus or 'базовые конструкции текущего уровня'}.",
            "to": "/exercises",
        },
        {
            "title": "Повторение слов",
            "description": f"Готовы к повторению: {due_words(user).count()}.",
            "to": "/dictionary",
        },
        {
            "title": "Разговор по сценарию",
            "description": "Выберите ситуацию и отправьте несколько реплик. Исправления помогут выбрать темы для тренировки.",
            "to": "/practice",
        },
    ]
    if not placement:
        plan.insert(
            0,
            {
                "title": "Уточните начальный уровень",
                "description": "Пройдите короткий тест для выбранного языка.",
                "to": "/placement",
            },
        )
    return {
        "language": language,
        "level": profile.level,
        "attempts": total,
        "correct": correct,
        "accuracy": accuracy,
        "completed_exercises": completed,
        "by_kind": by_kind,
        "vocabulary_words": words.count(),
        "words_due": due_words(user).count(),
        "word_reviews": reviews.count(),
        "correct_reviews": reviews.filter(is_correct=True).count(),
        "conversations": conversations.count(),
        "user_messages": messages.count(),
        "placement": PlacementData(placement).data if placement else None,
        "activity": activity,
        "daily_tasks": daily_tasks,
        "achievements": achievements,
        "xp_today": sum(
            item["xp"] for item in daily_tasks if item["count"] >= item["target"]
        ),
        "learning_plan": plan,
        "focus_topics": failed,
    }
