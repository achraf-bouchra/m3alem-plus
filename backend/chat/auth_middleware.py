import urllib.parse

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from rest_framework_simplejwt.authentication import JWTAuthentication


@database_sync_to_async
def get_user_from_token(token):
    jwt_auth = JWTAuthentication()
    validated_token = jwt_auth.get_validated_token(token)
    return jwt_auth.get_user(validated_token)


class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        query_params = urllib.parse.parse_qs(query_string)
        token = query_params.get('token')

        # try query string token first
        user = None
        if token:
            try:
                user = await get_user_from_token(token[0])
            except Exception:
                user = None

        # fallback to Authorization header: b'authorization': b'Bearer <token>'
        if not user:
            headers = dict(scope.get('headers') or [])
            auth_header = headers.get(b'authorization')
            if auth_header:
                try:
                    auth_decoded = auth_header.decode()
                    if auth_decoded.startswith('Bearer '):
                        header_token = auth_decoded.split(' ', 1)[1]
                        try:
                            user = await get_user_from_token(header_token)
                        except Exception:
                            user = None
                except Exception:
                    user = None

        scope['user'] = user or AnonymousUser()

        close_old_connections()
        return await super().__call__(scope, receive, send)
