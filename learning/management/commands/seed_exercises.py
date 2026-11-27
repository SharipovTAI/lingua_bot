from django.core.management.base import BaseCommand
from django.db import transaction
from learning.models import Exercise
from learning.question_bank import QUESTIONS
from learning.multilingual_bank import GERMAN, RUSSIAN


class Command(BaseCommand):
    help = "Добавить 90 заданий на трёх языках: 30 диагностических, 60 тренировочных."

    @transaction.atomic
    def handle(self, *args, **options):
        for language, bank in [("en", QUESTIONS), ("de", GERMAN), ("ru", RUSSIAN)]:
            for index, row in enumerate(bank):
                code, level, kind, topic, question, answer, distractors, explanation = (
                    row
                )
                choices = [answer, *distractors]
                offset = index % len(choices)
                choices = choices[offset:] + choices[:offset]
                placement = index % 6 < 2
                Exercise.objects.update_or_create(
                    code=code,
                    defaults={
                        "title": question,
                        "level": level,
                        "kind": kind,
                        "topic": topic,
                        "question": question,
                        "answer": answer,
                        "options": []
                        if placement and kind == "vocabulary"
                        else choices,
                        "explanation": explanation,
                        "is_placement": placement,
                        "language": language,
                    },
                )
        self.stdout.write(
            "Банк готов: три языка, по 10 вопросов теста и 20 упражнений."
        )
