from django.db import migrations, models


def set_new_artisans_rating(apps, schema_editor):
    ArtisanProfile = apps.get_model("accounts", "ArtisanProfile")
    ArtisanProfile.objects.filter(total_reviews=0).update(rating=5.0)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_remove_artisanprofile_profession"),
    ]

    operations = [
        migrations.AlterField(
            model_name="artisanprofile",
            name="rating",
            field=models.FloatField(default=5.0),
        ),
        migrations.RunPython(set_new_artisans_rating, migrations.RunPython.noop),
    ]
