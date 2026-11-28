import './components.css';

// Each person gets a steady colour from their id, so they're easy to spot in chats
const hueFor = (seed = '') => {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
};

const initials = (name = '?') =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

function Avatar({ id, name, size = 40, online, square = false }) {
  const hue = hueFor(id || name);
  return (
    <span
      className={`avatar${square ? ' square' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))`,
      }}
      title={name}
    >
      {initials(name)}
      {online !== undefined && <span className={`presence-dot ${online ? 'on' : ''}`} />}
    </span>
  );
}

export default Avatar;
