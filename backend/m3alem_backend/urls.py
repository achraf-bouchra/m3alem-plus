from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

from accounts.views import MyTokenObtainPairView, ProfileUpdateView, RegisterView

from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [

    # =====================
    # ADMIN
    # =====================
    path("admin/", admin.site.urls),

    # =====================
    # AUTH (JWT)
    # =====================
    path("api/login/", MyTokenObtainPairView.as_view(), name="login"),
    path("api/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("api/register/", RegisterView.as_view({"post": "create"}), name="register"),
    path("api/profile/update/", ProfileUpdateView.as_view(), name="profile-update"),

    # =====================
    # ACCOUNTS
    # =====================
    path("api/accounts/", include("accounts.urls")),

    # =====================
    # REQUESTS SYSTEM (CLIENT + ARTISAN + MATCHING)
    # =====================
    path("api/services/", include("services.urls")),
    path("api/requests/", include("requests_app.urls")),

    # =====================
    # PAYMENTS SYSTEM
    # =====================
    path("api/payments/", include("payments.urls")),
    path("api/matching/", include("matching.urls")),
    path("api/reviews/", include("reviews.urls")),
    path("api/fraud/", include("fraud.urls")),

    # =====================
    # CHAT SYSTEM
    # =====================
    path("api/chat/", include("chat.urls")),

    # =====================
    # ROLE DASHBOARDS
    # =====================
    # legacy dashboard routes removed in favor of REST API endpoints
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
