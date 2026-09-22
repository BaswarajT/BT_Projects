from django.contrib import admin

from .models import Company, PlatformSettings

admin.site.register(Company)
admin.site.register(PlatformSettings)
