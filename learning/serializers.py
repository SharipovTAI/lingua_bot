from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from .models import (Scenario, Profile, Conversation, Message, Exercise, Attempt, VocabularyWord, PlacementResult, WordReview)

User = get_user_model()


class ScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scenario
        fields = ['id', 'slug', 'title', 'description']


class RegistrationInput(serializers.Serializer):
    # В стандартном User username ограничен 150 символами; используем нормализованный email.
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username=value).exists() or User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Этот email уже зарегистрирован.')
        return value

    def validate(self, attrs):
        candidate = User(username=attrs['email'], email=attrs['email'])
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': exc.messages}) from None
        return attrs

    def create(self, validated_data):
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=validated_data['email'], email=validated_data['email'],
                    password=validated_data['password'],
                )
                Profile.objects.create(user=user)
        except IntegrityError:
            raise serializers.ValidationError({'email': ['Этот email уже зарегистрирован.']}) from None
        return user


class LoginInput(serializers.Serializer):
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)


class UserData(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email']


class RegistrationResult(serializers.Serializer):
    user = UserData()


class LoginResult(serializers.Serializer):
    token = serializers.CharField()
    user = UserData()


class ProfileData(serializers.ModelSerializer):
    language = serializers.ChoiceField(choices=['en'], required=False)

    class Meta:
        model = Profile
        fields = ['level', 'goal', 'language']


class ConversationData(serializers.ModelSerializer):
    scenario_id = serializers.PrimaryKeyRelatedField(source='scenario', queryset=Scenario.objects.all())
    scenario_title = serializers.CharField(source='scenario.title', read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'scenario_id', 'scenario_title', 'created_at']
        read_only_fields = ['id', 'created_at']


class MessageData(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'feedback', 'created_at']
        read_only_fields = fields


class CorrectionData(serializers.Serializer):
    original = serializers.CharField()
    corrected = serializers.CharField()
    explanation = serializers.CharField()


class MessageResult(serializers.Serializer):
    user_message = MessageData()
    assistant_message = MessageData()
    feedback = CorrectionData(many=True)


class MessageInput(serializers.Serializer):
    content = serializers.CharField(max_length=2000)


class AttemptInput(serializers.Serializer):
    answer = serializers.CharField(max_length=2000)

# API четвёртой недели



class ExerciseData(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ['id', 'title', 'level', 'kind', 'topic', 'question', 'options']


class PracticeAnswerInput(AttemptInput):
    request_id = serializers.UUIDField()


class AttemptData(serializers.ModelSerializer):
    correct_answer = serializers.CharField(source='exercise.answer', read_only=True)
    explanation = serializers.CharField(source='exercise.explanation', read_only=True)

    class Meta:
        model = Attempt
        fields = ['id', 'request_id', 'exercise_id', 'answer', 'is_correct',
                  'correct_answer', 'explanation', 'created_at']


class PlacementAnswer(serializers.Serializer):
    exercise_id = serializers.IntegerField(min_value=1)
    answer = serializers.CharField(max_length=2000)


class PlacementInput(serializers.Serializer):
    request_id = serializers.UUIDField()
    answers = PlacementAnswer(many=True, allow_empty=False, max_length=20)

    def validate_answers(self, value):
        ids = [item['exercise_id'] for item in value]
        if len(set(ids)) != len(ids):
            raise serializers.ValidationError('Вопросы не должны повторяться.')
        return sorted(value, key=lambda item: item['exercise_id'])


class PlacementData(serializers.ModelSerializer):
    class Meta:
        model = PlacementResult
        fields = ['id', 'request_id', 'score', 'total', 'level', 'created_at']


class VocabularyInput(serializers.Serializer):
    word = serializers.CharField(max_length=100)
    translation = serializers.CharField(max_length=200)

    def validate_word(self, value):
        from .practice import normalized
        return normalized(value)


class VocabularyData(serializers.ModelSerializer):
    class Meta:
        model = VocabularyWord
        fields = ['id', 'word', 'translation', 'next_review', 'streak']


class ReviewCard(serializers.ModelSerializer):
    class Meta:
        model = VocabularyWord
        fields = ['id', 'word', 'next_review']


class ReviewInput(serializers.Serializer):
    request_id = serializers.UUIDField()
    answer = serializers.CharField(max_length=200)


class ReviewData(serializers.ModelSerializer):
    class Meta:
        model = WordReview
        fields = ['id', 'request_id', 'word_id', 'answer', 'is_correct',
                  'translation', 'next_review', 'created_at']


class StatisticsData(serializers.Serializer):
    level = serializers.CharField()
    attempts = serializers.IntegerField()
    correct = serializers.IntegerField()
    accuracy = serializers.FloatField()
    completed_exercises = serializers.IntegerField()
    by_kind = serializers.DictField()
    vocabulary_words = serializers.IntegerField()
    words_due = serializers.IntegerField()
    word_reviews = serializers.IntegerField()
    correct_reviews = serializers.IntegerField()
    conversations = serializers.IntegerField()
    user_messages = serializers.IntegerField()
    placement = PlacementData(allow_null=True)
