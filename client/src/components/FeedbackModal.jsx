import React, { useState, useRef, useEffect } from 'react';
import {
  X, Send, MessageSquarePlus, ChevronDown,
  CheckCircle, AlertCircle,
  Lightbulb, Wrench, Bug, HelpCircle,
} from 'lucide-react';

const WEB3FORMS_KEY = 'bd9d6581-1b1c-4d5c-b8f1-d202cf917dec';

const CATEGORIES = [
  { value: 'feature', label: 'Suggest a new feature',     Icon: Lightbulb },
  { value: 'improve', label: 'Improve an existing feature', Icon: Wrench   },
  { value: 'bug',     label: 'Report a mistake / bug',     Icon: Bug       },
  { value: 'other',   label: 'General enquiry',            Icon: HelpCircle },
];

// ── Custom icon-dropdown ────────────────────────────────────────────────────
function CategorySelect({ value, onChange }) {
  const [open, setOpen]     = useState(false);
  const ref                 = useRef(null);
  const selected            = CATEGORIES.find(c => c.value === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-colors text-left
          ${open
            ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
            : 'border-white/8 bg-white/5 hover:border-white/15'
          }`}
      >
        {selected
          ? <>
              <selected.Icon size={16} className="text-primary flex-shrink-0" />
              <span className="flex-1 text-white">{selected.label}</span>
            </>
          : <span className="flex-1 text-white/30">Select a category…</span>
        }
        <ChevronDown
          size={15}
          className={`text-textMuted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/10 bg-[#161d2e] shadow-2xl overflow-hidden">
          {CATEGORIES.map(({ value: val, label, Icon }) => (
            <button
              key={val}
              type="button"
              onClick={() => { onChange(val); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left
                ${value === val
                  ? 'bg-primary/15 text-primary'
                  : 'text-textMuted hover:bg-white/5 hover:text-white'
                }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Field wrapper ───────────────────────────────────────────────────────────
function Field({ label, optional, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-textMuted mb-1.5">
        {label}
        {optional && <span className="ml-1 text-white/25 font-normal">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white ' +
  'placeholder:text-white/25 focus:outline-none focus:border-primary/60 ' +
  'focus:ring-1 focus:ring-primary/30 transition-colors';

// ── Main component ──────────────────────────────────────────────────────────
export default function FeedbackModal({ isOpen, onClose }) {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [category, setCategory] = useState('');
  const [message,  setMessage]  = useState('');
  const [status,   setStatus]   = useState('idle');   // 'idle' | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setName(''); setEmail(''); setCategory(''); setMessage('');
    setStatus('idle'); setErrorMsg('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || status === 'loading') return;
    setStatus('loading'); setErrorMsg('');

    const catLabel = CATEGORIES.find(c => c.value === category)?.label ?? 'General';
    const payload  = {
      access_key: WEB3FORMS_KEY,
      subject:    `[EduCrate Feedback] ${catLabel}`,
      name:       name.trim()  || 'Anonymous',
      email:      email.trim() || 'no-reply@educrate.app',
      message:    message.trim(),
      botcheck:   '',
    };

    try {
      const res  = await fetch('https://api.web3forms.com/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setTimeout(handleClose, 3000);
      } else {
        setStatus('error');
        setErrorMsg(data.message || 'Submission failed. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Check your connection and try again.');
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="bg-background border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-[fadeInScale_0.2s_ease]">
          <div className="h-0.5 w-full bg-gradient-to-r from-primary via-purple-400 to-pink-400" />
          <div className="px-6 py-12 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <CheckCircle size={32} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Feedback Sent!</h2>
              <p className="text-sm text-textMuted leading-relaxed max-w-xs">
                Thanks for reaching out. We&apos;ll review your message and get back to you soon.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="mt-1 px-8 py-2.5 rounded-xl bg-primary hover:bg-primaryHover text-white text-sm font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-background border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-[fadeInScale_0.2s_ease]">
        {/* Accent bar matching site primary */}
        <div className="h-0.5 w-full bg-gradient-to-r from-primary via-purple-400 to-pink-400" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MessageSquarePlus size={17} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Support & Feedback</h2>
              <p className="text-[11px] text-textMuted">We&apos;d love to hear from you</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-textMuted hover:text-white hover:bg-white/8 transition-colors"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Honeypot */}
          <input type="checkbox" name="botcheck" className="hidden" readOnly />

          {/* Name */}
          <Field label="Your Name" optional>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Celine John"
              className={inputCls}
            />
          </Field>

          {/* Email */}
          <Field label="Your Email" optional>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. you@example.com"
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-white/25">So we can reply to you directly.</p>
          </Field>

          {/* Category */}
          <Field label="Type of feedback">
            <CategorySelect value={category} onChange={setCategory} />
          </Field>

          {/* Message */}
          <Field label="Message">
            <span className="sr-only">required</span>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your suggestion, report a mistake, or ask anything…"
              className={`${inputCls} resize-none leading-relaxed`}
            />
          </Field>

          {/* Error */}
          {status === 'error' && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3">
              <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!message.trim() || status === 'loading'}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-[0_0_20px_rgba(124,124,255,0.2)]"
          >
            {status === 'loading' ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Sending…
              </>
            ) : (
              <>
                <Send size={15} />
                Send Feedback
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
