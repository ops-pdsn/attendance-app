'use client'

import { useState } from 'react'

export default function LocationDisplay({ latitude, longitude, address }) {
  const [showMap, setShowMap] = useState(false)

  if (!latitude || !longitude) {
    return (
      <span className="text-slate-400 dark:text-slate-500 text-sm">
        No location
      </span>
    )
  }

  return (
    <div className="inline-block">
      <button
        onClick={() => setShowMap(!showMap)}
        className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {address ? (
          <span className="max-w-[150px] truncate">{address}</span>
        ) : (
          <span>{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
        )}
      </button>

      {showMap && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowMap(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Location</h3>
                  {address && <p className="text-xs text-slate-500">{address}</p>}
                </div>
              </div>
              <button onClick={() => setShowMap(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video">
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.006},${longitude + 0.01},${latitude + 0.006}&layer=mapnik&marker=${latitude},${longitude}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                title="Location Map"
              />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
              
               <a href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                Open in Google Maps →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}