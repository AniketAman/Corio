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

export function PresetDropdown() {
  const { activePresetId, setActivePresetId, presets } = useReview();

  const activePreset = presets.find(p => p.id === activePresetId);
  const builtIn = presets.filter(p => p.builtIn);
  const custom = presets.filter(p => !p.builtIn);

  return (
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
            <span className="text-[11px] text-text-muted ml-3.5">{preset.description}</span>
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
                <span className="text-[11px] text-text-muted ml-3.5">{preset.description}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
