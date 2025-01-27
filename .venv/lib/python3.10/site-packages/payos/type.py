import json
from dataclasses import dataclass
from payos.constants import ERROR_MESSAGE
from typing import List, Optional

class ItemData:
    def __init__(self, name: str, quantity: int, price: int):
        if not isinstance(name, str):
            raise ValueError(f"{ERROR_MESSAGE['INVALID_PARAMETER']} name item must be a str")
        if not isinstance(quantity, int):
            raise ValueError(f"{ERROR_MESSAGE['INVALID_PARAMETER']} quantity item must be a int")
        if not isinstance(price, int):
            raise ValueError(f"{ERROR_MESSAGE['INVALID_PARAMETER']} price item must be a int")
        self.name = name
        self.quantity = quantity
        self.price = price
    def to_json(self):
        return {
            "name": self.name,
            "quantity": self.quantity,
            "price": self.price
        }


    
class PaymentData:
    def __init__(self, orderCode: int, amount: int, description: str, cancelUrl: str, returnUrl: str, buyerName: str = None, items: List[ItemData] = None,\
                  buyerEmail: str = None, buyerPhone: str = None, buyerAddress: str = None, expiredAt: int = None, signature: str = None):
        if not isinstance(orderCode, int):
            raise ValueError(f"{ERROR_MESSAGE['INVALID_PARAMETER']} orderCode must be a int")
        if not isinstance(amount, int):
            raise ValueError(f"{ERROR_MESSAGE['INVALID_PARAMETER']} amount must be a int")
        if not isinstance(description, str):
            raise ValueError(f"{ERROR_MESSAGE['INVALID_PARAMETER']} description must be a str")
        if items is not None:
            if not isinstance(items, list):
                raise ValueError(f"{ERROR_MESSAGE['INVALID_PARAMETER']} items must be a list")
            for x in items:
                if not isinstance(x, ItemData):
                    raise ValueError(f"{ERROR_MESSAGE['INVALID_PARAMETER']} item must be a ItemData")
        if not isinstance(description, str):
            raise ValueError(f"{ERROR_MESSAGE['INVALID_PARAMETER']} description must be a str")
        if not isinstance(cancelUrl, str):
            raise ValueError(f"{ERROR_MESSAGE['INVALID_PARAMETER']} cancelUrl must be a str")
        if not isinstance(returnUrl, str):
            raise ValueError(f"{ERROR_MESSAGE['INVALID_PARAMETER']} returnUrl must be a str")
        #required
        self.orderCode = orderCode
        self.amount = amount
        self.description = description
        self.items = items
        self.cancelUrl = cancelUrl
        self.returnUrl = returnUrl
        self.signature = signature
        #notrequired
        self.buyerName = buyerName
        self.buyerEmail = buyerEmail
        self.buyerPhone = buyerPhone
        self.buyerAddress = buyerAddress
        self.expiredAt = expiredAt

    def to_json(self):
        return {
            "orderCode": self.orderCode,
            "amount": self.amount,
            "description": self.description,
            "items": [item.to_json() for item in self.items] if self.items else None,
            "cancelUrl": self.cancelUrl,
            "returnUrl": self.returnUrl,
            "signature": self.signature,
            "buyerName": self.buyerName,
            "buyerEmail": self.buyerEmail,
            "buyerPhone": self.buyerPhone,
            "buyerAddress": self.buyerAddress,
            "expiredAt": self.expiredAt
        }
    

@dataclass
class CreatePaymentResult:
    bin: str
    accountNumber: str
    accountName: str
    amount: int
    description: str
    orderCode: int
    currency: str
    paymentLinkId: str
    status: str
    checkoutUrl: str
    qrCode: str
    expiredAt: Optional[int] = None
    def to_json(self):
         return {
            "bin": self.bin,
            "accountNumber": self.accountNumber,
            "accountName": self.accountName,
            "amount": self.amount,
            "description": self.description,
            "orderCode": self.orderCode,
            "currency": self.currency,
            "paymentLinkId": self.paymentLinkId,
            "status": self.status,
            "expiredAt": self.expiredAt,
            "checkoutUrl": self.checkoutUrl,
            "qrCode": self.qrCode
        }


@dataclass
class Transaction:
    reference: str
    amount: int
    accountNumber: str
    description: str
    transactionDateTime: str
    virtualAccountName: Optional[str]
    virtualAccountNumber: Optional[str]
    counterAccountBankId: Optional[str]
    counterAccountBankName: Optional[str]
    counterAccountName: Optional[str]
    counterAccountNumber: Optional[str]
    
    def to_json(self):
        return {
            "reference": self.reference,
            "amount": self.amount,
            "accountNumber": self.accountNumber,
            "description": self.description,
            "transactionDateTime": self.transactionDateTime,
            "virtualAccountName": self.virtualAccountName,
            "virtualAccountNumber": self.virtualAccountNumber,
            "counterAccountBankId": self.counterAccountBankId,
            "counterAccountBankName": self.counterAccountBankName,
            "counterAccountName": self.counterAccountName,
            "counterAccountNumber": self.counterAccountNumber
        }


@dataclass
class PaymentLinkInformation:
    id: str
    orderCode: int
    amount: int
    amountPaid: int
    amountRemaining: int
    status: str
    createdAt: str
    transactions: List[Transaction]
    cancellationReason: Optional[str]
    canceledAt: Optional[str]
    def to_json(self):
        return {
            "id": self.id,
            "orderCode": self.orderCode,
            "amount": self.amount,
            "amountPaid": self.amountPaid,
            "amountRemaining": self.amountRemaining,
            "status": self.status,
            "createdAt": self.createdAt,
            "transactions": [transaction.to_json() for transaction in self.transactions] if self.transactions else None,
            "cancellationReason": self.cancellationReason,
            "canceledAt": self.canceledAt
        }

@dataclass
class WebhookData:
    orderCode: int
    amount: int
    description: str
    accountNumber: str
    reference: str
    transactionDateTime: str
    paymentLinkId: str
    code: str
    desc: str
    counterAccountBankId: Optional[str]
    counterAccountBankName: Optional[str]
    counterAccountName: Optional[str]
    counterAccountNumber: Optional[str]
    virtualAccountName: Optional[str]
    virtualAccountNumber: Optional[str]
    currency: str

    def to_json(self):
        return {
            "orderCode": self.orderCode,
            "amount": self.amount,
            "description": self.description,
            "accountNumber": self.accountNumber,
            "reference": self.reference,
            "transactionDateTime": self.transactionDateTime,
            "paymentLinkId": self.paymentLinkId,
            "currency": self.currency,
            "code": self.code,
            "desc": self.desc,
            "counterAccountBankId": self.counterAccountBankId,
            "counterAccountBankName": self.counterAccountBankName,
            "counterAccountName": self.counterAccountName,
            "counterAccountNumber": self.counterAccountNumber,
            "virtualAccountName": self.virtualAccountName,
            "virtualAccountNumber": self.virtualAccountNumber
        }