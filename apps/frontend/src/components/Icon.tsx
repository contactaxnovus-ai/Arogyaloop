interface IconProps {
  name: string;
  size?: number;
}

export function Icon({ name, size = 20 }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className="material-symbols-outlined icon"
      style={{ fontSize: size, width: size, height: size }}
    >
      {name}
    </span>
  );
}
