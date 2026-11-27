from django.db import migrations


def preserve_levels(apps, schema_editor):
    Profile = apps.get_model('learning', 'Profile')
    Progress = apps.get_model('learning', 'LanguageProgress')
    for profile in Profile.objects.all().iterator():
        Progress.objects.get_or_create(user_id=profile.user_id, language=profile.language, defaults={'level':profile.level})
    # У старого словаря дата добавления неизвестна. Не приписываем эти слова новому дню.
    apps.get_model('learning','VocabularyWord').objects.update(created_at=None)


class Migration(migrations.Migration):
    dependencies = [('learning','0003_achievementaward_languageprogress_note_and_more')]
    operations = [migrations.RunPython(preserve_levels, migrations.RunPython.noop)]
