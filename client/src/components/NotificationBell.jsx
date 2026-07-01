import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const { firebaseUser, isSignedIn } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn || !firebaseUser) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/students/me/notifications', {
          headers: { Authorization: `Bearer ${await firebaseUser.getIdToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    const handleFocus = () => fetchNotifications();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isSignedIn, firebaseUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await fetch(`/api/students/me/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${await firebaseUser.getIdToken()}` },
      });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    setShowDropdown(false);
  };

  const handlePopupAction = (action) => {
    handleMarkAsRead(selectedNotification._id);
    if (action === 'view') {
      navigate('/account'); // Or specifically to the notes/PYQs page
    }
    setSelectedNotification(null);
  };

  if (!isSignedIn) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-2 rounded-xl text-textMuted hover:text-white hover:bg-white/5 transition-colors relative"
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface"></span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1c2235] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="font-bold text-white">Notifications</h3>
            <span className="text-xs bg-white/10 px-2 py-1 rounded text-textMuted">{notifications.length} Unread</span>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-textMuted text-sm">
                No new notifications
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map(notif => (
                  <div 
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className="p-4 hover:bg-white/5 cursor-pointer flex gap-3 transition-colors"
                  >
                    {notif.type === 'approved' ? (
                      <CheckCircle2 className="text-green-400 mt-0.5 shrink-0" size={18} />
                    ) : (
                      <AlertTriangle className="text-red-400 mt-0.5 shrink-0" size={18} />
                    )}
                    <div>
                      <p className="text-sm text-white font-medium">
                        {notif.type === 'approved' ? 'Upload Approved' : 'Action Required'}
                      </p>
                      <p className="text-xs text-textMuted mt-1 line-clamp-2">
                        Your {notif.contentType} "{notif.contentTitle}" was {notif.type}.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md p-6 text-center relative shadow-2xl">
            {selectedNotification.type === 'approved' ? (
              <>
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎉</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Content Approved!</h3>
                <p className="text-textMuted text-sm mb-6">
                  Great news! Your uploaded {selectedNotification.contentType} <strong>"{selectedNotification.contentTitle}"</strong> has passed our quality check and is now live for other students to see. Thank you for your contribution!
                </p>
                <div className="flex gap-3">
                  <button onClick={() => handlePopupAction('dismiss')} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors">
                    Dismiss
                  </button>
                  <button onClick={() => handlePopupAction('view')} className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold transition-colors">
                    View Live Post
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Action Required on Submission</h3>
                <p className="text-textMuted text-sm mb-6">
                  ⚠️ Your recent upload <strong>"{selectedNotification.contentTitle}"</strong> could not be approved because it didn't meet our quality or clarity guidelines. Please update the file and try again.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => handlePopupAction('dismiss')} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors">
                    Close
                  </button>
                  <button onClick={() => handlePopupAction('view')} className="flex-1 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition-colors">
                    View Details & Resubmit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
