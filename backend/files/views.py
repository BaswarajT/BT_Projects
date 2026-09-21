from rest_framework import viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from users.permissions import is_company_admin, is_super_admin

from .models import Attachment
from .serializers import AttachmentSerializer


class AttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        if is_super_admin(user):
            return Attachment.objects.all()
        if is_company_admin(user):
            return Attachment.objects.filter(task__project__company=user.company)
        return Attachment.objects.filter(task__project__members__user=user).distinct()

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
