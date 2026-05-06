import { useState } from 'react';
import { useReview } from '../context/ReviewContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { PresetManager } from './PresetManager';

export function PresetDropdown() {
  const { activePresetId, setActivePresetId, presets } = useReview();
  const [showManager, setShowManager] = useState(false);

  const activePreset = presets.find(p => p.id === activePresetId);
  const builtIn = presets.filter(p => p.builtIn);
  const custom = presets.filter(p => !p.builtIn);

  return (
    <>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-2 min-w-[120px] justify-between">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>{activePreset?.name || 'Review'}</span>
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-50">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Presets</DropdownMenuLabel>
            {builtIn.map(preset => (
              <DropdownMenuItem
                key={preset.id}
                onClick={() => setActivePresetId(preset.id)}
                className="flex flex-col items-start gap-0.5"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className={`w-1.5 h-1.5 rounded-full ${activePresetId === preset.id ? 'bg-accent' : 'bg-transparent border border-text-muted'}`} />
                  <span className="font-medium text-text-primary">{preset.name}</span>
                </div>
                <span className="text-[12px] text-text-muted ml-3.5">{preset.description}</span>
              </DropdownMenuItem>
            ))}
            {custom.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Custom</DropdownMenuLabel>
                {custom.map(preset => (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => setActivePresetId(preset.id)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className={`w-1.5 h-1.5 rounded-full ${activePresetId === preset.id ? 'bg-accent' : 'bg-transparent border border-text-muted'}`} />
                      <span className="font-medium text-text-primary">{preset.name}</span>
                    </div>
                    <span className="text-[12px] text-text-muted ml-3.5">{preset.description}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowManager(true)}>
              <span className="flex items-center gap-2 text-text-secondary">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M6.5 1.75a.75.75 0 011.5 0V3h-1.5V1.75zM8 13h-1.5v1.25a.75.75 0 001.5 0V13zM14.25 7.5a.75.75 0 010 1.5H13v-1.5h1.25zM3 8H1.75a.75.75 0 000 1.5H3V8zM8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" fill="currentColor"/>
                  <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM5.5 8a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z" fill="currentColor"/>
                </svg>
                Manage Presets...
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
          <PresetManager onClose={() => setShowManager(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
