from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ArtisanProfileViewSet,
    ClientProfileViewSet,
    MyTokenObtainPairView,
    RegisterView,
    UserViewSet,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'client-profiles', ClientProfileViewSet, basename='client-profiles')
router.register(r'artisan-profiles', ArtisanProfileViewSet, basename='artisan-profiles')
router.register(r'register', RegisterView, basename='register')

urlpatterns = [
    path('', include(router.urls)),
]
