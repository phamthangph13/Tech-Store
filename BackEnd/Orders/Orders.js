export default class OrderManager {
    constructor() {
        this.init();
        this.loadCartItems();
    }

    init() {
        // Lắng nghe sự kiện click trên các nút thanh toán
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-checkout')) {
                this.handleCheckout();
            }
        });
    }

    async handleCheckout() {
        try {
            const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user'));
            if (!user) {
                this.showNotification('Vui lòng đăng nhập để thanh toán', 'error');
                return;
            }

            // Lấy thông tin giỏ hàng
            const response = await fetch(`http://localhost:5000/cart/${user.account_link}`);
            const cartData = await response.json();

            if (!cartData.items || cartData.items.length === 0) {
                this.showNotification('Giỏ hàng trống', 'error');
                return;
            }

            // Tính tổng tiền và chuẩn bị dữ liệu thanh toán
            const items = cartData.items.map(item => ({
                name: item.product.name,
                quantity: item.quantity,
                price: item.product.price
            }));

            const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // Rút gọn mô tả để đảm bảo không quá 25 ký tự
            const description = `Thanh toan ${user.account_name}`;

            const paymentData = {
                amount: totalAmount,
                description: description,
                items: items
            };

            // Tạo link thanh toán
            const paymentResponse = await fetch('http://localhost:5000/create_payment_link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });

            const paymentResult = await paymentResponse.json();

            if (paymentResult.checkoutUrl) {
                window.location.href = paymentResult.checkoutUrl;
            } else {
                this.showNotification('Không thể tạo link thanh toán', 'error');
            }

        } catch (error) {
            console.error('Error during checkout:', error);
            this.showNotification('Có lỗi xảy ra khi thanh toán', 'error');
        }
    }

    async loadCartItems() {
        try {
            const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user'));
            if (!user || !user.account_link) {
                console.error('User not logged in');
                return;
            }

            const response = await fetch(`http://localhost:5000/cart/${user.account_link}`);
            const data = await response.json();

            if (data.success) {
                this.renderCartItems(data.items);
            }
        } catch (error) {
            console.error('Error loading cart items:', error);
        }
    }

    renderCartItems(items) {
        const cartContainer = document.querySelector('.orders-grid');
        if (!cartContainer) return;

        if (items.length === 0) {
            cartContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Giỏ hàng trống</p>
                </div>
            `;
            return;
        }

        cartContainer.innerHTML = `
            ${items.map(item => {
                const itemTotal = item.product.price * item.quantity;
                return `
                    <div class="order-card cart-item" data-aos="zoom-in" data-aos-delay="100" data-product-id="${item.product._id}">
                        <div class="order-header">
                            <span class="order-date">Thêm vào: ${new Date(item.addedAt).toLocaleDateString('vi-VN')}</span>
                            <span class="order-status in-cart">Trong giỏ hàng</span>
                        </div>
                        <div class="order-details">
                            <img src="${item.product.image}" alt="${item.product.name}" class="order-image">
                            <div class="order-info">
                                <h3>${item.product.name}</h3>
                                <p>Số lượng: ${item.quantity}</p>
                                <p class="order-price">${this.formatPrice(item.product.price)}</p>
                                <p class="item-total">Thành tiền: ${this.formatPrice(itemTotal)}</p>
                            </div>
                        </div>
                        <div class="order-actions">
                            <button class="btn-remove">
                                <i class="fas fa-trash"></i>
                                Xóa
                            </button>
                            <button class="btn-checkout">
                                <i class="fas fa-credit-card"></i>
                                Thanh toán ngay
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        `;

        // Thêm event listener cho nút xóa
        this.attachRemoveListeners();
    }

    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    }

    attachRemoveListeners() {
        document.querySelectorAll('.btn-remove').forEach(button => {
            button.addEventListener('click', async (e) => {
                const productId = e.target.closest('.order-card').dataset.productId;
                await this.removeFromCart(productId);
            });
        });
    }

    async removeFromCart(productId) {
        try {
            const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user'));
            if (!user) return;

            const response = await fetch('http://localhost:5000/cart/remove', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: user.account_link,
                    productId: productId
                })
            });

            const data = await response.json();
            if (data.success) {
                // Reload cart items after successful removal
                this.loadCartItems();
                // Show success notification
                this.showNotification('Đã xóa sản phẩm khỏi giỏ hàng', 'success');
            }
        } catch (error) {
            console.error('Error removing item from cart:', error);
            this.showNotification('Không thể xóa sản phẩm', 'error');
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 400);
        }, 3000);
    }
}

// Khởi tạo OrderManager khi file được load
new OrderManager();
