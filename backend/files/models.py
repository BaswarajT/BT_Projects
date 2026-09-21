import uuid

from django.conf import settings
from django.db import models


def attachment_upload_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return f"task_files/{uuid.uuid4().hex}.{ext}"


class Attachment(models.Model):
    task = models.ForeignKey("tasks.Task", on_delete=models.CASCADE, related_name="attachments")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file = models.FileField(upload_to=attachment_upload_path)
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_name or self.file.name
