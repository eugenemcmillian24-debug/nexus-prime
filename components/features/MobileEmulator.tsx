'use client';

import React, { useState } from 'react';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  RotateCcw, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Cpu,
  Wifi,
  Battery
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DeviceProfile {
  name: string;
  width: number;
  height: number;
  icon: React.ReactNode;
}

const DEVICES: DeviceProfile[] = [
  { name: 'iPhone 15 Pro', width: 393, height: 852, icon: <Smartphone className="w-4 h-4" /> },
  { name: 'iPad Air', width: 820, height: 1180, icon: <Tablet className="w-4 h-4" /> },
  { name: 'MacBook Air', width: 1280, height: 832, icon: <Monitor className="w-4 h-4" /> },
];

export default function MobileEmulator({ previewUrl }: { previewUrl: string }) {
  const [activeDevice, setActiveDevice] = useState(DEVICES[0]);
  const [scale, setScale] = useState(0.8);
  const [isRotated, setIsRotated] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(false);

  const reloadPreview = () => {
    setLoading(true);
    const frame = document.getElementById('emulator-frame') as HTMLIFrameElement;
    if (frame) frame.src = previewUrl;
    setTimeout(() => setLoading(false), 1000);
  };

  const currentWidth = isRotated ? activeDevice.height : activeDevice.width;
  const currentHeight = isRotated ? activeDevice.width : activeDevice.height;

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500">
      {/* Controls Bar */}
      <div className="flex items-center justify-between p-4 bg-[#050505] border border-white/5 rounded-xl">
        <div className="flex items-center space-x-2">
          {DEVICES.map((device) => (
            <Button
              key={device.name}
              variant={activeDevice.name === device.name ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveDevice(device)}
              className="h-8 text-xs"
            >
              {device.icon}
              <span className="ml-2 hidden sm:inline">{device.name}</span>
            </Button>
          ))}
          <div className="w-px h-4 bg-white/10 mx-2" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsRotated(!isRotated)}>
            <RotateCcw className={cn("w-4 h-4 transition-transform", isRotated && "rotate-90")} />
          </Button>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <Label htmlFor="scale-slider" className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Zoom</Label>
            <Slider
              id="scale-slider"
              min={0.4}
              max={1.2}
              step={0.1}
              value={[scale]}
              onValueChange={(v: number[]) => setScale(v[0])}
              className="w-24"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Dark</Label>
            <Switch checked={isDark} onCheckedChange={setIsDark} />
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8 border-white/10" onClick={reloadPreview}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Emulator Workspace */}
      <div className="flex-grow flex items-center justify-center overflow-auto bg-[#0a0a0a] rounded-xl border border-white/5 relative p-10 min-h-[600px]">
        <div 
          className="transition-all duration-500 ease-in-out relative shadow-2xl"
          style={{
            width: `${currentWidth}px`,
            height: `${currentHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Device Frame Shell */}
          <div className={cn(
            "absolute inset-0 rounded-[3rem] border-[12px] border-[#1a1a1a] bg-[#1a1a1a] shadow-inner overflow-hidden",
            "after:content-[''] after:absolute after:top-0 after:left-1/2 after:-translate-x-1/2 after:w-32 after:h-7 after:bg-[#1a1a1a] after:rounded-b-2xl after:z-20"
          )}>
            {/* Status Bar Mock */}
            <div className="absolute top-2 left-0 right-0 px-8 flex items-center justify-between text-white/90 z-30 text-[10px] font-bold">
              <span>9:41</span>
              <div className="flex items-center space-x-1.5">
                <Wifi className="w-3 h-3" />
                <Cpu className="w-3 h-3" />
                <Battery className="w-3 h-3 rotate-90" />
              </div>
            </div>

            {/* Iframe Preview */}
            <div className="w-full h-full bg-white relative">
              {loading && (
                <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-white/50 font-mono">Syncing Mobile Lab...</p>
                </div>
              )}
              <iframe
                id="emulator-frame"
                src={previewUrl}
                className="w-full h-full border-none"
                title="Mobile Preview"
              />
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-20" />
          </div>
        </div>

        {/* Floating Info */}
        <div className="absolute bottom-4 left-4 flex items-center space-x-2">
          <Badge variant="outline" className="bg-black/50 backdrop-blur-md border-white/10 text-[10px] py-0 px-2 h-5">
            {currentWidth} × {currentHeight}
          </Badge>
          <Badge variant="outline" className="bg-black/50 backdrop-blur-md border-white/10 text-[10px] py-0 px-2 h-5 text-emerald-400">
            {Math.round(scale * 100)}%
          </Badge>
        </div>
      </div>
    </div>
  );
}
