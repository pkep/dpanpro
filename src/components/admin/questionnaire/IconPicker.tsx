import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';

const COMMON_ICONS = [
  '💧', '🚽', '🚿', '🛁', '♨️', '🔧', '🔩', '⚙️', '🔌', '⚡',
  '💡', '🔥', '❄️', '🌡️', '🔑', '🚪', '🛡️', '🔐', '🔒', '🪟',
  '🏗️', '🏢', '🏠', '📋', '🚗', '💩', '🚫', '🔄', '🪣', '🔘',
  '🗃️', '😰', '🔔', '⚠️', '✅', '❌', '➕', '🪰', '🧊', '💨',
  '🧹', '🪠', '🧲', '🪜', '🔋', '📡', '🎯', '🛠️', '🪚', '🔨',
  '🪛', '📐', '🧰', '🧯', '💰', '📦', '🏷️', '⏱️', '📍', '🗺️',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="🔧"
        className="w-20 text-center text-lg"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" type="button">
            <Smile className="h-4 w-4 mr-1" /> Choisir
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <div className="grid grid-cols-8 gap-1">
            {COMMON_ICONS.map(icon => (
              <button
                key={icon}
                type="button"
                className={`p-1.5 text-lg rounded hover:bg-accent transition-colors ${value === icon ? 'bg-primary/20 ring-1 ring-primary' : ''}`}
                onClick={() => { onChange(icon); setOpen(false); }}
              >
                {icon}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {value && <span className="text-2xl">{value}</span>}
    </div>
  );
}
