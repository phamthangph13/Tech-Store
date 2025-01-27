// Constants
const API_BASE_URL = 'http://localhost:5000';

// Hàm để lấy danh sách dịch vụ từ server
async function fetchServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`);
        console.log('API Response:', response);

        if (!response.ok) {
            throw new Error('Failed to fetch services');
        }
        const data = await response.json();
        console.log('Services Data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching services:', error);
        return null;
    }
}

// Hàm tạo card dịch vụ
function createServiceCard(service, isPremiumUser) {
    console.log('Creating card for service:', service.name, 'isPremiumUser:', isPremiumUser);
    
    const serviceType = service.isPremium ? 'premium' : 'member';
    
    // Xác định text và class cho button dựa vào loại dịch vụ và role của user
    const buttonConfig = {
        text: (service.isPremium && !isPremiumUser) ? 'Đăng Ký Ngay' : 'Dùng Ngay',
        class: service.isPremium ? 'btn-service premium' : 'btn-service'
    };

    console.log('Button config:', buttonConfig);

    return `
        <div class="service-card ${serviceType}" data-aos="flip-left" data-aos-delay="100">
            <div class="service-icon">
                <i class="${service.icon}"></i>
            </div>
            <div class="service-badge ${serviceType}">${service.isPremium ? 'Premium' : 'Free'}</div>
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            <ul class="service-features">
                ${service.features.map(feature => `
                    <li><i class="fas fa-check"></i> ${feature}</li>
                `).join('')}
            </ul>
            ${service.isPremium ? `
                <div class="service-price">
                    <span>Chỉ từ</span>
                    <h4>${service.price.toLocaleString('vi-VN')} ₫</h4>
                    <span>/tháng</span>
                </div>
            ` : ''}
            <button class="${buttonConfig.class}" onclick="handleServiceAction('${service._id}', ${service.isPremium})">
                ${buttonConfig.text}
            </button>
        </div>
    `;
}

// Hàm render dịch vụ
async function renderServices(services, userData) {
    console.log('Rendering services:', services);
    console.log('User data:', userData);

    // Thêm kiểm tra role realtime
    if (userData && userData.account_link) {
        try {
            const response = await fetch(`${API_BASE_URL}/user/check-role/${userData.account_link}`);
            const data = await response.json();
            if (data.success) {
                userData.role = data.role; // Cập nhật role mới nhất
                // Cập nhật localStorage
                const currentUser = JSON.parse(localStorage.getItem('user'));
                if (currentUser) {
                    currentUser.role = data.role;
                    localStorage.setItem('user', JSON.stringify(currentUser));
                }
            }
        } catch (error) {
            console.error('Error checking user role:', error);
        }
    }

    const isPremiumUser = userData?.role?.toLowerCase() === 'premium';

    const freeServicesGrid = document.getElementById('free-services-grid');
    const premiumServicesGrid = document.getElementById('premium-services-grid');
    
    if (!freeServicesGrid || !premiumServicesGrid) {
        console.log('Not on services page, skipping render');
        return; // Thoát nếu không tìm thấy containers
    }

    // Kiểm tra xem services có phải là một mảng không
    if (!Array.isArray(services)) {
        console.error('Services data is not an array:', services);
        return;
    }

    // Lọc và render dịch vụ miễn phí
    const freeServices = services.filter(service => !service.isPremium);
    console.log('Free services:', freeServices);

    // Lọc và render dịch vụ premium
    const premiumServices = services.filter(service => service.isPremium);
    console.log('Premium services:', premiumServices);

    // Kiểm tra isPremium của service trước khi render
    freeServicesGrid.innerHTML = freeServices
        .map(service => {
            console.log('Creating free service card:', service, 'isPremiumUser:', isPremiumUser);
            return createServiceCard(service, isPremiumUser);
        })
        .join('');

    premiumServicesGrid.innerHTML = premiumServices
        .map(service => {
            console.log('Creating premium service card:', service, 'isPremiumUser:', isPremiumUser);
            return createServiceCard(service, isPremiumUser);
        })
        .join('');
}

// Hàm xử lý khi click vào nút dịch vụ
async function handleServiceAction(serviceId, isPremium) {
    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    const isPremiumUser = currentUser.role?.toLowerCase() === 'premium';

    if (isPremium && !isPremiumUser) {
        // Chuyển hướng đến trang đăng ký Premium
        window.location.href = '/Page/Premium.html';
    } else {
        // Xử lý khi người dùng có quyền sử dụng dịch vụ
        try {
            const response = await fetch(`${API_BASE_URL}/services/use/${serviceId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: currentUser._id })
            });
            
            const result = await response.json();
            if (result.success) {
                alert('Bắt đầu sử dụng dịch vụ thành công!');
            } else {
                alert(result.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error using service:', error);
            alert('Có lỗi xảy ra khi sử dụng dịch vụ');
        }
    }
}

// Export các hàm để sử dụng trong Dashboard.js
export {
    fetchServices,
    renderServices,
    handleServiceAction
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Lấy user data từ sessionStorage
        const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
        console.log('User Data from session:', userData); // Debug log

        const servicesData = await fetchServices();
        console.log('Fetched services data:', servicesData);

        if (servicesData && servicesData.success) {
            // Chỉ render services, không thay đổi display của section
            renderServices(servicesData.services, userData);
        } else {
            console.error('Failed to fetch services data');
        }
    } catch (error) {
        console.error('Error initializing services:', error);
    }
});
