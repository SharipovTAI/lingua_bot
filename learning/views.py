import json

from django.conf import settings
from django.db import connection
from django.shortcuts import render
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import Scenario
from .serializers import (
    ScenarioSerializer, RegistrationInput, ProfileData,
    ConversationInput, MessageInput, AttemptInput,
)


def index(request):
    tables = connection.introspection.table_names()
    probe = None
    probe_path = settings.BASE_DIR / '.runtime' / 'ai_probe.json'
    if settings.DEBUG and probe_path.exists():
        probe = json.loads(probe_path.read_text(encoding='utf-8'))
    return render(request, 'learning/index.html', {
        'tables': [name for name in tables if name.startswith('learning_')],
        'scenarios': Scenario.objects.all(), 'probe': probe,
    })


class HealthView(APIView):
    @extend_schema(tags=['Готово — неделя 1'], responses={200: OpenApiResponse(description='Сервер и база отвечают'), 503: OpenApiResponse(description='База недоступна')})
    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
        except Exception:
            return Response({'status': 'error', 'database': 'unavailable'}, status=503)
        return Response({'status': 'ok', 'service': 'linguabot-backend', 'version': '0.1.0', 'database': 'sqlite', 'stage': 'week-1'})


class ScenarioListView(generics.ListAPIView):
    queryset = Scenario.objects.order_by('id')
    serializer_class = ScenarioSerializer

    @extend_schema(tags=['Готово — неделя 1'], summary='Получить справочник сценариев из SQLite')
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


DRAFT_RESPONSE = {501: OpenApiResponse(description='Операция запланирована, бизнес-логика ещё не реализована')}


def planned(week):
    return Response({'error': {'code': 'not_implemented', 'message': 'Черновой контракт API. Реализация запланирована.', 'planned_week': week}}, status=501)


class RegisterDraft(APIView):
    @extend_schema(tags=['Неделя 2 — контракт'], request=RegistrationInput, responses=DRAFT_RESPONSE)
    def post(self, request):
        return planned(2)


class LoginDraft(APIView):
    @extend_schema(tags=['Неделя 2 — контракт'], request=RegistrationInput, responses=DRAFT_RESPONSE)
    def post(self, request):
        return planned(2)


class ProfileDraft(APIView):
    @extend_schema(tags=['Неделя 2 — контракт'], responses=DRAFT_RESPONSE)
    def get(self, request):
        return planned(2)

    @extend_schema(tags=['Неделя 2 — контракт'], request=ProfileData, responses=DRAFT_RESPONSE)
    def patch(self, request):
        return planned(2)


class ConversationsDraft(APIView):
    @extend_schema(tags=['Неделя 2 — контракт'], responses=DRAFT_RESPONSE)
    def get(self, request):
        return planned(2)

    @extend_schema(tags=['Неделя 2 — контракт'], request=ConversationInput, responses=DRAFT_RESPONSE)
    def post(self, request):
        return planned(2)


class MessagesDraft(APIView):
    @extend_schema(tags=['Неделя 2 — контракт'], responses=DRAFT_RESPONSE)
    def get(self, request, conversation_id):
        return planned(2)

    @extend_schema(tags=['Неделя 3 — контракт'], request=MessageInput, responses=DRAFT_RESPONSE)
    def post(self, request, conversation_id):
        return planned(3)


class ExercisesDraft(APIView):
    @extend_schema(tags=['Неделя 4 — контракт'], responses=DRAFT_RESPONSE)
    def get(self, request):
        return planned(4)


class AttemptsDraft(APIView):
    @extend_schema(tags=['Неделя 4 — контракт'], request=AttemptInput, responses=DRAFT_RESPONSE)
    def post(self, request, exercise_id):
        return planned(4)


class StatisticsDraft(APIView):
    @extend_schema(tags=['Неделя 4 — контракт'], responses=DRAFT_RESPONSE)
    def get(self, request):
        return planned(4)
