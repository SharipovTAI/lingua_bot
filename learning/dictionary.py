"""Внешние словарь и переводчик. Запросы выполняются только по действию пользователя."""

import html
from urllib.parse import quote

import requests
from django.core.cache import cache
from django.utils.html import strip_tags

from .tutor import TutorError


def lookup(word, language, target):
    cache_key = f"dictionary:{language}:{target}:{word.casefold()}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    try:
        for attempt in range(2):
            try:
                response = requests.get(
                    "https://api.mymemory.translated.net/get",
                    params={"q": word, "langpair": f"{language}|{target}"},
                    timeout=(2, 6),
                    allow_redirects=False,
                )
                response.raise_for_status()
                break
            except (requests.Timeout, requests.ConnectionError):
                if attempt:
                    raise
        data = response.json()
        if str(data.get("responseStatus")) != "200" or data.get("quotaFinished"):
            raise ValueError
        translation = html.unescape(data["responseData"]["translatedText"]).strip()
        if not translation or len(translation) > 500:
            raise ValueError
    except (requests.RequestException, ValueError, KeyError, TypeError, AttributeError):
        raise TutorError(
            503, "Внешний переводчик временно недоступен или исчерпан его лимит."
        ) from None
    definitions, examples = [], []
    source = "MyMemory"
    try:
        entry = requests.get(
            "https://en.wiktionary.org/api/rest_v1/page/definition/"
            + quote(word, safe=""),
            headers={"User-Agent": "LinguaBot-University-Demo/1.0"},
            timeout=(3, 5),
            allow_redirects=False,
        )
        if entry.status_code == 200:
            groups = entry.json().get(language, [])
            for group in groups:
                for definition in group.get("definitions", []):
                    text = html.unescape(
                        strip_tags(definition.get("definition", ""))
                    ).strip()
                    if text:
                        definitions.append(text[:500])
                    for example in definition.get("examples", []):
                        text = (
                            example.get("text", "")
                            if isinstance(example, dict)
                            else str(example)
                        )
                        text = html.unescape(strip_tags(text)).strip()
                        if text:
                            examples.append(text[:500])
            if definitions:
                source += ", Wiktionary (CC BY-SA)"
    except (requests.RequestException, ValueError, TypeError, AttributeError):
        pass
    # У коротких слов переводная память может содержать ошибочные пары.
    # Для перевода на английский словарное значение надёжнее случайного совпадения.
    if target == "en" and definitions and len(word.split()) == 1:
        gloss = definitions[0].split(",")[0].split(";")[0].split("(")[0].strip()
        if gloss and len(gloss) <= 100:
            translation = gloss
    result = {
        "word": word,
        "language": language,
        "target": target,
        "translation": translation,
        "definitions": definitions[:3],
        "examples": examples[:3],
        "source": source,
        "source_url": "https://en.wiktionary.org/wiki/" + quote(word, safe=""),
        "translation_url": "https://mymemory.translated.net/",
    }
    cache.set(cache_key, result, 60 * 60 * 24)
    return result
