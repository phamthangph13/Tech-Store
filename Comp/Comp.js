document.addEventListener('DOMContentLoaded', function() {
    // Load header
    fetch('../Comp/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-container').innerHTML = data;
            // Gọi hàm khởi tạo Auth sau khi load header xong
            if (typeof initializeAuth === 'function') {
                initializeAuth();
            }
        })
        .catch(error => console.error('Error loading header:', error));

    // Load footer
    fetch('../Comp/footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-container').innerHTML = data;
        })
        .catch(error => console.error('Error loading footer:', error));
});
