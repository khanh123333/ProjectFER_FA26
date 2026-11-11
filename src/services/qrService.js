const QRCode = require('qrcode');
const env = require('../config/env');

class QRService {
  /**
   * Sinh mã QR Data URL cho bàn ăn
   * @param {string} tableNumber
   */
  static async generateTableQR(tableNumber) {
    const tableUrl = `${env.CLIENT_URL}/menu?table=${encodeURIComponent(tableNumber)}`;
    return await QRCode.toDataURL(tableUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  }
}

module.exports = QRService;
