import { Plane } from 'lucide-react';

interface LoadingPlaneProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingPlane({ text = 'Chargement...', size = 'md' }: LoadingPlaneProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const containerClasses = {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64'
  };

  const orbitSize = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]}`}>
      {/* Conteneur de l'animation circulaire */}
      <div className={`relative ${orbitSize[size]}`}>
        {/* Cercle de fond (piste) */}
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        
        {/* Cercle de progression */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-400 animate-spin" style={{ animationDuration: '1.5s' }} />
        
        {/* Avion qui tourne */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '1.5s' }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2">
            <Plane className={`${sizeClasses[size]} text-primary-400 rotate-90`} />
          </div>
        </div>
      </div>

      {/* Texte de chargement */}
      <p className="mt-4 text-white/70 text-sm font-medium">{text}</p>
    </div>
  );
}
