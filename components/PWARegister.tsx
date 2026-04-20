"use client";

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        // .then((reg) => console.log('SW registered:', reg)) // PROD FIX: Removed console.log
        // .catch((err) => console.log('SW registration failed:', err)); // PROD FIX: Removed console.log
    }
  }, []);

  return null;
}
