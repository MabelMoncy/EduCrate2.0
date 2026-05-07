import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PDFPreviewModal from '../components/PDFPreviewModal';
import { FileText, ArrowLeft, Download, Eye, Trash2, Loader2 } from 'lucide-react';
import { getResources, deleteResource } from '../lib/api';

export default function Semester() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewResource, setPreviewResource] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const data = await getResources({ semester: id });
      setResources(data);
    } catch (error) {
      console.error('Failed to fetch semester resources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [id]);

  const handleDelete = async (resource) => {
    if (!window.confirm(`Delete "${resource.title}"? This cannot be undone.`)) return;
    try {
      setDeletingId(resource._id);
      await deleteResource(resource._id);
      setResources(prev => prev.filter(r => r._id !== resource._id));
    } catch (error) {
      console.error('Failed to delete resource:', error);
      alert(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-textMuted hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={20} />
        Back to Dashboard
      </button>

      <header className="mb-10 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Semester {id ? id.replace('S', '') : ''} Resources
          </h2>
              <p className="text-textMuted max-w-2xl">
                All materials and documents uploaded for {id}.
              </p>
            </div>
            <span className="bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full">
              {resources.length} file{resources.length !== 1 ? 's' : ''}
            </span>
          </header>

          <div className="bg-surface border border-white/5 rounded-xl overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-textMuted flex flex-col items-center gap-3">
                <Loader2 className="animate-spin" size={32} />
                Loading resources...
              </div>
            ) : resources.length > 0 ? (
              <div className="min-w-[800px]">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-xs uppercase text-textMuted tracking-wider">
                    <th className="px-6 py-4 font-medium">Resource</th>
                    <th className="px-6 py-4 font-medium">Subject</th>
                    <th className="px-6 py-4 font-medium">Size</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((item, idx) => (
                    <tr
                      key={item._id || idx}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="text-primary" size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate max-w-xs">{item.title}</p>
                            <p className="text-xs text-textMuted truncate max-w-xs">{item.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-sm">{item.subject}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{item.fileSize || '—'}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Preview */}
                          <button
                            onClick={() => setPreviewResource(item)}
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                            title="Preview PDF"
                          >
                            <Eye size={17} />
                          </button>
                          {/* Download */}
                          <a
                            href={item.fileUrl}
                            download
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Download"
                          >
                            <Download size={17} />
                          </a>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item._id}
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === item._id
                              ? <Loader2 size={17} className="animate-spin" />
                              : <Trash2 size={17} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
              <div className="p-12 text-center">
                <FileText className="mx-auto text-textMuted mb-4 opacity-30" size={48} />
                <p className="text-gray-400 font-medium">No resources found for this semester.</p>
                <p className="text-textMuted text-sm mt-1">Upload a PDF from the dashboard to get started.</p>
              </div>
            )}
          </div>

      {/* PDF Preview Modal */}
      {previewResource && (
        <PDFPreviewModal
          resource={previewResource}
          onClose={() => setPreviewResource(null)}
        />
      )}
    </Layout>
  );
}
