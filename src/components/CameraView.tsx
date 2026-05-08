import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, Timer, Sparkles, X, Check, Loader2, Maximize2 } from 'lucide-react';
import { cn, incrementPhotoCount, getPhotoCount, generateDeviceId, getDeviceLimit } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import confetti from 'canvas-confetti';

type Filter = 'none' | 'vintage' | 'bw' | 'warm';

export default function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerSetting, setTimerSetting] = useState<0 | 3 | 5 | 10>(0);
  const [activeFilter, setActiveFilter] = useState<Filter>('none');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(getPhotoCount());
  const [deviceLimit] = useState(getDeviceLimit());

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const [isMirrored, setIsMirrored] = useState(false); // Default to false as requested

  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: mode,
          width: { ideal: 1080 },
          height: { ideal: 1440 }
        }, 
        audio: false 
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      
      // Auto-mirror only if user explicitly wants it for "selfie feel", 
      // but the user here requested "TIDAK mirror"
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera access denied. Please enable camera permissions in your browser settings or try opening in a new tab if you are using an in-app browser.");
      } else {
        setError("Failed to access camera. Please make sure your device supports camera access and try again.");
      }
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [facingMode]);

  const takePhoto = () => {
    if (photoCount >= deviceLimit) return;
    
    if (timerSetting > 0) {
      setCountdown(timerSetting);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(interval);
            capture();
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
    } else {
      capture();
    }
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    
    // Reset transformation to ensure NO mirroring in result
    context.setTransform(1, 0, 0, 1, 0, 0);
    
    if (isMirrored) {
      context.translate(canvasRef.current.width, 0);
      context.scale(-1, 1);
    }
    
    context.drawImage(videoRef.current, 0, 0);
    
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6); 
    setCapturedImage(dataUrl);
    setIsCapturing(true);
  };

  const handleUpload = async () => {
    if (!capturedImage) return;
    setIsUploading(true);
    
    try {
      await addDoc(collection(db, 'photos'), {
        imageData: capturedImage,
        filter: activeFilter,
        deviceId: generateDeviceId(),
        createdAt: serverTimestamp(),
        approved: false,
      });
      
      incrementPhotoCount();
      setPhotoCount(prev => prev + 1);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C9A646', '#F8F4EC', '#5A0F1C']
      });
      resetCamera();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'photos');
    } finally {
      setIsUploading(false);
    }
  };

  const resetCamera = () => {
    setCapturedImage(null);
    setIsCapturing(false);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (photoCount >= deviceLimit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-black-rich">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 border border-gold/30 bg-black-rich/50 backdrop-blur-xl rounded-3xl"
        >
          <Sparkles className="w-16 h-16 mx-auto mb-6 text-gold animate-pulse" />
          <h1 className="mb-4 text-4xl font-serif text-gold font-bold italic">Film's Out!</h1>
          <p className="text-ivory/80 leading-relaxed max-w-xs mx-auto">
            Thank you for sharing your beautiful moments tonight. Your photos have been saved to the event gallery.
          </p>
          <div className="mt-8 pt-8 border-t border-gold/10">
            <p className="text-sm font-serif italic text-gold/60">Gathering Dinner 2026</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-[100dvh] bg-black overflow-hidden font-sans">
      {/* Viewport */}
      <div className="relative flex-1 flex flex-col items-center justify-center bg-black overflow-hidden">
        <div className={cn(
          "relative w-full h-full flex items-center justify-center transition-all duration-700",
          capturedImage ? "p-8" : "p-0"
        )}>
          <div className={cn(
            "relative w-full h-full overflow-hidden transition-all duration-500 shadow-2xl",
            capturedImage ? "rounded-3xl border-4 border-ivory" : "rounded-none border-0"
          )}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{ transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)' }}
              className={cn(
                "w-full h-full object-cover",
                activeFilter === 'vintage' && 'vintage-filter',
                activeFilter === 'bw' && 'bw-filter',
                activeFilter === 'warm' && 'warm-filter'
              )}
            />
            
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent" />
            
            <AnimatePresence>
              {capturedImage && (
                <motion.img 
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  src={capturedImage} 
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover z-20",
                    activeFilter === 'vintage' && 'vintage-filter',
                    activeFilter === 'bw' && 'bw-filter',
                    activeFilter === 'warm' && 'warm-filter'
                  )}
                />
              )}
            </AnimatePresence>

            {countdown !== null && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <motion.span 
                  key={countdown}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 1 }}
                  className="text-8xl font-serif text-gold font-bold"
                >
                  {countdown}
                </motion.span>
              </div>
            )}
          </div>

          <div className="absolute top-6 left-6 z-40 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-gold/30 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono text-ivory tracking-[0.2em] font-bold uppercase">
              ROLL: {photoCount}/{deviceLimit}
            </span>
          </div>

          {!capturedImage && (
            <div className="absolute top-6 right-6 z-40 flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(e => console.error(e));
                  } else {
                    document.exitFullscreen();
                  }
                }}
                className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-gold/20 text-gold"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black-rich/95 backdrop-blur-3xl border-t border-gold/10 p-6 pb-12">
        {!capturedImage ? (
          <div className="flex flex-col gap-8 max-w-lg mx-auto">
            {/* Filter Selection Panel - More spacious */}
            <div className="flex overflow-x-auto no-scrollbar gap-3 justify-center items-center py-2 px-1">
              {(['none', 'vintage', 'bw', 'warm'] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    "flex-shrink-0 px-5 py-2.5 rounded-full border transition-all text-xs flex items-center justify-center font-bold uppercase tracking-[0.1em]",
                    activeFilter === f ? "border-gold bg-gold text-black shadow-xl shadow-gold/30" : "border-ivory/10 text-ivory/40 hover:border-ivory/30"
                  )}
                >
                  {f === 'none' ? 'Normal' : f}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center px-4 gap-4">
              <button 
                onClick={() => {
                  const timers: (0 | 3 | 5 | 10)[] = [0, 3, 5, 10];
                  const next = timers[(timers.indexOf(timerSetting) + 1) % timers.length];
                  setTimerSetting(next);
                }}
                className={cn(
                  "w-12 h-12 rounded-full border transition-all flex flex-col items-center justify-center gap-1",
                  timerSetting > 0 ? "border-gold text-gold bg-gold/10" : "border-ivory/20 text-ivory/60"
                )}
              >
                <Timer size={22} />
              </button>

              {/* Shutter */}
              <button
                onClick={takePhoto}
                disabled={countdown !== null}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gold blur-2xl opacity-20 group-active:opacity-50 transition-opacity" />
                <div className="w-24 h-24 rounded-full border-4 border-gold p-1.5 relative z-10 transition-transform active:scale-95">
                  <div className="w-full h-full rounded-full bg-ivory shadow-inner" />
                </div>
              </button>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={switchCamera}
                  className="w-12 h-12 rounded-full border border-ivory/20 text-ivory/60 flex items-center justify-center"
                >
                  <Camera size={22} />
                </button>
                <button 
                  onClick={() => setIsMirrored(!isMirrored)}
                  className={cn(
                    "w-12 h-12 rounded-full border transition-all flex items-center justify-center",
                    isMirrored ? "border-gold text-gold bg-gold/10" : "border-ivory/20 text-ivory/60"
                  )}
                >
                  <RefreshCw size={22} className={isMirrored ? 'scale-x-[-1]' : ''} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-sm mx-auto">
            <h3 className="text-center font-serif text-ivory/60 italic text-xl">Save this moment?</h3>
            <div className="flex justify-center items-center gap-12">
              <button
                onClick={resetCamera}
                disabled={isUploading}
                className="w-16 h-16 rounded-full border border-burgundy flex items-center justify-center text-burgundy bg-burgundy/5 active:scale-90 transition-all"
              >
                <X size={32} />
              </button>
              
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-20 h-20 rounded-full bg-gold flex items-center justify-center text-black-rich shadow-2xl shadow-gold/40 active:scale-90 transition-all disabled:opacity-50"
              >
                {isUploading ? <Loader2 size={32} className="animate-spin" /> : <Check size={32} />}
              </button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
      
      {error && (
        <div className="absolute inset-0 z-50 bg-black flex items-center justify-center p-8 text-center">
          <div className="max-w-xs p-8 border border-burgundy/30 bg-black-rich/50 backdrop-blur-xl rounded-3xl">
            <X className="w-12 h-12 text-burgundy mx-auto mb-4" />
            <p className="text-ivory font-serif text-lg mb-6">{error}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gold text-black rounded-full font-bold uppercase tracking-wider text-xs active:scale-95 transition-all"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="px-6 py-3 border border-gold/30 text-gold rounded-full font-bold uppercase tracking-wider text-xs active:scale-95 transition-all"
              >
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
