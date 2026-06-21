from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import ArtisanProfile, ClientProfile, User
from chat.models import ChatRoom, Message
from payments.models import ClientPaymentMethod, Payment
from requests_app.models import Offer, Request
from reviews.models import Review
from services.models import Category, Service


CATALOG = {
    "Plumber": [
        "Plumber : Fix leak",
        "Plumber : Install sink",
        "Plumber : Unclog pipe",
    ],
    "Electrician": [
        "Electrician : Install lights",
        "Electrician : Fix wiring",
        "Electrician : Repair circuit",
    ],
    "Carpenter": [
        "Carpenter : Build furniture",
        "Carpenter : Fix door",
        "Carpenter : Install kitchen",
    ],
    "Welder": [
        "Welder : Metal repair",
        "Welder : Welding structure",
        "Welder : Gate fabrication",
    ],
    "Cleaner": [
        "Cleaner : House cleaning",
        "Cleaner : Office cleaning",
        "Cleaner : Deep cleaning",
    ],
}

BASE_LAT = 33.5731
BASE_LNG = -7.5898
ARTISAN_LOCATIONS = [
    (33.5731, -7.5898),
    (33.5742, -7.5889),
    (33.5724, -7.5906),
    (33.5747, -7.5901),
    (33.5720, -7.5885),
]
VALID_USER_ROLES = {"CLIENT", "ARTISAN", "ADMIN"}


class Command(BaseCommand):
    help = "Audit and clean all marketplace data so the database is ready for testing."

    @transaction.atomic
    def handle(self, *args, **options):
        report = defaultdict(int)

        report["reviews_deleted"] = Review.objects.count()
        Review.objects.all().delete()
        report["payments_deleted"] = Payment.objects.count()
        Payment.objects.all().delete()
        report["payment_methods_deleted"] = ClientPaymentMethod.objects.count()
        ClientPaymentMethod.objects.all().delete()
        report["offers_deleted"] = Offer.objects.count()
        Offer.objects.all().delete()
        report["requests_deleted"] = Request.objects.count()
        Request.objects.all().delete()
        report["messages_deleted"] = Message.objects.count()
        Message.objects.all().delete()
        report["chat_rooms_deleted"] = ChatRoom.objects.count()
        ChatRoom.objects.all().delete()

        invalid_users = User.objects.filter(email__isnull=True) | User.objects.filter(email="")
        invalid_users = invalid_users | User.objects.exclude(role__in=VALID_USER_ROLES)
        report["invalid_users_deleted"] = invalid_users.distinct().count()
        invalid_users.distinct().delete()

        seen_emails = set()
        for user in User.objects.order_by("created_at", "id"):
            normalized_email = (user.email or "").strip().lower()
            if not normalized_email or normalized_email in seen_emails:
                user.delete()
                report["duplicate_users_deleted"] += 1
                continue
            seen_emails.add(normalized_email)
            changed = False
            if user.email != normalized_email:
                user.email = normalized_email
                changed = True
            if not user.phone:
                user.phone = "+212600000000"
                changed = True
            if changed:
                user.save(update_fields=["email", "phone", "updated_at"])
                report["users_normalized"] += 1

        Service.objects.all().delete()
        Category.objects.all().delete()
        categories = {}
        for category_name, service_names in CATALOG.items():
            category = Category.objects.create(name=category_name)
            categories[category_name] = category
            for service_name in service_names:
                Service.objects.create(category=category, name=service_name)
        report["categories_seeded"] = len(CATALOG)
        report["services_seeded"] = sum(len(items) for items in CATALOG.values())

        for user in User.objects.filter(role="CLIENT"):
            ArtisanProfile.objects.filter(user=user).delete()
            profile, created = ClientProfile.objects.get_or_create(user=user)
            if created:
                report["client_profiles_created"] += 1
            changed = False
            if not profile.phone:
                profile.phone = user.phone or "+212600000000"
                changed = True
            if not profile.address:
                profile.address = "Casablanca"
                changed = True
            if profile.latitude is None:
                profile.latitude = BASE_LAT
                changed = True
            if profile.longitude is None:
                profile.longitude = BASE_LNG
                changed = True
            if changed:
                profile.save()
                report["client_profiles_fixed"] += 1

        ClientProfile.objects.filter(user__role="ARTISAN").delete()
        ArtisanProfile.objects.filter(user__role="CLIENT").delete()
        ClientProfile.objects.filter(user__role="ADMIN").delete()
        ArtisanProfile.objects.filter(user__role="ADMIN").delete()

        artisans = list(User.objects.filter(role="ARTISAN").order_by("email", "id"))
        category_names = list(CATALOG.keys())
        while len(artisans) < len(category_names):
            category_name = category_names[len(artisans)]
            user = User.objects.create_user(
                email=f"artisan{len(artisans) + 1}@test.com",
                password="12345678",
                role="ARTISAN",
                first_name=category_name,
                last_name="Pro",
                phone="+212600000000",
            )
            artisans.append(user)
            report["test_artisans_created"] += 1

        if not User.objects.filter(role="CLIENT").exists():
            client = User.objects.create_user(
                email="client1@test.com",
                password="12345678",
                role="CLIENT",
                first_name="Client",
                last_name="Test",
                phone="+212600000000",
            )
            ClientProfile.objects.create(
                user=client,
                phone=client.phone,
                address="Casablanca",
                latitude=BASE_LAT,
                longitude=BASE_LNG,
            )
            report["test_clients_created"] += 1

        assigned_categories = set()
        for index, user in enumerate(artisans):
            category_name = category_names[index % len(category_names)]
            category = categories[category_name]
            lat, lng = ARTISAN_LOCATIONS[index % len(ARTISAN_LOCATIONS)]
            profile, created = ArtisanProfile.objects.get_or_create(user=user)
            if created:
                report["artisan_profiles_created"] += 1
            profile.phone = profile.phone or user.phone or "+212600000000"
            profile.category = category
            profile.bio = profile.bio or f"Available {category_name.lower()} for nearby jobs."
            profile.available = True
            profile.address = profile.address or "Casablanca"
            profile.latitude = lat
            profile.longitude = lng
            profile.rating = 0
            profile.completed_jobs = 0
            profile.total_reviews = 0
            profile.save()
            assigned_categories.add(category_name)
            report["artisan_profiles_fixed"] += 1

        for category_name in category_names:
            if category_name in assigned_categories:
                continue
            user = User.objects.create_user(
                email=f"{category_name.lower()}@test.com",
                password="12345678",
                role="ARTISAN",
                first_name=category_name,
                last_name="Pro",
                phone="+212600000000",
            )
            category = categories[category_name]
            lat, lng = ARTISAN_LOCATIONS[category_names.index(category_name)]
            ArtisanProfile.objects.create(
                user=user,
                phone=user.phone,
                category=category,
                bio=f"Available {category_name.lower()} for nearby jobs.",
                available=True,
                address="Casablanca",
                latitude=lat,
                longitude=lng,
                rating=0,
                completed_jobs=0,
                total_reviews=0,
            )
            report["category_artisans_created"] += 1

        report["final_users"] = User.objects.count()
        report["final_clients"] = User.objects.filter(role="CLIENT").count()
        report["final_artisans"] = User.objects.filter(role="ARTISAN").count()
        report["final_client_profiles"] = ClientProfile.objects.count()
        report["final_artisan_profiles"] = ArtisanProfile.objects.count()
        report["final_categories"] = Category.objects.count()
        report["final_services"] = Service.objects.count()
        report["final_requests"] = Request.objects.count()
        report["final_offers"] = Offer.objects.count()
        report["final_payments"] = Payment.objects.count()

        self.stdout.write(self.style.SUCCESS("Database audit and cleanup complete."))
        for key in sorted(report):
            self.stdout.write(f"{key}: {report[key]}")
