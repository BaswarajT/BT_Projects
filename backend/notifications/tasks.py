from celery import shared_task

from .models import Notification


@shared_task
def send_due_date_reminder(task_id):
    from tasks.models import Task

    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return
    if task.assigned_to:
        Notification.objects.create(
            recipient=task.assigned_to,
            title="Task due soon",
            message=f"'{task.title}' is due on {task.due_date}",
        )
