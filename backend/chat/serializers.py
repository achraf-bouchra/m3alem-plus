from rest_framework import serializers

from .models import ChatRoom, Message
from accounts.serializers import ArtisanProfileSerializer, ClientProfileSerializer, UserSerializer
from requests_app.models import Request


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'room', 'sender', 'content', 'timestamp']
        read_only_fields = ['id', 'sender', 'timestamp']


class ChatRoomSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    artisan = UserSerializer(read_only=True)
    client_profile = serializers.SerializerMethodField()
    artisan_profile = serializers.SerializerMethodField()
    request_service_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'client', 'artisan', 'client_profile', 'artisan_profile', 'request_service_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'client', 'artisan', 'client_profile', 'artisan_profile', 'request_service_name', 'created_at', 'updated_at']

    def get_client_profile(self, obj):
        profile = getattr(obj.client, 'client_profile', None)
        if not profile:
            return None
        return ClientProfileSerializer(profile, context=self.context).data

    def get_artisan_profile(self, obj):
        profile = getattr(obj.artisan, 'artisan_profile', None)
        if not profile:
            return None
        return ArtisanProfileSerializer(profile, context=self.context).data

    def get_request_service_name(self, obj):
        request = Request.objects.filter(
            client=obj.client,
            assigned_artisan=obj.artisan,
            status__in=["ASSIGNED", "COMPLETED"],
        ).select_related("service").order_by("-updated_at").first()
        return request.service.name if request else None
