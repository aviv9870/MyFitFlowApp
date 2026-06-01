import React from 'react';

const muscleColors: Record<string, string> = {
  Chest: "#2dd4bf",
  Back: "#22c55e",
  Quads: "#f59e0b",
  Hamstrings: "#dc2626",
  Biceps: "#3b82f6",
  Triceps: "#9333ea",
  Shoulders: "#f43f5e",
  Abs: "#f97316",
};

interface MuscleMapProps {
  muscleVolumes: Record<string, number>;
}

const MuscleMap: React.FC<MuscleMapProps> = ({ muscleVolumes }) => {
  const max = Math.max(1, ...Object.values(muscleVolumes));

  const getColor = (name: string) => {
    const base = muscleColors[name as keyof typeof muscleColors] || "#94a3b8";
    const intensity = Math.min(1, (muscleVolumes[name] ?? 0) / max);
    const r = Math.round(parseInt(base.slice(1,3),16) + (255 - parseInt(base.slice(1,3),16)) * intensity);
    const g = Math.round(parseInt(base.slice(3,5),16) + (255 - parseInt(base.slice(3,5),16)) * intensity);
    const b = Math.round(parseInt(base.slice(5,7),16) + (255 - parseInt(base.slice(5,7),16)) * intensity);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="w-full h-[500px] bg-background rounded-3xl overflow-hidden border border-border relative">
      <div className="absolute top-4 left-4 z-10">
        <h2 className="text-lg font-bold text-foreground">Interactive Muscle Map</h2>
        <p className="text-xs text-muted-foreground">Hover to see volume</p>
      </div>
        <svg viewBox="0 0 200 400" className="w-full h-full">
          {/* Chest */}
          <rect x="70" y="50" width="60" height="80" fill={getColor('Chest')} />
          {/* Back */}
          <rect x="70" y="150" width="60" height="80" fill={getColor('Back')} />
          {/* Quads */}
          <rect x="70" y="250" width="60" height="80" fill={getColor('Quads')} />
          {/* Hamstrings */}
          <rect x="70" y="350" width="60" height="80" fill={getColor('Hamstrings')} />
          {/* Biceps */}
          <rect x="20" y="50" width="30" height="80" fill={getColor('Biceps')} />
          {/* Triceps */}
          <rect x="150" y="50" width="30" height="80" fill={getColor('Triceps')} />
          {/* Shoulders */}
          <rect x="20" y="150" width="30" height="80" fill={getColor('Shoulders')} />
          {/* Abs */}
          <rect x="150" y="150" width="30" height="80" fill={getColor('Abs')} />
        </svg>
      </div>
    );
  };
  
  export default MuscleMap;
