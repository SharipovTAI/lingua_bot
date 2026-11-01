from django.core.management.base import BaseCommand
from learning.models import Scenario

SCENARIOS = [
    ('introduction', 'Знакомство', 'Представиться и рассказать о себе.'),
    ('cafe', 'Кафе', 'Заказать напиток и уточнить стоимость.'),
    ('shop', 'Магазин', 'Выбрать товар и спросить о размере.'),
    ('hotel', 'Гостиница', 'Заселиться и узнать условия проживания.'),
    ('directions', 'Ориентирование в городе', 'Спросить дорогу и понять ответ.'),
]


class Command(BaseCommand):
    help = 'Добавить пять справочных сценариев. Не создаёт диалоги и ответы ИИ.'

    def handle(self, *args, **options):
        for slug, title, description in SCENARIOS:
            Scenario.objects.update_or_create(slug=slug, defaults={'title': title, 'description': description})
        self.stdout.write(f'Сценариев в SQLite: {Scenario.objects.count()}')
