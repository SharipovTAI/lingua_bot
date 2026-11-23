import unicodedata
from django.db.models import Q
from django.utils import timezone
from .models import Attempt, Exercise


def normalized(value):
    return ' '.join(unicodedata.normalize('NFKC', value).casefold().split())


def recommended_exercises(user):
    level = getattr(getattr(user, 'profile', None), 'level', 'A1')
    # Последняя попытка определяет, осталась ли ошибка по теме.
    latest = {}
    for item in Attempt.objects.filter(user=user).select_related('exercise').order_by('-created_at', '-id'):
        latest.setdefault(item.exercise_id, item)
    topics = {item.exercise.topic for item in latest.values() if not item.is_correct and item.exercise.topic}
    exercises = Exercise.objects.filter(is_placement=False, level=level)
    return sorted(exercises, key=lambda item: (
        item.topic not in topics,
        item.id in latest and latest[item.id].is_correct,
        item.id,
    ))


def due_words(user):
    from .models import VocabularyWord
    return VocabularyWord.objects.filter(user=user).filter(
        Q(next_review__isnull=True) | Q(next_review__lte=timezone.now())
    ).order_by('next_review', 'id')
