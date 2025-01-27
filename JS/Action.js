// Export các hàm để có thể sử dụng ở file khác
export async function addToCart(productId) {
    try {
        // Lấy user từ cả localStorage và sessionStorage
        const user = JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user'));
        
        // Debug log để kiểm tra
        console.log('AddToCart - Current user:', user);
        
        if (!user || !user.account_link) {
            throw new Error('Vui lòng đăng nhập để thêm vào giỏ hàng');
        }

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

        // Debug log để kiểm tra request
        console.log('Request payload:', {
            userId: user.account_link,
            productId: productId
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Không thể thêm vào giỏ hàng');
        }

        return data;
    } catch (error) {
        console.error('AddToCart error:', error);
        throw error;
    }
}
 
// Thêm hàm kiểm tra đăng nhập để export
export function isUserLoggedIn() {
    // Debug logs
    console.log('Checking login state...');
    console.log('SessionStorage:', sessionStorage.getItem('user'));
    console.log('LocalStorage:', localStorage.getItem('user'));

    // Kiểm tra từ sessionStorage trước
    const sessionUser = sessionStorage.getItem('user');
    if (sessionUser) {
        const user = JSON.parse(sessionUser);
        console.log('Session user:', user);
        return user && user.account_link ? true : false;
    }

    // Nếu không có trong sessionStorage, kiểm tra localStorage
    const localUser = localStorage.getItem('user');
    if (localUser) {
        const user = JSON.parse(localUser);
        console.log('Local storage user:', user);
        return user && user.account_link ? true : false;
    }

    console.log('Không tìm thấy người dùng trong storage');
    return false;
}

export async function getCartItems() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
        if (!user) {
            throw new Error('Vui lòng đăng nhập để xem giỏ hàng');
        }

        const response = await fetch(`http://localhost:5000/cart/${user._id}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message);
        }

        return data.items;
    } catch (error) {
        throw error;
    }
} 

export async function removeFromCart(productId) {
    try {
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
        if (!user) {
            throw new Error('Vui lòng đăng nhập để thực hiện thao tác này');
        }

        const response = await fetch('http://localhost:5000/cart/remove', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: user._id,
                productId: productId
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
