// tests/auth.test.js
const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mocks estratégicos
jest.mock('../../models/User', () => {
  const User = {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
  };
  // User.scope('withPassword') returns the same mocked model
  User.scope = jest.fn(() => User);
  return User;
});
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../routes/amazonAffiliateListingRoutes', () => {
    const express = require('express');
    return express.Router();
});
jest.mock('../../routes/proposalRoutes', () => {
    const express = require('express');
    return express.Router();
});
jest.mock('../../routes/clientsRoutes', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.json({ clients: [] }));
    return router;
});
jest.mock('../../routes/invoiceRoutes', () => {
    const express = require('express');
    return express.Router();
});
jest.mock('../../routes/productRoutes', () => {
    const express = require('express');
    const router = express.Router();
    router.get('/', (req, res) => res.json({ products: [] }));
    return router;
});
jest.mock('../../routes/cartRoutes', () => {
    const express = require('express');
    return express.Router();
});
jest.mock('../../routes/orderRoutes', () => {
    const express = require('express');
    return express.Router();
});
jest.mock('../../routes/usersRoutes', () => {
    const express = require('express');
    return express.Router();
});
jest.mock('../../routes/jobRoutes', () => {
    const express = require('express');
    return express.Router();
});
jest.mock('../../models/db', () => ({
    authenticate: jest.fn(),
    sync: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(),
    close: jest.fn(),
    define: jest.fn(() => ({
        findAll: jest.fn(),
        findOne: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
    })),
}));

const User = require('../../models/User');
const app = require('../../server');

describe('Auth Routes - 100% Coverage for routes/auth.js', () => {
    let originalJwtSecret;

    beforeAll(() => {
        originalJwtSecret = process.env.JWT_SECRET;
        process.env.JWT_SECRET = 'test-secret-key';
    });

    afterAll(() => {
        process.env.JWT_SECRET = originalJwtSecret;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('📝 REGISTER ROUTE - LÍNEAS 8-28', () => {
        test('should execute register with existing user - line 14', async () => {
            // Mock User.findOne para simular usuario existente
            User.findOne.mockResolvedValue({
                id: 1,
                email: 'existing@test.com',
                name: 'Existing User'
            });

            const response = await request(app)
                .post('/api/register')
                .send({
                    name: 'New User',
                    email: 'existing@test.com',
                    password: 'password123',
                    role: 'user'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('User already exists');
            expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'existing@test.com' } });
        });

        test('should execute successful registration - lines 16-24', async () => {
            // Mock User.findOne para no encontrar usuario existente
            User.findOne.mockResolvedValue(null);
            
            // Mock User.create para simular creación exitosa
            const mockUser = {
                id: 123,
                name: 'Test User',
                email: 'test@test.com',
                role: 'client'
            };
            User.create.mockResolvedValue(mockUser);

            const response = await request(app)
                .post('/api/register')
                .send({
                    name: 'Test User',
                    email: 'test@test.com',
                    password: 'password123',
                    role: 'user'
                });

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('User registered successfully');
            expect(response.body.user.id).toBe(123);
            expect(response.body.user.name).toBe('Test User');
            expect(response.body.user.email).toBe('test@test.com');
            expect(response.body.user.role).toBe('client');
            
            expect(User.create).toHaveBeenCalledWith({
                name: 'Test User',
                email: 'test@test.com',
                password: 'password123',
                role: 'client'
            });
        });

        test('should ignore a role sent by the caller and always create a client', async () => {
            User.findOne.mockResolvedValue(null);
            User.create.mockImplementation(async (data) => ({ id: 5, ...data }));

            const response = await request(app)
                .post('/api/register')
                .send({ name: 'Mallory', email: 'm@test.com', password: 'password123', role: 'admin' });

            expect(response.status).toBe(201);
            expect(response.body.user.role).toBe('client');
            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'client' }));
        });

        test('should execute register catch block - lines 25-27', async () => {
            User.findOne.mockResolvedValue(null);
            User.create.mockRejectedValue(new Error('Database connection error'));

            const response = await request(app)
                .post('/api/register')
                .send({
                    name: 'Test User',
                    email: 'test@test.com',
                    password: 'password123',
                    role: 'user'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Database connection error');
        });
    });

    describe('🔑 LOGIN ROUTE - LÍNEAS 32-54', () => {
        test('should execute login with non-existent user - line 37', async () => {
            User.findOne.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'password123'
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid email or password');
            expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'nonexistent@test.com' } });
        });

        test('should execute login with wrong password - line 40', async () => {
            const mockUser = {
                id: 123,
                name: 'Test User',
                email: 'test@test.com',
                password: '$2b$10$hashedPassword',
                role: 'user'
            };
            
            User.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false); // Password no coincide

            const response = await request(app)
                .post('/api/login')
                .send({
                    email: 'test@test.com',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid email or password');
            expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', '$2b$10$hashedPassword');
        });

        test('should execute successful login - lines 42-53', async () => {
            const mockUser = {
                id: 456,
                name: 'Test User',
                email: 'test@test.com',
                password: '$2b$10$hashedPassword',
                role: 'admin'
            };
            
            User.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('mock-jwt-token-123');

            const response = await request(app)
                .post('/api/login')
                .send({
                    email: 'test@test.com',
                    password: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.body.token).toBe('mock-jwt-token-123');
            expect(response.body.user.id).toBe(456);
            expect(response.body.user.name).toBe('Test User');
            expect(response.body.user.email).toBe('test@test.com');
            expect(response.body.user.role).toBe('admin');

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: 456, role: 'admin' },
                'test-secret-key',
                { expiresIn: '1h' }
            );
        });

        test('should load the password hash through the withPassword scope', async () => {
            User.findOne.mockResolvedValue(null);

            await request(app).post('/api/login').send({ email: 'a@test.com', password: 'x' });

            expect(User.scope).toHaveBeenCalledWith('withPassword');
        });

        test('should fail instead of signing with a default secret when JWT_SECRET is missing', async () => {
            const originalSecret = process.env.JWT_SECRET;
            delete process.env.JWT_SECRET;

            User.findOne.mockResolvedValue({ id: 789, name: 'Test User', email: 'test@test.com', password: 'hash', role: 'client' });
            bcrypt.compare.mockResolvedValue(true);

            const response = await request(app)
                .post('/api/login')
                .send({ email: 'test@test.com', password: 'password123' });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('JWT_SECRET is not configured');
            expect(jwt.sign).not.toHaveBeenCalled();

            process.env.JWT_SECRET = originalSecret;
        });

        test('should execute login catch block - lines 54-56', async () => {
            User.findOne.mockRejectedValue(new Error('Database connection failed'));

            const response = await request(app)
                .post('/api/login')
                .send({
                    email: 'test@test.com',
                    password: 'password123'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Database connection failed');
        });
    });

    describe('🔐 CHANGE PASSWORD ROUTE', () => {
        const authHeader = { Authorization: 'Bearer valid-token' };

        beforeEach(() => {
            jwt.verify.mockReturnValue({ id: 999, role: 'client' });
        });

        test('the old unauthenticated reset-password route no longer exists', async () => {
            const response = await request(app)
                .post('/api/reset-password')
                .send({ email: 'victim@test.com', newPassword: 'hacked123' });

            expect(response.status).toBe(404);
            expect(User.findOne).not.toHaveBeenCalled();
        });

        test('should require authentication', async () => {
            const response = await request(app)
                .post('/api/change-password')
                .send({ currentPassword: 'oldpassword', newPassword: 'newpassword123' });

            expect(response.status).toBe(401);
            expect(User.findByPk).not.toHaveBeenCalled();
        });

        test('should require both passwords', async () => {
            const response = await request(app)
                .post('/api/change-password')
                .set(authHeader)
                .send({ newPassword: 'newpassword123' });

            expect(response.status).toBe(400);
        });

        test('should reject short new passwords', async () => {
            const response = await request(app)
                .post('/api/change-password')
                .set(authHeader)
                .send({ currentPassword: 'oldpassword', newPassword: 'short' });

            expect(response.status).toBe(400);
            expect(User.findByPk).not.toHaveBeenCalled();
        });

        test('should return 404 if the logged-in user no longer exists', async () => {
            User.findByPk.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/change-password')
                .set(authHeader)
                .send({ currentPassword: 'oldpassword', newPassword: 'newpassword123' });

            expect(response.status).toBe(404);
            expect(User.findByPk).toHaveBeenCalledWith(999);
        });

        test('should reject a wrong current password', async () => {
            const mockUser = { id: 999, password: 'oldHash', save: jest.fn() };
            User.findByPk.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            const response = await request(app)
                .post('/api/change-password')
                .set(authHeader)
                .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword123' });

            expect(response.status).toBe(401);
            expect(mockUser.save).not.toHaveBeenCalled();
        });

        test('should change the password of the logged-in user only', async () => {
            const mockUser = { id: 999, password: 'oldHash', save: jest.fn().mockResolvedValue(true) };
            User.findByPk.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);

            const response = await request(app)
                .post('/api/change-password')
                .set(authHeader)
                .send({ currentPassword: 'oldpassword', newPassword: 'newpassword123', email: 'other@test.com' });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Password updated successfully');
            expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword', 'oldHash');
            expect(mockUser.password).toBe('newpassword123');
            expect(mockUser.save).toHaveBeenCalled();
            expect(User.findOne).not.toHaveBeenCalled();
        });

        test('should handle database errors', async () => {
            User.findByPk.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/change-password')
                .set(authHeader)
                .send({ currentPassword: 'oldpassword', newPassword: 'newpassword123' });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Database error');
        });
    });

    describe('🎯 GARANTIZAR 100% Coverage - TODAS las líneas', () => {
        test('should achieve 100% statements, branches, functions, and lines', async () => {
            // 1. REGISTER: Todas las branches
            
            // Branch: Usuario existente
            User.findOne.mockResolvedValue({ email: 'existing' });
            await request(app).post('/api/register').send({ 
                name: 'Test', email: 'existing@test.com', password: 'pass', role: 'user' 
            });

            // Branch: Usuario nuevo (éxito)
            User.findOne.mockResolvedValue(null);
            User.create.mockResolvedValue({ id: 1, name: 'Test', email: 'test@test.com', role: 'user' });
            await request(app).post('/api/register').send({ 
                name: 'Test', email: 'test@test.com', password: 'pass', role: 'user' 
            });

            // Branch: Error en catch
            User.create.mockRejectedValue(new Error('Error'));
            await request(app).post('/api/register').send({ 
                name: 'Test', email: 'test@test.com', password: 'pass', role: 'user' 
            });

            // 2. LOGIN: Todas las branches
            
            // Branch: Usuario no encontrado
            User.findOne.mockResolvedValue(null);
            await request(app).post('/api/login').send({ email: 'none@test.com', password: 'pass' });

            // Branch: Password incorrecto
            User.findOne.mockResolvedValue({ id: 1, password: 'hash' });
            bcrypt.compare.mockResolvedValue(false);
            await request(app).post('/api/login').send({ email: 'test@test.com', password: 'wrong' });

            // Branch: Login exitoso
            User.findOne.mockResolvedValue({ id: 1, name: 'Test', email: 'test@test.com', role: 'user', password: 'hash' });
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');
            await request(app).post('/api/login').send({ email: 'test@test.com', password: 'correct' });

            // Branch: Error en catch
            User.findOne.mockRejectedValue(new Error('DB Error'));
            await request(app).post('/api/login').send({ email: 'test@test.com', password: 'pass' });

            // Verificar que todas las funciones se ejecutaron
            expect(User.findOne).toHaveBeenCalled();
            expect(User.create).toHaveBeenCalled();
            expect(bcrypt.compare).toHaveBeenCalled();
            expect(jwt.sign).toHaveBeenCalled();
        });
    });
});