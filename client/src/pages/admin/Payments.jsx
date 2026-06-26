import React, { useState, useEffect } from 'react';
import { Loader2, IndianRupee, TrendingUp, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Payments() {
  const { user } = useAuth();
  const [data, setData] = useState({
    orders: [],
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/payments', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Payments & Orders</h2>
        <p className="text-textMuted text-sm mt-1">Track platform revenue and recent transactions.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-textMuted" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-surface border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center">
                <IndianRupee size={24} />
              </div>
              <div>
                <p className="text-sm text-textMuted font-medium">Total Revenue</p>
                <h3 className="text-2xl font-bold text-white">₹{data.totalRevenue}</h3>
              </div>
            </div>
            
            <div className="p-6 rounded-2xl bg-surface border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <ShoppingBag size={24} />
              </div>
              <div>
                <p className="text-sm text-textMuted font-medium">Total Orders</p>
                <h3 className="text-2xl font-bold text-white">{data.totalOrders}</h3>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-textMuted font-medium">Avg Order Value</p>
                <h3 className="text-2xl font-bold text-white">₹{Math.round(data.averageOrderValue)}</h3>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden mt-8">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
            </div>
            {data.orders.length === 0 ? (
              <div className="p-12 text-center text-textMuted">No orders found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5 text-sm text-textMuted">
                      <th className="p-4 font-medium">Order ID</th>
                      <th className="p-4 font-medium">Student</th>
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium">Amount</th>
                      <th className="p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.orders.map(order => (
                      <tr key={order._id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-sm font-mono text-gray-400">{order.razorpayOrderId}</td>
                        <td className="p-4 text-sm text-white">{order.studentId?.email || 'Unknown'}</td>
                        <td className="p-4 text-sm text-gray-400">{new Date(order.createdAt).toLocaleString()}</td>
                        <td className="p-4 text-sm font-bold text-white">₹{order.totalAmount}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                            order.status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
