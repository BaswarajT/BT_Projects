from django.contrib import admin

from .models import Task, TaskDependency, TimeEntry

admin.site.register(Task)
admin.site.register(TaskDependency)
admin.site.register(TimeEntry)
