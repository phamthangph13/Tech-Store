export default class OrderManager {
    constructor() {
        this.init();
        this.loadCartItems();
    }

    init() {
        // Lắng nghe sự kiện click trên các nút thanh toán
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-checkout')) {
                this.handleCheckout(e);
            }
        });
    }

    async handleCheckout(e) {
        try {
            const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user'));
            if (!user) {
                this.showNotification('Vui lòng đăng nhập để thanh toán', 'error');
                return;
            }

            // Lấy thông tin sản phẩm từ card được click
            const orderCard = e.target.closest('.order-card');
            if (!orderCard) return;

            const productId = orderCard.dataset.productId;
            const quantity = orderCard.querySelector('.quantity-input').value;
            const productName = orderCard.querySelector('.order-info h3').textContent;
            const productPrice = parseInt(orderCard.querySelector('.order-price').textContent.replace(/[^\d]/g, ''));

            // Chuẩn bị dữ liệu thanh toán cho một sản phẩm
            const items = [{
                name: productName,
                quantity: parseInt(quantity),
                price: productPrice
            }];

            const totalAmount = productPrice * parseInt(quantity);
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
                            <div class="product-image-container">
                                <img src="${item.product.image}" alt="${item.product.name}" class="order-image">
                            </div>
                            <div class="order-info">
                                <h3>${item.product.name}</h3>
                                <p class="order-price">${this.formatPrice(item.product.price)}</p>
                                <div class="quantity-controls">
                                    <button class="quantity-btn minus"><i class="fas fa-minus"></i></button>
                                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="99">
                                    <button class="quantity-btn plus"><i class="fas fa-plus"></i></button>
                                </div>
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

        // Thêm event listeners cho các nút điều khiển số lượng
        this.attachQuantityControlListeners();
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

    attachQuantityControlListeners() {
        document.querySelectorAll('.quantity-controls').forEach(control => {
            const minusBtn = control.querySelector('.minus');
            const plusBtn = control.querySelector('.plus');
            const input = control.querySelector('.quantity-input');
            const productId = control.closest('.order-card').dataset.productId;

            minusBtn.addEventListener('click', () => {
                if (input.value > 1) {
                    input.value = parseInt(input.value) - 1;
                    this.updateCartItemQuantity(productId, parseInt(input.value));
                }
            });

            plusBtn.addEventListener('click', () => {
                if (input.value < 99) {
                    input.value = parseInt(input.value) + 1;
                    this.updateCartItemQuantity(productId, parseInt(input.value));
                }
            });

            input.addEventListener('change', () => {
                let value = parseInt(input.value);
                if (isNaN(value) || value < 1) value = 1;
                if (value > 99) value = 99;
                input.value = value;
                this.updateCartItemQuantity(productId, value);
            });
        });
    }

    async updateCartItemQuantity(productId, quantity) {
        try {
            const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user'));
            if (!user) return;

            // Changed from PUT to POST method since PUT might not be allowed
            const response = await fetch('http://localhost:5000/cart/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: user.account_link,
                    productId: productId,
                    quantity: quantity
                })
            });

            // Add response validation
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.loadCartItems();
            } else {
                throw new Error(data.message || 'Failed to update quantity');
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
            this.showNotification('Không thể cập nhật số lượng', 'error');
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
