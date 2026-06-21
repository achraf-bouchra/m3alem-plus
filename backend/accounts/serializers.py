from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from services.models import Category
from services.serializers import CategorySerializer
from .models import ArtisanProfile, ClientProfile, User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "phone",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "is_active"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.email


class ClientProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    profile_image_url = serializers.SerializerMethodField()
    number_of_requests = serializers.IntegerField(read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            "id",
            "user",
            "email",
            "phone",
            "address",
            "latitude",
            "longitude",
            "profile_image",
            "profile_image_url",
            "number_of_requests",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "profile_image_url",
            "number_of_requests",
            "created_at",
            "updated_at",
        ]

    def get_profile_image_url(self, obj):
        if not obj.profile_image:
            return None
        request = self.context.get("request")
        url = obj.profile_image.url
        return request.build_absolute_uri(url) if request else url


class ArtisanProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )
    profile_image_url = serializers.SerializerMethodField()
    total_offers = serializers.IntegerField(read_only=True)
    number_of_offers = serializers.IntegerField(read_only=True)

    class Meta:
        model = ArtisanProfile
        fields = [
            "id",
            "user",
            "email",
            "phone",
            "category",
            "category_id",
            "bio",
            "profile_image",
            "profile_image_url",
            "available",
            "is_verified",
            "address",
            "latitude",
            "longitude",
            "rating",
            "total_offers",
            "number_of_offers",
            "experience_years",
            "completed_jobs",
            "total_reviews",
            "payout_full_name",
            "bank_name",
            "iban",
            "account_number",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "profile_image_url",
            "rating",
            "total_offers",
            "number_of_offers",
            "completed_jobs",
            "total_reviews",
            "created_at",
            "updated_at",
        ]

    def get_profile_image_url(self, obj):
        if not obj.profile_image:
            return None
        request = self.context.get("request")
        url = obj.profile_image.url
        return request.build_absolute_uri(url) if request else url

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not instance.total_reviews:
            data["rating"] = 5.0
        return data


class RegisterSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=["CLIENT", "ARTISAN"])
    password = serializers.CharField(write_only=True, allow_blank=False, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    latitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    longitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    profile_image = serializers.ImageField(write_only=True, required=False, allow_null=True)
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    bio = serializers.CharField(write_only=True, required=False, allow_blank=True)
    profile = serializers.DictField(required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "name",
            "email",
            "phone",
            "phone_number",
            "password",
            "confirm_password",
            "role",
            "address",
            "latitude",
            "longitude",
            "profile_image",
            "category",
            "bio",
            "profile",
        ]

    def validate_role(self, value):
        if value not in ["CLIENT", "ARTISAN"]:
            raise serializers.ValidationError("Register role must be CLIENT or ARTISAN")
        return value

    def validate(self, attrs):
        if not str(attrs.get("email") or "").strip():
            raise serializers.ValidationError({"email": "Email is required."})
        if not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required."})
        if not attrs.get("role"):
            raise serializers.ValidationError({"role": "Role is required."})
        confirm_password = attrs.pop("confirm_password", None)
        if confirm_password and attrs.get("password") != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if attrs.get("email"):
            attrs["email"] = str(attrs["email"]).strip().lower()
        if User.objects.filter(email=attrs["email"]).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        name = str(attrs.pop("name", "") or "").strip()
        if name and not attrs.get("first_name") and not attrs.get("last_name"):
            first_name, _, last_name = name.partition(" ")
            attrs["first_name"] = first_name
            attrs["last_name"] = last_name
        profile = attrs.get("profile", {})
        if attrs.get("role") == "ARTISAN":
            if not attrs.get("category") and not profile.get("category"):
                raise serializers.ValidationError({"category": "Category is required for artisans."})
        return attrs

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", {})
        profile_data.pop("profession", None)
        phone_number = validated_data.pop("phone_number", "")
        address = validated_data.pop("address", "")
        latitude = validated_data.pop("latitude", None)
        longitude = validated_data.pop("longitude", None)
        profile_image = validated_data.pop("profile_image", None)
        category = validated_data.pop("category", None)
        bio = validated_data.pop("bio", "")
        password = validated_data.pop("password")

        if phone_number and not validated_data.get("phone"):
            validated_data["phone"] = phone_number

        email = str(validated_data.pop("email")).strip().lower()
        role = validated_data.get("role")
        print("REGISTER:", email, role)
        user = User.objects.create(email=email, **validated_data)
        user.set_password(password)
        user.save()

        if user.role == "CLIENT":
            ArtisanProfile.objects.filter(user=user).delete()
            defaults = {
                **profile_data,
                "phone": user.phone or phone_number,
                "address": address or profile_data.get("address", ""),
                "latitude": latitude if latitude is not None else profile_data.get("latitude"),
                "longitude": longitude if longitude is not None else profile_data.get("longitude"),
            }
            if profile_image:
                defaults["profile_image"] = profile_image
            profile, _ = ClientProfile.objects.get_or_create(user=user)
        else:
            ClientProfile.objects.filter(user=user).delete()
            defaults = {
                **profile_data,
                "phone": user.phone or phone_number,
                "category": category or profile_data.get("category"),
                "bio": bio or profile_data.get("bio", ""),
                "address": address or profile_data.get("address", ""),
                "latitude": latitude if latitude is not None else profile_data.get("latitude"),
                "longitude": longitude if longitude is not None else profile_data.get("longitude"),
            }
            if profile_image:
                defaults["profile_image"] = profile_image
            profile, _ = ArtisanProfile.objects.get_or_create(user=user)

        for attr, value in defaults.items():
            setattr(profile, attr, value)
        profile.save()
        return user


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    role = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        email = str(attrs.get("email") or attrs.get(self.username_field) or "").strip().lower()
        password = attrs.get("password") or ""
        selected_role = str(attrs.pop("role", "") or "").strip().upper()
        print(f"[AUTH DEBUG] login email={email}")
        existing_user = User.objects.filter(email=email).first()
        print(f"[AUTH DEBUG] user exists={bool(existing_user)}")
        if existing_user:
            print(f"[AUTH DEBUG] password hashed={not str(existing_user.password).startswith(password)}")

        user = authenticate(
            request=self.context.get("request"),
            email=email,
            password=password,
        )
        print(f"[AUTH DEBUG] password correct={bool(user)}")
        if user and selected_role in ["CLIENT", "ARTISAN"] and user.role != selected_role:
            raise serializers.ValidationError({"detail": "This account does not match selected role"})

        attrs["email"] = email
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        data["user_id"] = str(self.user.id)
        data["role"] = self.user.role
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["role"] = user.role
        return token
