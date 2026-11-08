import json

from django.conf import settings
from django.contrib.auth import authenticate
from django.db import connection
from django.shortcuts import render, get_object_or_404
from django.http import Http404
from rest_framework import generics
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import Scenario, Profile, Conversation, Message
from .serializers import (
    ScenarioSerializer, RegistrationInput, RegistrationResult, LoginInput, LoginResult, UserData,
    ProfileData, ConversationData, MessageData, MessageResult, MessageInput, AttemptInput,
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


def week2_demo(request):
    if not settings.DEBUG:
        raise Http404
    return render(request, 'learning/week2_demo.html')


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    @extend_schema(tags=['Готово — неделя 1'], responses={200: OpenApiResponse(description='Сервер и база отвечают'), 503: OpenApiResponse(description='База недоступна')})
    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
        except Exception:
            return Response({'status': 'error', 'database': 'unavailable'}, status=503)
        return Response({'status': 'ok', 'service': 'linguabot-backend', 'version': '0.2.0', 'database': 'sqlite', 'stage': 'week-2'})


class ScenarioListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    queryset = Scenario.objects.order_by('id')
    serializer_class = ScenarioSerializer

    @extend_schema(tags=['Готово — неделя 1'], summary='Получить справочник сценариев из SQLite')
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


DRAFT_RESPONSE = {501: OpenApiResponse(description='Операция запланирована, бизнес-логика ещё не реализована')}


def planned(week):
    return Response({'error': {'code': 'not_implemented', 'message': 'Черновой контракт API. Реализация запланирована.', 'planned_week': week}}, status=501)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    @extend_schema(tags=['Авторизация'], request=RegistrationInput, responses={201: RegistrationResult, 400: OpenApiResponse(description='Ошибка проверки email или пароля')})
    def post(self, request):
        serializer = RegistrationInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({'user': UserData(user).data}, status=201)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'

    @extend_schema(tags=['Авторизация'], request=LoginInput, responses={200: LoginResult, 401: OpenApiResponse(description='Неверный email или пароль')})
    def post(self, request):
        serializer = LoginInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, username=serializer.validated_data['email'].strip().lower(), password=serializer.validated_data['password'])
        if user is None:
            return Response({'detail': 'Неверный email или пароль.'}, status=401, headers={'WWW-Authenticate': 'Token'})
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserData(user).data})


class LogoutView(APIView):
    @extend_schema(tags=['Авторизация'], request=None, responses={204: OpenApiResponse(description='Токен отозван')})
    def post(self, request):
        request.auth.delete()
        return Response(status=204)


class ProfileView(APIView):
    @extend_schema(tags=['Профиль'], responses=ProfileData)
    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response(ProfileData(profile).data)

    @extend_schema(tags=['Профиль'], request=ProfileData, responses=ProfileData)
    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileData(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ConversationsView(APIView):
    @extend_schema(tags=['Диалоги'], responses=ConversationData(many=True))
    def get(self, request):
        conversations = Conversation.objects.filter(user=request.user).select_related('scenario').order_by('-created_at', '-id')
        return Response(ConversationData(conversations, many=True).data)

    @extend_schema(tags=['Диалоги'], request=ConversationData, responses={201: ConversationData})
    def post(self, request):
        serializer = ConversationData(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)


class ConversationDetailView(APIView):
    @extend_schema(tags=['Диалоги'], responses={200: ConversationData, 404: OpenApiResponse(description='Диалог не найден или принадлежит другому пользователю')})
    def get(self, request, conversation_id):
        conversation = get_object_or_404(Conversation.objects.select_related('scenario'), id=conversation_id, user=request.user)
        return Response(ConversationData(conversation).data)


class MessagesView(APIView):
    @extend_schema(tags=['Сообщения'], responses=MessageData(many=True))
    def get(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)
        return Response(MessageData(conversation.messages.all(), many=True).data)

    @extend_schema(tags=['Сообщения'], summary='Сохранить сообщение пользователя без вызова ИИ', request=MessageInput, responses={201: MessageResult})
    def post(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)
        serializer = MessageInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = Message.objects.create(conversation=conversation, role='user', content=serializer.validated_data['content'])
        return Response({'user_message': MessageData(message).data, 'assistant_message': None, 'feedback': []}, status=201)


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
