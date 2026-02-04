/**
 * Logo ATS/CSI - Composant simple avec image
 */

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function Logo({ width = 180, height = 100, className = '' }: LogoProps) {
  return (
    <img 
      src="/assets/logo-ats-csi.png" 
      alt="ATS - African Transport Systems / CSI - Centre des Solutions Informatiques"
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
