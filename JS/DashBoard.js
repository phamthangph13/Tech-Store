// Thêm vào đầu file

function removeAllEventListeners(element) {
    const clone = element.cloneNode(true);
    element.parentNode.replaceChild(clone, element);
    return clone;
}

// Hàm để lấy thông tin người dùng từ URL parameter
function getUserFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('account'); 
}

// Thêm hàm kiểm tra DOM đã sẵn sàng
function isDOMReady() {
    return new Promise(resolve => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
        } else {
            document.addEventListener('DOMContentLoaded', resolve);
        }
    });
}

// Hàm để điền thông tin người dùng vào trang
function populateUserInfo(userData) {
    console.log('User data received:', userData); // Debug log
    if (!userData) {
        return;
    }

    const elements = {
        avatars: document.querySelectorAll('.profile-avatar'),
        userName: document.querySelector('.sidebar-header .user-name'),
        userRole: document.querySelector('.sidebar-header .user-role'),
        profileName: document.querySelector('.profile-header h3'),
        profileUsername: document.querySelector('.profile-header p'),
        emailInput: document.getElementById('emailInput'),
        fullnameInput: document.getElementById('fullnameInput'),
        phoneInput: document.getElementById('phoneInput'),
        addressInput: document.getElementById('addressInput'),
        statsOrders: document.querySelector('.stat-value'),
        statsRating: document.querySelectorAll('.stat-value')[1]
    };

    // Xử lý địa chỉ
    if (elements.addressInput) {
        // Kiểm tra và lấy địa chỉ mặc định từ mảng addresses
        if (userData.addresses && Array.isArray(userData.addresses)) {
            const defaultAddress = userData.addresses.find(addr => addr.isDefault);
            if (defaultAddress) {
                const addressParts = [
                    defaultAddress.specific,
                    defaultAddress.ward,
                    defaultAddress.district,
                    defaultAddress.province
                ].filter(Boolean); // Lọc bỏ các giá trị null/undefined/empty
                
                elements.addressInput.value = addressParts.join(', ');
                console.log('Setting address to:', elements.addressInput.value); // Debug log
            }
        }
    }

    // Cập nhật các trường khác như cũ
    if (elements.emailInput) {
        elements.emailInput.value = userData.email || '';
    }

    if (elements.fullnameInput) {
        elements.fullnameInput.value = userData.fullname || '';
    }

    if (elements.phoneInput) {
        elements.phoneInput.value = userData.phone || '';
    }

    // Cập nhật các thông tin khác như cũ
    if (elements.avatars?.length > 0) {
        elements.avatars.forEach(avatar => {
            avatar.src = userData.avatar;
        });
    }

    if (elements.userName) {
        elements.userName.textContent = userData.fullname || 'Chưa cập nhật';
    }

    if (elements.userRole) {
        elements.userRole.textContent = userData.role || 'Member';
        elements.userRole.className = 'user-role';
        elements.userRole.classList.add(userData.role?.toLowerCase() === 'premium' ? 'premium' : 'member');
    }

    if (elements.profileName) {
        elements.profileName.textContent = userData.fullname || 'Chưa cập nhật';
    }

    if (elements.profileUsername) {
        elements.profileUsername.textContent = `@${userData.account_name}`;
    }

    // Cập nhật thống kê
    if (elements.statsOrders) {
        elements.statsOrders.textContent = userData.stats?.orders || '0';
    }

    if (elements.statsRating) {
        elements.statsRating.textContent = userData.stats?.rating || '0.0';
    }
}

// Hàm để lấy thông tin người dùng từ server
async function fetchUserData(accountLink) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/${accountLink}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        
        const userData = await response.json();
        return userData;
    } catch (error) {
        return null;
    }
}

// Xử lý cập nhật thông tin
async function handleProfileUpdate(accountLink, formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/update/${accountLink}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (result.success) {
            // Fetch lại dữ liệu mới nhất từ server
            const updatedUserData = await fetchUserData(accountLink);
            if (updatedUserData) {
                // Cập nhật UI với dữ liệu mới
                populateUserInfo(updatedUserData);
                
                // Cập nhật thông tin trong localStorage và sessionStorage nếu là user hiện tại
                const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
                if (currentUser.account_link === accountLink) {
                    const updatedUser = { ...currentUser, ...updatedUserData };
                    sessionStorage.setItem('user', JSON.stringify(updatedUser));
                    if (localStorage.getItem('user')) {
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }
                }
            }
            alert('Cập nhật thông tin thành công!');
        } else {
            alert(result.message || 'Có lỗi xảy ra khi cập nhật thông tin');
        }
    } catch (error) {
        alert('Có lỗi xảy ra khi cập nhật thông tin');
    }
}

// Thêm biến để theo dõi trạng thái upload
let isUploading = false;

// Hàm chuyển đổi file thành base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Hàm xử lý upload avatar
async function handleAvatarUpload(file, accountLink) {
    if (isUploading) {
        return;
    }

    try {
        isUploading = true;

        // Kiểm tra kích thước file (giới hạn 1MB)
        if (file.size > 1 * 1024 * 1024) {
            alert('File quá lớn. Vui lòng chọn file nhỏ hơn 1MB');
            return;
        }

        // Thêm loading state
        const avatarOverlay = document.querySelector('.avatar-overlay');
        const originalContent = avatarOverlay.innerHTML;
        avatarOverlay.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Chuyển file thành base64
        const base64String = await fileToBase64(file);

        const response = await fetch(`${API_BASE_URL}/user/update-avatar/${accountLink}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                avatar: base64String
            })
        });

        const result = await response.json();

        if (result.success) {
            // Cập nhật tất cả các avatar trong trang
            const allAvatars = document.querySelectorAll('.avatar, .profile-avatar');
            
            allAvatars.forEach(avatar => {
                avatar.src = result.avatar + '?t=' + new Date().getTime(); // Thêm timestamp để tránh cache
            });

            // Cập nhật thông tin trong storage
            const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
            if (currentUser.account_link === accountLink) {
                currentUser.avatar = result.avatar;
                sessionStorage.setItem('user', JSON.stringify(currentUser));
                if (localStorage.getItem('user')) {
                    localStorage.setItem('user', JSON.stringify(currentUser));
                }
            }

            alert('Cập nhật avatar thành công!');
        } else {
            alert(result.message || 'Có lỗi xảy ra khi cập nhật avatar');
        }
    } catch (error) {
        alert('Có lỗi xảy ra khi cập nhật avatar');
    } finally {
        // Restore original overlay content
        const avatarOverlay = document.querySelector('.avatar-overlay');
        avatarOverlay.innerHTML = '<i class="fas fa-camera"></i>';
        isUploading = false;
    }
}

// Thêm các biến và hàm mới cho xử lý địa chỉ
let provinces = [];
let districts = [];
let wards = [];

// Hàm lấy danh sách tỉnh/thành phố
async function fetchProvinces() {
    try {
        const response = await fetch('https://provinces.open-api.vn/api/p/');
        provinces = await response.json();
        const provinceSelect = document.getElementById('provinceSelect');
        
        provinces.forEach(province => {
            const option = document.createElement('option');
            option.value = province.code;
            option.textContent = province.name;
            provinceSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching provinces:', error);
    }
}

// Hàm lấy danh sách quận/huyện theo tỉnh/thành
async function fetchDistricts(provinceCode) {
    try {
        const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
        const data = await response.json();
        districts = data.districts;
        const districtSelect = document.getElementById('districtSelect');
        
        districtSelect.innerHTML = '<option value="">Chọn Quận/Huyện</option>';
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district.code;
            option.textContent = district.name;
            districtSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching districts:', error);
    }
}

// Hàm lấy danh sách phường/xã theo quận/huyện
async function fetchWards(districtCode) {
    try {
        const response = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
        const data = await response.json();
        wards = data.wards;
        const wardSelect = document.getElementById('wardSelect');
        
        wardSelect.innerHTML = '<option value="">Chọn Phường/Xã</option>';
        wards.forEach(ward => {
            const option = document.createElement('option');
            option.value = ward.code;
            option.textContent = ward.name;
            wardSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching wards:', error);
    }
}

// Hàm xử lý việc lưu địa chỉ
async function handleAddressSubmit(event, accountLink) {
    event.preventDefault();
    
    const provinceSelect = document.getElementById('provinceSelect');
    const districtSelect = document.getElementById('districtSelect');
    const wardSelect = document.getElementById('wardSelect');
    const specificAddress = document.getElementById('specificAddress');
    const addressNote = document.getElementById('addressNote');

    const province = provinceSelect.options[provinceSelect.selectedIndex].text;
    const district = districtSelect.options[districtSelect.selectedIndex].text;
    const ward = wardSelect.options[wardSelect.selectedIndex].text;

    const fullAddress = {
        specific: specificAddress.value,
        ward: ward,
        district: district,
        province: province,
        note: addressNote.value,
        fullString: `${specificAddress.value}, ${ward}, ${district}, ${province}`
    };

    // Cập nhật địa chỉ lên server
    await handleProfileUpdate(accountLink, { address: fullAddress.fullString });
    
    // Cập nhật input địa chỉ hiển thị
    document.getElementById('addressInput').value = fullAddress.fullString;
    
    // Đóng modal
    const addressModal = document.getElementById('addressModal');
    addressModal.style.display = 'none';
}

// Hàm lấy icon cho nhãn địa chỉ
function getLabelIcon(label) {
    const icons = {
        'home': '🏠',
        'office': '🏢',
        'company': '🏭',
        'other': '📍'
    };
    return icons[label] || '📍';
}

// Hàm lấy tên nhãn địa chỉ
function getLabelName(label) {
    const names = {
        'home': 'Nhà riêng',
        'office': 'Văn phòng',
        'company': 'Công ty',
        'other': 'Khác'
    };
    return names[label] || 'Khác';
}

// Cập nhật hàm renderAddressCard
function renderAddressCard(address) {
    const labelIcon = getLabelIcon(address.label);
    const labelName = getLabelName(address.label);

    if (address.fullAddress) {
        return `
            <div class="address-item ${address.isDefault ? 'default' : ''}" data-id="${address.id}">
                ${address.isDefault ? '<span class="default-badge">Mặc định</span>' : ''}
                <div class="address-label">
                    ${labelIcon} ${labelName}
                </div>
                <div class="address-content">
                    <p><strong>Địa chỉ:</strong> ${address.fullAddress}</p>
                </div>
                <div class="address-actions">
                    ${!address.isDefault ? `
                        <button class="btn-set-default" data-id="${address.id}" onclick="setDefaultAddress('${address.id}')">
                            <i class="fas fa-check"></i> Đặt mặc định
                        </button>
                    ` : ''}
                    <button class="btn-delete-address" data-id="${address.id}" onclick="deleteAddress('${address.id}')">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div class="address-item ${address.isDefault ? 'default' : ''}" data-id="${address.id}">
            ${address.isDefault ? '<span class="default-badge">Mặc định</span>' : ''}
            <div class="address-label">
                ${labelIcon} ${labelName}
            </div>
            <div class="address-content">
                <p><strong>Địa chỉ:</strong> ${address.specific}, ${address.ward}, ${address.district}, ${address.province}</p>
                ${address.note ? `<p><strong>Ghi chú:</strong> ${address.note}</p>` : ''}
            </div>
            <div class="address-actions">
                ${!address.isDefault ? `
                    <button class="btn-set-default" data-id="${address.id}" onclick="setDefaultAddress('${address.id}')">
                        <i class="fas fa-check"></i> Đặt mặc định
                    </button>
                ` : ''}
                <button class="btn-delete-address" data-id="${address.id}" onclick="deleteAddress('${address.id}')">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </div>
        </div>
    `;
}

// Hàm để load và hiển thị danh sách địa chỉ
async function loadAddresses(accountLink) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/addresses/${accountLink}`);
        const data = await response.json();
        console.log('Server response:', data); // Debug log

        const addressList = document.querySelector('.address-list');
        const addressForm = document.getElementById('addressForm');
        const btnAddAddress = document.querySelector('.btn-add-address');
        
        if (data.success && data.addresses) {
            console.log('Processing addresses:', data.addresses); // Debug log
            
            if (data.addresses.length === 0) {
                addressList.innerHTML = '<p class="no-address">Bạn chưa có địa chỉ nào</p>';
            } else {
                const addressHTML = data.addresses.map(renderAddressCard).join('');
                console.log('Generated HTML:', addressHTML); // Debug log
                addressList.innerHTML = addressHTML;
            }
            
            addressForm.style.display = 'none';
            btnAddAddress.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading addresses:', error);
    }
}

// Hàm xóa địa chỉ
async function deleteAddress(addressId) {
    if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) {
        return;
    }

    try {
        const accountLink = getUserFromURL();
        const response = await fetch(`${API_BASE_URL}/user/address/${accountLink}/${addressId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            await loadAddresses(accountLink);
            alert('Xóa địa chỉ thành công');
        } else {
            alert(data.message || 'Có lỗi xảy ra khi xóa địa chỉ');
        }
    } catch (error) {
        console.error('Error deleting address:', error);
        alert('Có lỗi xảy ra khi xóa địa chỉ');
    }
}

// Hàm để load thông tin người dùng
async function loadUserInfo(accountLink) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/${accountLink}`);
        const data = await response.json();
        
        if (data) {
            // Cập nhật các trường thông tin cơ bản
            document.getElementById('emailInput').value = data.email || '';
            document.getElementById('fullnameInput').value = data.fullname || '';
            document.getElementById('phoneInput').value = data.phone || '';
            
            // Cập nhật địa chỉ mặc định
            const addressInput = document.getElementById('addressInput');
            if (addressInput) {
                if (data.addresses && Array.isArray(data.addresses)) {
                    const defaultAddress = data.addresses.find(addr => addr.isDefault);
                    if (defaultAddress) {
                        if (defaultAddress.fullAddress) {
                            addressInput.value = defaultAddress.fullAddress;
                        } else {
                            addressInput.value = `${defaultAddress.specific}, ${defaultAddress.ward}, ${defaultAddress.district}, ${defaultAddress.province}`;
                        }
                    } else {
                        addressInput.value = data.address || '';
                    }
                } else {
                    addressInput.value = data.address || '';
                }
            }

            // Cập nhật các thông tin hiển thị khác
            updateUserDisplay(data.user);
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Hàm xử lý khi đặt địa chỉ mặc định
async function setDefaultAddress(addressId) {
    try {
        const accountLink = getUserFromURL();
        console.log('Setting default address:', addressId);

        const response = await fetch(`${API_BASE_URL}/user/address/${accountLink}/${addressId}/default`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('Server response for setting default:', data);

        if (data.success) {
            // Reload danh sách địa chỉ
            await loadAddresses(accountLink);
            
            // Reload và cập nhật thông tin người dùng
            const userResponse = await fetch(`${API_BASE_URL}/user/${accountLink}`);
            const userData = await userResponse.json();
            
            if (userData.success) {
                // Tìm địa chỉ mặc định mới
                const addresses = userData.user.addresses || [];
                const newDefaultAddress = addresses.find(addr => addr.id === addressId);
                
                if (newDefaultAddress) {
                    const formattedAddress = newDefaultAddress.fullAddress || 
                        `${newDefaultAddress.specific}, ${newDefaultAddress.ward}, ${newDefaultAddress.district}, ${newDefaultAddress.province}`;
                    
                    // Cập nhật trực tiếp vào input
                    const addressInput = document.getElementById('addressInput');
                    if (addressInput) {
                        addressInput.value = formattedAddress;
                    }
                }
            }
            
            alert('Đã đặt làm địa chỉ mặc định');
        } else {
            alert(data.message || 'Có lỗi xảy ra khi đặt địa chỉ mặc định');
        }
    } catch (error) {
        console.error('Error setting default address:', error);
        alert('Có lỗi xảy ra khi đặt địa chỉ mặc định');
    }
}

// Đảm bảo các hàm được gọi khi trang load
document.addEventListener('DOMContentLoaded', function() {
    const accountLink = getUserFromURL();
    if (accountLink) {
        loadUserInfo(accountLink);
        
        // Thêm event listener cho form cập nhật thông tin
        const profileForm = document.querySelector('.profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                // ... xử lý cập nhật thông tin ...
            });
        }
    }
});

// Thêm hàm mới để fetch và hiển thị địa chỉ
async function fetchAndDisplayAddresses(accountLink) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/addresses/${accountLink}`);
        const data = await response.json();
        
        if (data.success && data.addresses) {
            const defaultAddress = data.addresses.find(addr => addr.isDefault);
            if (defaultAddress) {
                const addressInput = document.getElementById('addressInput');
                if (addressInput) {
                    const addressParts = [
                        defaultAddress.specific,
                        defaultAddress.ward,
                        defaultAddress.district,
                        defaultAddress.province
                    ].filter(Boolean);
                    
                    addressInput.value = addressParts.join(', ');
                    console.log('Updated address from fetch:', addressInput.value); // Debug log
                }
            }
        }
    } catch (error) {
        console.error('Error fetching addresses:', error);
    }
}

// Cập nhật hàm initializeDashboard
async function initializeDashboard() {
    try {
        await isDOMReady();

        const accountLink = getUserFromURL();
        
        if (!accountLink) {
            window.location.href = 'index.html';
            return;
        }

        let userData = await fetchUserData(accountLink);
        if (!userData) {
            alert('Không thể tải thông tin người dùng');
            return;
        }

        populateUserInfo(userData);
        // Thêm gọi hàm fetch địa chỉ
        await fetchAndDisplayAddresses(accountLink);
        setupEventListeners(accountLink);

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Có lỗi xảy ra khi khởi tạo trang');
    }
}

// Tách phần setup event listeners thành hàm riêng
function setupEventListeners(accountLink) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn file hình ảnh');
            return;
        }

        await handleAvatarUpload(file, accountLink);
        fileInput.value = '';
    });

    let avatarContainer = document.querySelector('.profile-avatar-container');
    avatarContainer = removeAllEventListeners(avatarContainer);
    
    avatarContainer.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!isUploading) {
            fileInput.click();
        }
    };

    const profileForm = document.querySelector('.profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                fullname: profileForm.querySelector('input[placeholder="Họ và tên"]')?.value.trim(),
                phone: profileForm.querySelector('input[placeholder="Số điện thoại"]')?.value.trim(),
                address: profileForm.querySelector('input[placeholder="Địa chỉ"]')?.value.trim()
            };

            if (formData.phone && !/^[0-9]{10}$/.test(formData.phone)) {
                alert('Số điện thoại không hợp lệ (phải có 10 chữ số)');
                return;
            }

            await handleProfileUpdate(accountLink, formData);
        });
    }

    // Thêm xử lý chuyển đổi tab
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.dashboard-section');
    
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Xóa active class từ tất cả links
            sidebarLinks.forEach(l => l.classList.remove('active'));
            
            // Thêm active class cho link được click
            link.classList.add('active');
            
            // Ẩn tất cả sections
            sections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Hiển thị section tương ứng
            const targetSection = document.getElementById(`${link.dataset.page}-section`);
            if (targetSection) {
                targetSection.style.display = 'block';
                
                // Kích hoạt lại animation AOS
                AOS.refresh();
            }
        });
    });

    // Thêm sự kiện cho nút thêm địa chỉ mới
    const btnAddAddress = document.querySelector('.btn-add-address');
    if (btnAddAddress) {
        btnAddAddress.addEventListener('click', () => {
            // Hiển thị form và ẩn nút thêm địa chỉ
            document.getElementById('addressForm').style.display = 'block';
            btnAddAddress.style.display = 'none';
            // Ẩn danh sách địa chỉ
            document.querySelector('.address-list').style.display = 'none';
        });
    }

    // Thêm sự kiện cho nút hủy form
    const btnCancelForm = document.querySelector('.btn-cancel-form');
    if (btnCancelForm) {
        btnCancelForm.addEventListener('click', () => {
            // Ẩn form và hiển thị lại nút thêm địa chỉ
            document.getElementById('addressForm').style.display = 'none';
            document.querySelector('.btn-add-address').style.display = 'block';
            // Hiển thị lại danh sách địa chỉ
            document.querySelector('.address-list').style.display = 'block';
            // Reset form
            document.getElementById('addressForm').reset();
        });
    }

    // Khi mở modal địa chỉ
    const addressInput = document.getElementById('addressInput');
    if (addressInput) {
        addressInput.addEventListener('click', async () => {
            const addressModal = document.getElementById('addressModal');
            const addressForm = document.getElementById('addressForm');
            const btnAddAddress = document.querySelector('.btn-add-address');
            
            // Hiển thị modal
            addressModal.style.display = 'block';
            
            // Ẩn form nhập địa chỉ
            addressForm.style.display = 'none';
            
            // Hiển thị nút thêm địa chỉ
            btnAddAddress.style.display = 'block';
            
            // Load danh sách địa chỉ
            await loadAddresses(accountLink);
            
            // Fetch provinces nếu chưa có
            if (provinces.length === 0) {
                await fetchProvinces();
            }
        });
    }

    // Thêm sự kiện submit form địa chỉ
    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
        addressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                province: document.getElementById('provinceSelect').options[document.getElementById('provinceSelect').selectedIndex].text,
                district: document.getElementById('districtSelect').options[document.getElementById('districtSelect').selectedIndex].text,
                ward: document.getElementById('wardSelect').options[document.getElementById('wardSelect').selectedIndex].text,
                specific: document.getElementById('specificAddress').value,
                note: document.getElementById('addressNote').value,
                label: document.getElementById('addressLabel').value,
                isDefault: document.getElementById('isDefault').checked
            };

            try {
                const response = await fetch(`${API_BASE_URL}/user/address/${accountLink}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                if (data.success) {
                    // Ẩn form
                    addressForm.style.display = 'none';
                    // Hiển thị lại nút thêm địa chỉ
                    document.querySelector('.btn-add-address').style.display = 'block';
                    // Hiển thị lại danh sách địa chỉ
                    document.querySelector('.address-list').style.display = 'block';
                    // Reset form
                    addressForm.reset();
                    // Load lại danh sách địa chỉ
                    await loadAddresses(accountLink);
                    alert('Thêm địa chỉ thành công');
                } else {
                    alert(data.message || 'Có lỗi xảy ra khi thêm địa chỉ');
                }
            } catch (error) {
                console.error('Error adding address:', error);
                alert('Có lỗi xảy ra khi thêm địa chỉ');
            }
        });
    }

    // Thêm event listener cho form đổi mật khẩu
    document.querySelector('.security-form').addEventListener('submit', async function(e) {
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
            alert(error.message);
        }
    });

    // Thêm event listener cho nút đăng xuất
    document.querySelector('.btn-logout').addEventListener('click', function() {
        if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            logout();
        }
    });

    // Thêm xử lý cho các nút hiện/ẩn mật khẩu
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
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
    });

    // Thêm sự kiện cho select boxes
    const provinceSelect = document.getElementById('provinceSelect');
    const districtSelect = document.getElementById('districtSelect');
    const wardSelect = document.getElementById('wardSelect');

    if (provinceSelect) {
        provinceSelect.addEventListener('change', (e) => {
            fetchDistricts(e.target.value);
        });
    }

    if (districtSelect) {
        districtSelect.addEventListener('change', (e) => {
            fetchWards(e.target.value);
        });
    }
}

// Khởi tạo khi trang load
window.addEventListener('load', initializeDashboard);