import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Buyers() {
  const { user } = useAuth();
  const [data, setData] = useState({
    totalBuyers: 0,
    buyers: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchBuyers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/buyers', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBuyers();
  }, [fetchBuyers]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Buyers List</h2>
        <p className="text-textMuted text-sm mt-1">View all students who have purchased PYQs.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-textMuted" /></div>
      ) : (
        <>
          <div className="p-6 rounded-2xl bg-surface border border-white/5 flex items-center gap-4 max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-textMuted font-medium">Total Unique Buyers</p>
              <h3 className="text-2xl font-bold text-white">{data.totalBuyers}</h3>
            </div>
          </div>

          <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden mt-8">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">Student Leaderboard (By Spend)</h3>
            </div>
            {data.buyers.length === 0 ? (
              <div className="p-12 text-center text-textMuted">No buyers found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5 text-sm text-textMuted">
                      <th className="p-4 font-medium">Name</th>
                      <th className="p-4 font-medium">Email</th>
                      <th className="p-4 font-medium">PYQs Purchased</th>
                      <th className="p-4 font-medium text-right">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.buyers.map(buyer => (
                      <tr key={buyer._id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-sm font-bold text-white">{buyer.displayName}</td>
                        <td className="p-4 text-sm text-gray-400">{buyer.email}</td>
                        <td className="p-4 text-sm text-white">
                          <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded font-bold">
                            {buyer.purchasedCount} papers
                          </span>
                        </td>
                        <td className="p-4 text-sm font-bold text-green-400 text-right">₹{buyer.totalSpent}</td>
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
