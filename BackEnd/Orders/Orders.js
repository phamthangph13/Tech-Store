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
            // Tải nội dung của Payment.html
            const response = await fetch('/Form/Payment.html');
            const html = await response.text();

            // Tạo container cho payment modal nếu chưa tồn tại
            let paymentModalContainer = document.getElementById('paymentModalContainer');
            if (!paymentModalContainer) {
                paymentModalContainer = document.createElement('div');
                paymentModalContainer.id = 'paymentModalContainer';
                document.body.appendChild(paymentModalContainer);
            }

            // Chèn HTML của payment modal
            paymentModalContainer.innerHTML = html;

            // Hiển thị modal
            const paymentModal = document.getElementById('paymentModal');
            if (paymentModal) {
                paymentModal.style.display = 'flex';

                // Xử lý chuyển đổi phương thức thanh toán
                const methodButtons = paymentModal.querySelectorAll('.method-item');
                const paymentForms = paymentModal.querySelectorAll('.payment-form');

                methodButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        // Xóa trạng thái active của tất cả các nút
                        methodButtons.forEach(btn => btn.classList.remove('active'));
                        // Thêm trạng thái active cho nút được click
                        button.classList.add('active');

                        // Ẩn tất cả các form
                        paymentForms.forEach(form => form.classList.remove('active'));
                        // Hiển thị form tương ứng
                        const method = button.getAttribute('data-method');
                        const targetForm = paymentModal.querySelector(`#${method}-form`);
                        if (targetForm) {
                            targetForm.classList.add('active');
                        }
                    });
                });

                // Xử lý copy thông tin ngân hàng
                const copyButtons = paymentModal.querySelectorAll('.copy-btn');
                copyButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const textToCopy = button.getAttribute('data-copy');
                        navigator.clipboard.writeText(textToCopy)
                            .then(() => {
                                // Thêm hiệu ứng phản hồi khi copy thành công
                                const originalIcon = button.innerHTML;
                                button.innerHTML = '<i class="fas fa-check"></i>';
                                setTimeout(() => {
                                    button.innerHTML = originalIcon;
                                }, 1500);
                            })
                            .catch(err => console.error('Copy failed:', err));
                    });
                });

                // Xử lý đóng modal
                const closeBtn = paymentModal.querySelector('.close-payment');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        paymentModal.style.display = 'none';
                    });
                }

                // Xử lý click bên ngoài modal
                paymentModal.addEventListener('click', (e) => {
                    if (e.target === paymentModal) {
                        paymentModal.style.display = 'none';
                    }
                });

                // Xử lý các bước thanh toán
                this.initializePaymentSteps(paymentModal);
                this.initializeFileUpload(paymentModal);

                // Thêm xử lý cho QR và E-wallet
                const qrForm = document.getElementById('qr-form');
                const ewalletForm = document.getElementById('ewallet-form');
                
                if (qrForm) {
                    this.initializeQRPayment(qrForm);
                }
                
                if (ewalletForm) {
                    this.initializeEWalletPayment(ewalletForm);
                }
            }
        } catch (error) {
            console.error('Error loading payment modal:', error);
        }
    }

    initializePaymentSteps(modal) {
        const forms = modal.querySelectorAll('.payment-form');
        
        forms.forEach(form => {
            const steps = form.querySelectorAll('.step');
            const contents = form.querySelectorAll('.step-content');
            const proceedBtn = form.querySelector('.btn-proceed');
            const backBtn = form.querySelector('.btn-back');
            let currentStep = 1;

            if (proceedBtn && backBtn) {
                // Xử lý nút Tiếp tục
                proceedBtn.addEventListener('click', () => {
                    if (currentStep < steps.length) {
                        // Kiểm tra điều kiện trước khi chuyển bước
                        if (this.validateStep(currentStep, form)) {
                            // Cập nhật steps
                            steps[currentStep - 1].classList.remove('active');
                            steps[currentStep].classList.add('active');

                            // Cập nhật content
                            contents[currentStep - 1].classList.remove('active');
                            contents[currentStep].classList.add('active');

                            currentStep++;

                            // Cập nhật text và trạng thái của các nút
                            this.updateButtonStates(currentStep, steps.length, proceedBtn, backBtn);
                            
                            // Nếu là bước cuối, thêm animation hoàn thành
                            if (currentStep === steps.length) {
                                this.showCompletionAnimation(form);
                            }
                        }
                    } else {
                        // Xử lý khi hoàn tất thanh toán
                        this.handlePaymentCompletion(modal);
                    }
                });

                // Xử lý nút Quay lại
                backBtn.addEventListener('click', () => {
                    if (currentStep > 1) {
                        currentStep--;

                        // Cập nhật steps
                        steps[currentStep].classList.remove('active');
                        steps[currentStep - 1].classList.add('active');

                        // Cập nhật content
                        contents[currentStep].classList.remove('active');
                        contents[currentStep - 1].classList.add('active');

                        // Cập nhật text và trạng thái của các nút
                        this.updateButtonStates(currentStep, steps.length, proceedBtn, backBtn);
                    }
                });
            }
        });
    }

    validateStep(step, form) {
        switch(step) {
            case 1:
                // Kiểm tra xem người dùng đã copy thông tin chưa
                return true; // Luôn cho phép qua bước 2
            case 2:
                // Kiểm tra xem đã upload biên lai chưa
                const preview = form.querySelector('#uploadPreview');
                if (!preview || !preview.querySelector('img')) {
                    alert('Vui lòng tải lên biên lai chuyển khoản');
                    return false;
                }
                return true;
            default:
                return true;
        }
    }

    updateButtonStates(currentStep, totalSteps, proceedBtn, backBtn) {
        // Cập nhật text của nút proceed
        if (currentStep === totalSteps) {
            proceedBtn.innerHTML = '<span>Hoàn tất</span><i class="fas fa-check"></i>';
            proceedBtn.classList.add('success');
        } else {
            proceedBtn.innerHTML = '<span>Tiếp tục</span><i class="fas fa-arrow-right"></i>';
            proceedBtn.classList.remove('success');
        }

        // Hiển thị/ẩn nút back
        backBtn.style.display = currentStep === 1 ? 'none' : 'flex';
    }

    showCompletionAnimation(form) {
        const successStatus = form.querySelector('.payment-status.success');
        if (successStatus) {
            successStatus.style.display = 'flex';
            successStatus.style.animation = 'fadeInScale 0.5s ease-out';
        }
    }

    handlePaymentCompletion(modal) {
        // Thêm class để kích hoạt animation
        modal.classList.add('completing');
        
        // Đợi animation hoàn thành rồi đóng modal
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('completing');
            
            // Hiển thị thông báo thành công
            this.showSuccessNotification();
        }, 1500);
    }

    showSuccessNotification() {
        // Tạo và hiển thị notification
        const notification = document.createElement('div');
        notification.className = 'payment-notification success';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <div class="notification-content">
                <h4>Thanh toán thành công!</h4>
                <p>Cảm ơn bạn đã sử dụng dịch vụ</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Xóa notification sau 3 giây
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    initializeFileUpload(modal) {
        const uploadArea = modal.querySelector('#uploadArea');
        const fileInput = modal.querySelector('#receiptUpload');
        const preview = modal.querySelector('#uploadPreview');

        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });

            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#4361ee';
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.style.borderColor = '#333';
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#333';
                
                if (e.dataTransfer.files.length) {
                    handleFile(e.dataTransfer.files[0]);
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files.length) {
                    handleFile(fileInput.files[0]);
                }
            });

            const handleFile = (file) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        preview.style.display = 'block';
                        preview.innerHTML = `<img src="${e.target.result}" alt="Receipt">`;
                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('Vui lòng chỉ tải lên file ảnh');
                }
            };
        }
    }

    initializeQRPayment(form) {
        const qrContainer = form.querySelector('.qr-container');
        const qrImage = qrContainer.querySelector('.qr-code');
        
        // Bước 1: Loading ban đầu
        qrImage.style.opacity = '0';
        const initialLoading = document.createElement('div');
        initialLoading.className = 'qr-initial-loading';
        initialLoading.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tạo mã QR...</p>
            </div>
        `;
        qrContainer.appendChild(initialLoading);

        // Bước 2: Hiển thị mã QR sau 3s
        setTimeout(() => {
            initialLoading.remove();
            qrImage.style.opacity = '1';
            qrImage.style.animation = 'fadeIn 0.5s ease';

            // Bước 3: Thêm overlay chờ thanh toán sau 5s
            setTimeout(() => {
                const loadingOverlay = document.createElement('div');
                loadingOverlay.className = 'qr-loading-overlay';
                loadingOverlay.innerHTML = `
                    <div class="loading-content">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Đang chờ thanh toán...</p>
                    </div>
                `;
                qrContainer.appendChild(loadingOverlay);
                
                // Bước 4: Random kết quả sau 10s
                setTimeout(() => {
                    const isSuccess = Math.random() > 0.3; // 70% tỷ lệ thành công
                    
                    if (isSuccess) {
                        loadingOverlay.querySelector('p').textContent = 'Thanh toán thành công!';
                        loadingOverlay.querySelector('i').className = 'fas fa-check-circle';
                        loadingOverlay.classList.add('success');
                        
                        setTimeout(() => {
                            this.handlePaymentCompletion(form.closest('.payment-modal'));
                        }, 1500);
                    } else {
                        loadingOverlay.querySelector('p').textContent = 'Thanh toán thất bại!';
                        loadingOverlay.querySelector('i').className = 'fas fa-times-circle';
                        loadingOverlay.classList.add('error');
                        
                        setTimeout(() => {
                            loadingOverlay.remove();
                            qrImage.style.opacity = '1';
                        }, 2000);
                    }
                }, 10000);
            }, 5000);
        }, 3000);
    }

    initializeEWalletPayment(form) {
        const qrContainer = form.querySelector('.qr-container');
        const qrImage = qrContainer.querySelector('.qr-code');
        
        // Bước 1: Loading ban đầu
        qrImage.style.opacity = '0';
        const initialLoading = document.createElement('div');
        initialLoading.className = 'qr-initial-loading';
        initialLoading.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tạo mã QR...</p>
            </div>
        `;
        qrContainer.appendChild(initialLoading);

        // Bước 2: Hiển thị mã QR sau 3s
        setTimeout(() => {
            initialLoading.remove();
            qrImage.style.opacity = '1';
            qrImage.style.animation = 'fadeIn 0.5s ease';

            // Bước 3: Thêm overlay chờ thanh toán sau 5s
            setTimeout(() => {
                const loadingOverlay = document.createElement('div');
                loadingOverlay.className = 'ewallet-loading-overlay';
                loadingOverlay.innerHTML = `
                    <div class="loading-content">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Đang chờ thanh toán...</p>
                    </div>
                `;
                qrContainer.appendChild(loadingOverlay);
                
                // Bước 4: Random kết quả sau 10s
                setTimeout(() => {
                    const isSuccess = Math.random() > 0.3; // 70% tỷ lệ thành công
                    
                    if (isSuccess) {
                        loadingOverlay.querySelector('p').textContent = 'Thanh toán thành công!';
                        loadingOverlay.querySelector('i').className = 'fas fa-check-circle';
                        loadingOverlay.classList.add('success');
                        
                        setTimeout(() => {
                            this.handlePaymentCompletion(form.closest('.payment-modal'));
                        }, 1500);
                    } else {
                        loadingOverlay.querySelector('p').textContent = 'Thanh toán thất bại!';
                        loadingOverlay.querySelector('i').className = 'fas fa-times-circle';
                        loadingOverlay.classList.add('error');
                        
                        setTimeout(() => {
                            loadingOverlay.remove();
                            qrImage.style.opacity = '1';
                        }, 2000);
                    }
                }, 10000);
            }, 5000);
        }, 3000);
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

        cartContainer.innerHTML = items.map(item => `
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
                    </div>
                </div>
                <div class="order-actions">
                    <button class="btn-checkout">
                        <i class="fas fa-credit-card"></i>
                        Thanh toán
                    </button>
                    <button class="btn-remove" onclick="removeFromCart('${item.product._id}')">
                        <i class="fas fa-trash"></i>
                        Xóa
                    </button>
                </div>
            </div>
        `).join('');

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
