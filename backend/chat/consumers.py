import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from chat.models import ChatRoom, Message


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        user = self.scope.get("user")
        if not user or not getattr(user, "is_authenticated", False):
            await self.close(code=4001)
            return

        is_member = await self.user_is_room_member(self.room_id, user.id)
        if not is_member:
            await self.close(code=4003)
            return

        self.room_group_name = f"chat_{self.room_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({"type": "error", "detail": "Invalid JSON"}))
            return

        content = (data.get("content") or data.get("message") or "").strip()
        if not content:
            return

        user = self.scope.get("user")
        saved_message = await self.create_message(self.room_id, user.id, content)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "payload": saved_message,
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "new_message",
            "payload": event["payload"],
        }))

    @database_sync_to_async
    def user_is_room_member(self, room_id, user_id):
        return ChatRoom.objects.filter(id=room_id).filter(
            client_id=user_id
        ).exists() or ChatRoom.objects.filter(id=room_id, artisan_id=user_id).exists()

    @database_sync_to_async
    def create_message(self, room_id, user_id, content):
        message = Message.objects.create(room_id=room_id, sender_id=user_id, content=content)
        return {
            "id": str(message.id),
            "room": str(message.room_id),
            "sender": {
                "id": str(message.sender_id),
                "email": message.sender.email,
                "first_name": message.sender.first_name,
                "last_name": message.sender.last_name,
                "full_name": message.sender.get_full_name() or message.sender.email,
                "role": message.sender.role,
            },
            "content": message.content,
            "timestamp": message.timestamp.isoformat(),
        }
