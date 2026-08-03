jest.mock('../../models/AmazonAffiliateListing', () => ({
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findByPk: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock('../../utils/amazonPageMeta', () => ({
  isAmazonProductUrl: jest.fn(),
  extractAmazonProductMeta: jest.fn(),
}));

const controller = require('../../controllers/amazonAffiliateListingController');
const AmazonAffiliateListing = require('../../models/AmazonAffiliateListing');
const { isAmazonProductUrl, extractAmazonProductMeta } = require('../../utils/amazonPageMeta');

const mkRow = (data) => ({
  ...data,
  toJSON: () => ({ ...data }),
});

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('amazonAffiliateListingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listPublished', () => {
    test('returns only published listings mapped to public JSON', async () => {
      const rows = [
        mkRow({ id: 1, name: 'A', imageUrls: ['https://img/a.jpg'], isPublished: true }),
        mkRow({ id: 2, name: 'B', imageUrls: null }),
      ];
      AmazonAffiliateListing.findAll.mockResolvedValue(rows);
      const res = mkRes();

      await controller.listPublished({}, res);

      expect(AmazonAffiliateListing.findAll).toHaveBeenCalledWith({
        where: { isPublished: true },
        order: [
          ['displayOrder', 'ASC'],
          ['id', 'ASC'],
        ],
      });
      expect(res.json).toHaveBeenCalledWith([
        { id: 1, name: 'A', imageUrls: ['https://img/a.jpg'], isPublished: true, image_url: 'https://img/a.jpg' },
        { id: 2, name: 'B', imageUrls: null, image_url: null },
      ]);
    });

    test('returns 500 when the query fails', async () => {
      AmazonAffiliateListing.findAll.mockRejectedValue(new Error('db down'));
      const res = mkRes();

      await controller.listPublished({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error fetching affiliate listings',
        details: 'db down',
      });
    });
  });

  describe('listAllAdmin', () => {
    test('returns all listings regardless of publication', async () => {
      const rows = [mkRow({ id: 1, name: 'Hidden', isPublished: false })];
      AmazonAffiliateListing.findAll.mockResolvedValue(rows);
      const res = mkRes();

      await controller.listAllAdmin({}, res);

      expect(AmazonAffiliateListing.findAll).toHaveBeenCalledWith({
        order: [
          ['displayOrder', 'ASC'],
          ['id', 'ASC'],
        ],
      });
      expect(res.json).toHaveBeenCalledWith([
        { id: 1, name: 'Hidden', isPublished: false, image_url: null },
      ]);
    });

    test('returns 500 when the query fails', async () => {
      AmazonAffiliateListing.findAll.mockRejectedValue(new Error('db down'));
      const res = mkRes();

      await controller.listAllAdmin({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('create', () => {
    test('requires name and amazonAffiliateUrl', async () => {
      const res = mkRes();
      await controller.create({ body: { name: 'Only name' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'name and amazonAffiliateUrl are required' });
    });

    test('rejects a non-http(s) URL', async () => {
      const res = mkRes();
      await controller.create(
        { body: { name: 'X', amazonAffiliateUrl: 'ftp://nope' } },
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'amazonAffiliateUrl must be a valid http(s) URL',
      });
    });

    test('creates a listing and normalizes imageUrl into imageUrls', async () => {
      const created = mkRow({
        id: 9,
        name: 'Widget',
        amazonAffiliateUrl: 'https://www.amazon.com/dp/B0000?tag=store-20',
        imageUrls: ['https://img/x.jpg'],
      });
      AmazonAffiliateListing.create.mockResolvedValue(created);
      const res = mkRes();

      await controller.create(
        {
          body: {
            name: 'Widget',
            amazonAffiliateUrl: 'https://www.amazon.com/dp/B0000?tag=store-20',
            imageUrl: '  https://img/x.jpg  ',
          },
        },
        res
      );

      expect(AmazonAffiliateListing.create).toHaveBeenCalledWith({
        name: 'Widget',
        amazonAffiliateUrl: 'https://www.amazon.com/dp/B0000?tag=store-20',
        imageUrls: ['https://img/x.jpg'],
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 9, image_url: 'https://img/x.jpg' })
      );
    });

    test('returns 400 when creation fails', async () => {
      AmazonAffiliateListing.create.mockRejectedValue(new Error('unique violation'));
      const res = mkRes();

      await controller.create(
        { body: { name: 'X', amazonAffiliateUrl: 'https://www.amazon.com/dp/B0000' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'unique violation' });
    });
  });

  describe('update', () => {
    test('rejects an invalid amazonAffiliateUrl', async () => {
      const res = mkRes();
      await controller.update({ body: { amazonAffiliateUrl: 'not-a-url' }, params: { id: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when the listing does not exist', async () => {
      AmazonAffiliateListing.update.mockResolvedValue([0]);
      const res = mkRes();

      await controller.update({ body: { name: 'X' }, params: { id: '123' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Listing not found' });
    });

    test('updates and returns the refreshed listing', async () => {
      const updated = mkRow({ id: 1, name: 'New', imageUrls: null });
      AmazonAffiliateListing.update.mockResolvedValue([1]);
      AmazonAffiliateListing.findByPk.mockResolvedValue(updated);
      const res = mkRes();

      await controller.update({ body: { name: 'New' }, params: { id: '1' } }, res);

      expect(AmazonAffiliateListing.update).toHaveBeenCalledWith(
        { name: 'New' },
        { where: { id: '1' } }
      );
      expect(AmazonAffiliateListing.findByPk).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'New', imageUrls: null, image_url: null });
    });

    test('returns 400 when the update fails', async () => {
      AmazonAffiliateListing.update.mockRejectedValue(new Error('boom'));
      const res = mkRes();

      await controller.update({ body: { name: 'X' }, params: { id: '1' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
    });
  });

  describe('importFromUrl', () => {
    test('requires a url', async () => {
      const res = mkRes();
      await controller.importFromUrl({ body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'url is required' });
    });

    test('rejects non-http(s) url', async () => {
      const res = mkRes();
      await controller.importFromUrl({ body: { url: 'amazon.com' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('rejects non-Amazon urls', async () => {
      isAmazonProductUrl.mockReturnValue(false);
      const res = mkRes();
      await controller.importFromUrl(
        { body: { url: 'https://www.walmart.com/item/123' } },
        res
      );
      expect(isAmazonProductUrl).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Only Amazon product links are allowed (amazon.*, amzn.to, a.co)',
      });
    });

    test('returns 502 when the Amazon page cannot be read', async () => {
      isAmazonProductUrl.mockReturnValue(true);
      extractAmazonProductMeta.mockRejectedValue(
        Object.assign(new Error('timeout'), { code: 'FETCH_FAILED', cause: new Error('timed out') })
      );
      const res = mkRes();

      await controller.importFromUrl(
        { body: { url: 'https://www.amazon.com/dp/B0000' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Could not read the Amazon page. Try again or add the listing manually.',
        details: 'timed out',
      });
    });

    test('returns 400 for an invalid Amazon url from the scraper', async () => {
      isAmazonProductUrl.mockReturnValue(true);
      extractAmazonProductMeta.mockRejectedValue(
        Object.assign(new Error('Invalid Amazon URL'), { code: 'INVALID_AMAZON_URL' })
      );
      const res = mkRes();

      await controller.importFromUrl({ body: { url: 'https://a.co/x' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid Amazon URL' });
    });

    test('creates a listing from scraped metadata', async () => {
      isAmazonProductUrl.mockReturnValue(true);
      extractAmazonProductMeta.mockResolvedValue({
        title: 'Great Widget',
        description: 'A widget',
        imageUrl: 'https://m.media-amazon.com/images/I/61ABC._AC_SL1500_.jpg',
      });
      const created = mkRow({
        id: 5,
        name: 'Great Widget',
        amazonAffiliateUrl: 'https://www.amazon.com/dp/B0000?tag=store-20',
        imageUrls: ['https://m.media-amazon.com/images/I/61ABC._AC_SL1500_.jpg'],
      });
      AmazonAffiliateListing.create.mockResolvedValue(created);
      const res = mkRes();

      await controller.importFromUrl(
        {
          body: {
            url: 'https://www.amazon.com/dp/B0000?tag=store-20',
            category: 'Home',
            isPublished: true,
            displayOrder: 3,
          },
        },
        res
      );

      expect(AmazonAffiliateListing.create).toHaveBeenCalledWith({
        name: 'Great Widget',
        description: 'A widget',
        category: 'Home',
        amazonAffiliateUrl: 'https://www.amazon.com/dp/B0000?tag=store-20',
        imageUrls: ['https://m.media-amazon.com/images/I/61ABC._AC_SL1500_.jpg'],
        isPublished: true,
        displayOrder: 3,
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('returns 400 on unexpected errors', async () => {
      isAmazonProductUrl.mockReturnValue(true);
      extractAmazonProductMeta.mockRejectedValue(new Error('unexpected'));
      const res = mkRes();

      await controller.importFromUrl(
        { body: { url: 'https://www.amazon.com/dp/B0000' } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'unexpected' });
    });
  });

  describe('destroy', () => {
    test('returns 404 when the listing does not exist', async () => {
      AmazonAffiliateListing.destroy.mockResolvedValue(0);
      const res = mkRes();

      await controller.destroy({ params: { id: '999' } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Listing not found' });
    });

    test('deletes the listing', async () => {
      AmazonAffiliateListing.destroy.mockResolvedValue(1);
      const res = mkRes();

      await controller.destroy({ params: { id: '1' } }, res);

      expect(AmazonAffiliateListing.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(res.json).toHaveBeenCalledWith({ message: 'Listing deleted' });
    });

    test('returns 500 when deletion fails', async () => {
      AmazonAffiliateListing.destroy.mockRejectedValue(new Error('boom'));
      const res = mkRes();

      await controller.destroy({ params: { id: '1' } }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
    });
  });
});
