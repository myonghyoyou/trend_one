from django.db import models
import uuid

class Transaction(models.Model):
    TRANSACTION_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("rolled_back", "Rolled Back"),
        ("failed", "Failed"),
    ]

    transaction_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    status = models.CharField(
        max_length=50, choices=TRANSACTION_STATUS_CHOICES, default="pending"
    )
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Transaction {self.transaction_id} - {self.status}"
