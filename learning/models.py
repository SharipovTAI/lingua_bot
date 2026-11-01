from django.conf import settings
from django.db import models


LEVELS = [('A1', 'A1'), ('A2', 'A2'), ('B1', 'B1'), ('B2', 'B2'), ('C1', 'C1')]


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    level = models.CharField(max_length=2, choices=LEVELS, default='A1')
    goal = models.CharField(max_length=200, blank=True)
    language = models.CharField(max_length=10, default='en')


class Scenario(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=100)
    description = models.TextField()

    def __str__(self):
        return self.title


class Conversation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    scenario = models.ForeignKey(Scenario, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=[('user', 'user'), ('assistant', 'assistant')])
    content = models.TextField()
    feedback = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']


class Exercise(models.Model):
    title = models.CharField(max_length=200)
    level = models.CharField(max_length=2, choices=LEVELS)
    kind = models.CharField(max_length=20, choices=[('grammar', 'Грамматика'), ('vocabulary', 'Лексика')])
    question = models.TextField()
    answer = models.TextField()


class Attempt(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    answer = models.TextField()
    is_correct = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)


class VocabularyWord(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    word = models.CharField(max_length=100)
    translation = models.CharField(max_length=200)
    next_review = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'word'], name='unique_user_word')]
