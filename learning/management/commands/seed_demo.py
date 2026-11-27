from uuid import uuid5, NAMESPACE_URL
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from learning.models import Profile, LanguageProgress, Exercise, Attempt, VocabularyWord


class Command(BaseCommand):
    help = "Создать помеченный демонстрационный аккаунт с учебными данными."

    @transaction.atomic
    def handle(self, *args, **options):
        user, created = get_user_model().objects.get_or_create(
            username="demo@linguabot.example",
            defaults={"email": "demo@linguabot.example"},
        )
        if created:
            user.set_password("LinguaDemo!2026")
            user.save(update_fields=["password"])
        profile, _ = Profile.objects.get_or_create(user=user)
        if created:
            profile.goal = "Общаться в путешествиях и на работе"
            profile.level = "A2"
            profile.save()
        words = {
            "en": [
                ("tea", "чай"),
                ("journey", "путешествие"),
                ("ticket", "билет"),
                ("hotel", "отель"),
            ],
            "de": [
                ("Tee", "чай"),
                ("Reise", "путешествие"),
                ("Ticket", "билет"),
                ("Haus", "дом"),
            ],
            "ru": [
                ("чай", "tea"),
                ("путешествие", "journey"),
                ("билет", "ticket"),
                ("дом", "house"),
            ],
        }
        for language in words:
            LanguageProgress.objects.get_or_create(
                user=user, language=language, defaults={"level": "A2"}
            )
            for word, translation in words[language]:
                existing = VocabularyWord.objects.filter(
                    user=user, language=language, word__iexact=word
                ).first()
                if not existing:
                    VocabularyWord.objects.create(
                        user=user,
                        language=language,
                        word=word if language == "de" else word.casefold(),
                        translation=translation,
                    )
                elif language == "de" and existing.word != word:
                    existing.word = word
                    existing.save(update_fields=["word"])
            exercise = Exercise.objects.filter(
                language=language, is_placement=False, level="A2"
            ).first()
            if exercise:
                for day in range(3):
                    attempt, new = Attempt.objects.get_or_create(
                        user=user,
                        request_id=uuid5(
                            NAMESPACE_URL, f"linguabot-demo-{language}-{day}"
                        ),
                        defaults={
                            "exercise": exercise,
                            "answer": exercise.answer,
                            "is_correct": True,
                        },
                    )
                    if new:
                        Attempt.objects.filter(pk=attempt.pk).update(
                            created_at=timezone.now() - timedelta(days=day)
                        )
        runtime = settings.BASE_DIR / ".runtime"
        runtime.mkdir(exist_ok=True)
        (runtime / "demo-access.txt").write_text(
            "Учебный аккаунт с демонстрационными данными\nEmail: demo@linguabot.example\nПароль: LinguaDemo!2026\n",
            encoding="utf-8",
        )
        self.stdout.write(
            "Демонстрационный аккаунт готов. Данные для входа в .runtime/demo-access.txt."
        )
