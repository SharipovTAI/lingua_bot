from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Profile, Scenario, Conversation, Message


PASSWORD = 'River!Maple47_Sky'


class WeekTwoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.alice = User.objects.create_user(username='alice@example.com', email='alice@example.com', password=PASSWORD)
        cls.bob = User.objects.create_user(username='bob@example.com', email='bob@example.com', password=PASSWORD)
        Profile.objects.create(user=cls.alice)
        Profile.objects.create(user=cls.bob, level='B1', goal='Work')
        cls.alice_token = Token.objects.create(user=cls.alice)
        cls.bob_token = Token.objects.create(user=cls.bob)
        cls.scenario = Scenario.objects.create(slug='cafe', title='Кафе', description='Заказ в кафе')
        cls.conversation = Conversation.objects.create(user=cls.alice, scenario=cls.scenario)

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def as_user(self, user='alice'):
        token = self.alice_token if user == 'alice' else self.bob_token
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)

    def test_registration_creates_hashed_password_and_default_profile(self):
        result = self.client.post('/api/v1/auth/register/', {'email': 'New@Example.com', 'password': PASSWORD})
        self.assertEqual(result.status_code, 201)
        self.assertEqual(set(result.json()['user']), {'id', 'email'})
        user = User.objects.get(username='new@example.com')
        self.assertNotEqual(user.password, PASSWORD)
        self.assertTrue(user.check_password(PASSWORD))
        self.assertEqual(user.profile.level, 'A1')
        self.assertEqual(user.profile.language, 'en')

    def test_case_insensitive_duplicate_is_rejected(self):
        count = User.objects.count()
        result = self.client.post('/api/v1/auth/register/', {'email': 'ALICE@EXAMPLE.COM', 'password': PASSWORD})
        self.assertEqual(result.status_code, 400)
        self.assertEqual(User.objects.count(), count)

    def test_invalid_email_and_weak_password_are_rejected(self):
        for data in [{'email': 'not-an-email', 'password': PASSWORD}, {'email': 'new@example.com', 'password': '12345678'}]:
            self.assertEqual(self.client.post('/api/v1/auth/register/', data).status_code, 400)
        self.assertEqual(User.objects.count(), 2)

    def test_email_longer_than_username_capacity_is_rejected(self):
        result = self.client.post('/api/v1/auth/register/', {'email': 'x'*64+'@'+'y'*63+'.'+'z'*25+'.com', 'password': PASSWORD})
        self.assertEqual(result.status_code, 400)

    def test_login_accepts_uppercase_email_and_returns_usable_token(self):
        result = self.client.post('/api/v1/auth/login/', {'email': 'ALICE@example.com', 'password': PASSWORD})
        self.assertEqual(result.status_code, 200)
        self.assertNotIn('password', result.json()['user'])
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + result.json()['token'])
        self.assertEqual(self.client.get('/api/v1/profile/').status_code, 200)

    def test_wrong_password_or_unknown_user_get_same_error(self):
        known = self.client.post('/api/v1/auth/login/', {'email': 'alice@example.com', 'password': 'wrong'})
        unknown = self.client.post('/api/v1/auth/login/', {'email': 'unknown@example.com', 'password': 'wrong'})
        self.assertEqual(known.status_code, 401)
        self.assertEqual(unknown.status_code, 401)
        self.assertEqual(known.json(), unknown.json())

    def test_inactive_user_cannot_login_or_use_old_token(self):
        self.alice.is_active = False
        self.alice.save(update_fields=['is_active'])
        result = self.client.post('/api/v1/auth/login/', {'email': 'alice@example.com', 'password': PASSWORD})
        self.assertEqual(result.status_code, 401)
        self.as_user()
        self.assertEqual(self.client.get('/api/v1/profile/').status_code, 401)

    def test_protected_routes_reject_missing_token(self):
        for path in ['/profile/', '/conversations/', f'/conversations/{self.conversation.id}/messages/']:
            self.assertEqual(self.client.get('/api/v1'+path).status_code, 401)
        self.assertEqual(self.client.post('/api/v1/conversations/', {'scenario_id': self.scenario.id}).status_code, 401)

    def test_invalid_token_is_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token not-a-real-token')
        self.assertEqual(self.client.get('/api/v1/profile/').status_code, 401)

    def test_profile_partial_update_is_persistent_and_owned(self):
        self.as_user()
        result = self.client.patch('/api/v1/profile/', {'goal': 'Travel', 'level': 'A2', 'user': self.bob.id}, format='json')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json(), {'goal': 'Travel', 'level': 'A2', 'language': 'en'})
        self.alice.profile.refresh_from_db()
        self.bob.profile.refresh_from_db()
        self.assertEqual(self.alice.profile.goal, 'Travel')
        self.assertEqual(self.bob.profile.goal, 'Work')

    def test_invalid_profile_update_does_not_change_database(self):
        self.as_user()
        for data in [{'level': 'C9'}, {'language': 'de'}, {'goal': 'x'*201}]:
            self.assertEqual(self.client.patch('/api/v1/profile/', data, format='json').status_code, 400)
        self.alice.profile.refresh_from_db()
        self.assertEqual(self.alice.profile.level, 'A1')

    def test_profile_is_created_for_legacy_user(self):
        self.alice.profile.delete()
        self.as_user()
        self.assertEqual(self.client.get('/api/v1/profile/').status_code, 200)
        self.assertEqual(Profile.objects.filter(user=self.alice).count(), 1)

    def test_conversation_is_always_owned_by_authenticated_user(self):
        self.as_user()
        result = self.client.post('/api/v1/conversations/', {'scenario_id': self.scenario.id, 'user': self.bob.id}, format='json')
        self.assertEqual(result.status_code, 201)
        self.assertEqual(Conversation.objects.get(id=result.json()['id']).user_id, self.alice.id)

    def test_unknown_scenario_does_not_create_conversation(self):
        self.as_user()
        before = Conversation.objects.count()
        self.assertEqual(self.client.post('/api/v1/conversations/', {'scenario_id': 99999}).status_code, 400)
        self.assertEqual(Conversation.objects.count(), before)

    def test_conversation_list_and_detail_are_scoped(self):
        self.as_user('bob')
        self.assertEqual(self.client.get('/api/v1/conversations/').json(), [])
        self.assertEqual(self.client.get(f'/api/v1/conversations/{self.conversation.id}/').status_code, 404)
        self.as_user()
        self.assertEqual(len(self.client.get('/api/v1/conversations/').json()), 1)
        self.assertEqual(self.client.get(f'/api/v1/conversations/{self.conversation.id}/').status_code, 200)

    def test_message_is_saved_as_user_without_paid_call(self):
        self.as_user()
        with patch('learning.services.requests.post') as upstream:
            result = self.client.post(f'/api/v1/conversations/{self.conversation.id}/messages/', {'content': 'Hello!', 'role': 'assistant'}, format='json')
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.json()['user_message']['role'], 'user')
        self.assertIsNone(result.json()['assistant_message'])
        self.assertEqual(Message.objects.get().content, 'Hello!')
        upstream.assert_not_called()

    def test_messages_are_loaded_in_order_after_new_client_login(self):
        self.as_user()
        path = f'/api/v1/conversations/{self.conversation.id}/messages/'
        for text in ['Hello', 'A table for two, please.']:
            self.client.post(path, {'content': text})
        new_client = APIClient()
        login = new_client.post('/api/v1/auth/login/', {'email': 'alice@example.com', 'password': PASSWORD})
        new_client.credentials(HTTP_AUTHORIZATION='Token ' + login.json()['token'])
        history = new_client.get(path)
        self.assertEqual(history.status_code, 200)
        self.assertEqual([m['content'] for m in history.json()], ['Hello', 'A table for two, please.'])

    def test_other_user_cannot_read_or_write_messages(self):
        Message.objects.create(conversation=self.conversation, role='user', content='Private')
        self.as_user('bob')
        path = f'/api/v1/conversations/{self.conversation.id}/messages/'
        self.assertEqual(self.client.get(path).status_code, 404)
        self.assertEqual(self.client.post(path, {'content': 'Hacked'}).status_code, 404)
        self.assertEqual(Message.objects.count(), 1)

    def test_empty_or_oversized_message_is_not_saved(self):
        self.as_user()
        path = f'/api/v1/conversations/{self.conversation.id}/messages/'
        for content in ['', '   ', 'x'*2001]:
            self.assertEqual(self.client.post(path, {'content': content}).status_code, 400)
        self.assertEqual(Message.objects.count(), 0)

    def test_logout_revokes_token_and_next_login_gets_new_token(self):
        self.as_user()
        old_token = self.alice_token.key
        self.assertEqual(self.client.post('/api/v1/auth/logout/').status_code, 204)
        self.assertEqual(self.client.get('/api/v1/profile/').status_code, 401)
        self.client.credentials()
        result = self.client.post('/api/v1/auth/login/', {'email': 'alice@example.com', 'password': PASSWORD})
        self.assertNotEqual(result.json()['token'], old_token)

    def test_exercises_still_planned_but_auth_is_required(self):
        self.assertEqual(self.client.get('/api/v1/exercises/').status_code, 401)
        self.as_user()
        self.assertEqual(self.client.get('/api/v1/exercises/').status_code, 501)

    def test_login_throttle_limits_repeated_attempts(self):
        # Некорректная форма не вызывает хеширование пароля, но учитывается ограничителем.
        for _ in range(20):
            self.assertEqual(self.client.post('/api/v1/auth/login/', {}).status_code, 400)
        self.assertEqual(self.client.post('/api/v1/auth/login/', {}).status_code, 429)

    @override_settings(DEBUG=False)
    def test_demo_page_hidden_outside_debug(self):
        self.assertEqual(self.client.get('/dev/week2/').status_code, 404)
