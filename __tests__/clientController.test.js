// 🔧 MOCKS PRIMERO
jest.mock('../models', () => ({
    Client: {
        create: jest.fn(),
        findAll: jest.fn(),
        findByPk: jest.fn()
    },
    Contact: {
        destroy: jest.fn(),
        bulkCreate: jest.fn()
    },
    Job: {
        create: jest.fn()
    }
}));

jest.mock('../middleware/auth', () => 
    jest.fn((req, res, next) => {
        req.user = { id: 'user123' };
        next();
    })
);

// Importar después de los mocks
const clientController = require('../controllers/clientController');
const { Client, Contact, Job } = require('../models');

describe('Client Controller - Complete Coverage', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            params: {},
            body: {},
            user: { id: 'user123' }
        };

        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };

        // Console spy para debug
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('➕ createClient', () => {
        test('should create client with contacts successfully', async () => {
            req.body = {
                companyName: 'Test Company',
                address: '123 Main St',
                city: 'Test City',
                state: 'TS',
                zip: '12345',
                contacts: [
                    { name: 'John Doe', email: 'john@test.com', phone: '123-456-7890' }
                ]
            };

            const mockClient = {
                id: 1,
                companyName: 'Test Company',
                address: '123 Main St',
                city: 'Test City',
                state: 'TS',
                zip: '12345',
                contacts: [{ name: 'John Doe', email: 'john@test.com', phone: '123-456-7890' }]
            };

            Client.create.mockResolvedValue(mockClient);

            await clientController.createClient(req, res);

            expect(Client.create).toHaveBeenCalledWith({
                companyName: 'Test Company',
                address: '123 Main St',
                city: 'Test City',
                state: 'TS',
                zip: '12345',
                status: 'active',
                contacts: [
                    { name: 'John Doe', email: 'john@test.com', phone: '123-456-7890' }
                ]
            }, {
                include: [{ model: Contact, as: 'contacts' }]
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockClient);
        });

        test('should create client without contacts (using default empty array)', async () => {
            req.body = {
                companyName: 'Test Company',
                address: '123 Main St',
                city: 'Test City',
                state: 'TS',
                zip: '12345'
                // No contacts provided (undefined)
            };

            const mockClient = {
                id: 1,
                companyName: 'Test Company',
                contacts: []
            };

            Client.create.mockResolvedValue(mockClient);

            await clientController.createClient(req, res);

            expect(Client.create).toHaveBeenCalledWith({
                companyName: 'Test Company',
                address: '123 Main St',
                city: 'Test City',
                state: 'TS',
                zip: '12345',
                status: 'active',
                contacts: [] // contacts || [] should result in []
            }, {
                include: [{ model: Contact, as: 'contacts' }]
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockClient);
        });

        test('should create client with null contacts (using default empty array)', async () => {
            req.body = {
                companyName: 'Test Company',
                address: '123 Main St',
                contacts: null // Explicitly null
            };

            const mockClient = { id: 1, companyName: 'Test Company' };
            Client.create.mockResolvedValue(mockClient);

            await clientController.createClient(req, res);

            expect(Client.create).toHaveBeenCalledWith({
                companyName: 'Test Company',
                address: '123 Main St',
                city: undefined,
                state: undefined,
                zip: undefined,
                status: 'active',
                contacts: [] // null || [] should result in []
            }, {
                include: [{ model: Contact, as: 'contacts' }]
            });
        });

        test('should handle error in createClient', async () => {
            req.body = {
                companyName: 'Test Company',
                address: '123 Main St'
            };

            const dbError = new Error('Database connection failed');
            Client.create.mockRejectedValue(dbError);

            await clientController.createClient(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Database connection failed' });
        });

        test('should handle validation error in createClient', async () => {
            req.body = {
                companyName: 'Test Company',
                address: '123 Main St'
            };

            const validationError = new Error('Validation error: address is required');
            Client.create.mockRejectedValue(validationError);

            await clientController.createClient(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Validation error: address is required' });
        });
    });

    describe('📋 getClients', () => {
        test('should get all clients with includes successfully', async () => {
            const mockClients = [
                {
                    id: 1,
                    companyName: 'Company 1',
                    address: '123 Main St',
                    contacts: [{ name: 'Contact 1', email: 'contact1@test.com' }],
                    jobs: [{ description: 'Job 1', date: '2024-01-01' }]
                },
                {
                    id: 2,
                    companyName: 'Company 2',
                    address: '456 Oak Ave',
                    contacts: [],
                    jobs: []
                }
            ];

            Client.findAll.mockResolvedValue(mockClients);

            await clientController.getClients(req, res);

            expect(Client.findAll).toHaveBeenCalledWith({
                include: [
                    { model: Contact, as: 'contacts' },
                    { model: Job, as: 'jobs' }
                ]
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockClients);
        });

        test('should handle empty result in getClients', async () => {
            Client.findAll.mockResolvedValue([]);

            await clientController.getClients(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([]);
        });

        test('should handle error in getClients', async () => {
            const dbError = new Error('Database connection failed');
            Client.findAll.mockRejectedValue(dbError);

            await clientController.getClients(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Database connection failed' });
        });
    });

    describe('🔍 getClientById', () => {
        test('should get client by ID with includes successfully', async () => {
            req.params.id = '1';

            const mockClient = {
                id: 1,
                companyName: 'Test Company',
                address: '123 Main St',
                contacts: [{ name: 'John Doe', email: 'john@test.com' }],
                jobs: [{ description: 'Installation Job', date: '2024-01-15' }]
            };

            Client.findByPk.mockResolvedValue(mockClient);

            await clientController.getClientById(req, res);

            expect(Client.findByPk).toHaveBeenCalledWith('1', {
                include: [
                    { model: Contact, as: 'contacts' },
                    { model: Job, as: 'jobs' }
                ]
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockClient);
        });

        test('should return 404 when client not found', async () => {
            req.params.id = '999';

            Client.findByPk.mockResolvedValue(null);

            await clientController.getClientById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Client no found' });
        });

        test('should handle error in getClientById', async () => {
            req.params.id = '1';

            const dbError = new Error('Database error');
            Client.findByPk.mockRejectedValue(dbError);

            await clientController.getClientById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Database error' });
        });
    });

    describe('✏️ updateClient', () => {
        test('should update client with contacts successfully', async () => {
            req.params.id = '1';
            req.body = {
                companyName: 'Updated Company',
                address: 'Updated Address',
                city: 'Updated City',
                state: 'UC',
                zip: '54321',
                contacts: [
                    { name: 'Updated Contact', email: 'updated@test.com', phone: '098-765-4321' }
                ]
            };

            const mockClient = {
                id: 1,
                companyName: 'Old Company',
                address: 'Old Address',
                city: 'Old City',
                state: 'OC',
                zip: '12345',
                update: jest.fn()
            };

            const mockUpdatedClient = {
                id: 1,
                companyName: 'Updated Company',
                address: 'Updated Address',
                city: 'Updated City',
                contacts: [{ name: 'Updated Contact', email: 'updated@test.com' }]
            };

            Client.findByPk
                .mockResolvedValueOnce(mockClient) // For initial check
                .mockResolvedValueOnce(mockUpdatedClient); // For final response

            Contact.destroy.mockResolvedValue(1);
            Contact.bulkCreate.mockResolvedValue([]);

            await clientController.updateClient(req, res);

            // Verificar que client.update fue llamado con los valores correctos
            expect(mockClient.update).toHaveBeenCalledWith({
                companyName: 'Updated Company', // companyName ?? client.companyName
                address: 'Updated Address', // address ?? client.address
                city: 'Updated City', // city ?? client.city
                state: 'UC', // state ?? client.state
                zip: '54321' // zip ?? client.zip
            });

            // Verificar manejo de contactos
            expect(Contact.destroy).toHaveBeenCalledWith({ where: { clientId: 1 } });
            expect(Contact.bulkCreate).toHaveBeenCalledWith([
                { name: 'Updated Contact', email: 'updated@test.com', phone: '098-765-4321', clientId: 1 }
            ]);

            // Verificar que se busca el cliente actualizado
            expect(Client.findByPk).toHaveBeenCalledWith(1, {
                include: [{ model: Contact, as: 'contacts' }]
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockUpdatedClient);
        });

        test('should update client without contacts (no contacts provided)', async () => {
            req.params.id = '1';
            req.body = {
                companyName: 'Updated Company',
                address: 'Updated Address'
                // No contacts provided - should not update contacts
            };

            const mockClient = {
                id: 1,
                companyName: 'Old Company',
                address: 'Old Address',
                city: 'Old City',
                state: 'OC',
                zip: '12345',
                update: jest.fn()
            };

            const mockUpdatedClient = {
                id: 1,
                companyName: 'Updated Company',
                address: 'Updated Address'
            };

            Client.findByPk
                .mockResolvedValueOnce(mockClient)
                .mockResolvedValueOnce(mockUpdatedClient);

            await clientController.updateClient(req, res);

            // 🔧 CORREGIR: El nullish coalescing (??) mantiene los valores existentes cuando son undefined
            expect(mockClient.update).toHaveBeenCalledWith({
                companyName: 'Updated Company',
                address: 'Updated Address',
                city: 'Old City', // undefined ?? client.city = 'Old City'
                state: 'OC', // undefined ?? client.state = 'OC'  
                zip: '12345' // undefined ?? client.zip = '12345'
            });

            // Como no se enviaron contacts, no debería llamar a destroy ni bulkCreate
            expect(Contact.destroy).not.toHaveBeenCalled();
            expect(Contact.bulkCreate).not.toHaveBeenCalled();

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockUpdatedClient);
        });

        test('should test nullish coalescing operator (??) behavior', async () => {
            req.params.id = '1';
            req.body = {
                companyName: null, // null ?? client.companyName should use client.companyName
                address: '', // '' ?? client.address should use '' (empty string is falsy but not null/undefined)
                city: undefined, // undefined ?? client.city should use client.city
                state: 'New State', // 'New State' ?? client.state should use 'New State'
                zip: 0 // 0 ?? client.zip should use 0 (falsy but not null/undefined)
            };

            const mockClient = {
                id: 1,
                companyName: 'Old Company',
                address: 'Old Address',
                city: 'Old City',
                state: 'Old State',
                zip: '12345',
                update: jest.fn()
            };

            Client.findByPk
                .mockResolvedValueOnce(mockClient)
                .mockResolvedValueOnce(mockClient);

            await clientController.updateClient(req, res);

            expect(mockClient.update).toHaveBeenCalledWith({
                companyName: 'Old Company', // null ?? 'Old Company' = 'Old Company'
                address: '', // '' ?? 'Old Address' = '' (empty string)
                city: 'Old City', // undefined ?? 'Old City' = 'Old City'
                state: 'New State', // 'New State' ?? 'Old State' = 'New State'
                zip: 0 // 0 ?? '12345' = 0
            });
        });

        test('should update client with empty contacts array', async () => {
            req.params.id = '1';
            req.body = {
                companyName: 'Updated Company',
                contacts: [] // Empty array should still trigger contact operations
            };

            const mockClient = {
                id: 1,
                companyName: 'Old Company',
                address: 'Old Address',
                city: 'Old City',
                state: 'OC',
                zip: '12345',
                update: jest.fn()
            };

            Client.findByPk
                .mockResolvedValueOnce(mockClient)
                .mockResolvedValueOnce(mockClient);

            Contact.destroy.mockResolvedValue(2);
            Contact.bulkCreate.mockResolvedValue([]);

            await clientController.updateClient(req, res);

            // Debería destruir contactos existentes pero no crear nuevos
            expect(Contact.destroy).toHaveBeenCalledWith({ where: { clientId: 1 } });
            expect(Contact.bulkCreate).toHaveBeenCalledWith([]); // Empty array
        });

        test('should return 404 when client not found in updateClient', async () => {
            req.params.id = '999';
            req.body = { companyName: 'Updated Company' };

            Client.findByPk.mockResolvedValue(null);

            await clientController.updateClient(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Client no found' });
        });

        test('should handle error in updateClient', async () => {
            req.params.id = '1';
            req.body = { companyName: 'Updated Company' };

            const dbError = new Error('Update failed');
            Client.findByPk.mockRejectedValue(dbError);

            await clientController.updateClient(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Update failed' });
        });
    });

    describe('➕ addJobToClient', () => {
        test('should add job to client with all fields successfully', async () => {
            req.params.id = '1';
            req.body = {
                date: '2024-01-15',
                description: 'Installation Job',
                equipmentInstalled: ['Equipment A', 'Equipment B'],
                images: ['image1.jpg', 'image2.jpg'],
                notes: 'Completed successfully',
                invoiceId: 'INV-001'
            };

            const mockClient = {
                id: 1,
                companyName: 'Test Company',
                status: 'active',
            };

            const mockJob = {
                id: 1,
                date: new Date('2024-01-15'),
                description: 'Installation Job',
                equipmentInstalled: ['Equipment A', 'Equipment B'],
                images: ['image1.jpg', 'image2.jpg'],
                notes: 'Completed successfully',
                invoiceId: 'INV-001',
                clientId: 1
            };

            Client.findByPk.mockResolvedValue(mockClient);
            Job.create.mockResolvedValue(mockJob);

            await clientController.addJobToClient(req, res);

            expect(Client.findByPk).toHaveBeenCalledWith('1');
            expect(Job.create).toHaveBeenCalledWith({
                date: new Date('2024-01-15'), // date ? new Date(date) : new Date()
                description: 'Installation Job',
                equipmentInstalled: ['Equipment A', 'Equipment B'], // equipmentInstalled || []
                images: ['image1.jpg', 'image2.jpg'], // images || []
                notes: 'Completed successfully', // notes || ''
                invoiceId: 'INV-001', // invoiceId || null
                clientId: 1
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockJob);
        });

        test('should add job with default values when optional fields not provided', async () => {
            req.params.id = '1';
            req.body = {
                description: 'Simple Job'
                // All other fields undefined - should use defaults
            };

            const mockClient = { id: 1, status: 'active' };
            const mockJob = {
                id: 1,
                description: 'Simple Job',
                equipmentInstalled: [],
                images: [],
                notes: '',
                invoiceId: null,
                clientId: 1
            };

            Client.findByPk.mockResolvedValue(mockClient);
            Job.create.mockResolvedValue(mockJob);

            // Mock Date constructor for consistent testing
            const mockDate = new Date('2024-01-01T00:00:00.000Z');
            const originalDate = global.Date;
            global.Date = jest.fn(() => mockDate);
            global.Date.now = originalDate.now;
            global.Date.parse = originalDate.parse;
            global.Date.UTC = originalDate.UTC;

            await clientController.addJobToClient(req, res);

            expect(Job.create).toHaveBeenCalledWith({
                date: mockDate, // date ? new Date(date) : new Date() -> new Date()
                description: 'Simple Job',
                equipmentInstalled: [], // equipmentInstalled || []
                images: [], // images || []
                notes: '', // notes || ''
                invoiceId: null, // invoiceId || null
                clientId: 1
            });

            // Restore Date
            global.Date = originalDate;

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockJob);
        });

        test('should add job with null/empty optional fields using logical OR', async () => {
            req.params.id = '1';
            req.body = {
                description: 'Test Job',
                equipmentInstalled: null, // null || [] should be []
                images: undefined, // undefined || [] should be []
                notes: null, // null || '' should be ''
                invoiceId: undefined // undefined || null should be null
            };

            const mockClient = { id: 1, status: 'active' };
            const mockJob = { id: 1, description: 'Test Job', clientId: 1 };

            Client.findByPk.mockResolvedValue(mockClient);
            Job.create.mockResolvedValue(mockJob);

            await clientController.addJobToClient(req, res);

            expect(Job.create).toHaveBeenCalledWith({
                date: expect.any(Date), // new Date() since date is undefined
                description: 'Test Job',
                equipmentInstalled: [], // null || []
                images: [], // undefined || []
                notes: '', // null || ''
                invoiceId: null, // undefined || null
                clientId: 1
            });
        });

        test('should return 404 when client not found in addJobToClient', async () => {
            req.params.id = '999';
            req.body = { description: 'Test Job' };

            Client.findByPk.mockResolvedValue(null);

            await clientController.addJobToClient(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Client no found' });
            expect(Job.create).not.toHaveBeenCalled();
        });

        test('should handle error in addJobToClient', async () => {
            req.params.id = '1';
            req.body = { description: 'Test Job' };

            const dbError = new Error('Job creation failed');
            Client.findByPk.mockRejectedValue(dbError);

            await clientController.addJobToClient(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Job creation failed' });
        });

        test('should handle invalid date in addJobToClient', async () => {
            req.params.id = '1';
            req.body = {
                date: 'invalid-date',
                description: 'Test Job'
            };

            const mockClient = { id: 1, status: 'active' };
            Client.findByPk.mockResolvedValue(mockClient);

            // 🔧 CORREGIR: new Date('invalid-date') creates Invalid Date
            const mockJob = { id: 1, description: 'Test Job', clientId: 1 };
            Job.create.mockResolvedValue(mockJob);

            await clientController.addJobToClient(req, res);

            // 🔧 USAR expect.any(Date) en lugar de comparar Invalid Date directamente
            expect(Job.create).toHaveBeenCalledWith({
                date: expect.any(Date), // Cualquier objeto Date (incluso Invalid Date)
                description: 'Test Job',
                equipmentInstalled: [],
                images: [],
                notes: '',
                invoiceId: null,
                clientId: 1
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockJob);
        });
    });

    describe('📦 Module Exports', () => {
        test('should export all controller functions', () => {
            expect(typeof clientController.createClient).toBe('function');
            expect(typeof clientController.getClients).toBe('function');
            expect(typeof clientController.getClientById).toBe('function');
            expect(typeof clientController.updateClient).toBe('function');
            expect(typeof clientController.addJobToClient).toBe('function');
        });
    });

    describe('🔍 EDGE CASES & COMPLETE COVERAGE', () => {
        test('should test logical OR vs nullish coalescing differences', () => {
            // Para documentar la diferencia entre || y ??
            const testCases = [
                { value: null, or: null || 'default', nullish: null ?? 'default' },
                { value: undefined, or: undefined || 'default', nullish: undefined ?? 'default' },
                { value: '', or: '' || 'default', nullish: '' ?? 'default' },
                { value: 0, or: 0 || 'default', nullish: 0 ?? 'default' },
                { value: false, or: false || 'default', nullish: false ?? 'default' },
                { value: [], or: [] || 'default', nullish: [] ?? 'default' }
            ];

            testCases.forEach(({ value, or, nullish }) => {
                if (value === null || value === undefined) {
                    expect(or).toBe('default');
                    expect(nullish).toBe('default');
                } else {
                    // 🔧 CORREGIR: Usar toStrictEqual para arrays y objetos
                    if (Array.isArray(value)) {
                        expect(or).toStrictEqual(value); // Arrays need deep equality
                        expect(nullish).toStrictEqual(value);
                    } else {
                        expect(or).toBe(value === '' || value === 0 || value === false ? 'default' : value);
                        expect(nullish).toBe(value);
                    }
                }
            });
        });

        test('should verify Date constructor behavior', () => {
            // Testear comportamiento de new Date()
            const validDate = new Date('2024-01-15');
            const invalidDate = new Date('invalid');
            const currentDate = new Date();

            expect(validDate.getFullYear()).toBe(2024);
            expect(invalidDate.toString()).toBe('Invalid Date');
            expect(currentDate).toBeInstanceOf(Date);
        });

        test('should verify array map behavior in contacts', () => {
            // Testear el comportamiento de contacts.map usado en updateClient
            const contacts = [
                { name: 'John', email: 'john@test.com' },
                { name: 'Jane', email: 'jane@test.com' }
            ];

            const clientId = 1;
            const mappedContacts = contacts.map(c => ({ ...c, clientId }));

            expect(mappedContacts).toEqual([
                { name: 'John', email: 'john@test.com', clientId: 1 },
                { name: 'Jane', email: 'jane@test.com', clientId: 1 }
            ]);
        });
    });
});