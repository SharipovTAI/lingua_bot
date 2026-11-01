from rest_framework import serializers
from .models import Scenario


class ScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scenario
        fields = ['id', 'slug', 'title', 'description']


class RegistrationInput(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)


class ProfileData(serializers.Serializer):
    level = serializers.ChoiceField(choices=['A1', 'A2', 'B1', 'B2', 'C1'])
    goal = serializers.CharField(max_length=200)
    language = serializers.ChoiceField(choices=['en'])


class ConversationInput(serializers.Serializer):
    scenario_id = serializers.IntegerField(min_value=1)


class MessageInput(serializers.Serializer):
    content = serializers.CharField(max_length=2000)


class AttemptInput(serializers.Serializer):
    answer = serializers.CharField(max_length=2000)
