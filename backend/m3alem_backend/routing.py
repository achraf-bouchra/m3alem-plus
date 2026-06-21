from django.urls import path

from chat.consumers import ChatConsumer
from requests_app.consumers import MarketplaceConsumer


websocket_urlpatterns = [
    path("ws/marketplace/", MarketplaceConsumer.as_asgi()),
    path("ws/chat/<uuid:room_id>/", ChatConsumer.as_asgi()),
]
