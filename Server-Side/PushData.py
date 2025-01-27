from pymongo import MongoClient
from datetime import datetime

# Kết nối đến MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['DouneStore']

# Dữ liệu sản phẩm mẫu
sample_products = [
    {
        "name": "Robot Hút Bụi Thông Minh",
        "description": "Robot hút bụi tự động với công nghệ AI, tự động nhận diện và làm sạch hiệu quả",
        "category": "robots",
        "type": "Objects",
        "image": "https://cdn.tgdd.vn/Products/Images/7922/242732/robot-hut-bui-lau-nha-xiaomi-mop-2-pro-sku2-1.jpg",
        "icon": "fas fa-robot",
        "isPremium": True,
        "price": 7990000,
        "features": [
            "Tự động nhận diện vật cản",
            "Pin sử dụng 4 giờ",
            "Điều khiển qua điện thoại",
            "Bảo hành 12 tháng"
        ],
        "createdAt": datetime.now()
    },
    {
        "name": "Robot Lau Nhà Thông Minh",
        "description": "Robot lau nhà thông minh với công nghệ lau hiện đại, tự động làm sạch sàn nhà",
        "category": "robots",
        "type": "Objects",
        "image": "https://cdn.tgdd.vn/Products/Images/7922/286990/robot-hut-bui-lau-nha-dreame-l10s-pro-1.jpg",
        "icon": "fas fa-broom",
        "isPremium": True,
        "price": 8990000,
        "features": [
            "Lau và hút bụi cùng lúc",
            "Tự động châm nước",
            "Điều khiển bằng giọng nói",
            "Bảo hành 24 tháng"
        ],
        "createdAt": datetime.now()
    },
    {
        "name": "Dịch Vụ Bảo Trì Robot",
        "description": "Dịch vụ bảo trì, sửa chữa robot định kỳ với đội ngũ kỹ thuật chuyên nghiệp",
        "category": "services",
        "type": "Intangibles",
        "image": "https://robotsanpham.com/wp-content/uploads/2023/03/sua-chua-robot.jpg",
        "icon": "fas fa-tools",
        "isPremium": False,
        "price": 499000,
        "features": [
            "Bảo trì định kỳ",
            "Sửa chữa tận nơi",
            "Đội ngũ kỹ thuật chuyên nghiệp",
            "Bảo hành sau sửa chữa"
        ],
        "createdAt": datetime.now()
    },

    {
        "name": "Nhận dạng biển số xe",
        "description": "Dịch vụ nhận dạng biển số xe thông minh sử dụng AI, giúp tự động nhận diện và quản lý thông tin phương tiện một cách chính xác và nhanh chóng",
        "category": "services",
        "type": "Intangibles",
        "image": "https://robotsanpham.com/wp-content/uploads/2023/03/sua-chua-robot.jpg",
        "icon": "fa fa-car",
        "isPremium": True,
        "price": 499000,
        "features": [
            "Nhận dạng biển số xe chính xác 99%",
            "Tích hợp dễ dàng với hệ thống quản lý",
            "Xử lý thời gian thực 24/7",
            "Hỗ trợ đa nền tảng",
            "Báo cáo và thống kê chi tiết",
            "Bảo mật dữ liệu theo chuẩn quốc tế"
        ],
        "createdAt": datetime.now()
    },
]


def seed_products():
    try:
        # Xóa tất cả sản phẩm cũ (tùy chọn)
        db.Product.delete_many({})
        
        # Thêm sản phẩm mới
        result = db.Product.insert_many(sample_products)
        
        print(f"Đã thêm thành công {len(result.inserted_ids)} sản phẩm")
        
        # Hiển thị danh sách sản phẩm đã thêm
        print("\nDanh sách sản phẩm:")
        for product in db.Product.find():
            print(f"- {product['name']} ({product['category']})")
            
    except Exception as e:
        print(f"Lỗi: {str(e)}")
    finally:
        client.close()

def seed_services():
    try:
        # Xóa tất cả services cũ
        db.Services.delete_many({})
        
        # Thêm services mới
        result = db.Services.insert_many(sample_services)
        
        print(f"Đã thêm thành công {len(result.inserted_ids)} services")
        
        # Hiển thị danh sách services đã thêm
        print("\nDanh sách services:")
        for service in db.Services.find():
            print(f"- {service['name']} ({'Premium' if service['isPremium'] else 'Free'})")
            
    except Exception as e:
        print(f"Lỗi: {str(e)}")

if __name__ == "__main__":
    seed_products()  # Seed products