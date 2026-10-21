/**
 * Express router for Job-related endpoints.
 * Handles CRUD operations for jobs.
 * @module routes/Job
 */

const express = require('express');
const router = express.Router();
const Job = require('../models/Job'); // Import Job model
const { Op } = require('sequelize');
const { auth } = require('../middleware/auth');
const { requireRole, STAFF_ROLES } = require('../middleware/requireRole');
const { resolveClientIdForUser } = require('../utils/clientScope');

const staffOnly = requireRole(...STAFF_ROLES);

// Every job route requires a logged-in user
router.use(auth);

// GET all jobs
router.get('/', async (req, res) => {
  try {
    const { from, to, technicianId } = req.query;
    const where = {};
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime[Op.gte] = new Date(from);
      if (to) where.startTime[Op.lte] = new Date(to);
    }
    if (technicianId) where.assignedTo = technicianId;

    // 'client' users only ever see their own company's jobs
    if (!STAFF_ROLES.includes(req.user.role)) {
      const clientId = await resolveClientIdForUser(req.user.id);
      if (!clientId) return res.json([]);
      where.clientId = clientId;
    }

    let jobs = await Job.findAll({ where });

    // Auto-mark past tasks as 'incomplete' if the end/start date has passed and status is still 'scheduled' or null
    const now = new Date();
    const toMark = jobs.filter(j => {
      const end = j.endTime ? new Date(j.endTime) : (j.startTime ? new Date(j.startTime) : (j.date ? new Date(j.date) : null));
      return end && end < now && (!j.status || j.status === 'scheduled');
    });
    if (toMark.length) {
      await Promise.all(toMark.map(j => Job.update({ status: 'incomplete' }, { where: { id: j.id } })));
      // re-fetch jobs after updates
      jobs = await Job.findAll({ where });
    }

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET a single job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!STAFF_ROLES.includes(req.user.role)) {
      const clientId = await resolveClientIdForUser(req.user.id);
      if (!clientId || String(job.clientId) !== String(clientId)) {
        return res.status(404).json({ error: 'Job not found' });
      }
    }
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new job
router.post('/', staffOnly, async (req, res) => {
  try {
    // maintain legacy 'date' column for compatibility by setting it to startTime if present
    const payload = { ...req.body };
    if (!payload.date && payload.startTime) payload.date = payload.startTime;
    // Normalize assignedTo to an array if provided as single value
    if (payload.assignedTo && !Array.isArray(payload.assignedTo)) {
      payload.assignedTo = [payload.assignedTo];
    }
    // Overlap validation: ensure no assigned technician has an overlapping job
    if (payload.assignedTo && payload.assignedTo.length) {
      const start = payload.startTime ? new Date(payload.startTime) : null;
      const end = payload.endTime ? new Date(payload.endTime) : null;
      if (!start || !end) return res.status(400).json({ error: 'startTime and endTime are required' });

      const conflicts = [];
      for (const techId of payload.assignedTo) {
        const overlapping = await Job.findAll({
          where: {
            assignedTo: { [Op.contains]: [Number(techId)] },
            [Op.and]: [
              { startTime: { [Op.lt]: end } },
              { endTime: { [Op.gt]: start } }
            ]
          }
        });
        if (overlapping && overlapping.length) {
          conflicts.push({ techId, jobs: overlapping.map(j => j.id) });
        }
      }
      if (conflicts.length) {
        return res.status(400).json({ error: 'Technician(s) have overlapping tasks', conflicts });
      }
    }

    const job = await Job.create(payload);
    res.status(201).json(job);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update a job
router.put('/:id', staffOnly, async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.date && payload.startTime) payload.date = payload.startTime;
    if (payload.assignedTo && !Array.isArray(payload.assignedTo)) {
      payload.assignedTo = [payload.assignedTo];
    }
    // Overlap validation for updates: ensure no assigned technician has an overlapping job (exclude current job)
    if (payload.assignedTo && payload.assignedTo.length) {
      const start = payload.startTime ? new Date(payload.startTime) : null;
      const end = payload.endTime ? new Date(payload.endTime) : null;
      if (!start || !end) return res.status(400).json({ error: 'startTime and endTime are required' });

      const conflicts = [];
      for (const techId of payload.assignedTo) {
        const overlapping = await Job.findAll({
          where: {
            id: { [Op.ne]: req.params.id },
            assignedTo: { [Op.contains]: [Number(techId)] },
            [Op.and]: [
              { startTime: { [Op.lt]: end } },
              { endTime: { [Op.gt]: start } }
            ]
          }
        });
        if (overlapping && overlapping.length) {
          conflicts.push({ techId, jobs: overlapping.map(j => j.id) });
        }
      }
      if (conflicts.length) {
        return res.status(400).json({ error: 'Technician(s) have overlapping tasks', conflicts });
      }
    }

    const [updated] = await Job.update(payload, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ error: 'Job not found' });
    const job = await Job.findByPk(req.params.id);
    res.json(job);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a job
router.delete('/:id', staffOnly, async (req, res) => {
  try {
    const deleted = await Job.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Job not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export the router for use in the main app
module.exports = router;
