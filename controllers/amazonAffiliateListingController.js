const AmazonAffiliateListing = require('../models/AmazonAffiliateListing');
const { isAmazonProductUrl, extractAmazonProductMeta } = require('../utils/amazonPageMeta');

const normalizePayload = (body) => {
  if (!body || typeof body !== 'object') return body;
  const out = { ...body };
  if (typeof out.imageUrl === 'string' && out.imageUrl.trim()) {
    out.imageUrls = [out.imageUrl.trim()];
  }
  delete out.imageUrl;
  return out;
};

const toPublicJson = (row) => {
  const obj = row.toJSON ? row.toJSON() : { ...row };
  obj.image_url = obj.imageUrls?.length ? obj.imageUrls[0] : null;
  return obj;
};

const isValidHttpUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

exports.listPublished = async (_req, res) => {
  try {
    const rows = await AmazonAffiliateListing.findAll({
      where: { isPublished: true },
      order: [
        ['displayOrder', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    res.json(rows.map(toPublicJson));
  } catch (err) {
    res.status(500).json({ error: 'Error fetching affiliate listings', details: err.message });
  }
};

exports.listAllAdmin = async (_req, res) => {
  try {
    const rows = await AmazonAffiliateListing.findAll({
      order: [
        ['displayOrder', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    res.json(rows.map(toPublicJson));
  } catch (err) {
    res.status(500).json({ error: 'Error fetching affiliate listings', details: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const { name, amazonAffiliateUrl } = payload || {};
    if (!name || !amazonAffiliateUrl) {
      return res.status(400).json({ error: 'name and amazonAffiliateUrl are required' });
    }
    if (!isValidHttpUrl(amazonAffiliateUrl)) {
      return res.status(400).json({ error: 'amazonAffiliateUrl must be a valid http(s) URL' });
    }
    const row = await AmazonAffiliateListing.create(payload);
    res.status(201).json(toPublicJson(row));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    if (payload.amazonAffiliateUrl != null && !isValidHttpUrl(payload.amazonAffiliateUrl)) {
      return res.status(400).json({ error: 'amazonAffiliateUrl must be a valid http(s) URL' });
    }
    const [n] = await AmazonAffiliateListing.update(payload, { where: { id: req.params.id } });
    if (!n) return res.status(404).json({ error: 'Listing not found' });
    const row = await AmazonAffiliateListing.findByPk(req.params.id);
    res.json(toPublicJson(row));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.importFromUrl = async (req, res) => {
  try {
    const rawUrl = (req.body?.url || '').trim();
    if (!rawUrl) {
      return res.status(400).json({ error: 'url is required' });
    }
    if (!isValidHttpUrl(rawUrl)) {
      return res.status(400).json({ error: 'url must be a valid http(s) URL' });
    }
    if (!isAmazonProductUrl(rawUrl)) {
      return res.status(400).json({
        error: 'Only Amazon product links are allowed (amazon.*, amzn.to, a.co)',
      });
    }

    const meta = await extractAmazonProductMeta(rawUrl);

    const row = await AmazonAffiliateListing.create({
      name: meta.title,
      description: meta.description,
      category: typeof req.body.category === 'string' && req.body.category.trim()
        ? req.body.category.trim().slice(0, 255)
        : null,
      amazonAffiliateUrl: rawUrl.slice(0, 2048),
      imageUrls: meta.imageUrl ? [meta.imageUrl.slice(0, 2048)] : [],
      isPublished: req.body.isPublished !== false,
      displayOrder: Number.isFinite(Number(req.body.displayOrder))
        ? Number(req.body.displayOrder)
        : 0,
    });

    res.status(201).json(toPublicJson(row));
  } catch (err) {
    if (err.code === 'INVALID_AMAZON_URL') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'FETCH_FAILED') {
      return res.status(502).json({
        error: 'Could not read the Amazon page. Try again or add the listing manually.',
        details: err.cause?.message || err.message,
      });
    }
    res.status(400).json({ error: err.message });
  }
};

exports.destroy = async (req, res) => {
  try {
    const deleted = await AmazonAffiliateListing.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Listing not found' });
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
