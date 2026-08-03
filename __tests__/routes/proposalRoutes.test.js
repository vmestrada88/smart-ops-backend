const request = require('supertest');
const express = require('express');

// 🔧 MOCK DE MODELOS
jest.mock('../../models/Proposal', () => ({
    Proposal: {
        findAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        count: jest.fn(),
        sequelize: {
            transaction: jest.fn(() => ({
                commit: jest.fn(),
                rollback: jest.fn()
            }))
        }
    },
    ProposalItem: {
        bulkCreate: jest.fn(),
        destroy: jest.fn()
    }
}));

jest.mock('../../models/Client', () => ({
    findByPk: jest.fn()
}));

jest.mock('../../models/User', () => ({
    findByPk: jest.fn()
}));

jest.mock('../../models/Product', () => ({
    findByPk: jest.fn()
}));

// 🔧 MOCK DE MIDDLEWARES
jest.mock('../../middleware/auth', () => ({
    auth: jest.fn((req, res, next) => {
        req.user = { id: 'user123', role: 'user' };
        next();
    })
}));

jest.mock('../../middleware/adminAuth', () => 
    jest.fn((req, res, next) => {
        req.user = { id: 'admin123', role: 'admin' };
        next();
    })
);

// Importar después de los mocks
const proposalRoutes = require('../../routes/proposalRoutes');
const { Proposal, ProposalItem } = require('../../models/Proposal');
const { auth } = require('../../middleware/auth');
const adminAuth = require('../../middleware/adminAuth');

// Crear app de test
const app = express();
app.use(express.json());
app.use('/api/proposals', proposalRoutes);

describe('Proposal Routes - Complete Controller Test', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('📋 GET /api/proposals - Get all proposals', () => {
        test('should get all proposals with includes (line 16)', async () => {
            const mockProposals = [
                {
                    id: 1,
                    proposalNumber: 'PROP-000001',
                    clientInfoName: 'Test Client',
                    total: 1000,
                    client: { id: 1, name: 'Client Name' },
                    creator: { id: 1, name: 'Creator Name' },
                    items: []
                }
            ];

            Proposal.findAll.mockResolvedValue(mockProposals);

            const response = await request(app)
                .get('/api/proposals')
                .expect(200);

            expect(response.body).toEqual({ proposals: mockProposals });
            expect(Proposal.findAll).toHaveBeenCalledWith({
                include: expect.any(Array),
                order: [['createdAt', 'DESC']]
            });
            expect(auth).toHaveBeenCalled();
        });

        test('should handle database error in get all proposals', async () => {
            Proposal.findAll.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/proposals')
                .expect(500);

            expect(response.body).toEqual({ error: 'Database error' });
        });
    });

    describe('➕ POST /api/proposals - Create proposal', () => {
        test('should create proposal with items (line 22)', async () => {
            const mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };

            Proposal.sequelize.transaction.mockResolvedValue(mockTransaction);

            const mockProposal = {
                id: 1,
                proposalNumber: 'PROP-000001',
                clientInfoName: 'New Client',
                update: jest.fn()
            };

            const newProposalData = {
                clientInfoName: 'New Client',
                clientInfoEmail: 'client@test.com',
                tax: 100,
                items: [
                    { name: 'Item 1', quantity: 2, unitPrice: 500 }
                ]
            };

            Proposal.create.mockResolvedValue(mockProposal);
            ProposalItem.bulkCreate.mockResolvedValue([]);
            Proposal.findByPk.mockResolvedValue({
                ...mockProposal,
                client: null,
                creator: null,
                items: []
            });

            const response = await request(app)
                .post('/api/proposals')
                .send(newProposalData)
                .expect(201);

            expect(Proposal.create).toHaveBeenCalled();
            expect(ProposalItem.bulkCreate).toHaveBeenCalled();
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(adminAuth).toHaveBeenCalled();
        });

        test('should handle validation error in create', async () => {
            const response = await request(app)
                .post('/api/proposals')
                .send({}) // Missing required clientInfoName
                .expect(400);

            expect(response.body).toEqual({ error: 'Client name is required' });
        });
    });

    describe('🔍 GET /api/proposals/:id - Get proposal by ID', () => {
        test('should get proposal by ID with includes (line 28)', async () => {
            const mockProposal = {
                id: 1,
                proposalNumber: 'PROP-000001',
                clientInfoName: 'Test Client',
                client: { id: 1, name: 'Client' },
                creator: { id: 1, name: 'Creator' },
                items: []
            };

            Proposal.findByPk.mockResolvedValue(mockProposal);

            const response = await request(app)
                .get('/api/proposals/1')
                .expect(200);

            expect(response.body).toEqual(mockProposal);
            expect(Proposal.findByPk).toHaveBeenCalledWith('1', {
                include: expect.any(Array)
            });
            expect(auth).toHaveBeenCalled();
        });

        test('should return 404 when proposal not found', async () => {
            Proposal.findByPk.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/proposals/999')
                .expect(404);

            expect(response.body).toEqual({ error: 'Proposal not found' });
        });
    });

    describe('✏️ PUT /api/proposals/:id - Update proposal', () => {
        test('should update proposal with transaction (line 34)', async () => {
            const mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };

            const mockProposal = {
                id: 1,
                update: jest.fn()
            };

            Proposal.sequelize.transaction.mockResolvedValue(mockTransaction);
            Proposal.findByPk
                .mockResolvedValueOnce(mockProposal) // For update check
                .mockResolvedValueOnce({ // For final response
                    ...mockProposal,
                    client: null,
                    creator: null,
                    items: []
                });

            ProposalItem.destroy.mockResolvedValue(1);
            ProposalItem.bulkCreate.mockResolvedValue([]);

            const updateData = {
                clientInfoName: 'Updated Client',
                items: [{ name: 'Updated Item', quantity: 1, unitPrice: 100 }]
            };

            const response = await request(app)
                .put('/api/proposals/1')
                .send(updateData)
                .expect(200);

            expect(mockProposal.update).toHaveBeenCalled();
            expect(ProposalItem.destroy).toHaveBeenCalled();
            expect(ProposalItem.bulkCreate).toHaveBeenCalled();
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(adminAuth).toHaveBeenCalled();
        });

        test('should return 404 when updating non-existent proposal', async () => {
            const mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };

            Proposal.sequelize.transaction.mockResolvedValue(mockTransaction);
            Proposal.findByPk.mockResolvedValue(null);

            const response = await request(app)
                .put('/api/proposals/999')
                .send({ clientInfoName: 'Updated' })
                .expect(404);

            expect(response.body).toEqual({ error: 'Proposal not found' });
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });

    describe('🗑️ DELETE /api/proposals/:id - Delete proposal', () => {
        test('should delete proposal with transaction (line 40)', async () => {
            const mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };

            const mockProposal = {
                id: 1,
                destroy: jest.fn()
            };

            Proposal.sequelize.transaction.mockResolvedValue(mockTransaction);
            Proposal.findByPk.mockResolvedValue(mockProposal);

            const response = await request(app)
                .delete('/api/proposals/1')
                .expect(204);

            expect(mockProposal.destroy).toHaveBeenCalled();
            expect(mockTransaction.commit).toHaveBeenCalled();
            expect(adminAuth).toHaveBeenCalled();
        });

        test('should return 404 when deleting non-existent proposal', async () => {
            const mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };

            Proposal.sequelize.transaction.mockResolvedValue(mockTransaction);
            Proposal.findByPk.mockResolvedValue(null);

            const response = await request(app)
                .delete('/api/proposals/999')
                .expect(404);

            expect(response.body).toEqual({ error: 'Proposal not found' });
            expect(mockTransaction.rollback).toHaveBeenCalled();
        });
    });

    describe('🔍 COVERAGE VERIFICATION', () => {
        test('should execute all routes successfully', async () => {
            // Reset mocks for success scenarios
            const mockTransaction = {
                commit: jest.fn(),
                rollback: jest.fn()
            };

            Proposal.sequelize.transaction.mockResolvedValue(mockTransaction);
            Proposal.findAll.mockResolvedValue([]);
            Proposal.findByPk.mockResolvedValue({
                id: 1,
                update: jest.fn(),
                destroy: jest.fn()
            });
            Proposal.create.mockResolvedValue({ id: 1, update: jest.fn() });

            // Test all routes
            await request(app).get('/api/proposals').expect(200);
            await request(app).post('/api/proposals').send({ clientInfoName: 'Test' }).expect(201);
            await request(app).get('/api/proposals/1').expect(200);
            await request(app).put('/api/proposals/1').send({ clientInfoName: 'Updated' }).expect(200);
            await request(app).delete('/api/proposals/1').expect(204);

            // Verify all methods called
            expect(auth).toHaveBeenCalled();
            expect(adminAuth).toHaveBeenCalled();
            expect(Proposal.findAll).toHaveBeenCalled();
            expect(Proposal.findByPk).toHaveBeenCalled();
            expect(Proposal.create).toHaveBeenCalled();
        });
    });
});