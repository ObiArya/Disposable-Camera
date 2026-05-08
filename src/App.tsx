/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import CameraView from './components/CameraView';
import AdminGallery from './components/AdminGallery';
import { generateDeviceId } from './lib/utils';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    // Generate or get device ID on mount
    generateDeviceId();

    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (newPath: string) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
  };

  // Improved check for GitHub Pages sub-directory structure
  const isAdminPath = path.endsWith('/admin-gallery');

  return (
    <div className="min-h-screen bg-black-rich">
      {isAdminPath ? (
        <AdminGallery />
      ) : (
        <CameraView />
      )}
      
      {/* Hidden nav tool for local testing or access if needed */}
      <div className="fixed bottom-4 left-4 z-[9999] opacity-0 hover:opacity-100 transition-opacity">
         <button 
           onClick={() => navigateTo(path === '/admin-gallery' ? '/' : '/admin-gallery')}
           className="text-[8px] text-ivory/10 hover:text-gold"
         >
           Switch View
         </button>
      </div>
    </div>
  );
}

