from django.urls import path
from .views import external_api_call_view, predict_credit_view

urlpatterns = [
    path('call-external/', external_api_call_view, name='call-external'),
    path('predict-credit/', predict_credit_view, name='predict-credit'),
]
