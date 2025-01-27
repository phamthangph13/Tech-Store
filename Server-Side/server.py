from flask import Flask, request, jsonify, render_template, send_from_directory
from pymongo import MongoClient
from bson import ObjectId
import bcrypt
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
from datetime import datetime, timedelta
from flask_swagger_ui import get_swaggerui_blueprint
from flask_cors import CORS
import jwt
import os
import string
import base64
import json
from payos import PayOS, PaymentData, ItemData

# Lấy đường dẫn tuyệt đối
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
public_dir = os.path.join(root_dir, 'PUBLIC')

app = Flask(__name__, 
    static_folder=None  # Tắt static folder mặc định
)

# Đăng ký nhiều static folders
app.add_url_rule('/PUBLIC/<path:filename>',
    endpoint='public_files',
    view_func=lambda filename: send_from_directory(public_dir, filename))

app.add_url_rule('/<path:filename>',
    endpoint='root_files',
    view_func=lambda filename: send_from_directory(root_dir, filename))

CORS(app, resources={
    r"/*": {
        "origins": [
            "http://127.0.0.1:5000",
            "http://localhost:5000",
            "http://127.0.0.1:5500",
            "http://localhost:5500"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

client = MongoClient('mongodb://localhost:27017/')
db = client['DouneStore']

otp_storage = {}

# Read configuration from Secure.lock
def read_secure_config():
    try:
        with open('Secure.lock', 'r') as f:
            config = {}
            for line in f:
                if line.strip() and not line.startswith('#'):  # Skip empty lines and comments
                    key, value = line.strip().split(' = ')
                    config[key] = value.strip('"')
            return config
    except Exception as e:
        print(f"Error reading Secure.lock: {str(e)}")
        return None

secure_config = read_secure_config()

# SMTP Configuration
SMTP_SERVER = secure_config['SMTP_SERVER']
SMTP_PORT = int(secure_config['SMTP_PORT'])
SMTP_USERNAME = secure_config['SMTP_USERNAME']
SMTP_PASSWORD = secure_config['SMTP_PASSWORD']

# PayOS configuration
payOS = PayOS(
    client_id=secure_config['CLIENT_ID'],
    api_key=secure_config['API_KEY'],
    checksum_key=secure_config['CHECKSUM_KEY']
)

SWAGGER_URL = '/api/docs'
API_URL = '/Swagger'

swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={
        'app_name': "DouneStore API",
        'dom_id': '#swagger-ui',
        'deepLinking': True,
        'supportedSubmitMethods': ['get', 'post', 'put', 'delete', 'patch'],
        'displayOperationId': True,
        'displayRequestDuration': True,
        'docExpansion': 'none',
        'filter': True
    }
)

app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')

@app.route('/Swagger')
def serve_swagger_spec():
    try:
        with open('static/Swagger.json', 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    except FileNotFoundError:
        return jsonify({'error': 'Swagger file not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return send_from_directory(root_dir, 'index.html')

@app.route('/cancel.html')
def cancel():
    return send_from_directory(public_dir, 'cancel.html')

@app.route('/success.html')
def success():
    return send_from_directory(public_dir, 'success.html')

@app.route('/create_payment_link', methods=['POST'])
def create_payment():
    domain = request.host_url.rstrip('/')  # Lấy domain hiện tại
    try:
        data = request.get_json()
        
        if not data or 'amount' not in data or 'description' not in data:
            return jsonify({
                "error": "Missing required fields",
                "message": "Amount và description là bắt buộc"
            }), 400
            
        order_code = int(datetime.now().strftime('%y%m%d%H%M%S') + str(random.randint(100, 999)))
        
        items_data = []
        if 'items' in data:
            for item in data['items']:
                # Kiểm tra và đảm bảo quantity là số nguyên dương
                try:
                    quantity = int(item.get('quantity', 0))
                    if quantity <= 0:
                        return jsonify({
                            "error": "Invalid quantity",
                            "message": "Số lượng sản phẩm phải lớn hơn 0"
                        }), 400
                except ValueError:
                    return jsonify({
                        "error": "Invalid quantity format",
                        "message": "Số lượng phải là số nguyên"
                    }), 400
                
                # Kiểm tra và đảm bảo price là số nguyên dương
                try:
                    # Chuyển đổi price thành số nguyên (đơn vị là VND)
                    price = int(float(item.get('price', 0)))
                    if price <= 0:
                        return jsonify({
                            "error": "Invalid price",
                            "message": "Giá sản phẩm phải lớn hơn 0"
                        }), 400
                except ValueError:
                    return jsonify({
                        "error": "Invalid price format",
                        "message": "Giá sản phẩm phải là số"
                    }), 400
                
                items_data.append(ItemData(
                    name=item['name'],
                    quantity=quantity,
                    price=price
                ))
        
        # Đảm bảo amount cũng là số nguyên
        try:
            amount = int(float(data['amount']))
            if amount <= 0:
                return jsonify({
                    "error": "Invalid amount",
                    "message": "Số tiền phải lớn hơn 0"
                }), 400
        except ValueError:
            return jsonify({
                "error": "Invalid amount format",
                "message": "Số tiền phải là số"
            }), 400
        
        paymentData = PaymentData(
            orderCode=order_code,
            amount=amount,
            description=data['description'],
            cancelUrl=f"{domain}/cancel.html",  # Sử dụng domain động
            returnUrl=f"{domain}/success.html", # Sử dụng domain động
            signature="",
            items=items_data
        )
        
        payosCreatePayment = payOS.createPaymentLink(paymentData)
        print("PayOS Response:", payosCreatePayment.to_json())
        return jsonify(payosCreatePayment.to_json())
    except Exception as e:
        print("Error:", str(e))
        return jsonify({
            "error": str(e),
            "message": "Không thể tạo link thanh toán"
        }), 403

def send_otp_email(email, otp):
    msg = MIMEMultipart()
    msg['From'] = SMTP_SERVER
    msg['To'] = email
    msg['Subject'] = "Xác thực đăng ký tài khoản"
    
    body = f"Mã OTP của bạn là: {otp}"
    msg.attach(MIMEText(body, 'plain'))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)

def generate_unique_link(length=200):
    while True:
        characters = string.ascii_letters + string.digits
        random_link = ''.join(random.choice(characters) for _ in range(length))
        
        if not db.User.find_one({'account_link': random_link}):
            return random_link

def generate_account_name(length=random.randint(5, 8)):
    characters = string.ascii_letters + string.digits
    while True:
        account_name = ''.join(random.choice(characters) for _ in range(length))
        if not db.User.find_one({'account_name': account_name}):
            return account_name

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data['email']
        password = data['password']
        fullname = data['fullname']

        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        otp_storage[email] = {
            'otp': otp,
            'fullname': fullname,
            'password': bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()),
            'timestamp': datetime.now()
        }

        send_otp_email(email, otp)

        return jsonify({'success': True, 'message': 'OTP đã được gửi đến email của bạn'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/verify', methods=['POST'])
def verify():
    try:
        data = request.get_json()
        email = data['email']
        otp = data['otp']

        if email not in otp_storage or otp_storage[email]['otp'] != otp:
            return jsonify({'success': False, 'message': 'OTP không hợp lệ'}), 400

        if datetime.now() - otp_storage[email]['timestamp'] > timedelta(minutes=15):
            del otp_storage[email]
            return jsonify({'success': False, 'message': 'OTP đã hết hạn'}), 400

        account_link = generate_unique_link()
        account_name = generate_account_name()

        db.User.insert_one({
            'fullname': otp_storage[email]['fullname'],
            'email': email,
            'password': otp_storage[email]['password'],
            'role': 'Member',
            'account_link': account_link,
            'account_name': account_name,
            'avatar': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHbEB1-Dr0WWq3h2HYDaK0e-AklnBEjMcoSg&s',
            'createdAt': datetime.now()
        })

        del otp_storage[email]

        return jsonify({
            'success': True, 
            'message': 'Đăng ký thành công',
            'account_link': account_link,
            'account_name': account_name
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data['email']
        password = data['password']

        user = db.User.find_one({'email': email})
        
        if not user:
            return jsonify({'success': False, 'message': 'Email không tồn tại'}), 400
        
        if bcrypt.checkpw(password.encode('utf-8'), user['password']):
            return jsonify({
                'success': True, 
                'message': 'Đăng nhập thành công',
                'user': {
                    'fullname': user['fullname'],
                    'email': user['email'],
                    'role': user['role'],
                    'account_link': user.get('account_link', ''),
                    'account_name': user.get('account_name', ''),
                    'avatar': user.get('avatar', '')
                }
            })
        else:
            return jsonify({'success': False, 'message': 'Mật khẩu không chính xác'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data['email']
        
        user = db.User.find_one({'email': email})
        if not user:
            return jsonify({'success': False, 'message': 'Email không tồn tại'}), 404

        token = jwt.encode({
            'email': email,
            'exp': datetime.utcnow() + timedelta(hours=1)
        }, JWT_SECRET)

        reset_link = f"http://127.0.0.1:5500/Form/reset-password.html?token={token}"

        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = email
        msg['Subject'] = "Khôi phục mật khẩu"
        
        body = f"""
        <html>
            <body>
                <p>Bạn đã yêu cầu khôi phục mật khẩu.</p>
                <p>Click vào link sau để đặt lại mật khẩu:</p>
                <a href="{reset_link}">Đặt lại mật khẩu</a>
                <p>Link này sẽ hết hạn sau 1 giờ.</p>
            </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        return jsonify({'success': True, 'message': 'Email khôi phục đã được gửi'})

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        token = data['token']
        new_password = data['password']

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            email = payload['email']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Link đã hết hạn'}), 400
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Link không hợp lệ'}), 400

        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        db.User.update_one(
            {'email': email},
            {'$set': {'password': hashed_password}}
        )

        return jsonify({'success': True, 'message': 'Mật khẩu đã được cập nhật'})

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/user/<account_link>', methods=['GET'])
def get_user(account_link):
    try:
        user = db.User.find_one({'account_link': account_link})
        
        if user: 
            user_data = {
                '_id': str(user['_id']),
                'fullname': user['fullname'],
                'email': user['email'],
                'role': user['role'],
                'account_link': user['account_link'],
                'account_name': user.get('account_name', ''),
                'avatar': user['avatar'],
                'phone': user.get('phone', ''),
                'address': user.get('address', ''),
                'createdAt': user['createdAt'].isoformat()
            }
            
            try:
                orders_count = db.Orders.count_documents({'user_id': str(user['_id'])})
                user_data['stats'] = {
                    'orders': orders_count,
                    'rating': 4.8
                }
            except Exception as stats_error:
                user_data['stats'] = {
                    'orders': 0,
                    'rating': 0
                }
            
            return jsonify(user_data)
        
        return jsonify({'error': 'User not found'}), 404
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/user/update/<account_link>', methods=['POST'])
def update_user(account_link):
    try:
        data = request.get_json()
        
        user = db.User.find_one({'account_link': account_link})
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy người dùng'
            }), 404

        update_data = {}
        
        if 'fullname' in data:
            new_fullname = data['fullname'].strip()
            if new_fullname != user.get('fullname', ''):
                update_data['fullname'] = new_fullname
        
        if 'phone' in data:
            new_phone = data['phone'].strip()
            if new_phone != user.get('phone', ''):
                if new_phone and (not new_phone.isdigit() or len(new_phone) != 10):
                    return jsonify({
                        'success': False,
                        'message': 'Số điện thoại không hợp lệ'
                    }), 400
                update_data['phone'] = new_phone
        
        if 'address' in data:
            new_address = data['address'].strip()
            if new_address != user.get('address', ''):
                update_data['address'] = new_address

        if not update_data:
            return jsonify({
                'success': True,
                'message': 'Không có thay đổi nào được thực hiện'
            })

        update_data['updatedAt'] = datetime.now()

        result = db.User.update_one(
            {'account_link': account_link},
            {'$set': update_data}
        )

        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Cập nhật thông tin thành công'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Không thể cập nhật thông tin'
            }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/user/update-avatar/<account_link>', methods=['POST'])
def update_avatar(account_link):
    try:
        data = request.get_json()
        if not data or 'avatar' not in data:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy dữ liệu avatar'
            }), 400

        avatar_base64 = data['avatar']
        
        result = db.User.update_one(
            {'account_link': account_link},
            {'$set': {
                'avatar': avatar_base64,
                'updatedAt': datetime.now()
            }}
        )

        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Cập nhật avatar thành công',
                'avatar': avatar_base64
            })
        
        return jsonify({
            'success': False,
            'message': 'Không thể cập nhật avatar'
        }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Có lỗi xảy ra khi cập nhật avatar',
            'error': str(e)
        }), 500

@app.route('/products', methods=['GET'])
def get_products():
    try:
        # Lấy tất cả sản phẩm từ collection
        products = list(db.Product.find())
        
        # Chuyển đổi ObjectId thành string để có thể serialize
        for product in products:
            product['_id'] = str(product['_id'])
        
        return jsonify({
            'success': True,
            'products': products
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/services', methods=['GET'])
def get_services():
    try:
        services = list(db.Product.find({"category": "services"}))
        for service in services:
            service['_id'] = str(service['_id'])
        
        return jsonify({
            'success': True,
            'services': services
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/services/use/<service_id>', methods=['POST'])
def use_service(service_id):
    try:
        data = request.get_json()
        user_id = data.get('userId')        
        return jsonify({
            'success': True,
            'message': 'Bắt đầu sử dụng dịch vụ thành công'
        })
    except Exception as e:
    
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/user/check-role/<account_link>', methods=['GET'])
def check_user_role(account_link):
    try:
        user = db.User.find_one({'account_link': account_link})
        if user:
            return jsonify({
                'success': True,
                'role': user['role']
            })
        return jsonify({
            'success': False,
            'message': 'User not found'
        }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/user/change-password/<account_link>', methods=['POST'])
def change_password(account_link):
    try:
        data = request.get_json()
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')
        
        # Tìm user
        user = db.User.find_one({'account_link': account_link})
        if not user:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy người dùng'
            }), 404

        # Kiểm tra mật khẩu hiện tại
        if not bcrypt.checkpw(current_password.encode('utf-8'), user['password']):
            return jsonify({
                'success': False,
                'message': 'Mật khẩu hiện tại không chính xác'
            }), 400

        # Mã hóa và cập nhật mật khẩu mới
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        result = db.User.update_one(
            {'account_link': account_link},
            {'$set': {
                'password': hashed_password,
                'updatedAt': datetime.now()
            }}
        )

        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Đổi mật khẩu thành công'
            })
        
        return jsonify({
            'success': False,
            'message': 'Không thể cập nhật mật khẩu'
        }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/user/addresses/<account_link>', methods=['GET'])
def get_user_addresses(account_link):
    try:
        user = db.User.find_one({'account_link': account_link})
        if not user:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy người dùng'
            }), 404

        addresses = []
        
        # Thêm địa chỉ từ trường address (string) nếu có
        if 'address' in user and user['address']:
            addresses.append({
                'id': str(ObjectId()),
                'fullAddress': user['address'],
                'isDefault': True,
                'label': 'home'  # Mặc định là nhà riêng cho địa chỉ cũ
            })

        # Thêm địa chỉ từ trường addresses (array)
        if 'addresses' in user and isinstance(user['addresses'], list):
            addresses.extend(user['addresses'])

        print("Debug - All addresses:", addresses)
        return jsonify({
            'success': True,
            'addresses': addresses
        })

    except Exception as e:
        print("Error in get_user_addresses:", str(e))
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/user/address/<account_link>', methods=['POST'])
def add_user_address(account_link):
    try:
        data = request.get_json()
        user = db.User.find_one({'account_link': account_link})
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy người dùng'
            }), 404

        new_address = {
            'id': str(ObjectId()),
            'province': data['province'],
            'district': data['district'],
            'ward': data['ward'],
            'specific': data['specific'],
            'note': data.get('note', ''),
            'label': data.get('label', 'other'),
            'isDefault': data.get('isDefault', False)
        }

        # Nếu đây là địa chỉ mặc định
        if new_address['isDefault']:
            # Bỏ mặc định của địa chỉ cũ trong addresses array
            if 'addresses' in user:
                db.User.update_one(
                    {'account_link': account_link},
                    {'$set': {'addresses.$[].isDefault': False}}
                )
            # Bỏ mặc định của địa chỉ string cũ
            if 'address' in user:
                db.User.update_one(
                    {'account_link': account_link},
                    {'$unset': {'address': ''}}
                )

        # Thêm địa chỉ mới
        db.User.update_one(
            {'account_link': account_link},
            {'$push': {'addresses': new_address}}
        )

        return jsonify({
            'success': True,
            'message': 'Thêm địa chỉ thành công',
            'address': new_address
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/user/address/<account_link>/<address_id>', methods=['DELETE'])
def delete_user_address(account_link, address_id):
    try:
        # Kiểm tra xem địa chỉ có phải mặc định không
        user = db.User.find_one({
            'account_link': account_link,
            'addresses': {'$elemMatch': {'id': address_id, 'isDefault': True}}
        })

        # Xóa địa chỉ
        result = db.User.update_one(
            {'account_link': account_link},
            {'$pull': {'addresses': {'id': address_id}}}
        )

        if result.modified_count > 0:
            # Nếu xóa địa chỉ mặc định, đặt địa chỉ đầu tiên còn lại làm mặc định
            if user:
                remaining_address = db.User.find_one(
                    {'account_link': account_link},
                    {'addresses': {'$slice': 1}}
                )
                if remaining_address and 'addresses' in remaining_address and remaining_address['addresses']:
                    db.User.update_one(
                        {
                            'account_link': account_link,
                            'addresses.id': remaining_address['addresses'][0]['id']
                        },
                        {'$set': {'addresses.$.isDefault': True}}
                    )

            return jsonify({
                'success': True,
                'message': 'Xóa địa chỉ thành công'
            })
        
        return jsonify({
            'success': False,
            'message': 'Không tìm thấy địa chỉ'
        }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/user/address/<account_link>/<address_id>/default', methods=['POST'])
def set_default_address(account_link, address_id):
    try:
        print(f"Setting default address: {address_id} for account: {account_link}")
        
        # Lấy thông tin người dùng
        user = db.User.find_one({'account_link': account_link})
        if not user:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy người dùng'
            }), 404

        # Tìm địa chỉ được chọn trong mảng addresses
        selected_address = None
        if 'addresses' in user:
            for addr in user['addresses']:
                if addr.get('id') == address_id:
                    selected_address = addr
                    break

        if not selected_address:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy địa chỉ'
            }), 404

        # Cập nhật tất cả địa chỉ trong mảng thành không mặc định
        db.User.update_one(
            {'account_link': account_link},
            {'$set': {'addresses.$[].isDefault': False}}
        )

        # Đặt địa chỉ được chọn thành mặc định
        result = db.User.update_one(
            {
                'account_link': account_link,
                'addresses.id': address_id
            },
            {'$set': {'addresses.$.isDefault': True}}
        )

        # Chuyển địa chỉ cũ (nếu có) vào mảng addresses
        if 'address' in user and user['address']:
            old_address = {
                'id': str(ObjectId()),
                'fullAddress': user['address'],
                'isDefault': False,
                'label': 'home'
            }
            db.User.update_one(
                {'account_link': account_link},
                {
                    '$push': {'addresses': old_address},
                    '$unset': {'address': ''}
                }
            )

        print(f"Update result: {result.modified_count}")

        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Đã đặt làm địa chỉ mặc định'
            })

        return jsonify({
            'success': False,
            'message': 'Không thể đặt làm địa chỉ mặc định'
        }), 500

    except Exception as e:
        print(f"Error setting default address: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# Cart APIs
@app.route('/cart/add', methods=['POST'])
def add_to_cart():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        product_id = data.get('productId')

        if not user_id or not product_id:
            return jsonify({
                'success': False,
                'message': 'Thiếu thông tin người dùng hoặc sản phẩm'
            }), 400

        # Kiểm tra sản phẩm tồn tại
        product = db.Product.find_one({'_id': ObjectId(product_id)})
        if not product:
            return jsonify({
                'success': False,
                'message': 'Không tìm thấy sản phẩm'
            }), 404

        # Kiểm tra và tạo giỏ hàng nếu chưa có
        cart = db.Cart.find_one({'userId': user_id})
        if not cart:
            cart = {
                'userId': user_id,
                'items': [],
                'createdAt': datetime.now()
            }
            db.Cart.insert_one(cart)

        # Thêm sản phẩm vào giỏ hàng
        db.Cart.update_one(
            {'userId': user_id},
            {
                '$push': {
                    'items': {
                        'productId': product_id,
                        'quantity': 1,
                        'addedAt': datetime.now()
                    }
                },
                '$set': {'updatedAt': datetime.now()}
            }
        )

        return jsonify({
            'success': True,
            'message': 'Đã thêm vào giỏ hàng'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/cart/<user_id>', methods=['GET'])
def get_cart_items(user_id):
    try:
        cart = db.Cart.find_one({'userId': user_id})
        if not cart:
            return jsonify({
                'success': True,
                'items': []
            })

        # Lấy thông tin chi tiết của từng sản phẩm trong giỏ hàng
        cart_items = []
        for item in cart.get('items', []):
            product = db.Product.find_one({'_id': ObjectId(item['productId'])})
            if product:
                product['_id'] = str(product['_id'])
                cart_items.append({
                    'product': product,
                    'quantity': item['quantity'],
                    'addedAt': item['addedAt'].isoformat() if isinstance(item['addedAt'], datetime) else item['addedAt']
                })

        return jsonify({
            'success': True,
            'items': cart_items
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/cart/remove', methods=['DELETE'])
def remove_from_cart():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        product_id = data.get('productId')

        if not user_id or not product_id:
            return jsonify({
                'success': False,
                'message': 'Thiếu thông tin người dùng hoặc sản phẩm'
            }), 400

        # Xóa sản phẩm khỏi giỏ hàng
        result = db.Cart.update_one(
            {'userId': user_id},
            {
                '$pull': {'items': {'productId': product_id}},
                '$set': {'updatedAt': datetime.now()}
            }
        )

        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Đã xóa sản phẩm khỏi giỏ hàng'
            })

        return jsonify({
            'success': False,
            'message': 'Không tìm thấy sản phẩm trong giỏ hàng'
        }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/cart/update', methods=['POST'])
def update_cart_item():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        product_id = data.get('productId')
        quantity = data.get('quantity')

        if not all([user_id, product_id, quantity]):
            return jsonify({
                'success': False,
                'message': 'Thiếu thông tin cần thiết'
            }), 400

        # Kiểm tra số lượng hợp lệ
        if not isinstance(quantity, int) or quantity < 1:
            return jsonify({
                'success': False,
                'message': 'Số lượng không hợp lệ'
            }), 400

        # Cập nhật số lượng sản phẩm trong giỏ hàng
        result = db.Cart.update_one(
            {
                'userId': user_id,
                'items.productId': product_id
            },
            {
                '$set': {
                    'items.$.quantity': quantity,
                    'updatedAt': datetime.now()
                }
            }
        )

        if result.modified_count > 0:
            return jsonify({
                'success': True,
                'message': 'Đã cập nhật số lượng sản phẩm'
            })

        return jsonify({
            'success': False,
            'message': 'Không tìm thấy sản phẩm trong giỏ hàng'
        }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
