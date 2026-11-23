import json
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from learning.services import probe_ai, AIProbeError


class Command(BaseCommand):
    help = 'Один короткий платный запрос к Apimira. Ключ не выводится.'

    def add_arguments(self, parser):
        parser.add_argument('--confirm-paid-request', action='store_true')

    def handle(self, *args, **options):
        if not options['confirm_paid_request']:
            raise CommandError('Добавьте --confirm-paid-request: проверка расходует токены')
        try:
            result = probe_ai()
        except (AIProbeError, ValueError) as exc:
            raise CommandError(str(exc)) from None
        result['checked_at'] = timezone.now().isoformat()
        folder = settings.BASE_DIR / '.runtime'
        folder.mkdir(exist_ok=True)
        (folder / 'ai_probe.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        self.stdout.write(json.dumps(result, ensure_ascii=False, indent=2))
