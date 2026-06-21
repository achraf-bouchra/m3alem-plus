from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import ArtisanProfile, ClientProfile, User
from services.models import Category, Service


class Command(BaseCommand):
    help = "Delete users and recreate marketplace test artisans and clients."

    def handle(self, *args, **options):
        artisans = [
            ("artisan1@test.com", "Plumber"),
            ("artisan2@test.com", "Electrician"),
            ("artisan3@test.com", "Carpenter"),
            ("artisan4@test.com", "Welder"),
            ("artisan5@test.com", "Cleaner"),
        ]
        clients = ["client1@test.com", "client2@test.com"]
        base_lat = 33.5731
        base_lng = -7.5898

        with transaction.atomic():
            User.objects.all().delete()

            for index, (email, category_name) in enumerate(artisans):
                category, _ = Category.objects.get_or_create(name=category_name)
                user = User.objects.create_user(
                    email=email,
                    password="1234",
                    role="ARTISAN",
                    first_name=category_name,
                    last_name="Pro",
                )
                ArtisanProfile.objects.update_or_create(
                    user=user,
                    defaults={
                        "category": category,
                        "bio": f"Verified {category_name.lower()} ready for nearby jobs.",
                        "available": True,
                        "is_verified": True,
                        "address": "Casablanca",
                        "latitude": base_lat + (index * 0.002),
                        "longitude": base_lng + (index * 0.002),
                        "rating": round(4.2 + (index % 4) * 0.2, 1),
                        "experience_years": 2 + index,
                        "completed_jobs": 8 + index,
                        "total_reviews": 4 + index,
                        "payout_full_name": f"{category_name} Pro",
                        "bank_name": "Test Bank",
                        "iban": f"MA64TEST{index + 1:04d}",
                        "account_number": f"000000{index + 1:04d}",
                    },
                )

            for index, email in enumerate(clients):
                user = User.objects.create_user(
                    email=email,
                    password="1234",
                    role="CLIENT",
                    first_name="Client",
                    last_name=str(index + 1),
                )
                ClientProfile.objects.update_or_create(
                    user=user,
                    defaults={
                        "address": "Casablanca",
                        "latitude": base_lat + (index * 0.001),
                        "longitude": base_lng + (index * 0.001),
                    },
                )

        self.stdout.write(self.style.SUCCESS("Marketplace test users recreated with password 1234."))
