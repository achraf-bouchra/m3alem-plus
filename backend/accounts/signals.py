from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, ClientProfile, ArtisanProfile

@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if instance.role == 'CLIENT':
        ArtisanProfile.objects.filter(user=instance).delete()
        ClientProfile.objects.get_or_create(user=instance)
    elif instance.role == 'ARTISAN':
        ClientProfile.objects.filter(user=instance).delete()
        ArtisanProfile.objects.get_or_create(user=instance)
