const request = require('supertest');
const app = require('../../server');
const { User } = require('../../models'); // Mock the User model
// Mock the models
jest.mock('../../models', () => ({
  User: {   
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),  
    destroy: jest.fn(),
    },
}));
// Mock authentication middlewares
jest.mock('../../middleware/auth', () => ({ auth: (req, res, next) => { req.user = { id: 1, role: 'admin' }; next(); } })); // Simulate an authenticated admin
jest.mock('../../middleware/adminAuth', () => (req, res, next) => next()); // Simulate successful admin authentication
describe('User Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks before each test
    });

    it('should create a user', async () => {
        const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', password: 'hashedpassword', role: 'client', createdAt: '2025-09-13T10:28:19.874Z' }; 
        User.create.mockResolvedValue(mockUser);

        const res = await request(app)
            .post('/api/users')
            .send({ name: 'Test User', email: 'test@example.com', password: 'hashedpassword', role: 'client' }); 

        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual(mockUser); 
        expect(User.create).toHaveBeenCalledWith({ name: 'Test User', email: 'test@example.com', password: 'hashedpassword', role: 'client' });
    });

    it('should get all users', async () => {
        const mockUsers = [
            { id: 1, name: 'User 1', email: 'user1@example.com', password: 'hashedpassword1', role: 'client', createdAt: '2025-09-13T10:28:19.874Z' },
            { id: 2, name: 'User 2', email: 'user2@example.com', password: 'hashedpassword2', role: 'admin', createdAt: '2025-09-13T10:28:19.874Z' },
        ];
        User.findAll.mockResolvedValue(mockUsers);

        const res = await request(app).get('/api/users');

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(mockUsers);
        expect(User.findAll).toHaveBeenCalledWith();
    });
    it('should get a user by ID', async () => {
        const mockUser = { id: 1, name: 'User 1', email: 'user1@example.com', password: 'hashedpassword1', role: 'client', createdAt: '2025-09-13T10:28:19.874Z' };
        User.findByPk.mockResolvedValue(mockUser);
        const res = await request(app).get('/api/users/1');

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(mockUser);
        expect(User.findByPk).toHaveBeenCalledWith('1');
    });
    it('should update a user via the instance so the password hook runs', async () => {
    const mockUser = { id: 1, name: 'User 1', email: 'user1@example.com', role: 'client', update: jest.fn().mockResolvedValue(undefined) };
    User.findByPk.mockResolvedValue(mockUser);

    const res = await request(app)
      .put('/api/users/1')
      .send({ name: 'User 1', email: 'user1@example.com', password: 'newpassword1', role: 'client' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'User 1', email: 'user1@example.com', role: 'client' });
    expect(User.findByPk).toHaveBeenCalledWith('1');
    expect(mockUser.update).toHaveBeenCalledWith({ name: 'User 1', email: 'user1@example.com', password: 'newpassword1', role: 'client' });
    expect(User.update).not.toHaveBeenCalled();
  });

    it('should only update the fields that were provided', async () => {
    const mockUser = { id: 1, name: 'User 1', update: jest.fn().mockResolvedValue(undefined) };
    User.findByPk.mockResolvedValue(mockUser);

    const res = await request(app).put('/api/users/1').send({ name: 'Renamed', password: '' });

    expect(res.statusCode).toBe(200);
    expect(mockUser.update).toHaveBeenCalledWith({ name: 'Renamed' });
  });

    it('should delete a user', async () => {
    User.destroy.mockResolvedValue(1);
    const res = await request(app).delete('/api/users/1');

    expect(res.statusCode).toBe(204);
    expect(User.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
  });
    it('should return 404 if user not found by ID', async () => {
        User.findByPk.mockResolvedValue(null);
        const res = await request(app).get('/api/users/999');
        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({ error: 'User not found' });
        expect(User.findByPk).toHaveBeenCalledWith('999');
    });
    it('should return 404 if user to update is not found', async () => {
    User.findByPk.mockResolvedValue(null);
    const res = await request(app)
      .put('/api/users/999')
      .send({ email: 'user1@example.com', name: 'User 1', password: 'hashedpassword1', role: 'client' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
    expect(User.findByPk).toHaveBeenCalledWith('999');
  });

  it('should return 404 if user to delete is not found', async () => {
    User.destroy.mockResolvedValue(0);
    const res = await request(app).delete('/api/users/999');

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
    expect(User.destroy).toHaveBeenCalledWith({ where: { id: '999' } }); 
  });
});