// Die.jsx — 3D casino die with pip faces + shuffle animation
// Exposes: Die, DieFace

const FACE_PIPS = {
  1: ['p-mc'],
  2: ['p-tl', 'p-br'],
  3: ['p-tl', 'p-mc', 'p-br'],
  4: ['p-tl', 'p-tr', 'p-bl', 'p-br'],
  5: ['p-tl', 'p-tr', 'p-mc', 'p-bl', 'p-br'],
  6: ['p-tl', 'p-tr', 'p-ml', 'p-mr', 'p-bl', 'p-br'],
};

function DieFace({ value, size = 56, color = 'ivory', blessed = false, style = {} }) {
  const pips = FACE_PIPS[value] || FACE_PIPS[1];
  const colorClass = color === 'gold' ? 'gold-die' : color === 'wine' ? 'wine-die' : '';
  return (
    <div
      className={`die ${colorClass} ${blessed ? 'blessed' : ''}`}
      style={{ width: size, height: size, ...style }}
    >
      <div className="pip-grid">
        {pips.map((pos, i) => (
          <div key={i} className={`pip ${pos}`} style={{
            width: size * 0.16, height: size * 0.16,
          }} />
        ))}
      </div>
    </div>
  );
}

// A Die that shuffles through values when isShuffling is true, then lands on final
function ShufflingDie({ finalValue, size = 56, color = 'ivory', blessed = false, isShuffling, revealDelay = 0 }) {
  const [displayValue, setDisplayValue] = React.useState(finalValue || 1);
  React.useEffect(() => {
    if (!isShuffling) { setDisplayValue(finalValue); return; }
    const iv = setInterval(() => {
      setDisplayValue(1 + Math.floor(Math.random() * 6));
    }, 80);
    return () => clearInterval(iv);
  }, [isShuffling, finalValue]);
  return (
    <div
      className={isShuffling ? '' : 'die-revealed'}
      style={{
        animation: !isShuffling ? `die-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${revealDelay}ms backwards` : undefined,
      }}
    >
      <DieFace value={displayValue} size={size} color={color} blessed={blessed} />
    </div>
  );
}

Object.assign(window, { DieFace, ShufflingDie, FACE_PIPS });
