from django.db import models
from accounts.models import User

class FraudAlert(models.Model):
    LEVEL_CHOICES = (
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="fraud_alerts")
    reason = models.TextField()
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default="LOW")
    is_resolved = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)