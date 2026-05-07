/**
 * Format giá tiền sang VND
 * @param {number} price
 * @returns {string}
 */
export const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

/**
 * Rút gọn chuỗi nếu quá dài
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export const truncate = (str, maxLength = 50) => {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
};

/**
 * Lấy chữ cái đầu của tên để làm avatar
 * @param {string} name
 * @returns {string}
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
