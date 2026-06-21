from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import logging
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ChatRoom, Message
from .serializers import ChatRoomSerializer, MessageSerializer

logger = logging.getLogger(__name__)


class ChatRoomViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ChatRoom.objects.all().order_by("-created_at")
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            return self.queryset
        return self.queryset.filter(client=user) | self.queryset.filter(artisan=user)

    @action(detail=True, methods=["get"], url_path="messages")
    def messages(self, request, pk=None):
        room = self.get_object()
        messages = room.messages.order_by("timestamp")
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all().order_by("timestamp")
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            return self.queryset
        return self.queryset.filter(room__client=user) | self.queryset.filter(room__artisan=user)

    def perform_create(self, serializer):
        room = serializer.validated_data.get("room")
        user = self.request.user
        if room.client_id != user.id and room.artisan_id != user.id:
            raise PermissionDenied("You are not a member of this chat room.")
        message = serializer.save(sender=user)
        serialized_message = MessageSerializer(message).data
        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{room.id}",
                    {
                        "type": "chat.message",
                        "payload": serialized_message,
                    },
                )
            except Exception:
                logger.exception("Could not broadcast chat message %s", message.id)
