import os
import requests


class AIProbeError(Exception):
    pass


def probe_ai():
    """Один платный запрос, только по явной команде разработчика."""
    key = os.getenv('APIMIRA_API_KEY', '')
    if not key:
        raise AIProbeError('APIMIRA_API_KEY не задан')
    base = os.getenv('APIMIRA_BASE_URL', 'https://apimira.com/v1').rstrip('/')
    if base != 'https://apimira.com/v1':
        raise AIProbeError('Для проверки разрешён только https://apimira.com/v1')
    model = os.getenv('APIMIRA_MODEL', 'deepseek/deepseek-v4-flash')
    limit = max(1, min(int(os.getenv('APIMIRA_MAX_TOKENS', '200')), 200))
    timeout = max(1, min(int(os.getenv('APIMIRA_TIMEOUT_SECONDS', '20')), 30))
    try:
        response = requests.post(
            base + '/chat/completions',
            headers={'Authorization': f'Bearer {key}'},
            json={
                'model': model,
                'messages': [{'role': 'user', 'content': 'Reply with only: OK'}],
                'max_completion_tokens': limit,
            },
            timeout=(5, timeout),
        )
    except requests.RequestException:
        raise AIProbeError('Не удалось связаться с Apimira; проверьте сеть и повторите вручную') from None
    if response.status_code != 200:
        # Не выводим тело ошибки: оно может содержать данные запроса.
        raise AIProbeError(f'Apimira вернул HTTP {response.status_code}')
    try:
        body = response.json()
        answer = body['choices'][0]['message']['content']
        usage = body.get('usage', {})
        counts = {name: int(usage.get(name, 0)) for name in ('prompt_tokens', 'completion_tokens', 'total_tokens')}
    except (ValueError, KeyError, IndexError, TypeError):
        raise AIProbeError('Неожиданный формат ответа Apimira') from None
    if not isinstance(answer, str) or not answer.strip():
        raise AIProbeError('Модель вернула пустой ответ')
    return {
        'status': 'ok', 'http_status': 200, 'model': model,
        'reply': answer.replace(key, '[hidden]')[:200],
        'requested_limit': limit, 'usage': counts,
        'limit_verified': counts['completion_tokens'] > 0 and counts['completion_tokens'] <= limit,
    }
