const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const env = require('../src/config/env');
const { User } = require('../src/models');

describe('Auth API Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(env.MONGO_URI);
    await User.deleteMany({ email: 'test_user_unique@gmail.com' });
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'test_user_unique@gmail.com' });
    await mongoose.connection.close();
  });

  it('1. Đăng ký tài khoản khách hàng mới', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test User Customer',
        email: 'test_user_unique@gmail.com',
        password: 'Password123'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('test_user_unique@gmail.com');
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('2. Đăng nhập với tài khoản vừa tạo', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test_user_unique@gmail.com',
        password: 'Password123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('3. Đăng nhập sai mật khẩu phải trả về 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test_user_unique@gmail.com',
        password: 'WrongPassword'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
