from django.core.management.base import BaseCommand
from django.db import transaction
from learning.models import Exercise
from learning.question_bank import QUESTIONS


class Command(BaseCommand):
    help = 'Добавить 30 заданий: 10 диагностических и 20 тренировочных.'

    @transaction.atomic
    def handle(self, *args, **options):
        for index, row in enumerate(QUESTIONS):
            code, level, kind, topic, question, answer, distractors, explanation = row
            choices = [answer, *distractors]
            offset = index % len(choices)
            choices = choices[offset:] + choices[:offset]
            Exercise.objects.update_or_create(code=code, defaults={
                'title': question, 'level': level, 'kind': kind, 'topic': topic,
                'question': question, 'answer': answer, 'options': choices,
                'explanation': explanation, 'is_placement': index % 6 < 2,
            })
        self.stdout.write('Банк готов: 10 вопросов диагностики и 20 упражнений.')
