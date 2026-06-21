from rest_framework.permissions import BasePermission

# 👤 Client فقط
class IsClient(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == "CLIENT"
        )


# 🛠 Artisan فقط
class IsArtisan(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == "ARTISAN"
        )


# 👑 Admin فقط
class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == "ADMIN"
        )