import React from 'react';

export default function AdminPanel() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-gray-800/30">
          <p className="text-gray-300">Admin panel functionality has been consolidated into the main application.</p>
          <p className="text-gray-300 mt-2">Please use the main dashboard for all administrative functions.</p>
        </div>
      </div>
    </div>
  );
}