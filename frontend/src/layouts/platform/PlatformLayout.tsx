// ============================================================
// Clyptus Job Portal - Shared Platform Portal Layout
// Single layout housing both Platform Super Admin & Platform Admin roles.
// ============================================================

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { PlatformSidebar } from './PlatformSidebar';
import { PlatformHeader } from './PlatformHeader';

export const PlatformLayout: React.FC = () => {
  const [menu, setMenu] = useState(false);
  return (
    <div className="flex h-screen w-full bg-[#080d1a] text-slate-100 overflow-hidden font-sans">
      {/* SHARED PLATFORM SIDEBAR (Permission-Filtered) */}
      <div className={`${menu ? 'flex' : 'hidden'} md:flex fixed md:static inset-y-0 left-0 z-40`}>
        <PlatformSidebar />
      </div>
      {menu && (
        <button
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
          className="fixed md:hidden inset-0 bg-black/60 z-30"
        />
      )}

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* SHARED PLATFORM HEADER */}
        <div className="flex items-center border-b border-slate-800">
          <button
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
            className="md:hidden p-3"
          >
            ☰
          </button>
          <div className="flex-1 min-w-0">
            <PlatformHeader />
          </div>
        </div>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#080d1a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
