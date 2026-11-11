/**
 * Các hàm tiện ích dùng chung phía Client
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount || 0);
}

// Giỏ hàng lưu trữ LocalStorage theo bàn
const CartManager = {
  getKey(tableNumber) {
    return `order_cart_${tableNumber || 'guest'}`;
  },

  getCart(tableNumber) {
    try {
      const data = localStorage.getItem(this.getKey(tableNumber));
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveCart(tableNumber, cart) {
    localStorage.setItem(this.getKey(tableNumber), JSON.stringify(cart));
    this.updateCartBadge(tableNumber);
  },

  clearCart(tableNumber) {
    localStorage.removeItem(this.getKey(tableNumber));
    this.updateCartBadge(tableNumber);
  },

  addItem(tableNumber, item) {
    const cart = this.getCart(tableNumber);
    // Kiểm tra xem món có cùng tùy chọn đã có trong giỏ chưa
    const existingIndex = cart.findIndex((i) => {
      if (i.product !== item.product) return false;
      const opts1 = JSON.stringify(i.selectedOptions || []);
      const opts2 = JSON.stringify(item.selectedOptions || []);
      return opts1 === opts2 && i.note === item.note;
    });

    if (existingIndex > -1) {
      cart[existingIndex].quantity += item.quantity;
    } else {
      cart.push(item);
    }

    this.saveCart(tableNumber, cart);
  },

  removeItem(tableNumber, index) {
    const cart = this.getCart(tableNumber);
    cart.splice(index, 1);
    this.saveCart(tableNumber, cart);
  },

  updateQuantity(tableNumber, index, newQty) {
    const cart = this.getCart(tableNumber);
    if (newQty <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = newQty;
    }
    this.saveCart(tableNumber, cart);
  },

  getTotal(cart) {
    return cart.reduce((sum, item) => {
      let extra = 0;
      if (Array.isArray(item.selectedOptions)) {
        extra = item.selectedOptions.reduce((s, o) => s + (o.extraPrice || 0), 0);
      }
      return sum + (item.price + extra) * item.quantity;
    }, 0);
  },

  updateCartBadge(tableNumber) {
    const cart = this.getCart(tableNumber);
    const count = cart.reduce((sum, it) => sum + it.quantity, 0);
    const badges = document.querySelectorAll('.cart-badge-count');
    badges.forEach((b) => {
      b.textContent = count;
      b.style.display = count > 0 ? 'inline-block' : 'none';
    });
  }
};

window.CartManager = CartManager;
window.formatCurrency = formatCurrency;
