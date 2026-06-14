import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Pin, PinOff, RefreshCw, Search, ServerCrash, Trash2 } from 'lucide-react';
import { deleteResource, getResources, updateResourcePin } from '../../lib/api';
import PDFPreviewModal from '../../components/PDFPreviewModal';

export default function ResourceManagement() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [previewResource, setPreviewResource] = useState(null);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError('');
      setResources(await getResources());
    } catch (err) {
      setError(err.message || 'Failed to load resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const filteredResources = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return resources;
    return resources.filter(resource =>
      [resource.title, resource.semester, resource.subject, resource.type]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(term))
    );
  }, [resources, search]);

  const handlePinToggle = async (resource) => {
    try {
      setBusyId(resource._id);
      const updated = await updateResourcePin(resource._id, !resource.isPinned);
      setResources(prev => prev.map(item => item._id === updated._id ? updated : item));
    } catch (err) {
      if (import.meta.env.DEV) console.error('[ResourceManagement] pin toggle:', err.message);
      alert('Could not update resource. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (resource) => {
    if (!window.confirm(`Delete "${resource.title}"? This removes the MongoDB record and Cloudinary file.`)) return;

    try {
      setBusyId(resource._id);
      await deleteResource(resource._id);
      setResources(prev => prev.filter(item => item._id !== resource._id));
    } catch (err) {
      if (import.meta.env.DEV) console.error('[ResourceManagement] delete:', err.message);
      alert('Could not delete resource. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage Resources</h2>
          <p className="text-sm text-textMuted">Pin department papers or remove unsafe uploads.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter resources"
              className="w-full rounded-xl border border-white/8 bg-[#151a28] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-primary/60 sm:w-72"
            />
          </div>
          <button
            type="button"
            onClick={fetchResources}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/8 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/12 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <ServerCrash size={18} />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-surface">
        {loading ? (
          <div className="flex items-center gap-3 p-6 text-textMuted">
            <Loader2 className="animate-spin" size={20} />
            Loading resources...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/8 text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-textMuted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Semester</th>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Size</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filteredResources.length > 0 ? (
                  filteredResources.map(resource => (
                    <tr key={resource._id} className="hover:bg-white/[0.03]">
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate font-medium text-white">{resource.title}</p>
                        <p className="truncate text-xs text-textMuted">{resource.description}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{resource.semester}</td>
                      <td className="max-w-xs px-4 py-3 text-gray-300">
                        <span className="line-clamp-1">{resource.subject}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          resource.type === 'pyq'
                            ? 'bg-amber-500/10 text-amber-300'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {resource.type === 'pyq' ? 'PYQ' : 'Notes'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{resource.fileSize || '-'}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {resource.createdAt ? new Date(resource.createdAt).toLocaleDateString('en-IN') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewResource(resource)}
                            className="rounded-lg bg-indigo-500/10 p-2 text-indigo-300 transition-colors hover:bg-indigo-500/20"
                            title="Preview"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePinToggle(resource)}
                            disabled={busyId === resource._id}
                            className="rounded-lg bg-amber-500/10 p-2 text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                            title={resource.isPinned ? 'Unpin' : 'Pin'}
                          >
                            {busyId === resource._id ? <Loader2 className="animate-spin" size={16} /> : resource.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(resource)}
                            disabled={busyId === resource._id}
                            className="rounded-lg bg-red-500/10 p-2 text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                            title="Delete"
                          >
                            {busyId === resource._id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-textMuted">
                      No resources found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {previewResource && (
        <PDFPreviewModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
        />
      )}
    </div>
  );
}
