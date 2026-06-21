import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from services.models import Category


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.is_active = True
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "ADMIN")
        extra_fields.setdefault("is_active", True)

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser, TimeStampedModel):
    ROLE_CHOICES = (
        ("CLIENT", "Client"),
        ("ARTISAN", "Artisan"),
        ("ADMIN", "Admin"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="CLIENT")
    phone = models.CharField(max_length=30, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def is_client(self):
        return self.role == "CLIENT"

    @property
    def is_artisan(self):
        return self.role == "ARTISAN"


class ClientProfile(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="client_profile")
    phone = models.CharField(max_length=30, blank=True, null=True)
    profile_image = models.ImageField(upload_to="profiles/clients/", blank=True, null=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    address = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"ClientProfile - {self.user.email}"

    @property
    def number_of_requests(self):
        return self.user.requests.count()


class ArtisanProfile(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="artisan_profile")
    phone = models.CharField(max_length=30, blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="artisan_profiles")
    bio = models.TextField(blank=True)
    profile_image = models.ImageField(upload_to="profiles/artisans/", blank=True, null=True)
    available = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    address = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    rating = models.FloatField(default=5.0)
    experience_years = models.PositiveIntegerField(default=0)
    completed_jobs = models.PositiveIntegerField(default=0)
    total_reviews = models.PositiveIntegerField(default=0)
    payout_full_name = models.CharField(max_length=150, blank=True)
    bank_name = models.CharField(max_length=150, blank=True)
    iban = models.CharField(max_length=64, blank=True)
    account_number = models.CharField(max_length=64, blank=True)

    def __str__(self):
        return f"Artisan - {self.user.email}"

    @property
    def number_of_offers(self):
        from requests_app.models import Request

        return min(self.user.offers.count(), Request.objects.count())

    @property
    def total_offers(self):
        return self.number_of_offers
