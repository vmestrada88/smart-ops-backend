const request = require('supertest');

jest.mock('../../middleware/auth', () => ({
  auth: jest.fn((req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  }),
}));
jest.mock('../../middleware/adminAuth', () => jest.fn((req, res, next) => next()));
jest.mock('../../routes/proposalRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../routes/amazonAffiliateListingRoutes', () => {
  const express = require('express');
  return express.Router();
});

const mockTransaction = {
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../models', () => ({
  Invoice: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    sequelize: {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
    },
  },
  InvoiceItem: {
    bulkCreate: jest.fn().mockResolvedValue([]),
    destroy: jest.fn().mockResolvedValue(0),
  },
  Client: {},
}));

const app = require('../../server');
const { Invoice } = require('../../models');

describe('Invoice Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Invoice.sequelize.transaction.mockResolvedValue(mockTransaction);
  });

  it('should create an invoice', async () => {
    const mockInvoice = {
      id: 1,
      clientId: 1,
      date: '2025-09-15',
      totalAmount: 100,
      createdAt: '2025-09-13T10:28:19.874Z',
      items: [],
    };
    Invoice.create.mockResolvedValue(mockInvoice);
    Invoice.findByPk.mockResolvedValue(mockInvoice);

    const res = await request(app)
      .post('/api/invoices')
      .send({ clientId: 1, date: '2025-09-15', totalAmount: 100 });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(mockInvoice);
    expect(Invoice.create).toHaveBeenCalled();
    expect(mockTransaction.commit).toHaveBeenCalled();
  });

  it('should get all invoices', async () => {
    const mockInvoices = [
      { id: 1, clientId: 1, totalAmount: 100, items: [] },
      { id: 2, clientId: 2, totalAmount: 200, items: [] },
    ];
    Invoice.findAll.mockResolvedValue(mockInvoices);

    const res = await request(app).get('/api/invoices');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockInvoices);
    expect(Invoice.findAll).toHaveBeenCalled();
  });

  it('should get an invoice by ID', async () => {
    const mockInvoice = { id: 1, clientId: 1, totalAmount: 100, items: [] };
    Invoice.findByPk.mockResolvedValue(mockInvoice);

    const res = await request(app).get('/api/invoices/1');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockInvoice);
    expect(Invoice.findByPk).toHaveBeenCalledWith('1', expect.any(Object));
  });

  it('should return 404 if invoice not found by ID', async () => {
    Invoice.findByPk.mockResolvedValue(null);

    const res = await request(app).get('/api/invoices/999');

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Invoice not found' });
  });

  it('should update an invoice', async () => {
    const mockInvoice = { id: 1, clientId: 1, totalAmount: 150, items: [] };
    Invoice.update.mockResolvedValue([1]);
    Invoice.findByPk.mockResolvedValue(mockInvoice);

    const res = await request(app)
      .put('/api/invoices/1')
      .send({ clientId: 1, totalAmount: 150 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockInvoice);
    expect(Invoice.update).toHaveBeenCalled();
    expect(mockTransaction.commit).toHaveBeenCalled();
  });

  it('should return 404 if invoice to update is not found', async () => {
    Invoice.update.mockResolvedValue([0]);

    const res = await request(app)
      .put('/api/invoices/999')
      .send({ clientId: 1, totalAmount: 150 });

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Invoice not found' });
  });

  it('should delete an invoice', async () => {
    Invoice.destroy.mockResolvedValue(1);

    const res = await request(app).delete('/api/invoices/1');

    expect(res.statusCode).toBe(204);
    expect(Invoice.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('should return 404 if invoice to delete is not found', async () => {
    Invoice.destroy.mockResolvedValue(0);

    const res = await request(app).delete('/api/invoices/999');

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Invoice not found' });
  });
});
