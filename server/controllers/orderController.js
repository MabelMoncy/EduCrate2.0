import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import PYQ from '../models/PYQ.js';
import Student from '../models/Student.js';
import { getSubjectsForSemester } from '../lib/semesterData.js';

export const razorpayWebhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ status: 'error' });
    }

    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Webhook signature mismatch');
      return res.status(400).json({ status: 'invalid signature' });
    }

    const event = req.body.event;
    
    // Process payment.captured event
    if (event === 'payment.captured' || event === 'order.paid') {
      // In payment.captured, payload.payment.entity has order_id
      // In order.paid, payload.order.entity has id
      const entity = req.body.payload.payment ? req.body.payload.payment.entity : req.body.payload.order.entity;
      const rzpOrderId = event === 'order.paid' ? entity.id : entity.order_id;
      const rzpPaymentId = event === 'payment.captured' ? entity.id : null;
      
      const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
      
      if (order && order.status !== 'paid') {
        const session = await Order.startSession();
        session.startTransaction();
        
        try {
          order.status = 'paid';
          if (rzpPaymentId) order.razorpayPaymentId = rzpPaymentId;
          await order.save({ session });

          const studentToUpdate = await Student.findById(order.studentId).session(session);
          if (studentToUpdate) {
            const alreadyPurchasedIds = studentToUpdate.purchasedPYQs.map(p => p.pyqId.toString());
            const newPurchasedItems = order.items
              .filter(item => !alreadyPurchasedIds.includes(item.pyqId.toString()))
              .map(item => ({
                pyqId: item.pyqId,
                orderId: order._id,
                paidAt: new Date(),
                amount: item.price,
              }));

            if (newPurchasedItems.length > 0) {
              studentToUpdate.purchasedPYQs.push(...newPurchasedItems);
              await studentToUpdate.save({ session });
            }
          }

          await session.commitTransaction();
          session.endSession();
        } catch (txnError) {
          await session.abortTransaction();
          session.endSession();
          console.error('Webhook transaction error:', txnError);
        }
      }
    }
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ status: 'error' });
  }
};

let razorpayInstance = null;
const getRazorpay = () => {
  if (!razorpayInstance && process.env.RAZORPAY_API_KEY && process.env.RAZORPAY_SECRET) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_API_KEY,
      key_secret: process.env.RAZORPAY_SECRET,
    });
  }
  return razorpayInstance;
};

// @desc    Create Razorpay Order
// @route   POST /api/orders/create
// @access  Student
export const createOrder = async (req, res, next) => {
  try {
    const { pyqIds, semester, year } = req.body;
    const student = req.student;

    if (!pyqIds || !Array.isArray(pyqIds) || pyqIds.length === 0) {
      res.status(400);
      throw new Error('No PYQs selected');
    }

    // Remove duplicate pyqIds from request payload
    const uniquePyqIds = [...new Set(pyqIds)];

    // Check if student already owns any of these PYQs
    const alreadyPurchasedIds = student.purchasedPYQs.map(p => p.pyqId.toString());
    const hasDuplicates = uniquePyqIds.some(id => alreadyPurchasedIds.includes(id.toString()));
    
    if (hasDuplicates) {
      res.status(400);
      throw new Error('Your cart contains PYQs you already own. Please remove them to proceed.');
    }

    const pyqs = await PYQ.find({ _id: { $in: uniquePyqIds } });
    if (pyqs.length !== uniquePyqIds.length) {
      res.status(400);
      throw new Error('One or more PYQs not found');
    }

    let subtotal = 0;
    const items = pyqs.map(p => {
      subtotal += p.price;
      return { pyqId: p._id, price: p.price };
    });

    let discount = 0;
    // Bundle Discount: 10% off if buying PYQs for ALL subjects in a given semester and year
    if (semester && year) {
      const allSubjectsInSyllabus = getSubjectsForSemester(semester);
      
      const semesterPYQs = pyqs.filter(p => p.semester === semester && p.year === year);
      const distinctSubjectsInCart = new Set(semesterPYQs.map(p => p.subject));

      if (allSubjectsInSyllabus.length > 0 && distinctSubjectsInCart.size === allSubjectsInSyllabus.length) {
        // Calculate the sum of the prices of the PYQs that make up the bundle
        const bundlePriceSum = semesterPYQs.reduce((acc, p) => acc + p.price, 0);
        discount = Math.floor(bundlePriceSum * 0.10); // 10% discount on the bundle portion ONLY
      }
    }

    const totalAmount = subtotal - discount;

    const rzp = getRazorpay();
    if (!rzp) {
      res.status(500);
      throw new Error('Razorpay is not configured on the server');
    }

    const options = {
      amount: totalAmount * 100, // in paise
      currency: 'INR',
      // Razorpay enforces a 40-char max on receipt
      receipt: `rc_${student._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
    };

    const razorpayOrder = await rzp.orders.create(options).catch((rzpErr) => {
      // Razorpay SDK error objects have the real message in rzpErr.error.description
      const description = rzpErr?.error?.description || rzpErr?.message || JSON.stringify(rzpErr);
      console.error('[Razorpay] order creation failed:', description);
      res.status(502);
      throw new Error(`Payment gateway error: ${description}`);
    });

    const order = await Order.create({
      razorpayOrderId: razorpayOrder.id,
      studentId: student._id,
      items,
      totalAmount,
      discount,
      status: 'pending',
    });

    res.json({
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_API_KEY,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/orders/verify
// @access  Student
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const student = req.student;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400);
      throw new Error('Payment details missing');
    }

    const secret = process.env.RAZORPAY_SECRET;
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      res.status(400);
      throw new Error('Payment verification failed - invalid signature');
    }

    const rzp = getRazorpay();
    const payment = await rzp.payments.fetch(razorpay_payment_id);
    
    if (payment.status !== 'captured') {
      res.status(400);
      throw new Error('Payment not captured by gateway');
    }

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (order.status === 'paid') {
      return res.json({ message: 'Order already processed' });
    }
    
    if (payment.amount !== order.totalAmount * 100) {
      res.status(400);
      throw new Error('Payment amount mismatch');
    }

    // Start MongoDB Session for transaction
    const session = await Order.startSession();
    session.startTransaction();

    try {
      order.status = 'paid';
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      await order.save({ session });

      // Add PYQs to student avoiding duplicates
      const alreadyPurchasedIds = student.purchasedPYQs.map(p => p.pyqId.toString());
      const newPurchasedItems = order.items
        .filter(item => !alreadyPurchasedIds.includes(item.pyqId.toString()))
        .map(item => ({
          pyqId: item.pyqId,
          orderId: order._id,
          paidAt: new Date(),
          amount: item.price,
        }));

      if (newPurchasedItems.length > 0) {
        student.purchasedPYQs.push(...newPurchasedItems);
        await student.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      res.json({ message: 'Payment verified and PYQs unlocked', order });
    } catch (txnError) {
      await session.abortTransaction();
      session.endSession();
      throw txnError;
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get Student's Orders
// @route   GET /api/orders/my
// @access  Student
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ studentId: req.student._id })
      .populate('items.pyqId', 'title semester subject year')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments (Admin)
// @route   GET /api/admin/payments
// @access  Admin
export const getAdminPayments = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('studentId', 'email displayName')
      .sort({ createdAt: -1 });
    
    let totalRevenue = 0;
    const paidOrders = orders.filter(o => o.status === 'paid');
    paidOrders.forEach(o => totalRevenue += o.totalAmount);

    res.json({
      orders,
      totalRevenue,
      totalOrders: paidOrders.length,
      averageOrderValue: paidOrders.length > 0 ? (totalRevenue / paidOrders.length) : 0,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all buyers (Admin)
// @route   GET /api/admin/buyers
// @access  Admin
export const getAdminBuyers = async (req, res, next) => {
  try {
    const students = await Student.find({ 'purchasedPYQs.0': { $exists: true } });
    
    const buyers = students.map(s => {
      const totalSpent = s.purchasedPYQs.reduce((acc, curr) => acc + curr.amount, 0);
      return {
        _id: s._id,
        email: s.email,
        displayName: s.displayName,
        purchasedCount: s.purchasedPYQs.length,
        totalSpent,
        joinedAt: s.createdAt,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    res.json({
      totalBuyers: buyers.length,
      buyers,
    });
  } catch (error) {
    next(error);
  }
};
