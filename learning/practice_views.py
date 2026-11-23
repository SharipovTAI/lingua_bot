from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Attempt, Conversation, Exercise, Message, PlacementResult, Profile,
    VocabularyWord, WordReview, LEVELS,
)
from .practice import normalized, recommended_exercises, due_words
from .serializers import (
    ExerciseData, PracticeAnswerInput, AttemptData, PlacementInput,
    PlacementData, VocabularyInput, VocabularyData, ReviewCard,
    ReviewInput, ReviewData, StatisticsData,
)


def checked_input(serializer_class, data, **kwargs):
    serializer = serializer_class(data=data, **kwargs)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def check_replay(matches):
    if not matches:
        raise ValidationError({'request_id': 'Этот request_id уже использован с другими данными.'})


class ExercisesView(APIView):
    @extend_schema(
        tags=['Упражнения'], responses=ExerciseData(many=True),
        parameters=[OpenApiParameter('kind', str, enum=['grammar', 'vocabulary'])],
    )
    def get(self, request):
        kind = request.query_params.get('kind')
        if kind and kind not in ('grammar', 'vocabulary'):
            raise ValidationError({'kind': 'Допустимы grammar и vocabulary.'})
        exercises = recommended_exercises(request.user)
        if kind:
            exercises = [item for item in exercises if item.kind == kind]
        return Response(ExerciseData(exercises, many=True).data)


class AttemptsView(APIView):
    @extend_schema(tags=['Упражнения'], request=PracticeAnswerInput, responses={201: AttemptData, 200: AttemptData})
    @transaction.atomic
    def post(self, request, exercise_id):
        exercise = get_object_or_404(Exercise, pk=exercise_id, is_placement=False)
        data = checked_input(PracticeAnswerInput, request.data)
        attempt, created = Attempt.objects.get_or_create(
            user=request.user, request_id=data['request_id'],
            defaults={'exercise': exercise, 'answer': data['answer'],
                      'is_correct': normalized(data['answer']) == normalized(exercise.answer)},
        )
        check_replay(attempt.exercise_id == exercise.id and attempt.answer == data['answer'])
        return Response(AttemptData(attempt).data, status=201 if created else 200)


class PlacementView(APIView):
    @extend_schema(tags=['Входной тест'], responses=ExerciseData(many=True))
    def get(self, request):
        return Response(ExerciseData(Exercise.objects.filter(is_placement=True).order_by('id'), many=True).data)

    @extend_schema(tags=['Входной тест'], request=PlacementInput, responses={201: PlacementData, 200: PlacementData})
    @transaction.atomic
    def post(self, request):
        data = checked_input(PlacementInput, request.data)
        previous = PlacementResult.objects.filter(user=request.user, request_id=data['request_id']).first()
        if previous:
            check_replay(previous.answers == data['answers'])
            return Response(PlacementData(previous).data)
        exercises = {item.id: item for item in Exercise.objects.filter(is_placement=True)}
        if len(exercises) != 10:
            raise ValidationError({'detail': 'Банк теста не готов. Выполните seed_exercises.'})
        if {item['exercise_id'] for item in data['answers']} != set(exercises):
            raise ValidationError({'answers': 'Нужен один ответ на каждый из 10 вопросов теста.'})
        score = sum(normalized(item['answer']) == normalized(exercises[item['exercise_id']].answer)
                    for item in data['answers'])
        level = LEVELS[min(score // 2, 4)][0]
        result, created = PlacementResult.objects.get_or_create(
            user=request.user, request_id=data['request_id'],
            defaults={'answers': data['answers'], 'score': score, 'total': 10, 'level': level},
        )
        check_replay(result.answers == data['answers'])
        if created:
            profile, _ = Profile.objects.get_or_create(user=request.user)
            profile.level = level
            profile.save(update_fields=['level'])
        return Response(PlacementData(result).data, status=201 if created else 200)


class VocabularyView(APIView):
    @extend_schema(tags=['Словарь'], responses=VocabularyData(many=True))
    def get(self, request):
        return Response(VocabularyData(VocabularyWord.objects.filter(user=request.user).order_by('word', 'id'), many=True).data)

    @extend_schema(tags=['Словарь'], request=VocabularyInput, responses={201: VocabularyData, 200: VocabularyData})
    def post(self, request):
        data = checked_input(VocabularyInput, request.data)
        # Учитываем слова, сохранённые до нормализации регистра в API.
        for existing in VocabularyWord.objects.filter(user=request.user):
            if normalized(existing.word) == data['word']:
                if existing.translation != data['translation']:
                    raise ValidationError({'word': 'Слово уже есть. Измените перевод через PATCH.'})
                return Response(VocabularyData(existing).data)
        word, created = VocabularyWord.objects.get_or_create(user=request.user, word=data['word'], defaults={
            'translation': data['translation'],
        })
        if word.translation != data['translation']:
            raise ValidationError({'word': 'Слово уже есть. Измените перевод через PATCH.'})
        return Response(VocabularyData(word).data, status=201 if created else 200)


class VocabularyDetailView(APIView):
    @extend_schema(tags=['Словарь'], request=VocabularyInput, responses=VocabularyData)
    @transaction.atomic
    def patch(self, request, word_id):
        word = get_object_or_404(VocabularyWord, pk=word_id, user=request.user)
        data = checked_input(VocabularyInput, request.data, partial=True)
        if not data:
            raise ValidationError({'detail': 'Передайте слово или перевод.'})
        new_word = data.get('word', word.word)
        if any(normalized(item.word) == normalized(new_word) for item in
               VocabularyWord.objects.filter(user=request.user).exclude(pk=word.pk)):
            raise ValidationError({'word': 'Такое слово уже есть в словаре.'})
        for field, value in data.items():
            setattr(word, field, value)
        word.streak = 0
        word.next_review = None
        try:
            with transaction.atomic():
                word.save()
        except IntegrityError:
            raise ValidationError({'word': 'Такое слово уже есть в словаре.'}) from None
        return Response(VocabularyData(word).data)

    @extend_schema(tags=['Словарь'], responses={204: None})
    def delete(self, request, word_id):
        get_object_or_404(VocabularyWord, pk=word_id, user=request.user).delete()
        return Response(status=204)


class ReviewListView(APIView):
    @extend_schema(tags=['Словарь'], responses=ReviewCard(many=True))
    def get(self, request):
        return Response(ReviewCard(due_words(request.user), many=True).data)


class ReviewView(APIView):
    @extend_schema(tags=['Словарь'], request=ReviewInput, responses={201: ReviewData, 200: ReviewData})
    @transaction.atomic
    def post(self, request, word_id):
        word = get_object_or_404(VocabularyWord.objects.select_for_update(), pk=word_id, user=request.user)
        data = checked_input(ReviewInput, request.data)
        previous = WordReview.objects.filter(user=request.user, request_id=data['request_id']).first()
        if previous:
            check_replay(previous.word_id == word.id and previous.answer == data['answer'])
            return Response(ReviewData(previous).data)
        if word.next_review and word.next_review > timezone.now():
            raise ValidationError({'detail': 'Время следующего повторения ещё не наступило.'})
        correct = normalized(data['answer']) == normalized(word.translation)
        streak = min(word.streak + 1, 5) if correct else 0
        interval = timedelta(days=[1, 3, 7, 14, 30][streak - 1]) if correct else timedelta(hours=1)
        next_review = timezone.now() + interval
        review, created = WordReview.objects.get_or_create(
            user=request.user, request_id=data['request_id'],
            defaults={'word': word, 'answer': data['answer'], 'is_correct': correct,
                      'translation': word.translation, 'next_review': next_review},
        )
        check_replay(review.word_id == word.id and review.answer == data['answer'])
        if created:
            word.streak, word.next_review = streak, next_review
            word.save(update_fields=['streak', 'next_review'])
        return Response(ReviewData(review).data, status=201 if created else 200)


class StatisticsView(APIView):
    @extend_schema(tags=['Прогресс'], responses=StatisticsData)
    def get(self, request):
        attempts = Attempt.objects.filter(user=request.user)
        total = attempts.count()
        correct = attempts.filter(is_correct=True).count()
        by_kind = {}
        for item in attempts.values('exercise__kind').annotate(total=Count('id'), correct=Count('id', filter=Q(is_correct=True))):
            by_kind[item['exercise__kind']] = {'attempts': item['total'], 'correct': item['correct']}
        profile, _ = Profile.objects.get_or_create(user=request.user)
        placement = PlacementResult.objects.filter(user=request.user).order_by('-created_at', '-id').first()
        return Response({
            'level': profile.level, 'attempts': total, 'correct': correct,
            'accuracy': round(correct / total * 100, 1) if total else 0.0,
            'completed_exercises': attempts.filter(is_correct=True).values('exercise_id').distinct().count(),
            'by_kind': by_kind,
            'vocabulary_words': VocabularyWord.objects.filter(user=request.user).count(),
            'words_due': due_words(request.user).count(),
            'word_reviews': WordReview.objects.filter(user=request.user).count(),
            'correct_reviews': WordReview.objects.filter(user=request.user, is_correct=True).count(),
            'conversations': Conversation.objects.filter(user=request.user).count(),
            'user_messages': Message.objects.filter(conversation__user=request.user, role='user').count(),
            'placement': PlacementData(placement).data if placement else None,
        })
