import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import PYQ from '../models/PYQ.js';
import Student from '../models/Student.js';

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

    const pyqs = await PYQ.find({ _id: { $in: pyqIds } });
    if (pyqs.length !== pyqIds.length) {
      res.status(400);
      throw new Error('One or more PYQs not found');
    }

    let subtotal = 0;
    const items = pyqs.map(p => {
      subtotal += p.price;
      return { pyqId: p._id, price: p.price };
    });

    let discount = 0;
    // Check if discount applies (buying all subjects for a specific year in a semester)
    if (semester && year) {
      const allYearPYQs = await PYQ.find({ semester, year });
      if (allYearPYQs.length > 0 && allYearPYQs.length === pyqs.length) {
        // They are buying all available PYQs for this semester and year
        const matchesAll = allYearPYQs.every(ayp => pyqIds.includes(ayp._id.toString()));
        if (matchesAll) {
          discount = Math.floor(subtotal * 0.10); // 10% discount
        }
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

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (order.status === 'paid') {
      return res.json({ message: 'Order already processed' });
    }

    order.status = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    await order.save();

    // Add PYQs to student
    const purchasedItems = order.items.map(item => ({
      pyqId: item.pyqId,
      orderId: order._id,
      paidAt: new Date(),
      amount: item.price,
    }));

    await Student.findByIdAndUpdate(student._id, {
      $push: { purchasedPYQs: { $each: purchasedItems } },
    });

    res.json({ message: 'Payment verified and PYQs unlocked', order });
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
