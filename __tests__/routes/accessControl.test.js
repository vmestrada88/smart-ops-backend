const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Controllers just answer 200 so the tests only exercise the auth/role wiring of the routes
jest.mock('../../controllers/userController', () => {
    const ok = (req, res) => res.json({ ok: true });
    return { getAllUsers: ok, getTechnicians: ok, createUser: ok, getUserById: ok, updateUser: ok, deleteUser: ok };
});
jest.mock('../../controllers/clientController', () => {
    const ok = (req, res) => res.json({ ok: true });
    return { getClients: ok, createClient: ok, getClientByContactEmail: ok, getClientById: ok, updateClient: ok, addJobToClient: ok };
});
jest.mock('../../utils/clientScope', () => ({
    getUserEmail: jest.fn(),
    resolveClientIdForUser: jest.fn(),
}));

const { getUserEmail } = require('../../utils/clientScope');
const { requireRole } = require('../../middleware/requireRole');
const { auth } = require('../../middleware/auth');

const SECRET = 'access-control-test-secret';
const tokenFor = (user) => `Bearer ${jwt.sign(user, SECRET)}`;
const admin = tokenFor({ id: 1, role: 'admin' });
const technician = tokenFor({ id: 2, role: 'technician' });
const client = tokenFor({ id: 3, role: 'client' });

const app = express();
app.use(express.json());
app.use('/api/users', require('../../routes/usersRoutes'));
app.use('/api/clients', require('../../routes/clientsRoutes'));

describe('Access control on users and clients routes', () => {
    let originalSecret;
    let consoleSpy;

    beforeAll(() => {
        originalSecret = process.env.JWT_SECRET;
        process.env.JWT_SECRET = SECRET;
    });

    afterAll(() => {
        process.env.JWT_SECRET = originalSecret;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => consoleSpy.mockRestore());

    describe('/api/users', () => {
        test.each([
            ['get', '/api/users'],
            ['post', '/api/users'],
            ['get', '/api/users/1'],
            ['put', '/api/users/1'],
            ['delete', '/api/users/1'],
        ])('%s %s requires a token', async (method, url) => {
            await request(app)[method](url).expect(401);
        });

        test('admins can list users (adminAuth now runs after auth)', async () => {
            await request(app).get('/api/users').set('Authorization', admin).expect(200);
        });

        test('non-admins cannot list or modify users', async () => {
            await request(app).get('/api/users').set('Authorization', technician).expect(403);
            await request(app).put('/api/users/2').set('Authorization', technician).send({ role: 'admin' }).expect(403);
        });

        test('users can read their own record but not someone else\'s', async () => {
            await request(app).get('/api/users/3').set('Authorization', client).expect(200);
            await request(app).get('/api/users/1').set('Authorization', client).expect(403);
        });

        test('admins can read any user', async () => {
            await request(app).get('/api/users/3').set('Authorization', admin).expect(200);
        });
    });

    describe('/api/clients', () => {
        test.each([
            ['get', '/api/clients'],
            ['post', '/api/clients'],
            ['get', '/api/clients/1'],
            ['put', '/api/clients/1'],
            ['post', '/api/clients/1/jobs'],
            ['get', '/api/clients/by-email/a@test.com'],
        ])('%s %s requires a token', async (method, url) => {
            await request(app)[method](url).expect(401);
        });

        test('staff can use client routes', async () => {
            await request(app).get('/api/clients').set('Authorization', technician).expect(200);
            await request(app).put('/api/clients/1').set('Authorization', technician).send({}).expect(200);
            await request(app).post('/api/clients').set('Authorization', admin).send({}).expect(200);
        });

        test('client users cannot list, read or modify clients', async () => {
            await request(app).get('/api/clients').set('Authorization', client).expect(403);
            await request(app).get('/api/clients/1').set('Authorization', client).expect(403);
            await request(app).put('/api/clients/1').set('Authorization', client).send({}).expect(403);
        });

        test('client users can look up their own email (case-insensitive)', async () => {
            getUserEmail.mockResolvedValue('Owner@Test.com');
            await request(app).get('/api/clients/by-email/owner%40test.com').set('Authorization', client).expect(200);
            expect(getUserEmail).toHaveBeenCalledWith(3);
        });

        test('client users cannot look up someone else\'s email', async () => {
            getUserEmail.mockResolvedValue('owner@test.com');
            await request(app).get('/api/clients/by-email/other%40test.com').set('Authorization', client).expect(403);
        });

        test('client email lookup handles errors', async () => {
            getUserEmail.mockRejectedValue(new Error('DB down'));
            const res = await request(app).get('/api/clients/by-email/owner%40test.com').set('Authorization', client).expect(500);
            expect(res.body.message).toBe('DB down');
        });

        test('staff can look up any email without hitting the database', async () => {
            await request(app).get('/api/clients/by-email/anyone%40test.com').set('Authorization', admin).expect(200);
            expect(getUserEmail).not.toHaveBeenCalled();
        });
    });
});

describe('requireRole middleware', () => {
    const run = (user, roles) => {
        const req = { user };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        requireRole(...roles)(req, res, next);
        return { res, next };
    };

    test('lets matching roles through', () => {
        const { next } = run({ role: 'manager' }, ['admin', 'manager']);
        expect(next).toHaveBeenCalled();
    });

    test('rejects other roles and missing users with 403', () => {
        expect(run({ role: 'client' }, ['admin']).res.status).toHaveBeenCalledWith(403);
        expect(run(undefined, ['admin']).res.status).toHaveBeenCalledWith(403);
    });
});

describe('auth middleware without JWT_SECRET', () => {
    test('returns 500 instead of verifying with a default secret', () => {
        const originalSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        auth({ headers: { authorization: 'Bearer whatever' } }, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(next).not.toHaveBeenCalled();
        errorSpy.mockRestore();
        process.env.JWT_SECRET = originalSecret;
    });
});
