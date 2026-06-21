from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import detect_fake_review


class ReviewFakePredictionView(APIView):
    """Standalone ML prediction endpoint for fake review detection.
    
    Accepts comment text and returns fraud indicators.
    (Note: reviews app now handles this automatically on Review creation via signals).
    """

    def post(self, request):
        comment = request.data.get("comment")
        if comment is None:
            return Response(
                {"detail": "'comment' field is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_fake, fake_score, level = detect_fake_review(comment)

        return Response({
            "is_fake": is_fake,
            "fake_score": fake_score,
            "level": level,
        }, status=status.HTTP_200_OK)