from django.urls import path

from .views import ReviewFakePredictionView

urlpatterns = [
    path('review-fake-check/', ReviewFakePredictionView.as_view(), name='review-fake-check'),
]
