interface MaterialIconProps {
  icon: string;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}

const MaterialIcon = ({ icon, className = "", filled = false, style }: MaterialIconProps) => (
  <span
    className={`material-icon ${className}`}
    style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0", ...style }}
  >
    {icon}
  </span>
);

export default MaterialIcon;
