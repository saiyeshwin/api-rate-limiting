const crypto = require('crypto');
const db = require('../config/db');

// @desc    Generate a new API key for a registered API
// @route   POST /api/keys
const generateKey = async (req, res) => {
  const { api_id, name } = req.body;

  if (!api_id) {
    return res.status(400).json({ error: 'Please provide api_id' });
  }

  try {
    // Verify API belongs to current user
    const apiCheck = await db.query('SELECT id FROM apis WHERE id = $1 AND user_id = $2', [api_id, req.user.id]);
    if (apiCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API not found or access denied' });
    }

    // Generate secure random key
    const rawKey = `ap_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 10) + '...'; // e.g. "ap_4f8e21..."
    const keyName = name ? name.trim() : 'Default Key';

    // Insert key into database
    const result = await db.query(
      'INSERT INTO api_keys (api_id, key_hash, key_prefix, name) VALUES ($1, $2, $3, $4) RETURNING id, api_id, key_prefix, name, created_at',
      [api_id, keyHash, keyPrefix, keyName]
    );

    const generatedKey = result.rows[0];

    // Return raw key ONLY ONCE
    res.status(201).json({
      ...generatedKey,
      plain_key: rawKey
    });
  } catch (error) {
    console.error('Error generating API key:', error.message);
    res.status(500).json({ error: 'Server error generating API key' });
  }
};

// @desc    Get all active API keys for a registered API
// @route   GET /api/keys/api/:apiId
const getKeysByApi = async (req, res) => {
  const { apiId } = req.params;

  try {
    // Verify API ownership
    const apiCheck = await db.query('SELECT id FROM apis WHERE id = $1 AND user_id = $2', [apiId, req.user.id]);
    if (apiCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API not found or access denied' });
    }

    // Fetch keys
    const result = await db.query(
      'SELECT id, api_id, key_prefix, name, created_at, revoked_at FROM api_keys WHERE api_id = $1 ORDER BY created_at DESC',
      [apiId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching API keys:', error.message);
    res.status(500).json({ error: 'Server error fetching API keys' });
  }
};

// @desc    Revoke an API key
// @route   POST /api/keys/:id/revoke
const revokeKey = async (req, res) => {
  const { id } = req.params;

  try {
    // Verify the key belongs to an API owned by the logged-in user
    const keyCheck = await db.query(
      `SELECT k.id, k.revoked_at 
       FROM api_keys k 
       JOIN apis a ON k.api_id = a.id 
       WHERE k.id = $1 AND a.user_id = $2`,
      [id, req.user.id]
    );

    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found or access denied' });
    }

    if (keyCheck.rows[0].revoked_at !== null) {
      return res.status(400).json({ error: 'API key has already been revoked' });
    }

    // Revoke the key
    const result = await db.query(
      'UPDATE api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, api_id, key_prefix, name, revoked_at',
      [id]
    );

    res.json({
      message: 'API key revoked successfully',
      key: result.rows[0]
    });
  } catch (error) {
    console.error('Error revoking API key:', error.message);
    res.status(500).json({ error: 'Server error revoking API key' });
  }
};

module.exports = {
  generateKey,
  getKeysByApi,
  revokeKey
};
