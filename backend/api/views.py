from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@api_view(['GET'])
def external_api_call_view(request):
    # Example of calling an external API
    external_url = "https://jsonplaceholder.typicode.com/posts/1"
    try:
        response = requests.get(external_url)
        data = response.json()
        return Response({
            "message": "Successfully called external API",
            "data": data
        })
    except requests.exceptions.RequestException as e:
        return Response({
            "error": "Failed to call external API",
            "details": str(e)
        }, status=500)
