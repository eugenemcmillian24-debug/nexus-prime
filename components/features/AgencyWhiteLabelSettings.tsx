'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Layout, Mail, Image as ImageIcon, Save, CheckCircle, AlertTriangle } from 'lucide-react';

interface AgencyConfig {
  company_name: string;
  footer_html: string;
  support_email: string;
  logo_url: string;
  hide_nexus_logs: boolean;
}

export default function AgencyWhiteLabelSettings() {
  const [config, setConfig] = useState<AgencyConfig>({
    company_name: '',
    footer_html: '',
    support_email: '',
    logo_url: '',
    hide_nexus_logs: true
  });
  const [isAgency, setIsAgency] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAgencySettings();
  }, []);

  const fetchAgencySettings = async () => {
    try {
      const res = await fetch('/api/user/agency');
      const data = await res.json();
      if (data.agency_mode) {
        setIsAgency(true);
        if (data.agency_config) {
          setConfig(data.agency_config);
        }
      }
    } catch (err) {
      // PROD FIX: Removed console.error for production
      // console.error('Failed to fetch agency settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/user/agency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agency_config: config })
      });
      if (res.ok) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Error saving settings.');
      }
    } catch (err) {
      setMessage('Error connecting to server.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading agency settings...</div>;

  if (!isAgency) {
    return (
      <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-xl max-w-2xl mx-auto mt-10">
        <div className="flex items-center gap-3 text-amber-500 mb-4">
          <Shield size={24} />
          <h2 className="text-xl font-bold">Agency Mode Inactive</h2>
        </div>
        <p className="text-zinc-400 mb-6">
          NEXUS PRIME is a premium-only platform. Upgrade to Agency Mode ($49/mo) to unlock full white-labeling, custom branding, and removal of all platform references from your generated applications.
        </p>
        <button 
          onClick={() => (window as any).setActiveTab?.('pricing')}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all"
        >
          View Agency Plans
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Shield className="text-indigo-500" />
            White-Label Settings
          </h1>
          <p className="text-zinc-400">Customize how your generated apps appear to your clients.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold transition-all"
        >
          {saving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${message.includes('Error') ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
          {message.includes('Error') ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Branding Section */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layout size={20} className="text-indigo-400" />
            Core Branding
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Company Name</label>
            <input 
              type="text"
              value={config.company_name}
              onChange={(e) => setConfig({...config, company_name: e.target.value})}
              placeholder="e.g. My Agency AI"
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Support Email</label>
            <input 
              type="email"
              value={config.support_email}
              onChange={(e) => setConfig({...config, support_email: e.target.value})}
              placeholder="support@youragency.com"
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Agency Logo URL</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={config.logo_url}
                onChange={(e) => setConfig({...config, logo_url: e.target.value})}
                placeholder="https://..."
                className="flex-1 bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
              />
              <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                {config.logo_url ? <img src={config.logo_url} className="w-full h-full object-contain" /> : <ImageIcon size={20} className="text-zinc-600" />}
              </div>
            </div>
          </div>
        </div>

        {/* Customization Section */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail size={20} className="text-indigo-400" />
            App Customization
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Custom Footer (HTML)</label>
            <textarea 
              value={config.footer_html}
              onChange={(e) => setConfig({...config, footer_html: e.target.value})}
              placeholder="<p>© 2026 My Agency AI. All rights reserved.</p>"
              rows={4}
              className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white font-mono text-xs focus:border-indigo-500 outline-none"
            />
            <p className="text-[10px] text-zinc-500 mt-1">This HTML will be injected into every generated app.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button 
              onClick={() => setConfig({...config, hide_nexus_logs: !config.hide_nexus_logs})}
              className={`w-12 h-6 rounded-full transition-all relative ${config.hide_nexus_logs ? 'bg-indigo-600' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.hide_nexus_logs ? 'left-7' : 'left-1'}`} />
            </button>
            <span className="text-sm text-zinc-300 font-medium">Strip "Nexus" from Build Logs</span>
          </div>
        </div>
      </div>

      <div className="bg-indigo-900/10 border border-indigo-500/20 p-6 rounded-xl">
        <h4 className="text-indigo-400 font-bold mb-2">How White-Labeling Works</h4>
        <ul className="text-sm text-zinc-400 space-y-2 list-disc pl-5">
          <li>The AI Agent will refer to itself as <span className="text-white">"{config.company_name || 'your agency name'}"</span>.</li>
          <li>All internal code comments and logs mentioning Nexus Prime will be automatically removed.</li>
          <li>The generated app will feature your <span className="text-white">Custom Footer</span> and <span className="text-white">Support Email</span>.</li>
          <li>Deployment URLs can be mapped to your client's custom domains without our branding.</li>
        </ul>
      </div>
    </div>
  );
}
