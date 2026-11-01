from django.contrib import admin
from .models import Profile, Scenario, Conversation, Message, Exercise, Attempt, VocabularyWord

for model in (Profile, Scenario, Conversation, Message, Exercise, Attempt, VocabularyWord):
    admin.site.register(model)
