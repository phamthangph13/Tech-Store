document.getElementById('checkout-button').addEventListener('click', function() {
    fetch('/create_payment_link', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
        } else {
            alert('Có lỗi xảy ra khi tạo link thanh toán');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Có lỗi xảy ra khi tạo link thanh toán');
    });
});
