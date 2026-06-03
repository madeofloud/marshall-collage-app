'use client';

import React, { useState, useEffect, useRef } from 'react';

type Session = {
  id: string;
  name: string;
  url: string;
  updatedAt: string;
};

type SessionData = {
  images: string[];
  background: string;
  rotationSpeed: number;
  grainAmount: number;
  panelOverrides: Record<string, unknown>;
  format: string;
  sizeTier: string;
  codec: string;
};

type Props = {
  currentData: SessionData;
  onLoad: (data: SessionData) => void;
};

export const SessionManager: React.FC<Props> = ({ currentData, onLoad }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) fetchSessions();
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSessions = async () => {
    const res = await fetch('/api/sessions');
    const data = await res.json();
    setSessions(data);
  };

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), data: currentData }),
    });
    setNewName('');
    await fetchSessions();
    setSaving(false);
  };

  const handleLoad = async (session: Session) => {
    const res = await fetch(session.url);
    const data = await res.json();
    onLoad(data);
    setOpen(false);
  };

  const handleDelete = async (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch('/api/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id, url: session.url }),
    });
    setSessions((s) => s.filter((x) => x.id !== session.id));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-white/50 hover:text-white/80 transition px-2 py-1 rounded border border-white/10 hover:border-white/20"
      >
        Sessions
      </button>

      {open && (
        <div className="absolute top-8 right-0 w-72 bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-50 p-4 space-y-4">
          {/* Save */}
          <div>
            <p className="text-xs text-white/50 mb-2 font-semibold uppercase tracking-wider">Save current</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Session name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder-white/30"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !newName.trim()}
                className="px-3 py-1.5 bg-marshall-gold text-black text-xs font-semibold rounded disabled:opacity-30"
              >
                {saving ? '...' : 'Save'}
              </button>
            </div>
          </div>

          {/* List */}
          <div>
            <p className="text-xs text-white/50 mb-2 font-semibold uppercase tracking-wider">Saved sessions</p>
            {sessions.length === 0 ? (
              <p className="text-xs text-white/30 italic">No sessions yet</p>
            ) : (
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => handleLoad(s)}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer group"
                  >
                    <span className="text-sm text-white/80 truncate">{s.name}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(s, e)}
                      className="text-white/20 hover:text-red-400 text-xs ml-2 opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
