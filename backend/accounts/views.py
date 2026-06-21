from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, ClientProfile, ArtisanProfile
from .serializers import (
    ArtisanProfileSerializer,
    ClientProfileSerializer,
    MyTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class RegisterView(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def create(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "message": "User created successfully",
        }, status=status.HTTP_201_CREATED)


class ProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def put(self, request):
        user = request.user
        data = request.data
        phone = data.get("phone") or data.get("phone_number")

        if "name" in data:
            first_name, _, last_name = str(data.get("name") or "").strip().partition(" ")
            user.first_name = first_name
            user.last_name = last_name
        for field in ["first_name", "last_name"]:
            if field in data:
                setattr(user, field, data.get(field) or "")
        if phone is not None:
            user.phone = phone
        user.save()

        if user.role == "CLIENT":
            ArtisanProfile.objects.filter(user=user).delete()
            profile, _ = ClientProfile.objects.get_or_create(user=user)
            serializer_class = ClientProfileSerializer
        elif user.role == "ARTISAN":
            ClientProfile.objects.filter(user=user).delete()
            profile, _ = ArtisanProfile.objects.get_or_create(user=user)
            serializer_class = ArtisanProfileSerializer
        else:
            return Response(UserSerializer(user, context={"request": request}).data)

        if phone is not None:
            profile.phone = phone
        for field in ["address", "latitude", "longitude"]:
            if field in data:
                value = data.get(field)
                setattr(profile, field, value if value != "" else None)
        if user.role == "ARTISAN":
            for field in ["bio", "payout_full_name", "bank_name", "iban", "account_number"]:
                if field in data:
                    setattr(profile, field, data.get(field) or "")
            if "available" in data:
                profile.available = data.get("available") in [True, "true", "True", "1", 1]
            if data.get("category"):
                profile.category_id = data.get("category")
        if data.get("profile_image"):
            profile.profile_image = data.get("profile_image")
        profile.save()
        return Response(serializer_class(profile, context={"request": request}).data)


class ClientProfileViewSet(viewsets.ModelViewSet):
    queryset = ClientProfile.objects.select_related("user").all()
    serializer_class = ClientProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            return self.queryset
        return self.queryset.filter(user=user)

    @action(detail=False, methods=["get"])
    def me(self, request):
        profile = self.get_queryset().first()
        if not profile:
            return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)


class ArtisanProfileViewSet(viewsets.ModelViewSet):
    queryset = ArtisanProfile.objects.select_related("user").all()
    serializer_class = ArtisanProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            return self.queryset
        return self.queryset.filter(user=user)

    @action(detail=False, methods=["get"])
    def me(self, request):
        profile = self.get_queryset().first()
        if not profile:
            return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if self.action in ["retrieve", "profile"]:
            return self.queryset
        if user.role == "ADMIN":
            return self.queryset
        return self.queryset.filter(id=user.id)

    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["post", "delete"], url_path="deactivate")
    def deactivate(self, request):
        user = request.user
        if user.role == "ARTISAN":
            ArtisanProfile.objects.filter(user=user).update(available=False)
        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])
        return Response({"detail": "Account deactivated."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def profile(self, request, pk=None):
        user = self.get_object()
        if user.role == "CLIENT":
            profile = getattr(user, "client_profile", None)
            if not profile:
                return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
            return Response(ClientProfileSerializer(profile, context=self.get_serializer_context()).data)
        if user.role == "ARTISAN":
            profile = getattr(user, "artisan_profile", None)
            if not profile:
                return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
            return Response(ArtisanProfileSerializer(profile, context=self.get_serializer_context()).data)
        return Response(UserSerializer(user, context=self.get_serializer_context()).data)
