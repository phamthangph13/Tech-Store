import hashlib
import hmac
import json
from payos.type import PaymentData

def convertObjToQueryStr(obj: dict) -> str:
    """
    Chuyển đổi đối tượng JSON thành chuỗi truy vấn URL.
    """
    query_string = []

    for key, value in obj.items():
        value_as_string = ""
        if isinstance(value, (int, float, bool)):
            value_as_string = str(value)
        elif value in [None, 'null', 'NULL']:
            value_as_string = ""
        elif isinstance(value, list):
            value_as_string = json.dumps([sortObjDataByKey(item) for item in value], separators=(',', ':')).replace('None', 'null')
        else:
            value_as_string = str(value)
        query_string.append(f"{key}={value_as_string}")

    return "&".join(query_string)

def sortObjDataByKey(obj: dict) -> dict:
    """
    Sắp xếp đối tượng JSON theo khóa.
    """
    return dict(sorted(obj.items()))

def createSignatureFromObj(data, key):
    """
    Tạo chữ ký từ đối tượng JSON.
    """
    sorted_data_by_key = sortObjDataByKey(data)
    data_query_str = convertObjToQueryStr(sorted_data_by_key)
    # Sử dụng hashlib.sha256 thay thế cho crypto.createHmac
    data_to_signature =  hmac.new(key.encode("utf-8"), msg=data_query_str.encode("utf-8"), digestmod=hashlib.sha256).hexdigest()

    return data_to_signature

def createSignatureOfPaymentRequest(data: PaymentData, key):
    """
    Tạo chữ ký của yêu cầu thanh toán.
    """
    amount = data.amount
    cancel_url = data.cancelUrl
    description = data.description
    order_code = data.orderCode
    return_url = data.returnUrl

    data_str = f"amount={amount}&cancelUrl={cancel_url}&description={description}&orderCode={order_code}&returnUrl={return_url}"
    data_to_signature =  hmac.new(key.encode("utf-8"), msg=data_str.encode("utf-8"), digestmod=hashlib.sha256).hexdigest()
    return data_to_signature