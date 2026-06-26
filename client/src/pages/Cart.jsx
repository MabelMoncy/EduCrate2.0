import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, clearCart, subtotal, discount, total } = useCart();
  const { user, firebaseUser } = useAuth(); // or studentData
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (cartItems.length === 0) return;

    setLoading(true);
    try {
      const resLoaded = await loadRazorpayScript();
      if (!resLoaded) {
        alert('Razorpay SDK failed to load. Are you offline?');
        setLoading(false);
        return;
      }

      // We need to fetch from our server to create an order
      // We will infer semester and year for discount calculation if possible
      const sampleItem = cartItems[0]; 
      
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseUser.getIdToken()}`,
        },
        body: JSON.stringify({
          pyqIds: cartItems.map(item => item._id),
          semester: sampleItem?.semester,
          year: sampleItem?.year,
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const orderData = await res.json();

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'EduCrate',
        description: 'PYQ Purchase',
        order_id: orderData.razorpayOrderId,
        handler: async function (response) {
          try {
            // Verify payment on our server
            const verifyRes = await fetch('/api/orders/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await firebaseUser.getIdToken()}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            
            if (verifyRes.ok) {
              alert('Payment successful! PYQs unlocked.');
              clearCart();
              // A full reload or context refresh is ideal here to update studentData
              window.location.href = '/account';
            } else {
              alert('Payment verification failed on server.');
            }
          } catch (err) {
            console.error('Verification error:', err);
            alert('Payment verification failed.');
          }
        },
        prefill: {
          name: user?.displayName || 'Student',
          email: user?.email || '',
        },
        theme: {
          color: '#6366f1' // Indigo
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (err) {
      console.error('Payment initiation error:', err);
      alert(err.message || 'Could not initiate payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-surface border border-white/5 hover:bg-white/5 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-white">Shopping Cart</h2>
            <p className="text-textMuted text-sm">Review your selected PYQs before payment.</p>
          </div>
        </header>

        {cartItems.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4">
              <span className="text-2xl">🛒</span>
            </div>
            <p className="text-xl font-semibold text-white mb-2">Your cart is empty</p>
            <p className="text-textMuted mb-6">Looks like you haven't added any PYQs yet.</p>
            <button 
              onClick={() => navigate('/pyqs')}
              className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition-colors"
            >
              Browse PYQs
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Cart Items List */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-sm font-semibold text-white">{cartItems.length} items</span>
                <button onClick={clearCart} className="text-xs font-semibold text-red-400 hover:text-red-300 uppercase tracking-wider">
                  Clear All
                </button>
              </div>
              
              {cartItems.map((item) => (
                <div key={item._id} className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-white/5">
                  <div className="w-16 h-16 rounded-xl bg-[#151a28] flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
                    <span className="text-xl">📄</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-sm line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-textMuted flex items-center gap-2 mt-1">
                      <span className="bg-white/5 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-indigo-300">
                        {item.semester} &bull; {item.year}
                      </span>
                      <span className="truncate">{item.subject}</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 pl-4">
                    <span className="font-bold text-white whitespace-nowrap">₹{item.price || 10}</span>
                    <button 
                      onClick={() => removeFromCart(item._id)}
                      className="p-2 rounded-lg text-red-400/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Remove from cart"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="p-6 rounded-2xl bg-surface border border-white/10 sticky top-24">
                <h3 className="text-lg font-bold text-white mb-6">Order Summary</h3>
                
                <div className="space-y-4 text-sm text-textMuted">
                  <div className="flex justify-between items-center">
                    <span>Subtotal</span>
                    <span className="font-medium text-white">₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Platform Fee</span>
                    <span className="font-medium text-green-400">₹0</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-green-400">
                      <span>Bundle Discount (10%)</span>
                      <span className="font-medium">-₹{discount}</span>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-base font-semibold text-white">Total</span>
                    <span className="text-2xl font-bold text-white">₹{total}</span>
                  </div>
                </div>

                <button 
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full mt-6 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Make Payment'}
                </button>
                
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-textMuted">
                  <ShieldCheck size={14} className="text-green-500" />
                  Secure 256-bit SSL Payment
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
