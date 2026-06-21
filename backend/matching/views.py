from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from matching.services import find_nearby_artisans
from requests_app.models import Request
from requests_app.serializers import MatchingSuggestionSerializer


class MatchingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, request_id):
        try:
            request_obj = Request.objects.get(id=request_id)
        except Request.DoesNotExist:
            return Response({"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user != request_obj.client and request.user.role != "ADMIN":
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        artisans = find_nearby_artisans(request_obj, radius_km=2.0, limit=5)
        serializer = MatchingSuggestionSerializer(artisans, many=True)
        return Response({
            "request_id": str(request_obj.id),
            "count": len(serializer.data),
            "results": serializer.data,
        })
