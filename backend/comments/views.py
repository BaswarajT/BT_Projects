from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from notifications.models import Notification
from users.permissions import is_company_admin, is_super_admin

from .models import Comment
from .serializers import CommentSerializer


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base = Comment.objects.select_related("author", "task")
        if is_super_admin(user):
            return base.distinct()
        if is_company_admin(user):
            return base.filter(task__project__company=user.company).distinct()
        return base.filter(task__project__members__user=user).distinct()

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        task = comment.task
        if task.assigned_to and task.assigned_to_id != self.request.user.id:
            Notification.objects.create(
                recipient=task.assigned_to,
                title="New comment on your task",
                message=f"{self.request.user.username} commented on '{task.title}'",
            )
