const request = require('supertest');
const express = require('express');

// 🔧 CREAR MOCK DIRECTAMENTE en jest.mock()
jest.mock('../../models/Job', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
}));

// Auth: simulate a logged-in user whose role each test can change
let mockCurrentUser = { id: 1, role: 'admin' };
jest.mock('../../middleware/auth', () => ({
    auth: (req, res, next) => { req.user = mockCurrentUser; next(); }
}));
jest.mock('../../utils/clientScope', () => ({
    resolveClientIdForUser: jest.fn(),
}));
const { resolveClientIdForUser } = require('../../utils/clientScope');

// Ahora importar las rutas DESPUÉS del mock
const jobRoutes = require('../../routes/jobRoutes');
const Job = require('../../models/Job'); // Importar el mock para usar en tests

// Crear app de test
const app = express();
app.use(express.json());
app.use('/api/jobs', jobRoutes);

describe('Job Routes - Complete CRUD Coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCurrentUser = { id: 1, role: 'admin' };
    });

    describe('🔒 Role-based access', () => {
        test('client users only get jobs of their own company', async () => {
            mockCurrentUser = { id: 7, role: 'client' };
            resolveClientIdForUser.mockResolvedValue(42);
            Job.findAll.mockResolvedValue([{ id: 1, clientId: 42, status: 'completed' }]);

            const response = await request(app).get('/api/jobs').expect(200);

            expect(resolveClientIdForUser).toHaveBeenCalledWith(7);
            expect(Job.findAll).toHaveBeenCalledWith({ where: { clientId: 42 } });
            expect(response.body).toEqual([{ id: 1, clientId: 42, status: 'completed' }]);
        });

        test('client users not linked to a company get an empty list', async () => {
            mockCurrentUser = { id: 7, role: 'client' };
            resolveClientIdForUser.mockResolvedValue(null);

            const response = await request(app).get('/api/jobs').expect(200);

            expect(response.body).toEqual([]);
            expect(Job.findAll).not.toHaveBeenCalled();
        });

        test('staff users are not scoped to a client', async () => {
            mockCurrentUser = { id: 2, role: 'technician' };
            Job.findAll.mockResolvedValue([]);

            await request(app).get('/api/jobs').expect(200);

            expect(resolveClientIdForUser).not.toHaveBeenCalled();
            expect(Job.findAll).toHaveBeenCalledWith({ where: {} });
        });

        test('client users get 404 for a job of another company', async () => {
            mockCurrentUser = { id: 7, role: 'client' };
            resolveClientIdForUser.mockResolvedValue(42);
            Job.findByPk.mockResolvedValue({ id: 5, clientId: 99 });

            const response = await request(app).get('/api/jobs/5').expect(404);

            expect(response.body).toEqual({ error: 'Job not found' });
        });

        test('client users can read a job of their own company', async () => {
            mockCurrentUser = { id: 7, role: 'client' };
            resolveClientIdForUser.mockResolvedValue(42);
            Job.findByPk.mockResolvedValue({ id: 5, clientId: 42 });

            await request(app).get('/api/jobs/5').expect(200);
        });

        test.each([
            ['post', '/api/jobs'],
            ['put', '/api/jobs/1'],
            ['delete', '/api/jobs/1'],
        ])('client users cannot %s %s', async (method, url) => {
            mockCurrentUser = { id: 7, role: 'client' };

            await request(app)[method](url).send({ title: 'x' }).expect(403);

            expect(Job.create).not.toHaveBeenCalled();
            expect(Job.update).not.toHaveBeenCalled();
            expect(Job.destroy).not.toHaveBeenCalled();
        });
    });

    describe('📋 GET /api/jobs - Get all jobs', () => {
        test('should return all jobs successfully (lines 12-17)', async () => {
            // Mock data
            const mockJobs = [
                { id: 1, title: 'Job 1', description: 'Description 1', status: 'active' },
                { id: 2, title: 'Job 2', description: 'Description 2', status: 'completed' }
            ];

            Job.findAll.mockResolvedValue(mockJobs);

            const response = await request(app)
                .get('/api/jobs')
                .expect(200);

            expect(response.body).toEqual(mockJobs);
            expect(Job.findAll).toHaveBeenCalledWith({ where: {} });
        });

        test('should handle database error when getting all jobs (lines 18-20)', async () => {
            const dbError = new Error('Database connection failed');
            Job.findAll.mockRejectedValue(dbError);

            const response = await request(app)
                .get('/api/jobs')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Database connection failed'
            });
            expect(Job.findAll).toHaveBeenCalledWith({ where: {} });
        });
    });

    describe('🔍 GET /api/jobs/:id - Get job by ID', () => {
        test('should return a specific job successfully (lines 23-28)', async () => {
            const mockJobData = { 
                id: 1, 
                title: 'Test Job', 
                description: 'Test Description',
                status: 'active' 
            };

            Job.findByPk.mockResolvedValue(mockJobData);

            const response = await request(app)
                .get('/api/jobs/1')
                .expect(200);

            expect(response.body).toEqual(mockJobData);
            expect(Job.findByPk).toHaveBeenCalledWith('1');
        });

        test('should return 404 when job not found (lines 26-27)', async () => {
            Job.findByPk.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/jobs/999')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Job not found'
            });
            expect(Job.findByPk).toHaveBeenCalledWith('999');
        });

        test('should handle database error when getting job by ID (lines 29-31)', async () => {
            const dbError = new Error('Database query failed');
            Job.findByPk.mockRejectedValue(dbError);

            const response = await request(app)
                .get('/api/jobs/1')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Database query failed'
            });
            expect(Job.findByPk).toHaveBeenCalledWith('1');
        });
    });

    describe('➕ POST /api/jobs - Create new job', () => {
        test('should create a new job successfully (lines 34-39)', async () => {
            const newJobData = {
                title: 'New Job',
                description: 'New Description',
                status: 'active'
            };

            const createdJob = { id: 1, ...newJobData };
            Job.create.mockResolvedValue(createdJob);

            const response = await request(app)
                .post('/api/jobs')
                .send(newJobData)
                .expect(201);

            expect(response.body).toEqual(createdJob);
            expect(Job.create).toHaveBeenCalledWith(newJobData);
        });

        test('should handle validation error when creating job (lines 40-42)', async () => {
            const invalidJobData = {
                // Missing required fields
                title: '',
                description: ''
            };

            const validationError = new Error('Validation error: title cannot be empty');
            Job.create.mockRejectedValue(validationError);

            const response = await request(app)
                .post('/api/jobs')
                .send(invalidJobData)
                .expect(400);

            expect(response.body).toEqual({
                error: 'Validation error: title cannot be empty'
            });
            expect(Job.create).toHaveBeenCalledWith(invalidJobData);
        });
    });

    describe('✏️ PUT /api/jobs/:id - Update job', () => {
        test('should update a job successfully (lines 45-51)', async () => {
            const updateData = {
                title: 'Updated Job Title',
                description: 'Updated Description',
                status: 'completed'
            };

            const updatedJob = { id: 1, ...updateData };

            // Mock update returns [1] meaning 1 row was updated
            Job.update.mockResolvedValue([1]);
            Job.findByPk.mockResolvedValue(updatedJob);

            const response = await request(app)
                .put('/api/jobs/1')
                .send(updateData)
                .expect(200);

            expect(response.body).toEqual(updatedJob);
            expect(Job.update).toHaveBeenCalledWith(updateData, { where: { id: '1' } });
            expect(Job.findByPk).toHaveBeenCalledWith('1');
        });

        test('should return 404 when updating non-existent job (lines 47-48)', async () => {
            const updateData = {
                title: 'Updated Job Title'
            };

            // Mock update returns [0] meaning no rows were updated
            Job.update.mockResolvedValue([0]);

            const response = await request(app)
                .put('/api/jobs/999')
                .send(updateData)
                .expect(404);

            expect(response.body).toEqual({
                error: 'Job not found'
            });
            expect(Job.update).toHaveBeenCalledWith(updateData, { where: { id: '999' } });
            // findByPk should NOT be called when update fails
            expect(Job.findByPk).not.toHaveBeenCalled();
        });

        test('should handle validation error when updating job (lines 52-54)', async () => {
            const invalidUpdateData = {
                title: '', // Invalid data
                status: 'invalid_status'
            };

            const validationError = new Error('Validation error: invalid status');
            Job.update.mockRejectedValue(validationError);

            const response = await request(app)
                .put('/api/jobs/1')
                .send(invalidUpdateData)
                .expect(400);

            expect(response.body).toEqual({
                error: 'Validation error: invalid status'
            });
            expect(Job.update).toHaveBeenCalledWith(invalidUpdateData, { where: { id: '1' } });
        });
    });

    describe('🗑️ DELETE /api/jobs/:id - Delete job', () => {
        test('should delete a job successfully (lines 57-62)', async () => {
            // Mock destroy returns 1 meaning 1 row was deleted
            Job.destroy.mockResolvedValue(1);

            const response = await request(app)
                .delete('/api/jobs/1')
                .expect(204);

            expect(response.body).toEqual({});
            expect(Job.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
        });

        test('should return 404 when deleting non-existent job (lines 59-60)', async () => {
            // Mock destroy returns 0 meaning no rows were deleted
            Job.destroy.mockResolvedValue(0);

            const response = await request(app)
                .delete('/api/jobs/999')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Job not found'
            });
            expect(Job.destroy).toHaveBeenCalledWith({ where: { id: '999' } });
        });

        test('should handle database error when deleting job (lines 63-65)', async () => {
            const dbError = new Error('Database deletion failed');
            Job.destroy.mockRejectedValue(dbError);

            const response = await request(app)
                .delete('/api/jobs/1')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Database deletion failed'
            });
            expect(Job.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
        });
    });

    describe('🎯 EDGE CASES & INTEGRATION', () => {
        test('should handle malformed JSON in POST request', async () => {
            // 🔧 CORREGIDO: Express devuelve error de parsing antes de llegar a la ruta
            const response = await request(app)
                .post('/api/jobs')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}');

            // Express maneja el JSON parsing error y devuelve 400
            expect(response.status).toBe(400);
            // El body puede estar vacío o tener un mensaje de error específico
            expect([{}, { error: expect.any(String) }, { message: expect.any(String) }])
                .toContainEqual(expect.objectContaining(response.body));
        });

        test('should handle malformed JSON in PUT request', async () => {
            // 🔧 CORREGIDO: Similar al POST
            const response = await request(app)
                .put('/api/jobs/1')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}');

            expect(response.status).toBe(400);
            expect([{}, { error: expect.any(String) }, { message: expect.any(String) }])
                .toContainEqual(expect.objectContaining(response.body));
        });

        test('should handle very large ID in requests', async () => {
            Job.findByPk.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/jobs/99999999999999999999')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Job not found'
            });
        });

        test('should handle special characters in ID', async () => {
            Job.findByPk.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/jobs/abc123')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Job not found'
            });
            expect(Job.findByPk).toHaveBeenCalledWith('abc123');
        });
    });

    describe('🔍 COVERAGE VERIFICATION', () => {
        test('should execute all route handlers at least once', async () => {
            // GET all jobs
            Job.findAll.mockResolvedValue([]);
            await request(app).get('/api/jobs').expect(200);

            // GET job by ID
            Job.findByPk.mockResolvedValue({ id: 1, title: 'Test' });
            await request(app).get('/api/jobs/1').expect(200);

            // POST create job
            Job.create.mockResolvedValue({ id: 1, title: 'New Job' });
            await request(app).post('/api/jobs').send({ title: 'New Job' }).expect(201);

            // PUT update job
            Job.update.mockResolvedValue([1]);
            Job.findByPk.mockResolvedValue({ id: 1, title: 'Updated Job' });
            await request(app).put('/api/jobs/1').send({ title: 'Updated Job' }).expect(200);

            // DELETE job
            Job.destroy.mockResolvedValue(1);
            await request(app).delete('/api/jobs/1').expect(204);

            // Verify all methods were called
            expect(Job.findAll).toHaveBeenCalled();
            expect(Job.findByPk).toHaveBeenCalled();
            expect(Job.create).toHaveBeenCalled();
            expect(Job.update).toHaveBeenCalled();
            expect(Job.destroy).toHaveBeenCalled();
        });

        test('should test all error paths', async () => {
            // Test all catch blocks
            const testError = new Error('Test error');

            // GET all jobs error
            Job.findAll.mockRejectedValue(testError);
            await request(app).get('/api/jobs').expect(500);

            // GET job by ID error
            Job.findByPk.mockRejectedValue(testError);
            await request(app).get('/api/jobs/1').expect(500);

            // POST create job error
            Job.create.mockRejectedValue(testError);
            await request(app).post('/api/jobs').send({ title: 'Test' }).expect(400);

            // PUT update job error
            Job.update.mockRejectedValue(testError);
            await request(app).put('/api/jobs/1').send({ title: 'Test' }).expect(400);

            // DELETE job error
            Job.destroy.mockRejectedValue(testError);
            await request(app).delete('/api/jobs/1').expect(500);

            // All error paths tested
            expect(true).toBe(true);
        });
    });
});