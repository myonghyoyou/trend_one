"""docs_converter URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.urls import path

from .views import base_view, gvrnr_view, transaction_view
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("", base_view.index.as_view(), name="index"),
    path("main/", base_view.main.as_view(), name="main"),
    path("getGvrnrList/", gvrnr_view.get_gvrnr_list.as_view(), name="getGvrnrList"),
    path("getGvrnrStats/", gvrnr_view.get_gvrnr_stats.as_view(), name="getGvrnrStats"),
    path("gvrnrCRUD/", gvrnr_view.gvrnr_crud.as_view(), name="gvrnrCRUD"),
    path(
        "createTransaction/",
        transaction_view.create_transaction,
        name="create_transaction",
    ),
    path(
        "getTransactionsInProgress/",
        transaction_view.get_transactions_in_progress,
        name="list_in_progress_transactions",
    ),
    path(
        "rollabckAllTransactionsInProgress/",
        transaction_view.rollback_all_transactions_in_progress,
        name="rollback_all_transactions_in_progress",
    )
]  # + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
