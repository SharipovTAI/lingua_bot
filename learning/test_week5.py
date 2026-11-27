from uuid import uuid4
from datetime import timedelta
from unittest.mock import Mock, patch

import requests
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from .models import (
    Profile,
    Exercise,
    Attempt,
    VocabularyWord,
    PlacementResult,
    Message,
    Scenario,
    Conversation,
    AchievementAward,
)
from .progress import activity_summary


class Week5Tests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_scenarios", verbosity=0)
        call_command("seed_exercises", verbosity=0)
        cls.user = User.objects.create_user(username="week5@example.com")
        Profile.objects.create(user=cls.user)
        cls.token = Token.objects.create(user=cls.user).key
        cls.other = User.objects.create_user(username="another@example.com")
        Profile.objects.create(user=cls.other)

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token)

    def switch(self, language, **kwargs):
        return self.client.patch(
            "/api/v1/profile/", {"language": language, **kwargs}, format="json"
        )

    def attempt(self, language="en", answer=None, request_id=None):
        exercise = Exercise.objects.filter(
            language=language, is_placement=False, level="A1"
        ).first()
        return self.client.post(
            f"/api/v1/exercises/{exercise.id}/attempts/",
            {
                "request_id": request_id or str(uuid4()),
                "answer": answer or exercise.answer,
            },
            format="json",
        )

    def test_ten_scenarios_and_banks_for_each_language(self):
        self.assertEqual(Scenario.objects.count(), 10)
        for language in ["en", "de", "ru"]:
            self.switch(language)
            questions = self.client.get("/api/v1/placement/").json()
            self.assertEqual(len(questions), 10)
            self.assertEqual(sum(not item["options"] for item in questions), 5)
            self.assertEqual(
                Exercise.objects.filter(language=language, is_placement=False).count(),
                20,
            )
            self.assertTrue(
                all(
                    item["language"] == language
                    for item in self.client.get("/api/v1/exercises/").json()
                )
            )

    def test_language_levels_are_independent(self):
        self.switch("en", level="B1")
        self.assertEqual(self.switch("de").json()["level"], "A1")
        self.switch("de", level="A2")
        self.assertEqual(self.switch("en").json()["level"], "B1")
        self.assertEqual(self.switch("de").json()["level"], "A2")

    def test_placement_and_statistics_are_language_specific(self):
        for language, correct in [("de", 2), ("ru", 4)]:
            self.switch(language)
            questions = Exercise.objects.filter(
                language=language, is_placement=True
            ).order_by("id")
            result = self.client.post(
                "/api/v1/placement/",
                {
                    "request_id": str(uuid4()),
                    "answers": [
                        {
                            "exercise_id": q.id,
                            "answer": q.answer if i < correct else "wrong",
                        }
                        for i, q in enumerate(questions)
                    ],
                },
                format="json",
            )
            self.assertEqual(result.status_code, 201)
            self.assertEqual(result.json()["language"], language)
        self.assertEqual(self.switch("de").json()["level"], "A2")
        self.assertEqual(
            self.client.get("/api/v1/statistics/").json()["placement"]["score"], 2
        )
        self.switch("en")
        self.assertIsNone(self.client.get("/api/v1/statistics/").json()["placement"])

    def test_dictionary_and_attempts_do_not_mix_languages(self):
        self.attempt()
        self.client.post(
            "/api/v1/vocabulary/",
            {"word": "gift", "translation": "подарок"},
            format="json",
        )
        self.switch("de")
        self.assertEqual(self.client.get("/api/v1/vocabulary/").json(), [])
        word = self.client.post(
            "/api/v1/vocabulary/", {"word": "Gift", "translation": "яд"}, format="json"
        )
        self.assertEqual(word.status_code, 201)
        self.assertEqual(self.client.get("/api/v1/statistics/").json()["attempts"], 0)
        self.switch("en")
        self.assertEqual(
            self.client.get("/api/v1/vocabulary/").json()[0]["translation"], "подарок"
        )

    def test_conversation_keeps_original_language_and_paid_retry_is_idempotent(self):
        self.switch("de")
        chat = self.client.post(
            "/api/v1/conversations/",
            {"scenario_id": Scenario.objects.first().id},
            format="json",
        ).json()
        self.assertEqual(chat["language"], "de")
        self.switch("ru")
        response = Mock(status_code=200)
        response.json.return_value = {
            "choices": [
                {"message": {"content": '{"reply":"Guten Tag!","feedback":[]}'}}
            ]
        }
        body = {"content": "Hallo!", "request_id": str(uuid4())}
        with (
            patch.dict(
                "os.environ",
                {
                    "APIMIRA_API_KEY": "test",
                    "APIMIRA_BASE_URL": "https://apimira.com/v1",
                },
            ),
            patch("learning.tutor.requests.post", return_value=response) as upstream,
        ):
            path = f"/api/v1/conversations/{chat['id']}/messages/"
            self.assertEqual(
                self.client.post(path, body, format="json").status_code, 201
            )
            self.assertEqual(
                self.client.post(path, body, format="json").status_code, 200
            )
            self.assertEqual(
                self.client.post(
                    path, {**body, "content": "Different"}, format="json"
                ).status_code,
                400,
            )
            upstream.assert_called_once()
            self.assertIn(
                "German", upstream.call_args.kwargs["json"]["messages"][0]["content"]
            )
        self.assertEqual(Message.objects.count(), 2)
        self.assertEqual(self.client.get("/api/v1/conversations/").json(), [])

    def test_twenty_achievements_are_persistent_and_private(self):
        response = self.attempt()
        stats = self.client.get("/api/v1/statistics/").json()
        self.assertEqual(len(stats["achievements"]), 20)
        earned = next(
            item for item in stats["achievements"] if item["id"] == "first-exercise"
        )
        self.assertTrue(earned["unlocked"])
        self.assertTrue(earned["unlocked_at"])
        Attempt.objects.filter(id=response.json()["id"]).delete()
        stats = self.client.get("/api/v1/statistics/").json()
        self.assertTrue(
            next(
                item for item in stats["achievements"] if item["id"] == "first-exercise"
            )["unlocked"]
        )
        self.assertFalse(AchievementAward.objects.filter(user=self.other).exists())
        self.switch("de")
        self.assertFalse(
            next(
                item
                for item in self.client.get("/api/v1/statistics/").json()[
                    "achievements"
                ]
                if item["id"] == "first-exercise"
            )["unlocked"]
        )

    def test_daily_tasks_and_xp_use_server_records_without_replay_inflation(self):
        for _ in range(3):
            key = str(uuid4())
            self.attempt(request_id=key)
            self.attempt(request_id=key)
        stats = self.client.get("/api/v1/statistics/").json()
        self.assertEqual(stats["activity"]["today"]["attempt"], 3)
        self.assertEqual(stats["daily_tasks"][0]["count"], 3)
        self.assertEqual(stats["xp_today"], 20)
        self.assertEqual(stats["activity"]["streak"], 1)

    def test_chart_and_streak_date_boundaries(self):
        exercise = Exercise.objects.filter(language="en", is_placement=False).first()
        for day in [0, 1, 2]:
            item = Attempt.objects.create(
                user=self.user, exercise=exercise, answer="x", is_correct=False
            )
            Attempt.objects.filter(id=item.id).update(
                created_at=timezone.now() - timedelta(days=day)
            )
        result = activity_summary({"attempt": Attempt.objects.filter(user=self.user)})
        self.assertEqual(result["streak"], 3)
        self.assertEqual(result["weekTotal"], 3)
        self.assertEqual(len(result["week"]), 7)
        with patch(
            "learning.progress.timezone.localdate",
            return_value=timezone.localdate() + timedelta(days=2),
        ):
            self.assertEqual(
                activity_summary({"attempt": Attempt.objects.filter(user=self.user)})[
                    "streak"
                ],
                0,
            )

    def test_other_user_actions_do_not_inflate_chart(self):
        exercise = Exercise.objects.filter(is_placement=False).first()
        Attempt.objects.create(
            user=self.other, exercise=exercise, answer="x", is_correct=True
        )
        self.assertEqual(
            self.client.get("/api/v1/statistics/").json()["activity"]["weekTotal"], 0
        )

    def test_chat_correction_topic_prioritizes_practice(self):
        exercise = Exercise.objects.get(code="a1-dog")
        chat = Conversation.objects.create(
            user=self.user, scenario=Scenario.objects.first()
        )
        Message.objects.create(
            conversation=chat,
            role="assistant",
            content="Correction",
            feedback={
                "corrections": [
                    {
                        "original": "dog",
                        "corrected": "a dog",
                        "explanation": "An article",
                        "topic": "animals",
                    }
                ]
            },
        )
        self.assertEqual(
            self.client.get("/api/v1/exercises/").json()[0]["topic"], exercise.topic
        )

    def test_external_dictionary_result_cached_and_html_cleaned(self):
        translation = Mock(status_code=200)
        translation.json.return_value = {
            "responseStatus": 200,
            "responseData": {"translatedText": "дом"},
        }
        entry = Mock(status_code=200)
        entry.json.return_value = {
            "de": [
                {
                    "definitions": [
                        {
                            "definition": "<b>house</b>",
                            "examples": [{"text": "Ein Haus."}],
                        }
                    ]
                }
            ]
        }
        self.switch("de")
        with patch(
            "learning.dictionary.requests.get", side_effect=[translation, entry]
        ) as upstream:
            result = self.client.get("/api/v1/dictionary/lookup/?word=Haus")
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.json()["translation"], "дом")
            self.assertEqual(result.json()["definitions"], ["house"])
            self.assertEqual(result.json()["examples"], ["Ein Haus."])
            self.client.get("/api/v1/dictionary/lookup/?word=Haus")
            self.assertEqual(upstream.call_count, 2)

    def test_external_service_failure_is_controlled(self):
        with patch("learning.dictionary.requests.get", side_effect=requests.Timeout):
            self.assertEqual(
                self.client.get("/api/v1/dictionary/lookup/?word=house").status_code,
                503,
            )
        self.assertEqual(
            self.client.get(
                "/api/v1/dictionary/lookup/?word=house&target=en"
            ).status_code,
            400,
        )

    def test_notes_are_saved_and_private(self):
        result = self.client.post(
            "/api/v1/notes/",
            {"title": "Rule", "content": "Practice every day"},
            format="json",
        )
        self.assertEqual(result.status_code, 201)
        pk = result.json()["id"]
        self.assertEqual(len(self.client.get("/api/v1/notes/").json()), 1)
        self.switch("de")
        self.assertEqual(self.client.get("/api/v1/notes/").json(), [])
        self.client.credentials(
            HTTP_AUTHORIZATION="Token " + Token.objects.create(user=self.other).key
        )
        self.assertEqual(self.client.get(f"/api/v1/notes/{pk}/").status_code, 404)
        self.assertEqual(
            self.client.patch(
                f"/api/v1/notes/{pk}/", {"title": "Hacked"}, format="json"
            ).status_code,
            404,
        )

    def test_demo_seed_is_repeatable(self):
        call_command("seed_demo", verbosity=0)
        before = Attempt.objects.count(), VocabularyWord.objects.count()
        call_command("seed_demo", verbosity=0)
        self.assertEqual(
            before, (Attempt.objects.count(), VocabularyWord.objects.count())
        )

    def test_german_nouns_keep_capitalization_without_duplicate_words(self):
        self.switch("de")
        result = self.client.post(
            "/api/v1/vocabulary/", {"word": "Haus", "translation": "дом"}, format="json"
        )
        self.assertEqual(result.json()["word"], "Haus")
        repeat = self.client.post(
            "/api/v1/vocabulary/", {"word": "haus", "translation": "дом"}, format="json"
        )
        self.assertEqual(repeat.status_code, 200)
        self.assertEqual(VocabularyWord.objects.filter(user=self.user).count(), 1)

    def test_tool_call_reply_is_validated_and_saved(self):
        import json

        chat = Conversation.objects.create(
            user=self.user, scenario=Scenario.objects.first()
        )
        arguments = {
            "reply": "Hello! How are you?",
            "feedback": [
                {
                    "original": "I is",
                    "corrected": "I am",
                    "explanation": "С I используется am.",
                    "topic": "be",
                }
            ],
        }
        response = Mock(status_code=200)
        response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": None,
                        "tool_calls": [
                            {
                                "function": {
                                    "name": "tutor_response",
                                    "arguments": json.dumps(arguments),
                                }
                            }
                        ],
                    }
                }
            ]
        }
        with (
            patch.dict(
                "os.environ",
                {
                    "APIMIRA_API_KEY": "test",
                    "APIMIRA_BASE_URL": "https://apimira.com/v1",
                },
            ),
            patch("learning.tutor.requests.post", return_value=response) as upstream,
        ):
            result = self.client.post(
                f"/api/v1/conversations/{chat.id}/messages/",
                {"content": "I is here."},
                format="json",
            )
            self.assertEqual(result.status_code, 201)
            self.assertEqual(result.json()["feedback"][0]["topic"], "be")
            self.assertEqual(
                upstream.call_args.kwargs["json"]["tool_choice"]["function"]["name"],
                "tutor_response",
            )

    def test_three_diagnostic_bands(self):
        from .serializers import PlacementData

        for level, band in [
            ("A1", "начальный"),
            ("A2", "начальный"),
            ("B1", "средний"),
            ("B2", "средний"),
            ("C1", "продвинутый"),
        ]:
            result = PlacementResult(
                user=self.user,
                request_id=uuid4(),
                answers=[],
                score=0,
                total=10,
                level=level,
            )
            self.assertEqual(PlacementData(result).data["band"], band)

    def test_malformed_translation_response_returns_service_error(self):
        response = Mock(status_code=200)
        response.json.return_value = []
        with patch("learning.dictionary.requests.get", return_value=response):
            self.assertEqual(
                self.client.get("/api/v1/dictionary/lookup/?word=hello").status_code,
                503,
            )

    def test_english_dictionary_gloss_overrides_bad_translation_memory(self):
        self.switch("ru")
        translation = Mock(status_code=200)
        translation.json.return_value = {
            "responseStatus": 200,
            "responseData": {"translatedText": "Bul."},
        }
        entry = Mock(status_code=200)
        entry.json.return_value = {
            "ru": [
                {
                    "definitions": [
                        {"definition": "house, building (a residential building)"}
                    ]
                }
            ]
        }
        with patch(
            "learning.dictionary.requests.get", side_effect=[translation, entry]
        ):
            result = self.client.get("/api/v1/dictionary/lookup/?word=дом&target=en")
            self.assertEqual(result.json()["translation"], "house")
