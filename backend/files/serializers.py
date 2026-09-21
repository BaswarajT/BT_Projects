from rest_framework import serializers

from .models import Attachment

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx", ".txt", ".zip"}


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ["id", "task", "uploaded_by", "file", "original_name", "uploaded_at"]
        read_only_fields = ["uploaded_by", "original_name", "uploaded_at"]

    def validate_file(self, value):
        if value.size > MAX_UPLOAD_SIZE_BYTES:
            raise serializers.ValidationError("File exceeds the 10MB upload limit.")
        ext = "." + value.name.rsplit(".", 1)[-1].lower() if "." in value.name else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(f"File type '{ext}' is not allowed.")
        return value

    def create(self, validated_data):
        validated_data["original_name"] = validated_data["file"].name
        return super().create(validated_data)
