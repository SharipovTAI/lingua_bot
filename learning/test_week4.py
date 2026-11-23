from uuid import uuid4
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Attempt, Exercise, PlacementResult, Profile, VocabularyWord, WordReview


class Week4Tests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_exercises', verbosity=0)
        cls.alice = User.objects.create_user(username='week4-alice')
        cls.bob = User.objects.create_user(username='week4-bob')
        Profile.objects.create(user=cls.alice)
        Profile.objects.create(user=cls.bob)
        cls.token = Token.objects.create(user=cls.alice).key
        cls.other_token = Token.objects.create(user=cls.bob).key

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token)
        self.exercise = Exercise.objects.get(code='a1-want')

    def attempt(self, exercise=None, answer='want', request_id=None):
        exercise = exercise or self.exercise
        return self.client.post(f'/api/v1/exercises/{exercise.id}/attempts/', {
            'answer': answer, 'request_id': request_id or str(uuid4()),
        }, format='json')

    def placement(self, correct=4, request_id=None):
        questions = Exercise.objects.filter(is_placement=True).order_by('id')
        return self.client.post('/api/v1/placement/', {
            'request_id': request_id or str(uuid4()),
            'answers': [{'exercise_id': item.id, 'answer': item.answer if index < correct else 'wrong'}
                        for index, item in enumerate(questions)],
        }, format='json')

    def word(self, user=None):
        return VocabularyWord.objects.create(user=user or self.alice, word='tea', translation='чай')

    def review(self, word, answer='чай', request_id=None):
        return self.client.post(f'/api/v1/vocabulary/{word.id}/reviews/', {
            'answer': answer, 'request_id': request_id or str(uuid4()),
        }, format='json')

    def test_seed_is_repeatable_and_keeps_attempts(self):
        self.attempt()
        call_command('seed_exercises', verbosity=0)
        self.assertEqual(Exercise.objects.count(), 30)
        self.assertEqual(Exercise.objects.filter(is_placement=True).count(), 10)
        self.assertEqual(Attempt.objects.count(), 1)

    def test_new_endpoints_require_authentication(self):
        self.client.credentials()
        for path in ['/placement/', '/exercises/', '/vocabulary/', '/vocabulary/review/', '/statistics/']:
            self.assertEqual(self.client.get('/api/v1' + path).status_code, 401)
        for path in ['/placement/', '/exercises/1/attempts/', '/vocabulary/', '/vocabulary/1/reviews/']:
            self.assertEqual(self.client.post('/api/v1' + path, {}, format='json').status_code, 401)

    def test_questions_hide_answers(self):
        for path in ['/placement/', '/exercises/']:
            response = self.client.get('/api/v1' + path)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json())
            for item in response.json():
                self.assertNotIn('answer', item)
                self.assertNotIn('explanation', item)
                self.assertEqual(len(item['options']), 3)

    def test_placement_sets_profile_and_is_idempotent(self):
        key = str(uuid4())
        result = self.placement(correct=4, request_id=key)
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.json()['level'], 'B1')
        self.assertEqual(Profile.objects.get(user=self.alice).level, 'B1')
        self.assertEqual(self.placement(correct=4, request_id=key).status_code, 200)
        self.assertEqual(PlacementResult.objects.count(), 1)
        self.assertEqual(self.placement(correct=5, request_id=key).status_code, 400)

    def test_placement_score_boundaries(self):
        for score, level in [(0, 'A1'), (1, 'A1'), (2, 'A2'), (3, 'A2'), (6, 'B2'), (8, 'C1'), (10, 'C1')]:
            result = self.placement(score)
            self.assertEqual(result.json()['level'], level)
            self.assertEqual(result.json()['score'], score)

    def test_partial_duplicate_and_foreign_placement_questions_are_rejected(self):
        question = Exercise.objects.filter(is_placement=True).first()
        for answers in [
            [{'exercise_id': question.id, 'answer': 'x'}],
            [{'exercise_id': question.id, 'answer': 'x'}] * 10,
            [{'exercise_id': item, 'answer': 'x'} for item in range(9990, 10000)],
        ]:
            response = self.client.post('/api/v1/placement/', {'request_id': str(uuid4()), 'answers': answers}, format='json')
            self.assertEqual(response.status_code, 400)
        self.assertEqual(PlacementResult.objects.count(), 0)
        self.assertEqual(Profile.objects.get(user=self.alice).level, 'A1')

    def test_old_placement_retry_does_not_override_new_level(self):
        key = str(uuid4())
        self.placement(0, key)
        self.placement(10)
        self.placement(0, key)
        self.assertEqual(Profile.objects.get(user=self.alice).level, 'C1')

    def test_exercises_follow_level_and_kind(self):
        self.placement(4)
        response = self.client.get('/api/v1/exercises/?kind=grammar')
        self.assertTrue(response.json())
        self.assertTrue(all(item['level'] == 'B1' and item['kind'] == 'grammar' for item in response.json()))
        self.assertEqual(self.client.get('/api/v1/exercises/?kind=unknown').status_code, 400)

    def test_normalized_answers_and_repeated_delivery(self):
        key = str(uuid4())
        response = self.attempt(answer='  WANT  ', request_id=key)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['is_correct'])
        self.assertEqual(response.json()['correct_answer'], 'want')
        self.assertTrue(response.json()['explanation'])
        self.assertEqual(self.attempt(answer='  WANT  ', request_id=key).status_code, 200)
        self.assertEqual(self.attempt(answer='wants', request_id=key).status_code, 400)
        self.assertEqual(Attempt.objects.count(), 1)

    def test_invalid_attempts_do_not_persist(self):
        for data in [{}, {'answer': '', 'request_id': str(uuid4())}, {'answer': 'x', 'request_id': 'bad'}]:
            response = self.client.post(f'/api/v1/exercises/{self.exercise.id}/attempts/', data, format='json')
            self.assertEqual(response.status_code, 400)
        self.assertEqual(self.attempt(Exercise.objects.filter(is_placement=True).first()).status_code, 404)
        self.assertEqual(Attempt.objects.count(), 0)

    def test_errors_prioritize_related_topic_and_mastery_removes_priority(self):
        exercise = Exercise.objects.get(code='a1-dog')
        self.attempt(exercise, 'wrong')
        self.assertEqual(self.client.get('/api/v1/exercises/').json()[0]['topic'], 'animals')
        self.attempt(exercise, 'собака')
        self.assertEqual(self.client.get('/api/v1/exercises/').json()[0]['id'], self.exercise.id)

    def test_vocabulary_normalization_and_duplicate_post(self):
        data = {'word': '  TEA  ', 'translation': 'чай'}
        first = self.client.post('/api/v1/vocabulary/', data, format='json')
        second = self.client.post('/api/v1/vocabulary/', data, format='json')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()['word'], 'tea')
        self.assertEqual(VocabularyWord.objects.count(), 1)
        self.assertEqual(self.client.post('/api/v1/vocabulary/', {'word': 'tea', 'translation': 'кофе'}, format='json').status_code, 400)

    def test_legacy_words_are_supported(self):
        VocabularyWord.objects.create(user=self.alice, word=' TEA ', translation='чай')
        self.assertEqual(self.client.post('/api/v1/vocabulary/', {'word': 'tea', 'translation': 'чай'}, format='json').status_code, 200)
        self.assertEqual(VocabularyWord.objects.count(), 1)

    def test_other_user_words_are_private(self):
        word = self.word(user=self.bob)
        self.assertEqual(self.client.get('/api/v1/vocabulary/').json(), [])
        self.assertEqual(self.client.patch(f'/api/v1/vocabulary/{word.id}/', {'translation': 'x'}, format='json').status_code, 404)
        self.assertEqual(self.review(word).status_code, 404)
        self.assertEqual(self.client.delete(f'/api/v1/vocabulary/{word.id}/').status_code, 404)

    def test_due_cards_hide_translation_and_correct_review_schedules(self):
        word = self.word()
        cards = self.client.get('/api/v1/vocabulary/review/').json()
        self.assertEqual(len(cards), 1)
        self.assertNotIn('translation', cards[0])
        key = str(uuid4())
        result = self.review(word, ' ЧАЙ ', key)
        self.assertEqual(result.status_code, 201)
        self.assertTrue(result.json()['is_correct'])
        word.refresh_from_db()
        self.assertEqual(word.streak, 1)
        self.assertTrue(timezone.now() + timedelta(hours=23) < word.next_review < timezone.now() + timedelta(hours=25))
        self.assertEqual(self.client.get('/api/v1/vocabulary/review/').json(), [])
        self.assertEqual(self.review(word, ' ЧАЙ ', key).status_code, 200)
        self.assertEqual(self.review(word).status_code, 400)
        self.assertEqual(WordReview.objects.count(), 1)

    def test_wrong_review_is_due_after_one_hour(self):
        word = self.word()
        self.assertFalse(self.review(word, 'кофе').json()['is_correct'])
        word.refresh_from_db()
        self.assertEqual(word.streak, 0)
        with patch('learning.practice.timezone.now', return_value=timezone.now() + timedelta(hours=2)):
            self.assertEqual(len(self.client.get('/api/v1/vocabulary/review/').json()), 1)

    def test_word_edit_resets_schedule_and_delete_works(self):
        word = self.word()
        self.review(word)
        result = self.client.patch(f'/api/v1/vocabulary/{word.id}/', {'translation': 'напиток'}, format='json')
        self.assertEqual(result.status_code, 200)
        self.assertIsNone(result.json()['next_review'])
        self.assertEqual(result.json()['streak'], 0)
        self.assertEqual(self.client.delete(f'/api/v1/vocabulary/{word.id}/').status_code, 204)

    def test_statistics_is_personal_and_counts_unique_completions(self):
        self.attempt(answer='wants')
        self.attempt()
        self.attempt()
        Attempt.objects.create(user=self.bob, exercise=self.exercise, answer='want', is_correct=True)
        self.review(self.word())
        stats = self.client.get('/api/v1/statistics/').json()
        self.assertEqual(stats['attempts'], 3)
        self.assertEqual(stats['correct'], 2)
        self.assertEqual(stats['completed_exercises'], 1)
        self.assertEqual(stats['accuracy'], 66.7)
        self.assertEqual(stats['word_reviews'], 1)
        self.assertEqual(stats['words_due'], 0)
        self.assertEqual(stats['by_kind']['grammar'], {'attempts': 3, 'correct': 2})

    def test_empty_statistics_and_no_paid_calls(self):
        with patch('learning.tutor.requests.post') as upstream:
            stats = self.client.get('/api/v1/statistics/').json()
            self.placement()
            self.attempt()
            self.review(self.word())
        self.assertEqual(stats['accuracy'], 0.0)
        self.assertIsNone(stats['placement'])
        upstream.assert_not_called()
