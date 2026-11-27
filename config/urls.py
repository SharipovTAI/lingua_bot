from django.contrib import admin
from django.urls import path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from learning import views, practice_views, extra_views
from learning.web import frontend

urlpatterns = [
    path('', frontend, name='index'),
    path('dev/week2/', views.week2_demo, name='week2-demo'),
    path('dev/backend/', views.index),
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/health/', views.HealthView.as_view()),
    path('api/v1/scenarios/', views.ScenarioListView.as_view()),
    path('api/v1/auth/register/', views.RegisterView.as_view()),
    path('api/v1/auth/login/', views.LoginView.as_view()),
    path('api/v1/auth/logout/', views.LogoutView.as_view()),
    path('api/v1/profile/', views.ProfileView.as_view()),
    path('api/v1/conversations/', views.ConversationsView.as_view()),
    path('api/v1/conversations/<int:conversation_id>/', views.ConversationDetailView.as_view()),
    path('api/v1/conversations/<int:conversation_id>/messages/', views.MessagesView.as_view()),
    path('api/v1/exercises/', practice_views.ExercisesView.as_view()),
    path('api/v1/exercises/<int:exercise_id>/attempts/', practice_views.AttemptsView.as_view()),
    path('api/v1/placement/', practice_views.PlacementView.as_view()),
    path('api/v1/vocabulary/', practice_views.VocabularyView.as_view()),
    path('api/v1/vocabulary/review/', practice_views.ReviewListView.as_view()),
    path('api/v1/vocabulary/<int:word_id>/', practice_views.VocabularyDetailView.as_view()),
    path('api/v1/vocabulary/<int:word_id>/reviews/', practice_views.ReviewView.as_view()),
    path('api/v1/dictionary/lookup/', extra_views.DictionaryLookupView.as_view()),
    path('api/v1/notes/', extra_views.NotesView.as_view()),
    path('api/v1/notes/<int:pk>/', extra_views.NoteDetailView.as_view()),
    path('api/v1/statistics/', practice_views.StatisticsView.as_view()),
    re_path(r'^(?!api/|admin/|static/|dev/).*$', frontend),
]
