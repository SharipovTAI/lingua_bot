from django.contrib import admin
from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from learning import views

urlpatterns = [
    path('', views.index, name='index'),
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/health/', views.HealthView.as_view()),
    path('api/v1/scenarios/', views.ScenarioListView.as_view()),
    path('api/v1/auth/register/', views.RegisterDraft.as_view()),
    path('api/v1/auth/login/', views.LoginDraft.as_view()),
    path('api/v1/profile/', views.ProfileDraft.as_view()),
    path('api/v1/conversations/', views.ConversationsDraft.as_view()),
    path('api/v1/conversations/<int:conversation_id>/messages/', views.MessagesDraft.as_view()),
    path('api/v1/exercises/', views.ExercisesDraft.as_view()),
    path('api/v1/exercises/<int:exercise_id>/attempts/', views.AttemptsDraft.as_view()),
    path('api/v1/statistics/', views.StatisticsDraft.as_view()),
]
