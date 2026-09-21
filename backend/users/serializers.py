import re

from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from rest_framework import serializers

from .countries import DIAL_CODES
from .permissions import ROLE_RANK, is_global_admin, max_assignable_role_rank

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    dial_code = serializers.SerializerMethodField()
    company_name = serializers.CharField(source="company.name", read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "display_name",
            "role", "company", "company_name", "phone", "avatar", "gender", "country", "dial_code",
            "state", "language", "timezone", "job_title", "department", "bio", "website",
            "email_verified", "phone_verified", "is_active",
        ]
        read_only_fields = ["role", "company", "email_verified", "phone_verified", "is_active"]

    def get_dial_code(self, obj):
        return f"+{DIAL_CODES[obj.country]}" if obj.country in DIAL_CODES else None


MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name", "last_name", "display_name", "email", "phone",
            "gender", "country", "state", "language", "timezone", "avatar",
            "job_title", "department", "bio", "website",
        ]

    def validate_avatar(self, value):
        if not value:
            return value
        if value.size > MAX_AVATAR_SIZE_BYTES:
            raise serializers.ValidationError("Image exceeds the 5MB upload limit.")
        content_type = getattr(value, "content_type", None)
        if content_type and content_type not in ALLOWED_AVATAR_TYPES:
            raise serializers.ValidationError("Unsupported image type.")
        return value

    def validate(self, attrs):
        phone = attrs.get("phone", getattr(self.instance, "phone", "") if self.instance else "")
        country = attrs.get("country", getattr(self.instance, "country", "") if self.instance else "")

        if phone:
            if not country:
                raise serializers.ValidationError(
                    {"country": "Select a country/region so the phone number can be validated."}
                )
            dial = DIAL_CODES.get(country)
            prefix = f"+{dial}"
            if not phone.startswith(prefix):
                raise serializers.ValidationError(
                    {"phone": f"Phone number must start with {prefix} for the selected country."}
                )
            local_number = phone[len(prefix):]
            if not re.fullmatch(r"\d{10}", local_number):
                raise serializers.ValidationError(
                    {"phone": "Phone number must be exactly 10 digits after the country code."}
                )
        return attrs

    def update(self, instance, validated_data):
        if "email" in validated_data and validated_data["email"] != instance.email:
            instance.email_verified = False
        if "phone" in validated_data and validated_data["phone"] != instance.phone:
            instance.phone_verified = False
        return super().update(instance, validated_data)


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)
    company_name = serializers.CharField(source="company.name", read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "role",
            "company", "company_name", "is_active", "password",
        ]

    def validate_role(self, value):
        requester = self.context["request"].user
        if ROLE_RANK.get(value, -1) > max_assignable_role_rank(requester):
            raise serializers.ValidationError(
                f"You don't have permission to assign the {value} role."
            )
        return value

    def validate_company(self, value):
        requester = self.context["request"].user
        if is_global_admin(requester):
            return value
        # Non-global-admins may only ever act within their own company. A blank/null
        # value (what the frontend sends by default for these requesters) silently
        # defaults to their own company; an explicit attempt to name a *different*
        # real company is rejected rather than silently overridden.
        if value not in (None, requester.company):
            raise serializers.ValidationError("You can only manage users within your own company.")
        return requester.company

    def create(self, validated_data):
        requester = self.context["request"].user
        password = validated_data.pop("password", None) or get_random_string(16)
        if not is_global_admin(requester):
            validated_data["company"] = requester.company
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user
