import os
from unittest.mock import Mock, patch

import requests
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Conversation, Message, Profile, Scenario
from .tutor import SCENARIO_ROLES


class TutorTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='student')
        Profile.objects.create(user=cls.user, level='B1')
        cls.scenario = Scenario.objects.create(slug='cafe', title='Кафе')
        cls.chat = Conversation.objects.create(user=cls.user, scenario=cls.scenario)
        cls.token = Token.objects.create(user=cls.user)

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.path = f'/api/v1/conversations/{self.chat.pk}/messages/'
        env = patch.dict(os.environ, {'APIMIRA_API_KEY': 'test-key', 'APIMIRA_BASE_URL': 'https://apimira.com/v1', 'APIMIRA_MAX_TOKENS': '200', 'APIMIRA_TIMEOUT_SECONDS': '20'})
        env.start()
        self.addCleanup(env.stop)
        upstream = patch('learning.tutor.requests.post')
        self.upstream = upstream.start()
        self.addCleanup(upstream.stop)

    def respond(self, content):
        self.upstream.return_value = Mock(status_code=200)
        self.upstream.return_value.json.return_value = {'choices': [{'message': {'content': content}}]}

    def test_context_is_bounded_ordered_and_private(self):
        other = Conversation.objects.create(user=self.user, scenario=self.scenario)
        Message.objects.create(conversation=other, role='user', content='Private other chat')
        for i in range(8):
            Message.objects.create(conversation=self.chat, role='user' if i % 2 == 0 else 'assistant', content=f'Turn {i}')
        self.respond('{"reply":"What would you like?","feedback":[]}')
        result = self.client.post(self.path, {'content': 'Tea, please.'})
        self.assertEqual(result.status_code, 201)
        self.upstream.assert_called_once()
        data = self.upstream.call_args.kwargs
        self.assertEqual(data['json']['max_completion_tokens'], 200)
        self.assertFalse(data['allow_redirects'])
        messages = data['json']['messages']
        self.assertIn('B1', messages[0]['content'])
        self.assertIn(SCENARIO_ROLES['cafe'], messages[0]['content'])
        self.assertEqual([m['content'] for m in messages[1:]], [f'Turn {i}' for i in range(2, 8)] + ['Tea, please.'])

    def test_correction_persists_with_assistant_message(self):
        self.respond('{"reply":"What would you like to order?","feedback":[{"original":"I wants","corrected":"I want","explanation":"С I нужен want."}]}')
        result = self.client.post(self.path, {'content': 'I wants tea.'})
        self.assertEqual(result.status_code, 201)
        self.assertEqual(result.json()['feedback'][0]['corrected'], 'I want')
        rows = self.client.get(self.path).json()
        self.assertEqual([m['role'] for m in rows], ['user', 'assistant'])
        self.assertEqual(rows[1]['feedback']['corrections'], result.json()['feedback'])

    def test_unrelated_correction_is_not_shown(self):
        self.respond('{"reply":"Sure!","feedback":[{"original":"not in message","corrected":"another","explanation":"..."}]}')
        result = self.client.post(self.path, {'content': 'Tea, please.'})
        self.assertEqual(result.json()['feedback'], [])

    def test_timeout_does_not_persist_or_retry(self):
        self.upstream.side_effect = requests.Timeout
        result = self.client.post(self.path, {'content': 'Hello!'})
        self.assertEqual(result.status_code, 504)
        self.assertFalse(self.chat.messages.exists())
        self.upstream.assert_called_once()

    def test_provider_unavailable(self):
        self.upstream.return_value = Mock(status_code=503)
        self.assertEqual(self.client.post(self.path, {'content': 'Hello!'}).status_code, 503)
        self.assertFalse(self.chat.messages.exists())

    def test_unexpected_payload_does_not_persist(self):
        self.respond('not JSON and not suitable for a user')
        result = self.client.post(self.path, {'content': 'Hello!'})
        self.assertEqual(result.status_code, 502)
        self.assertNotIn('not JSON', result.json()['detail'])
        self.assertFalse(self.chat.messages.exists())

    def test_missing_key_does_not_call_provider(self):
        with patch.dict(os.environ, {'APIMIRA_API_KEY': ''}):
            self.assertEqual(self.client.post(self.path, {'content': 'Hello!'}).status_code, 503)
        self.upstream.assert_not_called()

    def test_no_access_does_not_call_provider(self):
        other = User.objects.create_user(username='other')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + Token.objects.create(user=other).key)
        self.assertEqual(self.client.post(self.path, {'content': 'Hello!'}).status_code, 404)
        self.upstream.assert_not_called()

    def test_throttle_does_not_call_provider(self):
        for _ in range(10):
            self.assertEqual(self.client.post(self.path, {'content': ''}).status_code, 400)
        self.assertEqual(self.client.post(self.path, {'content': 'Hello!'}).status_code, 429)
        self.assertEqual(self.client.get(self.path).status_code, 200)
        self.upstream.assert_not_called()
