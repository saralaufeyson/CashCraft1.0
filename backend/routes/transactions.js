const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Create transaction
router.post('/',
  auth,
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('jar').notEmpty().withMessage('Jar is required'),
    body('type').isIn(['expense', 'income']).withMessage('Invalid transaction type'),
    body('category').trim().notEmpty().withMessage('Category is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const transaction = new Transaction({
        ...req.body,
        user: req.user._id
      });

      await transaction.save();
      res.status(201).json(transaction);
    } catch (error) {
      console.error('Transaction creation error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get all transactions
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, jar, type } = req.query;
    const query = { user: req.user._id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (jar) {
      query.jar = jar;
    }

    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .lean(); // Use lean() for better performance

    res.json(transactions);
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { user: req.user._id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            jar: '$jar',
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.jar',
          expenses: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0]
            }
          },
          income: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0]
            }
          },
          transactionCount: { $sum: '$count' }
        }
      }
    ]);

    res.json(analytics);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update transaction
router.patch('/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['amount', 'description', 'jar', 'category', 'date'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ message: 'Invalid updates' });
  }

  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    updates.forEach(update => transaction[update] = req.body[update]);
    await transaction.save();

    res.json(transaction);
  } catch (error) {
    console.error('Transaction update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Transaction deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add this new route for downloading reports
router.get('/report', auth, async (req, res) => {
  try {
    const { startDate, endDate, format = 'csv' } = req.query;
    const query = { user: req.user._id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .lean();

    // Format the data for CSV
    const csvData = transactions.map(t => ({
      Date: new Date(t.date).toLocaleDateString(),
      Description: t.description,
      Amount: t.amount.toFixed(2),
      Type: t.type,
      Category: t.category,
      Jar: t.jar
    }));

    // Convert to CSV string
    const csvString = [
      Object.keys(csvData[0]).join(','), // Header
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${startDate}-to-${endDate}.csv`);
    
    res.send(csvString);
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
});
// Add transfer between jars
router.post('/transfer', auth, async (req, res) => {
  try {
    const { fromJar, toJar, amount, description } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!fromJar || !toJar || !parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid transfer details' });
    }

    // Create withdrawal transaction
    const withdrawalTransaction = new Transaction({
      user: req.user._id,
      jar: fromJar,
      amount: parsedAmount,
      type: 'expense',
      description: `Transfer to ${description}`,
      category: 'transfer'
    });

    // Create deposit transaction
    const depositTransaction = new Transaction({
      user: req.user._id,
      jar: toJar,
      amount: parsedAmount,
      type: 'income',
      description: `Transfer from ${description}`,
      category: 'transfer'
    });

    await withdrawalTransaction.save();
    await depositTransaction.save();

    res.status(201).json({ message: 'Transfer successful' });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Upload and extract transactions from PDF
router.post('/upload-pdf', auth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }
    const data = await pdfParse(req.file.buffer);
    const text = data.text;
    // Attempt to extract table rows from the PDF text
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    // Find the header row (look for keywords like 'Date', 'Debit', 'Credit', etc.)
    let headerIdx = lines.findIndex(line => /date.*debit.*credit|transaction date.*withdrawal/i.test(line.replace(/\s+/g, '').toLowerCase()));
    if (headerIdx === -1) headerIdx = lines.findIndex(line => /date.*amount/i.test(line.replace(/\s+/g, '').toLowerCase()));
    if (headerIdx === -1) {
      return res.status(400).json({ message: 'Could not find table header in PDF' });
    }
    const headers = lines[headerIdx].split(/\s{2,}|\t|\|/).map(h => h.trim()).filter(Boolean);
    // Collect rows until a non-table line or end
    const rows = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const row = lines[i].split(/\s{2,}|\t|\|/).map(cell => cell.trim());
      if (row.length < headers.length - 1) break;
      rows.push(row);
    }
    // Convert to CSV
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    // Attempt to parse transactions from rows (basic mapping)
    const transactions = rows.map(row => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = row[idx] || ''; });
      return obj;
    });
    res.json({ csv, transactions });
  } catch (error) {
    console.error('PDF extraction error:', error);
    res.status(500).json({ message: 'Error extracting PDF' });
  }
});
module.exports = router;