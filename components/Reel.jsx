// Reel.jsx — horizontal slot-machine number picker
// Exposes: Reel (vertical slot reel, 1-indexed values)

function Reel({ value, onChange, min = 1, max = 6, color = 'gold', label }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const [dragStartY, setDragStartY] = React.useState(0);
  const [dragOffset, setDragOffset] = React.useState(0);

  const itemH = 44;
  // Render 3 items visible: value-1, value, value+1
  const items = [];
  for (let v = min; v <= max; v++) items.push(v);

  const idx = items.indexOf(value);

  function commit(newIdx) {
    const clamped = Math.max(0, Math.min(items.length - 1, newIdx));
    onChange(items[clamped]);
    setDragOffset(0);
  }

  function onPointerDown(e) {
    e.preventDefault();
    setDragging(true);
    setDragStartY(e.clientY || (e.touches && e.touches[0].clientY));
    if (window.sfx) window.sfx.tap();
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setDragOffset(y - dragStartY);
  }
  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    const shift = Math.round(-dragOffset / itemH);
    commit(idx + shift);
  }

  function step(delta) {
    commit(idx + delta);
    if (window.sfx) window.sfx.tap();
  }

  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => onPointerMove(e);
    const onUp = () => onPointerUp();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, dragOffset, dragStartY, idx]);

  // Center the current value in the 44px window (which sits at top: 42px in the reel)
  // Track positioned so item[idx] aligns at y=42
  const y = 42 - idx * itemH + (dragging ? dragOffset : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {label && <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
        letterSpacing: '0.2em', color: 'var(--gold-l)', textTransform: 'uppercase',
      }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => step(-1)} disabled={idx === 0} style={arrowBtn(idx === 0)}>
          <i className="ph-bold ph-caret-up" style={{ fontSize: 18, color: 'var(--wine-d)' }} />
        </button>
        <div
          className="reel"
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
          style={{ cursor: 'ns-resize', touchAction: 'none' }}
        >
          <div className="reel-window" />
          <div
            ref={trackRef}
            className="reel-track"
            style={{
              transform: `translateY(${y}px)`,
              transition: dragging ? 'none' : undefined,
            }}
          >
            {items.map((v, i) => (
              <div key={v} className={`reel-item ${i === idx && !dragging ? 'active' : ''}`}>
                {v}
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => step(1)} disabled={idx === items.length - 1} style={arrowBtn(idx === items.length - 1)}>
          <i className="ph-bold ph-caret-down" style={{ fontSize: 18, color: 'var(--wine-d)' }} />
        </button>
      </div>
    </div>
  );
}

function arrowBtn(disabled) {
  return {
    width: 36, height: 36,
    display: 'grid', placeItems: 'center',
    background: 'var(--gold)',
    border: '1.5px solid var(--gold-d)',
    borderRadius: '50%',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    boxShadow: '0 2px 0 var(--wine-d)',
    padding: 0,
  };
}

Object.assign(window, { Reel });
