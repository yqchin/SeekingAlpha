from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests
import mysql.connector
import os
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@api_view(['GET'])
def external_api_call_view(request):
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

@csrf_exempt
@api_view(['GET'])
def db_test_view(request):
    ssl_ca = os.path.join(os.path.dirname(__file__), 'global-bundle.pem')
    conn = None
    try:
        conn = mysql.connector.connect(
            host='database-3-instance-1.cbaw6ygwqta3.ap-southeast-1.rds.amazonaws.com',
            port=3306,
            database='testing_db',
            user='admin',
            password='seekingalphakx',
            ssl_disabled=False,
            autocommit=True,
            ssl_ca=ssl_ca
        )
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT * FROM user_test1;')
        rows = cur.fetchall()
        cur.close()
        return Response({
            "message": "Successfully connected to RDS",
            "data": rows
        })
    except Exception as e:
        return Response({
            "error": "Database error",
            "details": str(e)
        }, status=500)
    finally:
        if conn:
            conn.close()
