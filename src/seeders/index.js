const mongoose = require('mongoose');
const QRCode = require('qrcode');
const env = require('../config/env');
const ROLES = require('../constants/roles');
const { TABLE_STATUS } = require('../constants/orderStatus');
const {
  User,
  Category,
  Product,
  Table,
  Order,
  OrderLog,
  Coupon
} = require('../models');

async function seedData() {
  try {
    console.log('[Seeder] Kết nối CSDL để nạp dữ liệu mẫu...');
    await mongoose.connect(env.MONGO_URI);
    console.log('[Seeder] Đã kết nối MongoDB thành công.');

    // Xóa dữ liệu cũ
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Table.deleteMany({}),
      Order.deleteMany({}),
      OrderLog.deleteMany({}),
      Coupon.deleteMany({})
    ]);
    console.log('[Seeder] Đã dọn sạch dữ liệu cũ.');

    // 1. Tạo Users
    const users = await User.create([
      {
        fullName: 'Quản Trị Viên',
        email: 'admin@orderapp.com',
        phone: '0901000001',
        password: 'Admin@123',
        role: ROLES.ADMIN,
        isActive: true,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      },
      {
        fullName: 'Nguyễn Văn Thu Ngân',
        email: 'staff1@orderapp.com',
        phone: '0901000002',
        password: 'Staff@123',
        role: ROLES.STAFF,
        isActive: true,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
      },
      {
        fullName: 'Trần Thị Phục Vụ',
        email: 'staff2@orderapp.com',
        phone: '0901000003',
        password: 'Staff@123',
        role: ROLES.STAFF,
        isActive: true,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'
      },
      {
        fullName: 'Khách Hàng Mẫu',
        email: 'customer@gmail.com',
        phone: '0901000004',
        password: 'Customer@123',
        role: ROLES.CUSTOMER,
        isActive: true
      }
    ]);
    console.log(`[Seeder] Đã tạo ${users.length} tài khoản người dùng mẫu.`);

    // 2. Tạo Bàn và sinh mã QR
    const tablesData = [];
    for (let i = 1; i <= 10; i++) {
      const tableNumber = `Bàn ${String(i).padStart(2, '0')}`;
      const tableUrl = `${env.CLIENT_URL}/menu?table=${encodeURIComponent(tableNumber)}`;
      const qrCodeDataUrl = await QRCode.toDataURL(tableUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      });

      tablesData.push({
        tableNumber,
        capacity: i <= 4 ? 2 : (i <= 8 ? 4 : 8),
        location: i <= 3 ? 'window' : (i <= 6 ? 'outdoor' : 'indoor'),
        qrCode: qrCodeDataUrl,
        status: TABLE_STATUS.EMPTY,
        isActive: true
      });
    }
    const tables = await Table.create(tablesData);
    console.log(`[Seeder] Đã tạo ${tables.length} bàn kèm mã QR.`);

    // 3. Tạo Danh Mục
    const categoriesData = [
      {
        name: 'Trà Sữa',
        description: 'Trà sữa đậm vị thơm béo với nhiều loại topping hấp dẫn',
        type: 'drink',
        image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=600&q=80',
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'Cà Phê Truyền Thống & Hiện Đại',
        description: 'Cà phê nguyên chất Robusta & Arabica hảo hạng',
        type: 'drink',
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'Trà Trái Cây & Nước Ép',
        description: 'Nước trái cây tươi mát thanh nhiệt, tốt cho sức khỏe',
        type: 'drink',
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
        sortOrder: 3,
        isActive: true
      },
      {
        name: 'Bánh Ngọt & Tráng Miệng',
        description: 'Bánh ngọt nướng tươi mới mỗi ngày',
        type: 'food',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
        sortOrder: 4,
        isActive: true
      }
    ];
    const categories = await Category.create(categoriesData);
    console.log(`[Seeder] Đã tạo ${categories.length} danh mục.`);

    // 4. Tạo Món (Products) với các tùy chọn phong phú
    const standardDrinkOptions = [
      {
        name: 'Kích cỡ (Size)',
        isRequired: true,
        isMultiple: false,
        choices: [
          { label: 'Size M (Vừa)', extraPrice: 0 },
          { label: 'Size L (Lớn)', extraPrice: 7000 }
        ]
      },
      {
        name: 'Lượng Đường',
        isRequired: false,
        isMultiple: false,
        choices: [
          { label: '100% Đường (Chuẩn)', extraPrice: 0 },
          { label: '70% Đường', extraPrice: 0 },
          { label: '50% Đường', extraPrice: 0 },
          { label: '30% Đường', extraPrice: 0 },
          { label: 'Không đường', extraPrice: 0 }
        ]
      },
      {
        name: 'Lượng Đá',
        isRequired: false,
        isMultiple: false,
        choices: [
          { label: '100% Đá (Chuẩn)', extraPrice: 0 },
          { label: '70% Đá', extraPrice: 0 },
          { label: '50% Đá', extraPrice: 0 },
          { label: 'Không đá', extraPrice: 0 }
        ]
      },
      {
        name: 'Topping Thêm',
        isRequired: false,
        isMultiple: true,
        choices: [
          { label: 'Trân châu đen dẻo', extraPrice: 8000 },
          { label: 'Trân châu trắng giòn', extraPrice: 8000 },
          { label: 'Pudding trứng', extraPrice: 10000 },
          { label: 'Thạch sương sáo', extraPrice: 6000 },
          { label: 'Kem Cheese béo ngậy', extraPrice: 12000 }
        ]
      }
    ];

    const productsData = [
      // Trà sữa
      {
        name: 'Trà Sữa Trân Châu Hoàng Gia',
        category: categories[0]._id,
        description: 'Trà đen Ceylon đậm vị hòa quyện sữa tươi thanh trùng cùng trân châu đen nấu mật ong dẻo thơm.',
        price: 35000,
        images: ['https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=600&q=80'],
        options: standardDrinkOptions,
        isAvailable: true,
        isActive: true,
        soldCount: 142,
        tags: ['bestseller', 'tra-sua', 'hot']
      },
      {
        name: 'Sữa Tươi Trân Châu Đường Đen',
        category: categories[0]._id,
        description: 'Sữa tươi Đà Lạt béo mát kết hợp với trân châu đường đen nóng dẻo thơm lừng cốt mía.',
        price: 42000,
        images: ['https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=600&q=80'],
        options: standardDrinkOptions,
        isAvailable: true,
        isActive: true,
        soldCount: 230,
        tags: ['bestseller', 'hot']
      },
      {
        name: 'Trà Sữa Matcha Nhật Bản',
        category: categories[0]._id,
        description: 'Matcha Uji cao cấp từ Nhật Bản, chát nhẹ hậu ngọt sâu béo ngậy vị sữa tươi.',
        price: 39000,
        images: ['https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80'],
        options: standardDrinkOptions,
        isAvailable: true,
        isActive: true,
        soldCount: 88,
        tags: ['matcha', 'tra-sua']
      },
      // Cà phê
      {
        name: 'Cà Phê Sữa Đá Sài Gòn',
        category: categories[1]._id,
        description: 'Hạt Robusta Đắk Lắk pha phin truyền thống thơm nồng quyện sữa đặc béo ngọt.',
        price: 25000,
        images: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80'],
        options: [
          {
            name: 'Kích cỡ (Size)',
            isRequired: true,
            choices: [
              { label: 'Size Vừa', extraPrice: 0 },
              { label: 'Size Lớn', extraPrice: 6000 }
            ]
          },
          {
            name: 'Độ ngọt',
            isRequired: false,
            choices: [
              { label: 'Ngọt vừa (chuẩn)', extraPrice: 0 },
              { label: 'Ít sữa ngọt nhẹ', extraPrice: 0 },
              { label: 'Nhiều sữa', extraPrice: 0 }
            ]
          }
        ],
        isAvailable: true,
        isActive: true,
        soldCount: 310,
        tags: ['ca-phe', 'truyen-thong', 'bestseller']
      },
      {
        name: 'Bạc Xỉu Kem Muối Đặc Biệt',
        category: categories[1]._id,
        description: 'Bạc xỉu 3 tầng đẹp mắt, phủ lớp kem muối béo mặn mượt mà độc đáo.',
        price: 32000,
        images: ['https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80'],
        options: [
          {
            name: 'Kích cỡ (Size)',
            isRequired: true,
            choices: [
              { label: 'Size Vừa', extraPrice: 0 },
              { label: 'Size Lớn', extraPrice: 7000 }
            ]
          }
        ],
        isAvailable: true,
        isActive: true,
        soldCount: 195,
        tags: ['ca-phe', 'kem-muoi', 'hot']
      },
      // Trà trái cây
      {
        name: 'Trà Đào Cam Sả Tươi Mát',
        category: categories[2]._id,
        description: 'Hương sả thanh khiết kết hợp nước cốt cam tươi mọng nước và miếng đào giòn ngọt.',
        price: 35000,
        images: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'],
        options: [
          {
            name: 'Kích cỡ (Size)',
            isRequired: true,
            choices: [
              { label: 'Size M', extraPrice: 0 },
              { label: 'Size L', extraPrice: 7000 }
            ]
          },
          {
            name: 'Đường & Đá',
            isRequired: false,
            choices: [
              { label: '100% Chuẩn vị', extraPrice: 0 },
              { label: '70% Giảm ngọt', extraPrice: 0 },
              { label: '50% Ít ngọt', extraPrice: 0 }
            ]
          },
          {
            name: 'Topping thêm',
            isMultiple: true,
            choices: [
              { label: 'Thêm 2 miếng đào giòn', extraPrice: 10000 },
              { label: 'Thạch nha đam', extraPrice: 6000 },
              { label: 'Hạt chia hữu cơ', extraPrice: 5000 }
            ]
          }
        ],
        isAvailable: true,
        isActive: true,
        soldCount: 164,
        tags: ['tra-dao', 'trai-cay']
      },
      {
        name: 'Trà Mãng Cầu Đắk Lắk',
        category: categories[2]._id,
        description: 'Mãng cầu xiêm tươi dầm giòn sần sật, chua ngọt cân bằng giải nhiệt cực đã.',
        price: 38000,
        images: ['https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?auto=format&fit=crop&w=600&q=80'],
        options: [
          {
            name: 'Kích cỡ (Size)',
            isRequired: true,
            choices: [
              { label: 'Size M', extraPrice: 0 },
              { label: 'Size L', extraPrice: 7000 }
            ]
          }
        ],
        isAvailable: true,
        isActive: true,
        soldCount: 120,
        tags: ['hot', 'trend']
      },
      // Bánh ngọt
      {
        name: 'Bánh Tiramisu Truyền Thống Ý',
        category: categories[3]._id,
        description: 'Lớp bánh ladyfinger thấm đẫm cà phê espresso hòa quyện phô mai mascarpone béo ngậy.',
        price: 38000,
        images: ['https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80'],
        options: [],
        isAvailable: true,
        isActive: true,
        soldCount: 75,
        tags: ['banh-ngot', 'trang-mieng']
      },
      {
        name: 'Bánh Mousse Chanh Leo',
        category: categories[3]._id,
        description: 'Vị chua dịu thanh tao của chanh leo kết hợp lớp kem mousse xốp mịn tan chảy trong miệng.',
        price: 35000,
        images: ['https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80'],
        options: [],
        isAvailable: true,
        isActive: true,
        soldCount: 52,
        tags: ['banh-ngot']
      }
    ];
    const products = await Product.create(productsData);
    console.log(`[Seeder] Đã tạo ${products.length} món ăn & thức uống.`);

    console.log('[Seeder] Hoàn thành nạp dữ liệu mẫu thành công 100%!');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Lỗi]', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedData();
}

module.exports = seedData;
