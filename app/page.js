"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function IconVault() {
  const [icons, setIcons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const categories = ['All', 'Action', 'Navigation', 'Avatars', 'Brand', 'Misc'];
  const [activeCategory, setActiveCategory] = useState('All');
  const [uploadCategory, setUploadCategory] = useState('Action');
  
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    fetchIcons('', 'All', 0, false); 
    return () => subscription.unsubscribe();
  }, []);

  const fetchIcons = async (queryText = '', selectedCat = 'All', pageNum = 0, isLoadMore = false) => {
    setIsSearching(true);
    const limit = 20;
    const from = pageNum * limit;
    const to = from + limit - 1;

    let query = supabase.from('icons').select('*').order('created_at', { ascending: false }).range(from, to);

    if (queryText) query = query.ilike('name', `%${queryText}%`);
    if (selectedCat !== 'All') query = query.eq('category', selectedCat);

    const { data, error } = await query;
    
    if (error) console.error("Fetch Error:", error);
    else {
      if (isLoadMore) setIcons((prev) => [...prev, ...data]);
      else setIcons(data || []);
      setHasMore(data?.length === limit);
    }
    setIsSearching(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchIcons(searchTerm, activeCategory, 0, false);
  };

  const handleFilterClick = (cat) => {
    setActiveCategory(cat);
    setSearchTerm(''); 
    setPage(0);
    fetchIcons('', cat, 0, false);
  };

  const loadMoreIcons = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchIcons(searchTerm, activeCategory, nextPage, true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Ghalat ID/Password Thakur! " + error.message);
    setLoading(false);
  };

  const handleLogout = async () => await supabase.auth.signOut();

  const uploadIcon = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const fileName = `${Date.now()}_${file.name}`;
    
    const { error: storageError } = await supabase.storage.from('icons').upload(fileName, file);
    if (storageError) { alert("Upload Failed: " + storageError.message); setLoading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('icons').getPublicUrl(fileName);
    
    const { error: dbError } = await supabase.from('icons').insert([{ name: file.name, url: publicUrl, category: uploadCategory }]);
    
    if (dbError) alert("Database Error: " + dbError.message);
    else { setPage(0); fetchIcons(searchTerm, activeCategory, 0, false); }
    
    setLoading(false);
  };

  const deleteIcon = async (id, url) => {
    if (!window.confirm("Pakka delete karna hai?")) return;
    setLoading(true);

    const fileName = url.split('/').pop();
    const { error: storageError } = await supabase.storage.from('icons').remove([fileName]);
    if (storageError) { alert("Storage delete error: " + storageError.message); setLoading(false); return; }

    const { error: dbError } = await supabase.from('icons').delete().eq('id', id);
    if (dbError) alert("Database delete error: " + dbError.message);
    else { setPage(0); fetchIcons(searchTerm, activeCategory, 0, false); }
    
    setLoading(false);
  };

  // --- UI CHANGES START HERE ---
  // Background changed to Firstbase Navy (#07071f)
  return (
    <div className="min-h-screen bg-[#06061A] text-slate-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">THAKUR ASSET MANAGER</h1>
          <p className="text-slate-400 text-sm">Secured Internal Team Library</p>
        </div>
        
        {session ? (
          <div className="flex items-center gap-4 bg-[#0F172A] p-2 rounded-xl border border-slate-800 shadow-lg">
            <select 
              value={uploadCategory} 
              onChange={(e) => setUploadCategory(e.target.value)}
              className="bg-slate-800 text-slate-200 text-sm px-3 py-2 rounded-lg outline-none border border-slate-700 focus:border-indigo-500"
            >
              <option value="Action">Action (Upload, Settings)</option>
              <option value="Navigation">Navigation (Home, Arrows)</option>
              <option value="Avatars">Avatars (Users)</option>
              <option value="Brand">Brand (Logos, Social)</option>
              <option value="Misc">Misc (Others)</option>
            </select>

            {/* Indigo button matching Firstbase */}
            <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-900/20">
              {loading ? "WAIT..." : "+ ADD ICON"}
              <input type="file" className="hidden" onChange={uploadIcon} disabled={loading} />
            </label>
            <button onClick={handleLogout} className="bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-400 px-4 py-2 rounded-lg text-sm font-bold transition-colors">Logout</button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="flex gap-2">
            <input type="email" placeholder="Team Email" value={email} onChange={(e) => setEmail(e.target.value)} className="px-3 py-2 bg-[#0F172A] border border-slate-700 rounded text-sm focus:border-indigo-500 outline-none" required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="px-3 py-2 bg-[#0F172A] border border-slate-700 rounded text-sm focus:border-indigo-500 outline-none" required />
            <button type="submit" disabled={loading} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded text-sm font-bold">{loading ? "..." : "Login"}</button>
          </form>
        )}
      </header>

      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleFilterClick(cat)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                activeCategory === cat 
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                : 'bg-[#0F172A] border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input type="text" placeholder="Naam se dhoondiye..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-5 py-3 bg-[#0F172A] border border-slate-800 rounded-xl text-slate-200 focus:border-indigo-500 outline-none transition-all placeholder-slate-500 shadow-inner" />
          <button type="submit" disabled={isSearching} className="bg-slate-800 hover:bg-slate-700 text-white px-8 rounded-xl font-bold transition-colors border border-slate-700">{isSearching ? "..." : "SEARCH"}</button>
        </form>
      </div>

      <main className="max-w-6xl mx-auto pb-20">
        {icons.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-[#0F172A]/50">
            <p className="text-slate-500">Is filter ya search mein koi data nahi mila, Thakur.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {icons.map((icon) => (
                // Card background updated to Slate-900 (#0F172A)
                <div key={icon.id} className="group relative bg-[#0F172A] border border-slate-800 p-4 rounded-2xl hover:border-indigo-500 transition-all flex flex-col shadow-lg shadow-black/20">
                  {session && (
                    <button onClick={() => deleteIcon(icon.id, icon.url)} disabled={loading} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-[10px] px-2 py-1 rounded-md z-10 font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-md">X</button>
                  )}
                  
                  <span className="absolute top-3 left-3 bg-slate-800 text-slate-300 text-[9px] px-2 py-1 rounded uppercase font-bold z-10 border border-slate-700 shadow-sm">
                    {icon.category || 'MISC'}
                  </span>

                  {/* THAKUR'S LOGIC APPLIED: Pure White Background for the Icon image */}
                  <div className="h-32 flex items-center justify-center mb-4 bg-white rounded-xl overflow-hidden p-6 shadow-inner border border-slate-200">
                    <img src={icon.url} alt={icon.name} className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform drop-shadow-sm" />
                  </div>
                  
                  <p className="text-[10px] text-slate-400 truncate mb-3 text-center uppercase tracking-widest font-bold">{icon.name}</p>
                  <a href={icon.url} target="_blank" download className="mt-auto block text-center bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white py-2 rounded-lg text-xs font-bold transition-colors">
                    DOWNLOAD
                  </a>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 text-center">
                <button 
                  onClick={loadMoreIcons}
                  disabled={isSearching}
                  className="bg-[#0F172A] border border-slate-800 hover:border-indigo-500 text-slate-300 px-8 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg"
                >
                  {isSearching ? "LOADING..." : "LOAD MORE ICONS"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}