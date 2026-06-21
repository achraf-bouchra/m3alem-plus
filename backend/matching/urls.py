from django.urls import path
from .views import MatchingView

urlpatterns = [
    path("score/<uuid:request_id>/", MatchingView.as_view(), name="matching-score"),
]
