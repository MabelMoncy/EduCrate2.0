import { stripHtml } from '../lib/sanitizer.js';

const CATEGORIES = {
  feature: 'Suggest a new feature',
  improve: 'Improve an existing feature',
  bug: 'Report a mistake / bug',
  other: 'General enquiry',
};

/**
 * Handles user feedback submission.
 * Validates payload, strips HTML, and securely forwards to Web3Forms server-side.
 */
export const submitFeedback = async (req, res, next) => {
  try {
    const { name, email, category, message, botcheck } = req.body || {};

    // Honeypot check for bots
    if (botcheck) {
      return res.status(200).json({ success: true, message: 'Feedback submitted successfully' });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400);
      throw new Error('Message is required');
    }

    if (message.length > 5000) {
      res.status(400);
      throw new Error('Message cannot exceed 5000 characters');
    }

    if (name !== undefined && typeof name !== 'string') {
      res.status(400);
      throw new Error('Invalid name');
    }

    if (name && name.length > 100) {
      res.status(400);
      throw new Error('Name cannot exceed 100 characters');
    }

    if (email !== undefined && typeof email !== 'string') {
      res.status(400);
      throw new Error('Invalid email');
    }

    if (email && email.length > 200) {
      res.status(400);
      throw new Error('Email cannot exceed 200 characters');
    }

    const cleanMessage = stripHtml(message.trim()).substring(0, 5000);
    if (!cleanMessage) {
      res.status(400);
      throw new Error('Message is required');
    }

    const cleanName = name && typeof name === 'string'
      ? stripHtml(name.trim()).substring(0, 100)
      : 'Anonymous';
    const cleanEmail = email && typeof email === 'string' && email.trim()
      ? email.trim().substring(0, 200)
      : 'no-reply@educrate.app';
    const cleanCategory = typeof category === 'string' && CATEGORIES[category] ? category : 'other';
    const categoryLabel = CATEGORIES[cleanCategory];

    const web3formsKey = process.env.WEB3FORMS_KEY;

    if (!web3formsKey) {
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({
          success: true,
          message: 'Feedback received (dev mode: WEB3FORMS_KEY not configured)',
        });
      }
      res.status(503);
      throw new Error('Feedback service is temporarily unavailable');
    }

    const payload = {
      access_key: web3formsKey,
      subject: `[EduCrate Feedback] ${categoryLabel}`,
      name: cleanName || 'Anonymous',
      email: cleanEmail || 'no-reply@educrate.app',
      message: cleanMessage,
      botcheck: '',
    };

    const upstreamRes = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await upstreamRes.json();

    if (!data.success) {
      res.status(502);
      throw new Error(data.message || 'Failed to submit feedback upstream');
    }

    res.status(200).json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    next(error);
  }
};
