const request = require('supertest');

jest.mock('../../middleware/auth', () => ({ auth: (req, res, next) => next() }));
jest.mock('../../middleware/adminAuth', () => (req, res, next) => next());
jest.mock('../../routes/proposalRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../../routes/amazonAffiliateListingRoutes', () => {
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
    update: jest.fn(),
    destroy: jest.fn(),
  })),
}));
jest.mock('../../models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn(),
}));
jest.mock('../../models/Product', () => ({
  findAll: jest.fn(),
  findAndCountAll: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
}));

const app = require('../../server');
const Product = require('../../models/Product');

describe('Product Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });

  it('should create a product', async () => {
    const mockProduct = {
      id: 1,
      name: 'Test Product',
      brand: 'Test Brand',
      model: 'Test Model',
      description: 'Test Description',
      quantity: 10,
      priceSell: 100,
      priceBuy: 80,
      category: 'Test Category',
      imageUrls: [],
      // Change to string to match JSON serialization
    };
    Product.create.mockResolvedValue(mockProduct);

    const res = await request(app)
      .post('/api/products')
      .send({
        name: 'Test Product',
        brand: 'Test Brand',
        model: 'Test Model',
        quantity: 10,
        priceSell: 100,
        priceBuy: 80,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(mockProduct);
    expect(Product.create).toHaveBeenCalledWith({
      name: 'Test Product',
      brand: 'Test Brand',
      model: 'Test Model',
      quantity: 10,
      priceSell: 100,
      priceBuy: 80,
    });
  });

  it('should get all products', async () => {
    /**
     * An array of mock product objects used for testing purposes.
     * Each product contains all fields from the Product model.
     *
     * @type {Array<{id: number, name: string, brand: string, model: string, description: string, quantity: number, priceSell: number, priceBuy: number, category: string, imageUrls: string[], createdAt: Date}>}
     */
    const mockProducts = [
      {
        id: 1,
        name: 'Product 1',
        brand: 'Brand 1',
        model: 'Model 1',
        description: 'Description 1',
        quantity: 10,
        priceSell: 100,
        priceBuy: 80,
        category: 'Category 1',
        imageUrls: [],
        createdAt: '2025-09-13T10:28:19.874Z',
      },
      {
        id: 2,
        name: 'Product 2',
        brand: 'Brand 2',
        model: 'Model 2',
        description: 'Description 2',
        quantity: 20,
        priceSell: 200,
        priceBuy: 160,
        category: 'Category 2',
        imageUrls: [],
        createdAt: '2025-09-13T10:28:19.874Z',
      },
    ];
    Product.findAndCountAll.mockResolvedValue({ rows: mockProducts, count: 2 });

    const res = await request(app).get('/api/products');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockProducts);
    expect(Product.findAndCountAll).toHaveBeenCalledWith({
      limit: 100,
      offset: 0,
      order: [['id', 'ASC']],
    });
  });

  it('should get a product by ID', async () => {
    const mockProduct = {
      id: 1,
      name: 'Test Product',
      brand: 'Test Brand',
      model: 'Test Model',
      description: 'Test Description',
      quantity: 10,
      priceSell: 100,
      priceBuy: 80,
      category: 'Test Category',
      imageUrls: [],
      // Fixed value for consistency in tests
    };
    Product.findByPk.mockResolvedValue(mockProduct);

    const res = await request(app).get('/api/products/1');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockProduct);
    expect(Product.findByPk).toHaveBeenCalledWith('1');
  });

  it('should return 404 if product not found by ID', async () => {
    Product.findByPk.mockResolvedValue(null);

    const res = await request(app).get('/api/products/999');

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
    expect(Product.findByPk).toHaveBeenCalledWith('999');
  });

  it('should update a product', async () => {
    const mockUpdatedProduct = {
      id: 1,
      name: 'Updated Product',
      brand: 'Test Brand',
      model: 'Test Model',
      description: 'Test Description',
      quantity: 10,
      priceSell: 150,
      priceBuy: 80,
      category: 'Test Category',
      imageUrls: [],
      createdAt: '2025-09-13T10:28:19.874Z', // Valor fijo para consistencia en pruebas
    };
    Product.update.mockResolvedValue([1]);
    Product.findByPk.mockResolvedValue(mockUpdatedProduct);

    const res = await request(app)
      .put('/api/products/1')
      .send({ name: 'Updated Product', priceSell: 150 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockUpdatedProduct);
    expect(Product.update).toHaveBeenCalledWith(
      { name: 'Updated Product', priceSell: 150 },
      { where: { id: '1' } }
    );
    expect(Product.findByPk).toHaveBeenCalledWith('1');
  });

  it('should return 404 if product to update is not found', async () => {
    Product.update.mockResolvedValue([0]);

    const res = await request(app)
      .put('/api/products/999')
      .send({ name: 'Nonexistent Product', priceSell: 150 });

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
    expect(Product.update).toHaveBeenCalledWith(
      { name: 'Nonexistent Product', priceSell: 150 },
      { where: { id: '999' } }
    );
  });

  it('should delete a product', async () => {
    Product.destroy.mockResolvedValue(1);

    const res = await request(app).delete('/api/products/1');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'Product deleted' });
    expect(Product.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('should return 404 if product to delete is not found', async () => {
    Product.destroy.mockResolvedValue(0);

    const res = await request(app).delete('/api/products/999');

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
    expect(Product.destroy).toHaveBeenCalledWith({ where: { id: '999' } });
  });
});