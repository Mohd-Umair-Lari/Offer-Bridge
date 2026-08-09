import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SVG_ICON = `<svg width="192" height="192" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="220" y2="140" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f3e8ff"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="512" height="512" rx="128" fill="url(#bgGrad)"/>
  <rect x="16" y="16" width="480" height="480" rx="112" stroke="#a78bfa" stroke-width="4" stroke-opacity="0.3" fill="none"/>

  <text x="130" y="260" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="180" fill="#ffffff" letter-spacing="-6">O</text>
  <text x="250" y="260" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="180" fill="#ffffff" letter-spacing="-6">B</text>

  <g transform="translate(146, 250)" filter="url(#shadow)">
    <rect width="220" height="140" rx="20" fill="url(#cardGrad)"/>
    <rect x="24" y="30" width="36" height="28" rx="6" fill="#fbbf24"/>
    <rect x="36" y="30" width="12" height="28" fill="#d97706" opacity="0.4"/>
    <line x1="24" y1="84" x2="196" y2="84" stroke="#7c3aed" stroke-width="8" stroke-linecap="round"/>
    <line x1="24" y1="106" x2="130" y2="106" stroke="#9333ea" stroke-width="8" stroke-linecap="round"/>
  </g>
</svg>`;

export async function GET() {
  try {
    const backupPath = path.join(process.cwd(), '.migration-backup', 'public', 'icon-192x192.png');
    const publicPath = path.join(process.cwd(), 'public', 'icon-192x192.png');

    if (fs.existsSync(publicPath)) {
      const buffer = fs.readFileSync(publicPath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    if (fs.existsSync(backupPath)) {
      const buffer = fs.readFileSync(backupPath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  } catch (e) {}

  return new NextResponse(SVG_ICON, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
