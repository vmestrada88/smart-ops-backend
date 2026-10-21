jest.mock('../../models', () => ({
    User: { findByPk: jest.fn() },
    Contact: { findOne: jest.fn() },
}));

const { User, Contact } = require('../../models');
const { resolveClientIdForUser, getUserEmail } = require('../../utils/clientScope');

describe('clientScope utils', () => {
    beforeEach(() => jest.clearAllMocks());

    test('resolves the client of a user through the contact email', async () => {
        User.findByPk.mockResolvedValue({ id: 3, email: 'owner@test.com' });
        Contact.findOne.mockResolvedValue({ clientId: 42 });

        await expect(resolveClientIdForUser(3)).resolves.toBe(42);
        expect(Contact.findOne).toHaveBeenCalledWith({ where: { email: 'owner@test.com' } });
    });

    test('returns null when the user or the contact does not exist', async () => {
        User.findByPk.mockResolvedValue(null);
        await expect(resolveClientIdForUser(3)).resolves.toBeNull();

        User.findByPk.mockResolvedValue({ id: 3, email: 'owner@test.com' });
        Contact.findOne.mockResolvedValue(null);
        await expect(resolveClientIdForUser(3)).resolves.toBeNull();
    });

    test('getUserEmail returns the email or null', async () => {
        User.findByPk.mockResolvedValue({ email: 'owner@test.com' });
        await expect(getUserEmail(3)).resolves.toBe('owner@test.com');

        User.findByPk.mockResolvedValue(null);
        await expect(getUserEmail(3)).resolves.toBeNull();
    });
});
