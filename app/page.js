"use client";
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const SoundIcons = { UI: "🖱️", Action: "⚡", Alert: "⚠️", Music: "🎵", Voice: "🗣️", Misc: "🎸" };
const BaseGroups = [
  { name: 'Red', hex: '#ff0000' }, { name: 'Blue', hex: '#0062ff' },
  { name: 'Green', hex: '#00ff5e' }, { name: 'Yellow', hex: '#ffbf00' },
  { name: 'Purple', hex: '#8400ff' }, { name: 'Neutral', hex: '#606b79' },
  { name: 'white', hex: '#ffffff' }, { name: 'black', hex: '#000000' }
];
const ColorTags = ['BRAND', 'Primary', 'Secondary', 'Accent', 'Background', 'Surface', 'Text', 'Border'];

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function Page() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('icons');

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [session, setSession] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeColorTag, setActiveColorTag] = useState('All');

  // UI States
  const [fullScreenColor, setFullScreenColor] = useState(null);
  const [fullScreenIcon, setFullScreenIcon] = useState(null);
  const [iconBgColor, setIconBgColor] = useState('white');
  const [showTestText, setShowTestText] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [toast, setToast] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Modals & Forms
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [colorForm, setColorForm] = useState({ name: '', hex: '#', group: 'Neutral', tag: 'Primary', official: '' });

  // THAKUR: Login states add kiye hain yahan
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const pendingUploadTag = useRef('Misc');
  const longPressTimer = useRef(null);

  const categories = {
    icons: ['All', 'Action', 'Navigation', 'Avatars', 'Brand', 'Misc'],
    sounds: ['All', 'UI', 'Action', 'Alert', 'Music', 'Voice', 'Misc'],
    colors: ['All', ...BaseGroups.map(g => g.name)]
  }[activeTab];

  const themeStyles = {
    icons: { text: 'text-indigo-500', bg: 'bg-indigo-600', border: 'border-indigo-500', shadow: 'shadow-indigo-500/20' },
    sounds: { text: 'text-emerald-500', bg: 'bg-emerald-600', border: 'border-emerald-500', shadow: 'shadow-emerald-500/20' },
    colors: { text: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-500', shadow: 'shadow-amber-500/20' }
  }[activeTab];

  // Auto-fetch Official Color Name
  useEffect(() => {
    const fetchColorName = async () => {
      const hexCode = colorForm.hex.replace('#', '');
      if (hexCode.length === 6) {
        try {
          const res = await fetch(`https://www.thecolorapi.com/id?hex=${hexCode}`);
          const data = await res.json();
          if (data.name && data.name.value) {
            setColorForm(prev => ({ ...prev, official: data.name.value }));
          }
        } catch (err) {
          setColorForm(prev => ({ ...prev, official: 'Unknown Shade' }));
        }
      } else {
        setColorForm(prev => ({ ...prev, official: '' }));
      }
    };
    const timer = setTimeout(() => fetchColorName(), 500);
    return () => clearTimeout(timer);
  }, [colorForm.hex]);

  // Scroll logic for Navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY < 50 || currentScrollY < lastScrollY);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Auth & Data Fetching listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [activeTab, activeCategory, activeColorTag, searchQuery]);

  const fetchAssets = async () => {
    setAssets([]);
    try {
      let query = supabase.from(activeTab).select('*').order('created_at', { ascending: false });

      if (activeTab === 'colors') {
        if (activeCategory !== 'All') query = query.eq('category', activeCategory);
        if (activeColorTag !== 'All') query = query.eq('design_tag', activeColorTag);
      } else {
        if (activeCategory !== 'All') query = query.eq('category', activeCategory);
      }

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (!error) setAssets(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // THAKUR: LOGIN FUNCTION
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });
    setAuthLoading(false);

    if (error) {
      showToast(`LOGIN FAILED: ${error.message}`);
    } else {
      showToast("LOGGED IN SUCCESSFULLY");
      setShowLoginModal(false);
      setLoginForm({ email: '', password: '' });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    showToast("LOGGED OUT SUCCESSFULLY");
  };

  // ----------------------------------------------------------------
  // CORE LOGIC: FILE UPLOADS & DATABASE REGISTRY
  // ----------------------------------------------------------------
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    showToast(`UPLOADING ${file.name.toUpperCase()}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.secure_url) {
        const payload = {
          name: file.name.split('.')[0],
          url: data.secure_url,
          category: pendingUploadTag.current,
        };

        const { error } = await supabase.from(activeTab).insert([payload]);
        if (error) throw error;

        showToast("SUCCESS: VAULT UPDATED!");
        fetchAssets();
      }
    } catch (err) {
      console.error("Upload Error:", err);
      showToast("ERROR: UPLOAD FAILED");
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleColorSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: colorForm.name,
        url: colorForm.hex,
        category: colorForm.group,
        design_tag: colorForm.tag,
        official_name: colorForm.official || 'Unknown Shade'
      };

      const { error } = await supabase.from('colors').insert([payload]);

      if (error) throw new Error(error.message);

      showToast("COLOR REGISTERED!");
      setShowColorPanel(false);
      setColorForm({ name: '', hex: '#', group: 'Neutral', tag: 'Primary', official: '' });
      fetchAssets();
    } catch (err) {
      console.error("Submit Error:", err);
      showToast(`ERROR: ${err.message || "REGISTRY FAILED"}`);
    } finally {
      setLoading(false);
    }
  };

  const copyFormat = (format, value) => {
    let text = value;
    if (format === 'rgba') {
      const r = parseInt(value.slice(1, 3), 16), g = parseInt(value.slice(3, 5), 16), b = parseInt(value.slice(5, 7), 16);
      text = `rgba(${r}, ${g}, ${b}, 1)`;
    } else if (format === 'tailwind') text = `bg-[${value}]`;

    navigator.clipboard.writeText(text);
    showToast(`COPIED: ${text}`);
    setContextMenu(null);
  };

  const deleteAsset = async (id) => {
    if (!window.confirm("THAKUR, PURGE FROM VAULT?")) return;
    const { error } = await supabase.from(activeTab).delete().eq('id', id);
    if (!error) fetchAssets();
  };

  // Long Press Handlers
  const handleTouchStart = (e, assetUrl) => {
    const touch = e.touches[0];
    const x = touch.pageX;
    const y = touch.pageY;
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ x, y, value: assetUrl });
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // ----------------------------------------------------------------
  // RENDER HELPERS
  // ----------------------------------------------------------------
  const renderAssetCard = (asset) => (
    <div key={asset.id} className="group relative flex flex-col bg-[#0A0A0F] border border-white/5 rounded-[2.5rem] p-4 transition-all hover:border-white/20 hover:bg-slate-900/20">

      {/* THAKUR: Delete button ab sirf login hone par dikhega */}
      {session && (
        <button onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }} className="absolute top-6 right-6 bg-red-600 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-[60] hover:scale-110 shadow-lg">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}

      <div
        onClick={() => {
          if (activeTab === 'icons') {
            setFullScreenIcon(asset.url);
            setIconBgColor('white');
          }
        }}
        className={`relative w-full flex-1 min-h-[150px] mb-2 rounded-[2rem] flex items-center justify-center overflow-hidden transition-all bg-white ${activeTab === 'icons' ? 'cursor-zoom-in' : ''}`}
      >
        {activeTab === 'icons' && <img src={asset.url} className="max-h-[70%] max-w-[70%] object-contain drop-shadow-2xl transition-transform group-hover:scale-110" />}
        {activeTab === 'sounds' && (
          <button onClick={(e) => { e.stopPropagation(); if (playingId === asset.id) { audioRef.current.pause(); setPlayingId(null); } else { audioRef.current.src = asset.url; audioRef.current.play(); setPlayingId(asset.id); } }}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${playingId === asset.id ? 'bg-emerald-500 scale-110' : 'bg-[#0A0A0F] hover:bg-slate-800'}`}>
            {playingId === asset.id ? "⏸️" : (SoundIcons[asset.category] || "🎵")}
          </button>
        )}
        <div className="absolute top-1 left-4 flex flex-col gap-1.5">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black text-white uppercase backdrop-blur-md ${activeTab === 'icons' ? 'bg-indigo-600/90' : 'bg-emerald-600/90'}`}>
            {asset.category}
          </span>
        </div>
      </div>

      <div className="text-center flex flex-col h-full px-1">
        <p className="text-[12px] font-black uppercase truncate tracking-widest text-white mb-3">{asset.name}</p>
        <button onClick={async () => { const res = await fetch(asset.url); const b = await res.blob(); const l = document.createElement('a'); l.href = window.URL.createObjectURL(b); l.download = asset.name; l.click(); }}
          className="mt-auto py-3 bg-white/5 rounded-2xl text-[12px] font-black uppercase text-slate-600 hover:text-white hover:bg-white/10 transition-all">Get File</button>
      </div>
    </div>
  );

  const renderColorCard = (asset) => (
    <div
      key={asset.id}
      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.pageX, y: e.pageY, value: asset.url }); }}
      onTouchStart={(e) => handleTouchStart(e, asset.url)}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className="group relative flex flex-col bg-[#0A0A0F] border border-white/5 rounded-[2.5rem] p-4 transition-all hover:border-amber-500/30 hover:bg-slate-900/20"
    >
      {/* THAKUR: Delete button ab sirf login hone par dikhega */}
      {session && (
        <button onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }} className="absolute top-6 right-6 bg-red-600 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-[60] hover:scale-110 shadow-lg">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}

      <div onClick={() => setFullScreenColor(asset.url)} className="relative w-full flex-1 min-h-[150px] mb-3 rounded-[2rem] flex items-center justify-center overflow-hidden transition-all cursor-zoom-in" style={{ backgroundColor: asset.url }}>
        <div className="absolute top-1 left-1 flex flex-col gap-1.5">
          <span className="px-2.5 py-1 rounded-full text-[8px] font-black text-white uppercase backdrop-blur-md bg-black/60 shadow-lg">
            {asset.category}
          </span>
          {asset.design_tag && (
            <span className="px-2.5 py-1 rounded-full text-[8px] font-black bg-white/90 text-black uppercase shadow-lg">
              {asset.design_tag}
            </span>
          )}
        </div>
      </div>

      <div className="text-center flex flex-col h-full px-1">
        <p className="text-[12px] font-black uppercase truncate tracking-widest text-white mb-1">{asset.name}</p>
        <p className="text-[9px] font-bold tracking-wider text-amber-500 mb-1">{asset.url}</p>
        <p className="text-[10px] text-slate-500 font-bold italic truncate">{asset.official_name || "Official Tone"}</p>
      </div>
    </div>
  );

  return (
    <div onClick={() => setContextMenu(null)} className="min-h-screen bg-[#020205] text-slate-100 font-sans selection:bg-white/10 overflow-x-hidden">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept={activeTab === 'icons' ? 'image/*' : 'audio/*'} />

      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] bg-white text-black px-6 py-3 rounded-full font-black text-[10px] tracking-widest uppercase shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          {toast}
        </div>
      )}

      {/* NAVBAR */}
      <nav className={`fixed top-0 w-full z-[500] transition-all duration-500 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="bg-[#020205]/80 backdrop-blur-3xl border-b border-white/5 px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 md:gap-6">

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Image
                src="/icon.svg"
                alt="Asset Vault Logo"
                width={40}
                height={40}
                priority={true}
              />
            <h1 className={`text-xl md:text-2xl font-black tracking-[0.4em] uppercase italic transition-colors duration-500 ${themeStyles.text}`}>VAULT</h1>
            </div>

            <div className="flex-1 max-w-sm flex gap-2">
              <input
                type="text"
                placeholder={`FIND ${activeTab.toUpperCase()}...`}
                className="w-full bg-white/5 border border-white/10 rounded-full px-5 py-2 text-[10px] tracking-widest outline-none focus:border-white/20 uppercase font-bold placeholder:text-slate-700"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(searchInput)}
              />
              <button
                onClick={() => setSearchQuery(searchInput)}
                className="bg-white/10 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all text-white border border-white/5"
              >
                Search
              </button>
            </div>

            {/* THAKUR: Login/Logout and +NEW buttons logic based on session */}
            <div className="flex items-center gap-4">
              {session ? (
                <>
                  <button onClick={handleLogout} className="text-white/40 hover:text-red-500 text-[9px] font-black uppercase tracking-widest transition-all">
                    Logout
                  </button>
                  <button onClick={() => activeTab === 'colors' ? setShowColorPanel(true) : setShowUploadDropdown(true)} disabled={loading} className="bg-white text-black px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
                    {loading ? 'WAIT...' : '+ NEW'}
                  </button>
                </>
              ) : (
                <button onClick={() => setShowLoginModal(true)} className="bg-white text-black px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
                  TEAM LOGIN
                </button>
              )}
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-6 flex flex-col gap-2">
            <div className="flex gap-8 items-center overflow-x-auto no-scrollbar pb-2">
              <div className="flex bg-white/5 p-1 rounded-full border border-white/5 flex-shrink-0">
                {['icons', 'sounds', 'colors'].map(t => (
                  <button key={t} onClick={() => {
                    setActiveTab(t);
                    setActiveCategory('All');
                    setActiveColorTag('All');
                    setSearchInput('');
                    setSearchQuery('');
                  }} className={`px-6 py-2 rounded-full text-[9px] font-black transition-all ${activeTab === t ? `${themeStyles.bg} text-white shadow-lg ${themeStyles.shadow}` : 'text-slate-500 hover:text-slate-300'}`}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex gap-6 items-center">
                {activeTab === 'colors' && <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">GROUP:</span>}
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? `text-white border-b-2 ${themeStyles.border} pb-1` : 'text-slate-600 hover:text-slate-300 pb-1 border-b-2 border-transparent'}`}>{cat}</button>
                ))}
              </div>
            </div>

            {activeTab === 'colors' && (
              <div className="flex gap-6 items-center overflow-x-auto no-scrollbar pt-2 border-t border-white/5 mt-1">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">TAG:</span>
                <button onClick={() => setActiveColorTag('All')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeColorTag === 'All' ? `text-white border-b-2 border-amber-500 pb-1` : 'text-slate-600 hover:text-slate-300 pb-1 border-b-2 border-transparent'}`}>All</button>
                {ColorTags.map(tag => (
                  <button key={tag} onClick={() => setActiveColorTag(tag)} className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeColorTag === tag ? `text-white border-b-2 border-amber-500 pb-1` : 'text-slate-600 hover:text-slate-300 pb-1 border-b-2 border-transparent'}`}>{tag}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN GRID */}
      <main className="max-w-7xl mx-auto px-6 pt-52 pb-24">
        {assets.length === 0 ? (
          <div className="text-center py-20 opacity-30 font-black text-4xl uppercase tracking-widest">No Assets Found</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {assets.map((asset) => activeTab === 'colors' ? renderColorCard(asset) : renderAssetCard(asset))}
          </div>
        )}
      </main>

      {/* THAKUR: LOGIN MODAL ADDED */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowLoginModal(false)}>
          <div className="bg-[#08080E] border border-white/10 p-10 rounded-[3rem] w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-black uppercase text-xl mb-8 italic tracking-widest text-center">TEAM ACCESS</h2>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="TEAM EMAIL"
                  value={loginForm.email}
                  onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-xs outline-none focus:border-white/20 transition-all text-white"
                  required
                />
                <input
                  type="password"
                  placeholder="PASSWORD"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-xs outline-none focus:border-white/20 transition-all text-white"
                  required
                />
              </div>
              <button type="submit" disabled={authLoading} className="w-full bg-white text-black py-5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:brightness-90 transition-all">
                {authLoading ? "VERIFYING..." : "LOGIN"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAG SELECTOR MODAL (Icons & Sounds) */}
      {showUploadDropdown && activeTab !== 'colors' && (
        <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowUploadDropdown(false)}>
          <div className="bg-[#08080E] border border-white/10 p-10 rounded-[3rem] w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-black uppercase text-xl mb-8 italic tracking-widest text-center">SELECT TAG</h2>
            <div className="grid grid-cols-2 gap-4">
              {categories.filter(c => c !== 'All').map(cat => (
                <button key={cat} onClick={() => { pendingUploadTag.current = cat; setShowUploadDropdown(false); fileInputRef.current.click(); }} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all ${themeStyles.text}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* COLOR REGISTRY MODAL */}
      {showColorPanel && (
        <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowColorPanel(false)}>
          <div className="bg-[#08080E] border border-white/10 p-10 rounded-[3.5rem] w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-10">
              <h2 className="text-amber-500 font-black uppercase text-2xl italic tracking-tighter leading-none">Color<br />Sector</h2>
              <div className="w-20 h-20 rounded-[1.5rem] border border-white/10 shadow-2xl transition-all duration-300" style={{ backgroundColor: colorForm.hex.length >= 4 ? colorForm.hex : '#000' }} />
            </div>

            <form onSubmit={handleColorSubmit} className="space-y-6">
              <div className="space-y-4">
                <input type="text" placeholder="HEX CODE (#...)" value={colorForm.hex} onChange={e => setColorForm({ ...colorForm, hex: e.target.value.toUpperCase() })} className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-xs outline-none focus:border-amber-500 transition-all uppercase" required />
                <input type="text" placeholder="PROJECT NAME" value={colorForm.name} onChange={e => setColorForm({ ...colorForm, name: e.target.value })} className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-xs outline-none focus:border-amber-500" required />
                <input type="text" placeholder="AUTO GENERATING NAME..." value={colorForm.official} readOnly className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-xs outline-none text-slate-500 opacity-60 cursor-not-allowed" />

                <div className="flex flex-wrap gap-2.5">
                  {BaseGroups.map(bg => (
                    <button key={bg.name} type="button" onClick={() => setColorForm({ ...colorForm, group: bg.name })} className={`w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center ${colorForm.group === bg.name ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-90'}`} style={{ backgroundColor: bg.hex }}>
                      {colorForm.group === bg.name && <span className="text-[12px] filter invert">✅</span>}
                    </button>
                  ))}
                </div>
                <select value={colorForm.tag} onChange={e => setColorForm({ ...colorForm, tag: e.target.value })} className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black uppercase outline-none focus:border-amber-500 appearance-none transition-all cursor-pointer" required>
                  <option value="">Select Purpose</option>
                  {ColorTags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-white text-black py-5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:brightness-90 transition-all">
                {loading ? "Registering..." : "Commit to Vault"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FULL SCREEN ICON MODE WITH BG TOGGLE */}
      {fullScreenIcon && (
        <div className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center animate-in fade-in duration-300 ${iconBgColor === 'white' ? 'bg-white' : 'bg-[#020205]'}`} onClick={() => setFullScreenIcon(null)}>
          <div className="absolute top-10 flex gap-4 z-10" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIconBgColor('white')} className="bg-white text-black px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-black/20 hover:bg-slate-200 transition-all shadow-lg">White BG</button>
            <button onClick={() => setIconBgColor('black')} className="bg-black text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/20 hover:bg-slate-800 transition-all shadow-lg">Black BG</button>
            <button onClick={() => setFullScreenIcon(null)} className="bg-red-600 text-white px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-lg">Close</button>
          </div>
          <img src={fullScreenIcon} className="max-w-[85vw] max-h-[80vh] object-contain drop-shadow-2xl scale-in-center transition-all duration-500" onClick={(e) => e.stopPropagation()} alt="Fullscreen Icon" />
        </div>
      )}

      {/* FULL SCREEN COLOR MODE */}
      {fullScreenColor && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center animate-in fade-in duration-500" style={{ backgroundColor: fullScreenColor }}>
          <div className="absolute top-10 flex gap-6 z-10">
            <button onClick={() => setShowTestText(!showTestText)} className="bg-black/40 backdrop-blur-xl px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/10 hover:bg-white hover:text-black transition-all">{showTestText ? "Hide Text" : "Show Text"}</button>
            <button onClick={() => setFullScreenColor(null)} className="bg-red-600/20 backdrop-blur-xl px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white transition-all">Exit Mode</button>
          </div>
          {showTestText && (
            <div className="text-center space-y-24 select-none p-12">
              <div className="space-y-4">
                <h2 className="text-white text-6xl md:text-9xl font-black uppercase tracking-tighter drop-shadow-2xl">Contrast Check</h2>
                <p className="text-white/60 text-[10px] font-black tracking-[0.5em] uppercase">White Legibility on {fullScreenColor}</p>
              </div>
              <div className="space-y-4">
                <h2 className="text-black text-6xl md:text-9xl font-black uppercase tracking-tighter drop-shadow-2xl">Contrast Check</h2>
                <p className="text-black/60 text-[10px] font-black tracking-[0.5em] uppercase">Black Legibility on {fullScreenColor}</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-12 flex gap-4">
            {['HEX', 'RGBA', 'TAILWIND'].map(fmt => (
              <button key={fmt} onClick={() => copyFormat(fmt.toLowerCase(), fullScreenColor)} className="bg-black/60 backdrop-blur-xl px-8 py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white hover:text-black transition-all active:scale-90 shadow-2xl">Copy {fmt}</button>
            ))}
          </div>
        </div>
      )}

      {/* CONTEXT HUD (Right Click or Long Press) */}
      {contextMenu && (
        <div className="fixed z-[800] bg-[#111118]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-1.5 shadow-2xl animate-in zoom-in duration-150" style={{ top: contextMenu.y, left: contextMenu.x }}>
          {['HEX', 'RGBA', 'TAILWIND'].map(fmt => (
            <button key={fmt} onClick={() => copyFormat(fmt.toLowerCase(), contextMenu.value)} className="block w-full text-left px-6 py-3 text-[9px] font-black uppercase text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">Copy {fmt}</button>
          ))}
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .scale-in-center { animation: scale-in-center 0.4s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
        @keyframes scale-in-center {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}