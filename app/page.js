"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * THAKUR: Hum yahan Environment Variables use kar rahe hain.
 * 'NEXT_PUBLIC_' prefix zaroori hai taaki browser inhe padh sake.
 */
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const SoundIcons = {
  UI: "🖱️", Action: "⚡", Alert: "⚠️", Music: "🎵", Voice: "🗣️", Misc: "🎸"
};

export default function AssetVault() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('icons'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [session, setSession] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('Misc');
  
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState('All');

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const categories = activeTab === 'icons' 
    ? ['All', 'Action', 'Navigation', 'Avatars', 'Brand', 'Misc']
    : ['All', 'UI', 'Action', 'Alert', 'Music', 'Voice', 'Misc'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    fetchAssets();
    return () => subscription.unsubscribe();
  }, [activeTab, activeCategory]);

  const fetchAssets = async () => {
    setIsSearching(true);
    let query = supabase.from(activeTab).select('*').order('created_at', { ascending: false });
    if (activeCategory !== 'All') query = query.eq('category', activeCategory);
    if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
    
    const { data, error } = await query;
    if (!error) setAssets(data || []);
    setIsSearching(false);
  };

  const handlePlay = (id, url) => {
    if (playingId === id) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingId(id);
      }
    }
  };

  const uploadToCloudinary = async (file) => {
    // Thakur: Validation zaroori hai
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error("Cloudinary keys missing in .env.local!");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    const resourceType = activeTab === 'sounds' ? 'video' : 'image';

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      { method: 'POST', body: formData }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message || "Cloudinary Upload Failed");
    }
    
    const data = await response.json();
    return data.secure_url; 
  };

  const uploadAsset = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      // Step 1: Upload to Cloudinary (Compressed)
      const compressedUrl = await uploadToCloudinary(file);

      // Step 2: Save to Supabase
      const { error: dbError } = await supabase.from(activeTab).insert([{ 
        name: file.name, 
        url: compressedUrl, 
        category: uploadCategory 
      }]);
      
      if (dbError) throw dbError;
      
      fetchAssets();
      e.target.value = null; 

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteAsset = async (id) => {
    if (!window.confirm("Thakur, pakka uda dein?")) return;
    setLoading(true);
    const { error } = await supabase.from(activeTab).delete().eq('id', id);
    if (!error) fetchAssets();
    setLoading(false);
  };

  const downloadAsset = async (url, name) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) { window.open(url, '_blank'); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Ghalat credentials, Thakur!");
    setLoading(false);
  };

  const themeColor = activeTab === 'icons' ? 'indigo' : 'emerald';

  return (
    <div className="min-h-screen bg-[#02020F] text-slate-100 p-3 md:p-8 font-sans transition-all duration-500">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />
      
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 mb-10 border-b border-slate-900 pb-8">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">
            Thakur <span className={activeTab === 'icons' ? 'text-indigo-500' : 'text-emerald-500'}>Cloud</span> Vault
          </h1>
          <p className="text-slate-600 text-[10px] font-bold tracking-[0.4em] mt-1">SECURE REPOSITORY PRO</p>
        </div>

        <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
          <button onClick={() => {setActiveTab('icons'); setActiveCategory('All');}} className={`px-8 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeTab === 'icons' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-500 hover:text-white'}`}>ICONS</button>
          <button onClick={() => {setActiveTab('sounds'); setActiveCategory('All');}} className={`px-8 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeTab === 'sounds' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}>SOUNDS</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto mb-8 space-y-4">
        <div className="flex gap-2">
          <input type="text" placeholder={`Search ${activeTab}...`} className="w-full bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <button onClick={fetchAssets} className={`bg-${themeColor}-600 px-6 rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110`}>GO</button>
        </div>

        {session ? (
          <div className="flex flex-col md:flex-row gap-2 bg-slate-900/20 p-2 rounded-2xl border border-slate-800">
            <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none">
              {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className={`cursor-pointer bg-${themeColor}-600 hover:bg-${themeColor}-700 px-8 py-3 rounded-xl text-xs font-black flex-1 text-center transition-all shadow-xl`}>
              {loading ? "PROCESSING..." : `+ ADD NEW ${activeTab.toUpperCase()}`}
              <input type="file" className="hidden" onChange={uploadAsset} disabled={loading} accept={activeTab === 'icons' ? 'image/*' : 'audio/*'} />
            </label>
            <button onClick={() => supabase.auth.signOut()} className="text-slate-500 hover:text-red-400 text-[10px] font-bold px-4">Logout</button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col md:flex-row gap-2">
            <input type="email" placeholder="Team Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 text-xs flex-1" required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 text-xs flex-1" required />
            <button type="submit" className="bg-slate-800 px-6 py-2 rounded-xl text-xs font-bold uppercase hover:bg-slate-700 transition-colors">Team Login</button>
          </form>
        )}
      </div>

      <div className="max-w-6xl mx-auto flex flex-wrap gap-2 mb-10">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${activeCategory === cat ? `bg-${themeColor}-600 border-${themeColor}-500 text-white shadow-lg` : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-white'}`}>{cat}</button>
        ))}
      </div>

      <main className="max-w-6xl mx-auto pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {assets.map((asset) => (
            <div key={asset.id} className="group bg-slate-900/30 border border-slate-800 p-3 rounded-2xl flex flex-col hover:border-slate-600 transition-all hover:translate-y-[-4px] shadow-2xl">
              <div className={`relative aspect-square mb-4 rounded-xl flex items-center justify-center transition-all ${activeTab === 'icons' ? 'bg-white group-hover:bg-slate-50' : 'bg-slate-950 shadow-inner'}`}>
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[7px] font-black text-white uppercase tracking-tighter shadow-md ${activeTab === 'icons' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>{asset.category}</span>
                {activeTab === 'icons' ? (
                  <img src={asset.url} alt="" className="max-h-[65%] max-w-[65%] object-contain drop-shadow-md" />
                ) : (
                  <button onClick={() => handlePlay(asset.id, asset.url)} className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all shadow-2xl ${playingId === asset.id ? 'bg-emerald-500 scale-110 shadow-emerald-500/50' : 'bg-slate-800 hover:bg-slate-700'}`}>
                    {playingId === asset.id ? "⏸️" : (SoundIcons[asset.category] || "🎵")}
                  </button>
                )}
                {session && (
                  <button onClick={() => deleteAsset(asset.id)} className="absolute top-2 right-2 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all text-[7px] font-bold shadow-lg">DEL</button>
                )}
              </div>
              <div className="mt-auto space-y-3">
                <p className="text-[9px] text-slate-400 font-black uppercase truncate tracking-tight text-center px-1" title={asset.name}>{asset.name}</p>
                <button 
                  onClick={() => downloadAsset(asset.url, asset.name)} 
                  className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase border border-slate-800 transition-all hover:text-white ${activeTab === 'icons' ? 'hover:bg-indigo-600 hover:border-indigo-500' : 'hover:bg-emerald-600 hover:border-emerald-500'}`}
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}