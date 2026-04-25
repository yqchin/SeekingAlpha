from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests
import mysql.connector
import os
from django.views.decorators.csrf import csrf_exempt

from .credit import predict, PAY_FREQUENCY_MAP, LEAD_RISK_MAP

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
            
@csrf_exempt
@api_view(['POST'])
def predict_credit_view(request):
    data = request.data

    required = ['n_paid_off', 'pay_frequency', 'loan_amount', 'apr', 'scheduled_payment_amount', 'lead_type']
    missing = [f for f in required if f not in data]
    if missing:
        return Response({'error': f'Missing required fields: {missing}'}, status=400)

    pay_frequency = data['pay_frequency']
    if pay_frequency not in PAY_FREQUENCY_MAP:
        return Response({'error': f'pay_frequency must be one of {list(PAY_FREQUENCY_MAP.keys())}'}, status=400)

    lead_type = data['lead_type']
    if lead_type not in LEAD_RISK_MAP:
        return Response({'error': f'lead_type must be one of {list(LEAD_RISK_MAP.keys())}'}, status=400)

    loan_amount = float(data['loan_amount'])
    if loan_amount <= 0:
        return Response({'error': 'loan_amount must be greater than 0'}, status=400)

    try:
        result = predict(
            n_paid_off=int(data['n_paid_off']),
            pay_frequency=pay_frequency,
            loan_amount=loan_amount,
            apr=float(data['apr']),
            scheduled_payment_amount=float(data['scheduled_payment_amount']),
            lead_type=lead_type,
            clearfraud_score=float(data['clearfraud_score']) if data.get('clearfraud_score') is not None else None,
            total_fraud_indicators=float(data['total_fraud_indicators']) if data.get('total_fraud_indicators') is not None else None,
        )
        return Response(result)
    except Exception as e:
        return Response({'error': 'Prediction failed', 'details': str(e)}, status=500)
