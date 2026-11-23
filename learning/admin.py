from django.contrib import admin
from .models import Profile, Scenario, Conversation, Message, Exercise, Attempt, VocabularyWord, PlacementResult, WordReview

for model in (Profile, Scenario, Conversation, Message, Exercise, Attempt, VocabularyWord, PlacementResult, WordReview):
    admin.site.register(model)
