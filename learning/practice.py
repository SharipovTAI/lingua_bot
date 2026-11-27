import unicodedata
from django.db.models import Q
from django.utils import timezone
from .models import Attempt, Exercise, Message, LEVELS


def normalized(value):
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def practice_state(user):
    # Последняя попытка определяет, осталась ли ошибка по теме.
    language = getattr(getattr(user, "profile", None), "language", "en")
    latest = {}
    for item in (
        Attempt.objects.filter(user=user, exercise__language=language)
        .select_related("exercise")
        .order_by("-created_at", "-id")
    ):
        latest.setdefault(item.exercise_id, item)
    topics = {
        item.exercise.topic
        for item in latest.values()
        if not item.is_correct and item.exercise.topic
    }
    # Тема исправления ИИ включается в подбор, если она есть в учебном банке.
    for message in Message.objects.filter(
        conversation__user=user, conversation__language=language, role="assistant"
    ).order_by("-id")[:30]:
        for correction in message.feedback.get("corrections", []):
            topic = correction.get("topic")
            if topic:
                topics.add(topic)
                if language == "ru" and topic == "gender":
                    topics.add("cases")
    return latest, topics


def recommended_exercises(user):
    level = getattr(getattr(user, "profile", None), "level", "A1")
    language = getattr(getattr(user, "profile", None), "language", "en")
    latest, topics = practice_state(user)
    levels = [name for name, _ in LEVELS]
    allowed = levels[: levels.index(level) + 1]
    exercises = Exercise.objects.filter(
        Q(level=level) | Q(topic__in=topics, level__in=allowed),
        is_placement=False,
        language=language,
    )
    return sorted(
        exercises,
        key=lambda item: (
            item.topic not in topics,
            item.id in latest and latest[item.id].is_correct,
            item.id,
        ),
    )


def due_words(user):
    from .models import VocabularyWord

    return (
        VocabularyWord.objects.filter(
            user=user,
            language=getattr(getattr(user, "profile", None), "language", "en"),
        )
        .filter(Q(next_review__isnull=True) | Q(next_review__lte=timezone.now()))
        .order_by("next_review", "id")
    )
