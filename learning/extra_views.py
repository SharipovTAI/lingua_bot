from rest_framework import serializers, generics
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import LANGUAGES, Note, Profile
from .practice_views import PracticeView, checked_input
from .dictionary import lookup
from .tutor import TutorError


class LookupInput(serializers.Serializer):
    word = serializers.CharField(max_length=100)
    target = serializers.ChoiceField(choices=LANGUAGES, required=False)


class LookupData(serializers.Serializer):
    word = serializers.CharField()
    language = serializers.CharField()
    target = serializers.CharField()
    translation = serializers.CharField()
    definitions = serializers.ListField(child=serializers.CharField())
    examples = serializers.ListField(child=serializers.CharField())
    source = serializers.CharField()
    source_url = serializers.URLField()
    translation_url = serializers.URLField()


class DictionaryLookupView(PracticeView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "dictionary"

    @extend_schema(
        tags=["Внешний словарь"],
        parameters=[
            OpenApiParameter("word", str, required=True),
            OpenApiParameter("target", str, enum=["en", "de", "ru"]),
        ],
        responses=LookupData,
    )
    def get(self, request):
        data = checked_input(LookupInput, request.query_params)
        language = request.user.profile.language
        target = data.get("target", "en" if language == "ru" else "ru")
        if target == language:
            raise serializers.ValidationError(
                {"target": "Выберите другой язык перевода."}
            )
        try:
            result = lookup(data["word"], language, target)
        except TutorError as exc:
            return Response({"detail": str(exc)}, status=exc.status)
        return Response(result)


class NoteData(serializers.ModelSerializer):
    content = serializers.CharField(max_length=5000)

    class Meta:
        model = Note
        fields = ["id", "title", "content", "language", "updated_at"]
        read_only_fields = ["id", "language", "updated_at"]


class NotesView(generics.ListCreateAPIView):
    serializer_class = NoteData

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Note.objects.none()
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return Note.objects.filter(
            user=self.request.user, language=profile.language
        ).order_by("-updated_at", "-id")

    def perform_create(self, serializer):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        serializer.save(user=self.request.user, language=profile.language)


class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NoteData

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Note.objects.none()
        return Note.objects.filter(user=self.request.user)
