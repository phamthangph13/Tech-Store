console.log('Settings.js loaded');

document.addEventListener('DOMContentLoaded', function() {
    // Xử lý form đổi mật khẩu
    const securityForm = document.querySelector('.security-form');
    if (securityForm && !securityForm.hasAttribute('data-initialized')) {
        securityForm.setAttribute('data-initialized', 'true');
        
        securityForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const currentPassword = this.querySelector('input[placeholder="Nhập mật khẩu hiện tại"]').value;
            const newPassword = this.querySelector('input[placeholder="Nhập mật khẩu mới"]').value;
            const confirmPassword = this.querySelector('input[placeholder="Xác nhận mật khẩu mới"]').value;

            try {
                const result = await changePassword(currentPassword, newPassword, confirmPassword);
                alert(result.message);
                // Reset form sau khi đổi mật khẩu thành công
                this.reset();
            } catch (error) {
                alert(error.message || 'Có lỗi xảy ra khi đổi mật khẩu');
            }
        });
    }

    // Xử lý nút đăng xuất
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn && !logoutBtn.hasAttribute('data-initialized')) {
        logoutBtn.setAttribute('data-initialized', 'true');
        
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                logout();
            }
        });
    }

    // Xử lý các nút toggle password
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        if (!btn.hasAttribute('data-initialized')) {
            btn.setAttribute('data-initialized', 'true');
            
            btn.addEventListener('click', function() {
                console.log('Toggle password clicked');
                const input = this.parentElement.querySelector('input');
                if (input.type === 'password') {
                    input.type = 'text';
                    this.classList.remove('fa-eye-slash');
                    this.classList.add('fa-eye');
                } else {
                    input.type = 'password';
                    this.classList.remove('fa-eye');
                    this.classList.add('fa-eye-slash');
                }
            });
        }
    });
}); 