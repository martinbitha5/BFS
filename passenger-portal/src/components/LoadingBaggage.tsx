import { Luggage } from 'lucide-react';

interface LoadingBaggageProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingBaggage({ text = 'Recherche en cours...', size = 'md' }: LoadingBaggageProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };

  const containerClasses = {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]}`}>
      {/* Conteneur du convoyeur */}
      <div className="relative w-64 h-20 mb-6">
        {/* Convoyeur à bagages */}
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-full overflow-hidden">
          {/* Lignes du convoyeur en mouvement */}
          <div className="absolute inset-0 flex gap-4 animate-conveyor">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-2 h-full bg-gray-500/50" />
            ))}
          </div>
        </div>
        
        {/* Support du convoyeur */}
        <div className="absolute bottom-0 left-8 w-2 h-6 bg-gray-600 rounded-t" />
        <div className="absolute bottom-0 right-8 w-2 h-6 bg-gray-600 rounded-t" />
        
        {/* Bagages animés */}
        <div className="absolute bottom-3 animate-baggage-1">
          <div className="relative">
            <Luggage className={`${sizeClasses[size]} text-amber-400 transform`} />
            {/* Étiquette */}
            <div className="absolute -top-1 -right-1 w-2 h-3 bg-green-400 rounded-sm" />
          </div>
        </div>
        
        <div className="absolute bottom-3 animate-baggage-2">
          <div className="relative">
            <Luggage className={`${sizeClasses[size]} text-blue-400 transform scale-90`} />
            <div className="absolute -top-1 -right-1 w-2 h-3 bg-red-400 rounded-sm" />
          </div>
        </div>
        
        <div className="absolute bottom-3 animate-baggage-3">
          <div className="relative">
            <Luggage className={`${sizeClasses[size]} text-purple-400 transform scale-95`} />
            <div className="absolute -top-1 -right-1 w-2 h-3 bg-yellow-400 rounded-sm" />
          </div>
        </div>
      </div>

      {/* Texte de chargement */}
      <div className="flex items-center gap-3">
        <span className="text-white/80 text-sm font-medium">{text}</span>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse-dot-1" />
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse-dot-2" />
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse-dot-3" />
        </div>
      </div>

      {/* Styles d'animation */}
      <style>{`
        @keyframes conveyor-move {
          0% { transform: translateX(0); }
          100% { transform: translateX(-32px); }
        }
        
        @keyframes baggage-slide-1 {
          0% {
            left: -50px;
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            left: calc(100% + 50px);
            opacity: 0;
          }
        }
        
        @keyframes baggage-slide-2 {
          0% {
            left: -50px;
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            left: calc(100% + 50px);
            opacity: 0;
          }
        }
        
        @keyframes baggage-slide-3 {
          0% {
            left: -50px;
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            left: calc(100% + 50px);
            opacity: 0;
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        .animate-conveyor {
          animation: conveyor-move 0.5s linear infinite;
        }
        
        .animate-baggage-1 {
          animation: baggage-slide-1 3s ease-in-out infinite;
        }
        
        .animate-baggage-2 {
          animation: baggage-slide-2 3s ease-in-out infinite 1s;
        }
        
        .animate-baggage-3 {
          animation: baggage-slide-3 3s ease-in-out infinite 2s;
        }
        
        .animate-pulse-dot-1 {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
        
        .animate-pulse-dot-2 {
          animation: pulse-glow 1.5s ease-in-out infinite 0.3s;
        }
        
        .animate-pulse-dot-3 {
          animation: pulse-glow 1.5s ease-in-out infinite 0.6s;
        }
      `}</style>
    </div>
  );
}
