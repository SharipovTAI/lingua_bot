from django.conf import settings
from django.http import FileResponse, HttpResponse


def frontend(request):
    index = settings.FRONTEND_DIST / 'index.html'
    if not index.exists():
        return HttpResponse('Сначала выполните сборку frontend: npm ci и npm run build.', status=503, content_type='text/plain; charset=utf-8')
    response = FileResponse(index.open('rb'), content_type='text/html; charset=utf-8')
    response['Cache-Control'] = 'no-cache'
    return response
