from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, ClientProfile, ArtisanProfile


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User

    list_display = ('id', 'email', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('role',)}),
        ('Permissions', {'fields': ('is_staff', 'is_active', 'is_superuser')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role'),
        }),
    )

    search_fields = ('email',)
    ordering = ('email',)


admin.site.register(ClientProfile)
admin.site.register(ArtisanProfile)