// Thêm URL base của server
const API_BASE_URL = 'http://localhost:5000'; // Port mặc định của Flask

// Thêm biến global để lưu trạng thái đăng nhập
let currentUser = null; 

// Add this function near the top of your file, after the currentUser declaration
function handleLoginSuccess(user, remember = false) {
    // Store user data
    currentUser = user;
    
    // Store in sessionStorage by default
    sessionStorage.setItem('user', JSON.stringify(user));
    
    // If remember is checked, also store in localStorage
    if (remember) {
        localStorage.setItem('user', JSON.stringify(user));
        
        // Save login info if "Remember me" is checked
        const loginInfo = {
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-password').value
        };
        localStorage.setItem('savedLoginInfo', JSON.stringify(loginInfo));
    }
    
    // Update UI
    updateUIAfterLogin(user);
}

// Xử lý hiển thị modal login
function initializeLoginModal() {
    const loginBtn = document.querySelector('.login-btn');
    const loginModal = document.getElementById('loginModal');

    // Load form login từ file Login.html
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '../Form/Login.html', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            loginModal.innerHTML = xhr.responseText;
            
            // Tự động điền thông tin đăng nhập đã lưu
            const savedInfo = JSON.parse(localStorage.getItem('savedLoginInfo') || '{}');
            if (savedInfo.email) {
                document.getElementById('login-email').value = savedInfo.email;
                document.getElementById('login-password').value = savedInfo.password || '';
                document.getElementById('remember').checked = true;
            }

            // Thêm event listeners cho form đăng nhập
            const registerLink = loginModal.querySelector('.register-link a');
            const forgotPasswordLink = loginModal.querySelector('.forgot-password');
            
            // Chuyển sang form đăng ký
            registerLink.addEventListener('click', function(e) {
                e.preventDefault(); 
                loginModal.style.display = 'none';
                // Đảm bảo registerModal đã được khởi tạo
                const registerModal = document.getElementById('registerModal');
                if (!registerModal.innerHTML) {
                    initializeRegisterModal(true); // Truyền true để chỉ load nội dung
                } else {
                    registerModal.style.display = 'block';
                }
            });

            // Chuyển sang form quên mật khẩu
            forgotPasswordLink.addEventListener('click', function(e) {
                e.preventDefault();
                loginModal.style.display = 'none';
                initializeForgotPasswordModal();
            });

            // Sau khi load xong form, thêm các event listeners
            const closeBtn = document.querySelector('.close-btn');
            const togglePassword = document.querySelector('.toggle-password');

            // Hiện modal khi click nút đăng nhập
            loginBtn.addEventListener('click', function() {
                loginModal.style.display = 'block';
            });

            // Đóng modal khi click nút close
            closeBtn.addEventListener('click', function() {
                loginModal.style.display = 'none';
            });

            // Đóng modal khi click bên ngoài
            window.addEventListener('click', function(event) {
                if (event.target == loginModal) {
                    loginModal.style.display = 'none';
                }
            });

            // Toggle hiển thị mật khẩu
            togglePassword.addEventListener('click', function() {
                const passwordInput = document.getElementById('password');
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    this.classList.remove('fa-eye');
                    this.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    this.classList.remove('fa-eye-slash');
                    this.classList.add('fa-eye');
                }
            });

            // Thêm xử lý submit form đăng nhập
            const loginForm = loginModal.querySelector('#loginForm');
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                const remember = document.getElementById('remember').checked;

                try {
                    const response = await fetch(`${API_BASE_URL}/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email, password })
                    });

                    const data = await response.json();
                    if (data.success) {
                        handleLoginSuccess(data.user, remember);
                        loginModal.style.display = 'none';
                        alert('Đăng nhập thành công!');
                    } else {
                        alert(data.message);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Có lỗi xảy ra khi đăng nhập');
                }
            });
        }
    };
    xhr.send();
}

// Xử lý hiển thị modal register
function initializeRegisterModal(onlyLoadContent = false) {
    const registerBtn = document.querySelector('.signup-btn');
    let registerModal = document.getElementById('registerModal');

    // Nếu modal chưa tồn tại, tạo mới
    if (!registerModal) {
        registerModal = document.createElement('div');
        registerModal.className = 'register-modal';
        registerModal.id = 'registerModal';
        document.body.appendChild(registerModal);
    }

    // Load form register từ file Register.html
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '../Form/Register.html', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            registerModal.innerHTML = xhr.responseText;
            
            if (!onlyLoadContent) {
                // Chỉ thêm event listener cho nút đăng ký nếu không phải load từ form login
                registerBtn.addEventListener('click', function() {
                    registerModal.style.display = 'block';
                });
            } else {
                // Nếu được gọi từ form login, hiển thị ngay
                registerModal.style.display = 'block';
            }

            // Thêm các event listeners khác
            const closeBtn = registerModal.querySelector('.close-btn');
            const loginLink = registerModal.querySelector('.login-link a');
            const togglePasswords = registerModal.querySelectorAll('.toggle-password');

            // Đóng modal
            closeBtn.addEventListener('click', function() {
                registerModal.style.display = 'none';
            });

            // Quay lại form đăng nhập
            loginLink.addEventListener('click', function(e) {
                e.preventDefault();
                registerModal.style.display = 'none';
                document.getElementById('loginModal').style.display = 'block';
            });

            // Đóng modal khi click bên ngoài
            window.addEventListener('click', function(event) {
                if (event.target == registerModal) {
                    registerModal.style.display = 'none';
                }
            });

            // Toggle hiển thị mật khẩu cho cả hai trường password
            togglePasswords.forEach(toggle => {
                toggle.addEventListener('click', function() {
                    const passwordInput = this.previousElementSibling;
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        this.classList.remove('fa-eye');
                        this.classList.add('fa-eye-slash');
                    } else {
                        passwordInput.type = 'password';
                        this.classList.remove('fa-eye-slash');
                        this.classList.add('fa-eye');
                    }
                });
            });

            // Thêm xử lý submit form đăng ký
            const registerForm = registerModal.querySelector('#registerForm');
            console.log('Register form:', registerForm);

            registerForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const fullname = document.getElementById('register-fullname').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirm-password').value;

                if (password !== confirmPassword) {
                    alert('Mật khẩu xác nhận không khớp');
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/register`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ fullname, email, password })
                    });

                    const data = await response.json();
                    if (data.success) {
                        registerModal.style.display = 'none';
                        initializeVerifyModal(email);
                    } else {
                        alert(data.message);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Có lỗi xảy ra khi đăng ký');
                }
            });
        }
    };
    xhr.send();
}

// Thêm hàm mới để xử lý form quên mật khẩu
function initializeForgotPasswordModal() {
    const forgotPasswordModal = document.createElement('div');
    forgotPasswordModal.className = 'forgot-password-modal';
    forgotPasswordModal.id = 'forgotPasswordModal';
    document.body.appendChild(forgotPasswordModal);

    const xhr = new XMLHttpRequest();
    xhr.open('GET', '../Form/ForgetPassword.html', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            forgotPasswordModal.innerHTML = xhr.responseText;
            forgotPasswordModal.style.display = 'block';

            // Xử lý đóng modal
            const closeBtn = forgotPasswordModal.querySelector('.close-btn');
            closeBtn.addEventListener('click', function() {
                forgotPasswordModal.style.display = 'none';
            });

            // Xử lý click bên ngoài
            window.addEventListener('click', function(event) {
                if (event.target == forgotPasswordModal) {
                    forgotPasswordModal.style.display = 'none';
                }
            });

            // Xử lý quay lại form đăng nhập
            const backToLoginLink = forgotPasswordModal.querySelector('.back-to-login a');
            backToLoginLink.addEventListener('click', function(e) {
                e.preventDefault();
                forgotPasswordModal.style.display = 'none';
                document.getElementById('loginModal').style.display = 'block';
            });

            // Xử lý submit form quên mật khẩu
            const forgotPasswordForm = forgotPasswordModal.querySelector('#forgotPasswordForm');
            forgotPasswordForm.addEventListener('submit', function(e) {
                e.preventDefault();
                // Thêm logic xử lý quên mật khẩu ở đây
                console.log('Forgot password form submitted');
            });
        }
    };
    xhr.send();
}

function initializeVerifyModal(email) {
    const verifyModal = document.getElementById('verifyModal');
    
    // Load verify form content
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '../Form/Verify.html', true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            verifyModal.innerHTML = xhr.responseText;
            verifyModal.style.display = 'block';
            
            // Close button handler
            const closeBtn = verifyModal.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => {
                verifyModal.style.display = 'none';
            });

            // OTP input handlers
            const otpInputs = verifyModal.querySelectorAll('.otp-input');
            otpInputs.forEach((input, index) => {
                input.addEventListener('keyup', (e) => {
                    if (e.key >= 0 && e.key <= 9) {
                        if (index < otpInputs.length - 1) {
                            otpInputs[index + 1].focus();
                        }
                    } else if (e.key === 'Backspace') {
                        if (index > 0) {
                            otpInputs[index - 1].focus();
                        }
                    }
                });
            });

            // Timer and resend code
            let timeLeft = 60;
            const timerElement = document.getElementById('timer');
            const resendButton = document.getElementById('resendCode');
            
            const countdown = setInterval(() => {
                timeLeft--;
                timerElement.textContent = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(countdown);
                    resendButton.disabled = false;
                }
            }, 1000);

            // Back to register handler
            const backToRegister = verifyModal.querySelector('.back-to-register a');
            backToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                verifyModal.style.display = 'none';
                document.getElementById('registerModal').style.display = 'block';
            });

            // Thêm xử lý submit form verify
            const verifyForm = verifyModal.querySelector('#verifyForm');
            verifyForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const otpInputs = verifyModal.querySelectorAll('.otp-input');
                const otp = Array.from(otpInputs).map(input => input.value).join('');

                try {
                    const response = await fetch(`${API_BASE_URL}/verify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email, otp })
                    });

                    const data = await response.json();
                    if (data.success) {
                        alert('Đăng ký thành công!');
                        verifyModal.style.display = 'none';
                        document.getElementById('loginModal').style.display = 'block';
                    } else {
                        alert(data.message);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Có lỗi xảy ra khi xác thực');
                }
            });

            // Cập nhật xử lý nút gửi lại mã
            resendButton.addEventListener('click', async function() {
                try {
                    const response = await fetch(`${API_BASE_URL}/register`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email })
                    });

                    const data = await response.json();
                    if (data.success) {
                        // Reset timer
                        timeLeft = 60;
                        resendButton.disabled = true;
                        alert('Đã gửi lại mã OTP');
                    } else {
                        alert(data.message);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Có lỗi xảy ra khi gửi lại mã');
                }
            });
        }
    };
    xhr.send();
}

// Tách phần khởi tạo thành hàm riêng
function initializeAuth() {
    // Đảm bảo tất cả modal containers tồn tại
    const containers = ['loginModal', 'registerModal', 'verifyModal', 'forgotPasswordModal'];
    containers.forEach(id => {
        if (!document.getElementById(id)) {
            const div = document.createElement('div');
            div.id = id;
            div.className = id.includes('verify') ? 'verify-modal' : 'modal';
            document.body.appendChild(div);
        }
    });

    // Kiểm tra trạng thái đăng nhập
    checkLoginState();

    // Khởi tạo các modal và event listeners
    initializeLoginModal();
    initializeRegisterModal();
}

// Cập nhật hàm checkLoginState
function checkLoginState() {
    console.log('Checking login state...'); // Debug log
    
    // Kiểm tra trong sessionStorage trước
    let user = JSON.parse(sessionStorage.getItem('user'));
    console.log('Session user:', user);
    
    if (!user) {
        // Nếu không có trong sessionStorage, kiểm tra localStorage
        user = JSON.parse(localStorage.getItem('user'));
        console.log('Local storage user:', user);
        if (user) {
            // Nếu tìm thấy trong localStorage, copy sang sessionStorage
            sessionStorage.setItem('user', JSON.stringify(user));
        } else {
            // Nếu không có user và đang ở trang Dashboard, chuyển về Home
            if (window.location.pathname.includes('DashBoard.html')) {
                window.location.replace('Home.html');
            }
        }
    }

    if (user) {
        currentUser = user;
        updateUIAfterLogin(user);
        return true;
    }
    return false;
}

// Cập nhật hàm updateUIAfterLogin
function updateUIAfterLogin(user) {
    console.log('Updating UI for user:', user);
    if (!user) return;

    // Đợi cho đến khi header được load xong
    const waitForHeader = setInterval(() => {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            clearInterval(waitForHeader);
            
            // Ẩn nút đăng nhập và đăng ký
            const loginBtn = document.querySelector('.login-btn');
            const signupBtn = document.querySelector('.signup-btn');
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';

            // Tạo hoặc cập nhật menu user
            let userMenu = document.querySelector('.user-menu');
            if (!userMenu) {
                userMenu = document.createElement('div');
                userMenu.className = 'user-menu';
                userMenu.innerHTML = `
                    <div class="user-info">
                        <div class="user-dropdown">
                            <a href="DashBoard.html?account=${user.account_link}">Trang Cá Nhân</a>
                            ${user.role === 'Admin' ? '<a href="/admin">Quản trị</a>' : ''}
                            <a href="#" id="logout-btn">Đăng xuất</a>
                        </div> 
                    </div>
                `;
                navLinks.appendChild(userMenu);

                // Thêm xử lý đăng xuất
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        logout();
                    });
                }
            }
        }
    }, 100);
}

// Cập nhật hàm đăng xuất
function logout() {
    // Xóa dữ liệu người dùng khỏi storage
    currentUser = null;
    sessionStorage.removeItem('user');
    localStorage.removeItem('user');
    localStorage.removeItem('savedLoginInfo');
    
    // Chuyển hướng về trang chủ
    window.location.replace('index.html');
    
    // Ngăn chặn quay lại bằng cách xóa lịch sử
    window.history.pushState(null, '', 'index.html');
    window.onpopstate = function() {
        window.history.pushState(null, '', 'index.html');
    };
}

// Thêm hàm mới để xử lý đổi mật khẩu
async function changePassword(currentPassword, newPassword, confirmPassword) {
    try {
        // Kiểm tra mật khẩu mới và xác nhận mật khẩu
        if (newPassword !== confirmPassword) {
            throw new Error('Mật khẩu xác nhận không khớp');
        }

        // Lấy thông tin người dùng từ storage
        const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user'));
        if (!user || !user.account_link) {
            throw new Error('Không tìm thấy thông tin người dùng');
        }

        // Gọi API đổi mật khẩu
        const response = await fetch(`${API_BASE_URL}/user/change-password/${user.account_link}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message);
        }

        return data;
    } catch (error) {
        throw error;
    }
}