from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0001_initial"),
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="clientprofile",
            name="profile_image",
            field=models.ImageField(blank=True, null=True, upload_to="profiles/clients/"),
        ),
        migrations.AddField(
            model_name="artisanprofile",
            name="address",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="artisanprofile",
            name="category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="artisan_profiles",
                to="services.category",
            ),
        ),
        migrations.AddField(
            model_name="artisanprofile",
            name="phone",
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
        migrations.AddField(
            model_name="artisanprofile",
            name="profile_image",
            field=models.ImageField(blank=True, null=True, upload_to="profiles/artisans/"),
        ),
    ]
