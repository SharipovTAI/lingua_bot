from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from .models import Scenario, Profile, Conversation, Message

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


class MessageResult(serializers.Serializer):
    user_message = MessageData()
    assistant_message = MessageData(allow_null=True)
    feedback = serializers.ListField(child=serializers.DictField())


class MessageInput(serializers.Serializer):
    content = serializers.CharField(max_length=2000)


class AttemptInput(serializers.Serializer):
    answer = serializers.CharField(max_length=2000)
