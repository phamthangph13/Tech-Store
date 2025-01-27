document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productsGrid = document.querySelector('.products-grid');
    const isLoggedIn = true; // Assuming isLoggedIn is defined elsewhere in the code
    
    // Fetch products from API
    async function loadProducts() {
        try {
            const response = await fetch('http://localhost:5000/products');
            const data = await response.json();
            
            if (data.success) { 
                renderProducts(data.products);
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    // Render products to DOM
    function renderProducts(products) {
        productsGrid.innerHTML = products.map(product => `
            <div class="product-card" data-category="${product.category}" data-product-id="${product._id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}">
                    ${product.isPremium ? '<div class="premium-badge">Premium</div>' : ''}
                    ${product.discount ? `
                        <div class="discount-badge">-${product.discount}%</div>
                    ` : ''}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    ${product.price ? `
                        <div class="price-container">
                            ${product.discount ? `
                                <span class="original-price">${formatPrice(product.price)}</span>
                                <span class="discounted-price">${formatPrice(product.price * (1 - product.discount/100))}</span>
                            ` : `
                                <span class="discounted-price">${formatPrice(product.price)}</span>
                            `}
                        </div>
                    ` : ''}
                    <button class="add-to-cart ${product.type === 'Intangibles' ? 'use-now' : ''}">
                        ${product.type === 'Intangibles' ? 'Sử dụng ngay' : 'Thêm vào giỏ hàng'}
                    </button>
                </div>
            </div>
        `).join('');

        attachActionListeners();
    }

    // Helper function to format price
    function formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND' 
        }).format(price);
    }

    // Thêm hiệu ứng fade out/in cho sản phẩm
    function fadeOut(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
    }

    function fadeIn(element) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }

    // Xử lý việc lọc và hiển thị sản phẩm
    function filterProducts(category) {
        const products = document.querySelectorAll('.product-card');
        products.forEach(product => {
            product.style.transition = 'all 0.4s ease-out';

            if (category === 'all' || product.getAttribute('data-category') === category) {
                product.style.display = 'block';
                setTimeout(() => {
                    fadeIn(product);
                }, 50);
            } else {
                fadeOut(product);
                setTimeout(() => {
                    product.style.display = 'none';
                }, 400);
            }
        });
    }

    // Xử lý sự kiện click cho các nút filter
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Chỉ xử lý nếu nút chưa active
            if (!button.classList.contains('active')) {
                // Cập nhật trạng thái active
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Lọc sản phẩm
                const selectedCategory = button.getAttribute('data-category');
                filterProducts(selectedCategory);
            }
        });
    });

    // Update the event listener function to handle both types
    function attachActionListeners() {
        const actionButtons = document.querySelectorAll('.add-to-cart');
        actionButtons.forEach(button => {
            button.addEventListener('click', async (event) => {
                // Ngăn chặn hành vi mặc định của button
                event.preventDefault();

                if (!isUserLoggedIn()) {
                    showNotification('Vui lòng đăng nhập để tiếp tục!', 'error');
                    // Mở modal đăng nhập
                    const loginModal = document.getElementById('loginModal');
                    if (loginModal) {
                        loginModal.style.display = 'block';
                    }
                    return;
                }

                // Thêm hiệu ứng click
                button.classList.add('clicked');
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                button.appendChild(ripple);

                try {
                    // Lấy product ID từ thẻ cha gần nhất có class 'product-card'
                    const productCard = button.closest('.product-card');
                    if (!productCard) throw new Error('Không tìm thấy thông tin sản phẩm');

                    const productId = productCard.dataset.productId; // Thêm data-product-id vào product-card
                    const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user'));

                    if (button.classList.contains('use-now')) {
                        showNotification('Đang chuyển hướng đến trang dịch vụ!', 'success');
                    } else {
                        // Gọi API thêm vào giỏ hàng
                        const response = await fetch('http://localhost:5000/cart/add', {
                            method: 'POST',
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
                            showNotification('Đã thêm vào giỏ hàng!', 'success');
                        } else {
                            throw new Error(data.message || 'Không thể thêm vào giỏ hàng');
                        }
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showNotification(error.message || 'Có lỗi xảy ra. Vui lòng thử lại!', 'error');
                } finally {
                    // Xóa hiệu ứng click sau 600ms
                    setTimeout(() => {
                        button.classList.remove('clicked');
                        const ripple = button.querySelector('.ripple');
                        if (ripple) ripple.remove();
                    }, 600);
                }
            });
        });
    }

    // Hàm hiển thị thông báo
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        
        // Add icon based on type
        const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Remove notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 400);
        }, 3000);
    }

    // Thêm hàm kiểm tra đăng nhập
    function isUserLoggedIn() {
        // Kiểm tra từ sessionStorage trước
        const sessionUser = JSON.parse(sessionStorage.getItem('user'));
        if (sessionUser) return true;

        // Nếu không có trong sessionStorage, kiểm tra localStorage
        const localUser = JSON.parse(localStorage.getItem('user'));
        return !!localUser;
    }

    // Load products when page loads
    loadProducts();
}); 