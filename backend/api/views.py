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
    customer_email = request.data.get('customer_email')
    if not customer_email:
        return Response({'error': 'Missing required field: customer_email'}, status=400)

    ssl_ca = os.path.join(os.path.dirname(__file__), 'global-bundle.pem')
    conn = None
    try:
        conn = mysql.connector.connect(
            host='database-3-instance-1.cbaw6ygwqta3.ap-southeast-1.rds.amazonaws.com',
            port=3306,
            database='database3',
            user='admin',
            password='seekingalphakx',
            ssl_disabled=False,
            autocommit=True,
            ssl_ca=ssl_ca
        )
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT * FROM user_data WHERE customer_email = %s', (customer_email,))
        row = cur.fetchone()
        cur.close()

        if not row:
            return Response({'error': f'User with email {customer_email} not found'}, status=404)

        pay_frequency = row['pay_frequency']
        if pay_frequency not in PAY_FREQUENCY_MAP:
            return Response({'error': f'Invalid pay_frequency in DB: {pay_frequency}'}, status=400)

        lead_type = row['lead_type']
        if lead_type not in LEAD_RISK_MAP:
            return Response({'error': f'Invalid lead_type in DB: {lead_type}'}, status=400)

        loan_amount = float(row['loan_amount'])
        if loan_amount <= 0:
            return Response({'error': 'loan_amount must be greater than 0'}, status=400)

        result = predict(
            n_paid_off=int(row['n_paid_off']),
            pay_frequency=pay_frequency,
            loan_amount=loan_amount,
            apr=float(row['apr']),
            scheduled_payment_amount=float(row['scheduled_payment_amount']),
            lead_type=lead_type,
            clearfraud_score=float(row['clearfraud_score']) if row.get('clearfraud_score') is not None else None,
            total_fraud_indicators=float(row['total_fraud_indicators']) if row.get('total_fraud_indicators') is not None else None,
        )
        return Response({'userID': row['userID'], 'customer_name': row['customer_name'], 'customer_email': customer_email, **result})

    except Exception as e:
        return Response({'error': 'Prediction failed', 'details': str(e)}, status=500)
    finally:
        if conn:
            conn.close()
