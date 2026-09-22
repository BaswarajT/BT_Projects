import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import OTPCode, User
from .permissions import CanManageUsers, is_global_admin
from .serializers import AdminUserSerializer, ProfileUpdateSerializer, UserSerializer

logger = logging.getLogger(__name__)

OTP_TTL_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60


class UserManagementViewSet(viewsets.ModelViewSet):
    """Only Global Admin and Super Admin reach this at all — Admin has no user-management
    access (see users.permissions). Global Admin sees/manages every user on the platform;
    Super Admin is scoped to their own company via get_queryset.

    "Delete" is a soft delete: the account moves to the Recycle Bin (deleted_at set,
    is_active cleared) instead of being removed, and can be restored later. This also
    keeps its email/username reserved so a duplicate account can't be created in its
    place — see AdminUserSerializer.validate_email.
    """

    serializer_class = AdminUserSerializer
    permission_classes = [IsAuthenticated, CanManageUsers]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    search_fields = ["username", "first_name", "last_name", "email"]

    def _base_queryset(self):
        user = self.request.user
        if is_global_admin(user):
            return User.objects.all()
        return User.objects.filter(company=user.company)

    def get_queryset(self):
        base = self._base_queryset()
        if self.action in ("recycle_bin", "restore"):
            return base.filter(deleted_at__isnull=False).order_by("-deleted_at")
        base = base.filter(deleted_at__isnull=True)
        if is_global_admin(self.request.user):
            return base.order_by("company__name", "username")
        return base.order_by("username")

    def perform_destroy(self, instance):
        if instance.id == self.request.user.id:
            raise ValidationError({"detail": "You can't delete your own account."})
        if (
            instance.role == "GLOBAL_ADMIN"
            and User.objects.filter(role="GLOBAL_ADMIN", deleted_at__isnull=True).count() <= 1
        ):
            raise ValidationError({"detail": "You can't delete the last remaining Global Admin."})
        instance.deleted_at = timezone.now()
        instance.is_active = False
        instance.save(update_fields=["deleted_at", "is_active"])

    @action(detail=False, methods=["get"], url_path="recycle-bin")
    def recycle_bin(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        instance = self.get_object()
        instance.deleted_at = None
        instance.is_active = True
        instance.save(update_fields=["deleted_at", "is_active"])
        return Response(self.get_serializer(instance).data)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={"request": request}).data)


class RequestOtpView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, purpose):
        purpose = purpose.upper()
        if purpose not in ("EMAIL", "PHONE"):
            return Response({"detail": "Invalid verification type."}, status=400)

        target = request.user.email if purpose == "EMAIL" else request.user.phone
        if not target:
            field = "email" if purpose == "EMAIL" else "phone"
            return Response({field: [f"Add a {field} to your profile before verifying it."]}, status=400)

        already_verified = request.user.email_verified if purpose == "EMAIL" else request.user.phone_verified
        if already_verified:
            return Response({"detail": f"{purpose.title()} is already verified."}, status=400)

        recent = (
            OTPCode.objects.filter(user=request.user, purpose=purpose)
            .order_by("-created_at")
            .first()
        )
        if recent:
            elapsed = (timezone.now() - recent.created_at).total_seconds()
            if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
                wait = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
                return Response({"detail": f"Please wait {wait}s before requesting another code."}, status=429)

        code = f"{secrets.randbelow(1000000):06d}"
        OTPCode.objects.create(
            user=request.user,
            purpose=purpose,
            target=target,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=OTP_TTL_MINUTES),
        )

        if purpose == "EMAIL":
            send_mail(
                "Your BT Projects verification code",
                f"Your verification code is {code}. It expires in {OTP_TTL_MINUTES} minutes.",
                None,
                [target],
                fail_silently=True,
            )
        else:
            # No SMS gateway is configured in this environment. Logging stands in for
            # sending a real SMS until a provider (e.g. Twilio) is wired up here.
            logger.info("SMS OTP for %s (%s): %s", request.user.username, target, code)

        response_data = {"detail": f"Verification code sent to {target}."}
        if settings.DEBUG:
            response_data["dev_code"] = code
        return Response(response_data)


class ConfirmOtpView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, purpose):
        purpose = purpose.upper()
        if purpose not in ("EMAIL", "PHONE"):
            return Response({"detail": "Invalid verification type."}, status=400)

        code = str(request.data.get("code", "")).strip()
        otp = (
            OTPCode.objects.filter(user=request.user, purpose=purpose, code=code)
            .order_by("-created_at")
            .first()
        )
        if not otp or not otp.is_valid():
            return Response({"code": ["Invalid or expired code."]}, status=400)

        otp.consumed_at = timezone.now()
        otp.save(update_fields=["consumed_at"])

        if purpose == "EMAIL":
            request.user.email_verified = True
            request.user.save(update_fields=["email_verified"])
        else:
            request.user.phone_verified = True
            request.user.save(update_fields=["phone_verified"])

        return Response(UserSerializer(request.user, context={"request": request}).data)
