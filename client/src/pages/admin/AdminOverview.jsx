import React, { useEffect, useMemo, useState } from 'react';
import { Database, FileText, Loader2, Pin, ServerCrash, FileQuestion, IndianRupee, Users } from 'lucide-react';
import { getResources } from '../../lib/api';
import { VALID_SEMESTERS } from '../../lib/semesterData';
import { useAuth } from '../../context/AuthContext';

const parseFileSizeMb = (fileSize = '') => {
  const value = Number.parseFloat(fileSize);
  return Number.isFinite(value) ? value : 0;
};

export default function AdminOverview() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [pyqCount, setPyqCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [buyersCount, setBuyersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch original resources
        const resData = await getResources();
        setResources(resData);

        // Fetch PYQs
        const pyqRes = await fetch('/api/pyq');
        const pyqs = await pyqRes.json();
        setPyqCount(pyqs.length || 0);

        // Fetch Payments
        const payRes = await fetch('/api/admin/payments', { headers: { Authorization: `Bearer ${user.token}` }});
        const payData = await payRes.json();
        setRevenue(payData.totalRevenue || 0);

        // Fetch Buyers
        const buyerRes = await fetch('/api/admin/buyers', { headers: { Authorization: `Bearer ${user.token}` }});
        const buyerData = await buyerRes.json();
        setBuyersCount(buyerData.totalBuyers || 0);

      } catch (err) {
        setError(err.message || 'Failed to load admin overview.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.token) {
      fetchAllData();
    }
  }, [user]);

  const stats = useMemo(() => {
    const totalStorageMb = resources.reduce((sum, resource) => sum + parseFileSizeMb(resource.fileSize), 0);
    const pinnedCount = resources.filter(resource => resource.isPinned).length;
    const semesterCounts = VALID_SEMESTERS.map(semester => ({
      semester,
      count: resources.filter(resource => resource.semester === semester).length,
    }));
    const maxCount = Math.max(1, ...semesterCounts.map(item => item.count));

    return {
      totalDocuments: resources.length,
      totalStorageMb,
      pinnedCount,
      semesterCounts,
      maxCount,
    };
  }, [resources]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-surface p-5 text-textMuted">
        <Loader2 className="animate-spin" size={20} />
        Loading admin overview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
        <ServerCrash size={20} />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Notes"
          value={stats.totalDocuments}
          helper="Study materials in MongoDB"
          Icon={FileText}
        />
        <StatCard
          label="Total Storage"
          value={`${stats.totalStorageMb.toFixed(2)} MB`}
          helper="Estimated Notes storage"
          Icon={Database}
        />
        <StatCard
          label="Pinned Notes"
          value={stats.pinnedCount}
          helper="Shown in Department Papers"
          Icon={Pin}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3 mt-4">
        <StatCard
          label="Total PYQs Uploaded"
          value={pyqCount}
          helper="Premium question papers"
          Icon={FileQuestion}
        />
        <StatCard
          label="Total Revenue"
          value={`₹${revenue}`}
          helper="From PYQ sales"
          Icon={IndianRupee}
        />
        <StatCard
          label="Total Buyers"
          value={buyersCount}
          helper="Unique purchasing students"
          Icon={Users}
        />
      </section>

      <section className="rounded-2xl border border-white/8 bg-surface p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Uploads by Semester</h2>
          <p className="text-sm text-textMuted">A quick distribution view across S1-S8.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.semesterCounts.map(({ semester, count }) => (
            <div key={semester} className="rounded-xl border border-white/8 bg-[#111827] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold text-white">{semester}</span>
                <span className="text-sm text-textMuted">{count} file{count !== 1 ? 's' : ''}</span>
              </div>
              <div className="h-2 rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(count / stats.maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, helper, Icon }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-surface p-6">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon size={22} />
      </div>
      <p className="text-sm font-medium text-textMuted">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-textMuted">{helper}</p>
    </div>
  );
}
