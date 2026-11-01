import os
from unittest.mock import patch, Mock
from django.contrib.auth.models import User
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase, SimpleTestCase
from rest_framework.test import APIClient
from .models import Profile, Scenario, Conversation, Message, VocabularyWord
from .services import probe_ai, AIProbeError


class BackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_checks_database(self):
        response = self.client.get('/api/v1/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['database'], 'sqlite')

    def test_seed_is_repeatable_and_api_reads_database(self):
        call_command('seed_scenarios', verbosity=0)
        call_command('seed_scenarios', verbosity=0)
        self.assertEqual(Scenario.objects.count(), 5)
        Scenario.objects.filter(slug='cafe').update(title='Изменено в базе')
        response = self.client.get('/api/v1/scenarios/')
        self.assertEqual(len(response.json()), 5)
        self.assertIn('Изменено в базе', [item['title'] for item in response.json()])

    def test_draft_does_not_register_or_issue_token(self):
        response = self.client.post('/api/v1/auth/register/', {'email': 'test@example.com', 'password': 'password123'})
        self.assertEqual(response.status_code, 501)
        self.assertEqual(User.objects.count(), 0)

    def test_draft_message_does_not_call_paid_api(self):
        with patch('learning.services.requests.post') as upstream:
            response = self.client.post('/api/v1/conversations/1/messages/', {'content': 'Hello'})
        self.assertEqual(response.status_code, 501)
        upstream.assert_not_called()

    def test_related_records_are_removed_with_user(self):
        user = User.objects.create_user(username='demo')
        Profile.objects.create(user=user)
        scenario = Scenario.objects.create(slug='test', title='Test', description='Test')
        conversation = Conversation.objects.create(user=user, scenario=scenario)
        Message.objects.create(conversation=conversation, role='user', content='Hello')
        user.delete()
        self.assertEqual(Message.objects.count(), 0)
        self.assertEqual(Profile.objects.count(), 0)
        self.assertEqual(Scenario.objects.count(), 1)

    def test_unique_word_per_user(self):
        user = User.objects.create_user(username='demo')
        VocabularyWord.objects.create(user=user, word='hello', translation='привет')
        with self.assertRaises(IntegrityError), transaction.atomic():
            VocabularyWord.objects.create(user=user, word='hello', translation='здравствуйте')

    def test_cors_allows_react_but_not_other_origins(self):
        for origin, allowed in [('http://localhost:5173', True), ('https://unknown.example', False)]:
            response = self.client.options('/api/v1/health/', HTTP_ORIGIN=origin, HTTP_ACCESS_CONTROL_REQUEST_METHOD='GET')
            self.assertEqual('Access-Control-Allow-Origin' in response, allowed)


class AIProbeTests(SimpleTestCase):
    def test_missing_key_stops_before_network(self):
        with patch.dict(os.environ, {'APIMIRA_API_KEY': ''}), patch('learning.services.requests.post') as upstream:
            with self.assertRaises(AIProbeError):
                probe_ai()
            upstream.assert_not_called()

    def test_report_does_not_treat_provider_usage_as_verified_limit(self):
        body = {'choices': [{'message': {'content': 'OK'}}], 'usage': {'prompt_tokens': 10, 'completion_tokens': 500, 'total_tokens': 510}}
        response = Mock(status_code=200)
        response.json.return_value = body
        with patch.dict(os.environ, {'APIMIRA_API_KEY': 'test-only', 'APIMIRA_MAX_TOKENS': '200'}), patch('learning.services.requests.post', return_value=response) as upstream:
            result = probe_ai()
        self.assertFalse(result['limit_verified'])
        self.assertEqual(upstream.call_args.kwargs['json']['max_completion_tokens'], 200)

    def test_api_error_does_not_expose_secret_or_body(self):
        with patch.dict(os.environ, {'APIMIRA_API_KEY': 'secret-test'}), patch('learning.services.requests.post', return_value=Mock(status_code=401)):
            with self.assertRaisesMessage(AIProbeError, 'HTTP 401'):
                probe_ai()

    def test_paid_probe_requires_explicit_flag(self):
        with self.assertRaisesMessage(Exception, '--confirm-paid-request'), patch('learning.services.requests.post') as upstream:
            call_command('check_ai')
        upstream.assert_not_called()
