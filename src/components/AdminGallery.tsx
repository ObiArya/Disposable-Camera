import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Trash2, Maximize2, Play, Pause, X, Lock, Key, Loader2, Download, CheckSquare, Square, DownloadCloud, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface Photo {
  id: string;
  imageData: string;
  filter: string;
  createdAt: any;
  deviceId: string;
}

export default function AdminGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [slideshowMode, setSlideshowMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  
  // Selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  useEffect(() => {
    if (!isAuthorized) return;

    const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Photo[];
      setPhotos(data);
    });

    return () => unsubscribe();
  }, [isAuthorized]);

  useEffect(() => {
    if (!slideshowMode || isPaused || photos.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slideshowMode, isPaused, photos.length]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'gd2026') { 
      try {
        setIsLoggingIn(true);
        await signInAnonymously(auth);
        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth error:", error);
        alert('Admin authentication failed');
      } finally {
        setIsLoggingIn(false);
      }
    } else {
      alert('Incorrect password');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      await deleteDoc(doc(db, 'photos', id));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Delete ${selectedIds.size} selected photos?`)) {
      setIsBulkOperating(true);
      try {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
          batch.delete(doc(db, 'photos', id));
        });
        await batch.commit();
        setSelectedIds(new Set());
        setIsSelectMode(false);
      } catch (error) {
        console.error("Bulk delete error:", error);
        alert("Failed to perform bulk delete");
      } finally {
        setIsBulkOperating(false);
      }
    }
  };

  const downloadImage = useCallback((imageData: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleBulkDownload = () => {
    if (selectedIds.size === 0) return;
    const toDownload = photos.filter(p => selectedIds.has(p.id));
    toDownload.forEach((photo, index) => {
      setTimeout(() => {
        downloadImage(photo.imageData, `moment-${photo.id}.jpg`);
      }, index * 200); // Small delay to avoid browser blocking multiple downloads
    });
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black-rich flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 border border-gold/20 bg-black-rich/50 backdrop-blur-xl rounded-3xl shadow-2xl"
        >
          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-gold" size={28} />
          </div>
          <h2 className="text-2xl font-serif text-center text-ivory mb-2">Admin Dashboard</h2>
          <p className="text-ivory/40 text-center text-sm mb-8">Access restricted to authorized personnel</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/50 w-5 h-5" />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Access Key"
                className="w-full bg-ivory/5 border border-ivory/10 rounded-2xl py-4 pl-12 pr-4 text-ivory focus:border-gold outline-none transition-all font-serif"
              />
            </div>
            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gold py-4 rounded-2xl text-black font-bold tracking-widest uppercase hover:bg-champagne transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoggingIn ? <Loader2 className="animate-spin" /> : "Access Dashboard"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (slideshowMode && photos.length > 0) {
    const current = photos[currentIndex];
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full flex items-center justify-center relative p-8"
          >
            <img 
              src={current.imageData} 
              alt="Moment"
              className={cn(
                "max-w-full max-h-full object-contain shadow-2xl rounded-lg",
                current.filter === 'vintage' && 'vintage-filter',
                current.filter === 'bw' && 'bw-filter',
                current.filter === 'warm' && 'warm-filter'
              )}
            />
            
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center w-full text-gold">
              <p className="text-sm font-mono uppercase tracking-[0.5em] mb-2 opacity-60">Live Captured Moments</p>
              <h1 className="text-5xl font-serif italic text-ivory">Gathering Dinner 2026</h1>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute top-8 right-8 flex gap-4">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
          >
            {isPaused ? <Play size={24} /> : <Pause size={24} />}
          </button>
          <button 
            onClick={() => setSlideshowMode(false)}
            className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
          >
            <X size={24} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-rich p-6 lg:p-12 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 p-8 border border-gold/10 bg-black-rich/30 rounded-[2.5rem] backdrop-blur-lg shadow-xl shadow-black/50">
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-serif text-gold mb-2 italic">Gallery Dashboard</h1>
            <p className="text-ivory/40 font-mono tracking-[0.3em] text-xs uppercase">Moderation & Slideshow Hub</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3">
            <button 
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedIds(new Set());
              }}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-all",
                isSelectMode ? "bg-white text-black underline decoration-2 underline-offset-4" : "border border-ivory/20 text-ivory/60 hover:border-ivory/40"
              )}
            >
              {isSelectMode ? <CheckSquare size={16} /> : <Square size={16} />}
              {isSelectMode ? "Cancel Select" : "Select Photos"}
            </button>

            {isSelectMode && selectedIds.size > 0 && (
              <>
                <button 
                  onClick={handleBulkDownload}
                  className="flex items-center gap-2 bg-ivory text-black px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs animate-in fade-in zoom-in"
                >
                  <Download size={16} />
                  Download ({selectedIds.size})
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={isBulkOperating}
                  className="flex items-center gap-2 bg-burgundy text-ivory px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs animate-in fade-in zoom-in"
                >
                  {isBulkOperating ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Delete ({selectedIds.size})
                </button>
              </>
            )}

            {!isSelectMode && (
              <button 
                onClick={() => setSlideshowMode(true)}
                className="flex items-center gap-2 bg-gold px-8 py-3 rounded-full text-black font-bold uppercase tracking-widest text-xs hover:bg-champagne transition-all shadow-lg shadow-gold/20"
              >
                <Maximize2 size={16} />
                Start Slideshow
              </button>
            )}
            
            <button 
              onClick={() => setIsAuthorized(false)}
              className="p-3 border border-burgundy/30 text-burgundy rounded-full hover:bg-burgundy/10 transition-all"
            >
              <Lock size={18} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          <AnimatePresence>
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => {
                  if (isSelectMode) {
                    toggleSelect(photo.id);
                  } else {
                    setSelectedPhoto(photo);
                  }
                }}
                className={cn(
                  "group relative aspect-[3/4] rounded-3xl overflow-hidden border transition-all cursor-pointer",
                  selectedIds.has(photo.id) ? "border-gold shadow-2xl scale-95 ring-4 ring-gold/20" : "border-gold/10 hover:border-gold/30"
                )}
              >
                <img 
                  src={photo.imageData} 
                  alt="Guest Photo"
                  className={cn(
                     "w-full h-full object-cover transition-all duration-700",
                     !selectedIds.has(photo.id) && "grayscale group-hover:grayscale-0 group-hover:scale-110",
                     photo.filter === 'vintage' && 'vintage-filter',
                     photo.filter === 'bw' && 'bw-filter',
                     photo.filter === 'warm' && 'warm-filter'
                  )}
                />

                {isSelectMode && (
                  <div className="absolute top-4 right-4 z-20">
                    <div className={cn(
                      "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedIds.has(photo.id) ? "bg-gold border-gold" : "bg-black/20 border-white/50 backdrop-blur-sm"
                    )}>
                      {selectedIds.has(photo.id) && <Check size={18} className="text-black" />}
                    </div>
                  </div>
                )}
                
                {!isSelectMode && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-5 flex flex-col justify-end">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[10px] font-mono text-ivory/60 truncate">
                         {photo.createdAt?.seconds ? new Date(photo.createdAt.seconds * 1000).toLocaleTimeString() : 'Recent'}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadImage(photo.imageData, `moment-${photo.id}.jpg`);
                          }}
                          className="p-2.5 bg-ivory/10 hover:bg-ivory text-ivory hover:text-black rounded-xl transition-all"
                        >
                          <DownloadCloud size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(photo.id);
                          }}
                          className="p-2.5 bg-burgundy/20 hover:bg-burgundy text-burgundy hover:text-ivory rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Single Image Detail Viewer */}
        <AnimatePresence>
          {selectedPhoto && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12"
            >
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-8 right-8 z-50 p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"
              >
                <X size={24} />
              </button>

              <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center gap-8">
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="relative w-full flex-1 flex items-center justify-center"
                >
                  <img 
                    src={selectedPhoto.imageData} 
                    alt="Detail"
                    className={cn(
                      "max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-gold/20",
                      selectedPhoto.filter === 'vintage' && 'vintage-filter',
                      selectedPhoto.filter === 'bw' && 'bw-filter',
                      selectedPhoto.filter === 'warm' && 'warm-filter'
                    )}
                  />

                  {/* Navigation Buttons */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:-mx-16">
                    <button 
                      onClick={() => {
                        const idx = photos.findIndex(p => p.id === selectedPhoto.id);
                        setSelectedPhoto(photos[(idx - 1 + photos.length) % photos.length]);
                      }}
                      className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all backdrop-blur-md"
                    >
                      <Play size={24} className="rotate-180" />
                    </button>
                    <button 
                      onClick={() => {
                        const idx = photos.findIndex(p => p.id === selectedPhoto.id);
                        setSelectedPhoto(photos[(idx + 1) % photos.length]);
                      }}
                      className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all backdrop-blur-md"
                    >
                      <Play size={24} />
                    </button>
                  </div>
                </motion.div>

                <div className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                  <div className="text-left mr-8">
                    <p className="text-gold font-serif italic text-lg">Photo Details</p>
                    <p className="text-ivory/40 text-[10px] font-mono tracking-widest uppercase">
                      Captured: {selectedPhoto.createdAt?.seconds ? new Date(selectedPhoto.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => downloadImage(selectedPhoto.imageData, `moment-${selectedPhoto.id}.jpg`)}
                    className="flex items-center gap-2 px-6 py-3 bg-ivory text-black rounded-full font-bold uppercase tracking-widest text-xs"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (window.confirm('Delete this photo?')) {
                        deleteDoc(doc(db, 'photos', selectedPhoto.id));
                        setSelectedPhoto(null);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-burgundy/20 text-burgundy hover:bg-burgundy hover:text-ivory rounded-full font-bold uppercase tracking-widest text-xs transition-all"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {photos.length === 0 && (
          <div className="py-40 text-center">
            <div className="w-20 h-20 bg-ivory/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <DownloadCloud className="text-ivory/20" size={32} />
            </div>
            <p className="text-ivory/20 font-serif italic text-2xl tracking-wide">No moments captured yet...</p>
          </div>
        )}
      </div>
    </div>
  );
}
