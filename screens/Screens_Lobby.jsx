// Screens_Lobby.jsx — login, create/join, waiting room
// Exposes: LoginScreen, CreateScreen, JoinScreen, LobbyScreen

const { useState, useEffect } = React;

// ——— LOGIN ———
function LoginScreen({ onSubmit, lang, t }) {
  const [name, setName] = useState('');
  return (
    <ScreenShell>
      <div style={{ textAlign: 'center', padding: '28px 28px 0' }}>
        <div className="playbill" style={{ marginBottom: 20 }}>EST · 2026 · 吹牛</div>
        <div className="display-font" style={{
          fontSize: 54, lineHeight: 1.0, color: 'var(--gold-l)',
          textShadow: '0 3px 0 var(--wine-d), 0 6px 24px rgba(0,0,0,0.5)',
        }}>
          BOAST<br />DRINK
        </div>
        <div style={{
          fontFamily: 'Gloock, serif', fontSize: 17, color: 'var(--cream)',
          marginTop: 14, letterSpacing: '0.02em', fontStyle: 'italic',
        }}>
          {t('tagline')}
        </div>

        {/* Ornamental dice display */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '36px 0 28px' }}>
          <DieFace value={5} size={52} color="ivory" style={{ transform: 'rotate(-12deg)' }} />
          <DieFace value={1} size={62} color="gold" style={{ transform: 'rotate(4deg)' }} />
          <DieFace value={3} size={52} color="wine" style={{ transform: 'rotate(10deg)' }} />
        </div>
      </div>

      <div style={{ padding: '0 28px', marginTop: 4 }}>
        <label style={labelStyle}>{t('enterName')}</label>
        <input
          className="input-casino"
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          maxLength={12}
        />
        <button
          className="btn-casino"
          style={{ width: '100%', marginTop: 20 }}
          disabled={!name.trim()}
          onClick={() => { window.sfx && window.sfx.tap(); onSubmit(name.trim()); }}
        >
          <i className="ph-bold ph-door-open" style={{ fontSize: 18 }} />
          {t('enter')}
        </button>
      </div>
    </ScreenShell>
  );
}

// ——— LANDING (choose create or join) ———
function LandingScreen({ name, onCreate, onJoin, onHistory, onLogout, t }) {
  return (
    <ScreenShell>
      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="playbill">{t('welcome')}</div>
          <div className="display-font" style={{ fontSize: 28, marginTop: 6 }}>{name}</div>
        </div>
        <button onClick={onLogout} style={iconBtnStyle}>
          <i className="ph-bold ph-sign-out" style={{ fontSize: 18, color: 'var(--gold)' }} />
        </button>
      </div>

      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0 30px' }}>
          <div className="cup" style={{ width: 160, height: 180, transform: 'rotate(-6deg)' }} />
        </div>

        <button
          className="btn-casino"
          style={{ width: '100%', marginBottom: 14, padding: '18px 28px', fontSize: 18 }}
          onClick={() => { window.sfx && window.sfx.tap(); onCreate(); }}
        >
          <i className="ph-bold ph-crown" style={{ fontSize: 20 }} />
          {t('createRoom')}
        </button>
        <button
          className="btn-ghost-cream"
          style={{ width: '100%', marginBottom: 14 }}
          onClick={() => { window.sfx && window.sfx.tap(); onJoin(); }}
        >
          <i className="ph-bold ph-sign-in" style={{ fontSize: 18 }} />
          {t('joinRoom')}
        </button>

        <button
          onClick={onHistory}
          style={{
            background: 'none', border: 'none', color: 'var(--gold-l)',
            fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            width: '100%', padding: 12, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <i className="ph-bold ph-scroll" />
          {t('viewRecords')}
        </button>
      </div>
    </ScreenShell>
  );
}

// ——— CREATE ROOM ———
function CreateScreen({ name, onCreated, onBack, t }) {
  const [blessed, setBlessed] = useState(true);
  const [diceCount, setDiceCount] = useState(5);
  const roomCode = React.useMemo(() =>
    Math.floor(1000 + Math.random() * 9000).toString(), []);

  return (
    <ScreenShell>
      <TopBar title={t('createRoom')} onBack={onBack} />
      <div style={{ padding: '8px 24px 24px' }}>
        <div className="ornament-frame" style={{ textAlign: 'center', marginBottom: 20 }}>
          <span className="orn-tr" /><span className="orn-br" />
          <div className="playbill" style={{ marginBottom: 10 }}>{t('roomCode')}</div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 56, fontWeight: 700, color: 'var(--gold-l)',
            letterSpacing: '0.15em',
            textShadow: '0 2px 0 rgba(0,0,0,0.5)',
          }}>{roomCode}</div>
          <div style={{ fontSize: 12, color: 'var(--cream)', opacity: 0.7, marginTop: 4 }}>
            {t('shareCode')}
          </div>
        </div>

        <div style={{ ...settingRow }}>
          <div>
            <div style={settingLabel}>{t('diceCount')}</div>
            <div style={settingHelp}>{t('diceCountHelp')}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => { window.sfx && window.sfx.tap(); setDiceCount(n); }}
                style={segStyle(n === diceCount)}
              >{n}</button>
            ))}
          </div>
        </div>

        <div style={{ ...settingRow }}>
          <div>
            <div style={settingLabel}>{t('blessedDie')}</div>
            <div style={settingHelp}>{t('blessedDieHelp')}</div>
          </div>
          <div
            className={`switch ${blessed ? 'on' : ''}`}
            onClick={() => { window.sfx && window.sfx.tap(); setBlessed(!blessed); }}
            style={{
              width: 48, height: 26, borderRadius: 9999,
              background: blessed ? 'var(--gold)' : 'rgba(212,169,74,0.25)',
              border: '1px solid var(--gold-d)',
              position: 'relative', cursor: 'pointer',
              transition: 'background 180ms',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: blessed ? 24 : 2,
              width: 20, height: 20, borderRadius: '50%',
              background: blessed ? 'var(--wine-d)' : 'var(--cream)',
              transition: 'left 180ms ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
            }} />
          </div>
        </div>

        <button
          className="btn-casino"
          style={{ width: '100%', marginTop: 20 }}
          onClick={() => {
            window.sfx && window.sfx.tap();
            onCreated({ roomCode, blessed, diceCount });
          }}
        >
          <i className="ph-bold ph-play" style={{ fontSize: 18 }} />
          {t('openRoom')}
        </button>
      </div>
    </ScreenShell>
  );
}

// ——— JOIN ROOM ———
function JoinScreen({ name, onJoined, onBack, t, initialCode }) {
  const [code, setCode] = useState(initialCode || '');
  const [error, setError] = useState('');
  return (
    <ScreenShell>
      <TopBar title={t('joinRoom')} onBack={onBack} />
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 28px' }}>
          <i className="ph-duotone ph-door" style={{ fontSize: 90, color: 'var(--gold)' }} />
        </div>
        <label style={labelStyle}>{t('enterRoomCode')}</label>
        <input
          className="input-casino"
          style={{ letterSpacing: '0.3em', fontSize: 24 }}
          placeholder="0000"
          value={code}
          maxLength={4}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
            setError('');
          }}
          inputMode="numeric"
        />
        {error && <div style={{ color: 'var(--ember)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{error}</div>}
        <button
          className="btn-casino"
          style={{ width: '100%', marginTop: 22 }}
          disabled={code.length !== 4}
          onClick={() => {
            if (code.length !== 4) return;
            window.sfx && window.sfx.tap();
            onJoined({ roomCode: code });
          }}
        >
          <i className="ph-bold ph-door-open" style={{ fontSize: 18 }} />
          {t('join')}
        </button>

        <div style={{
          marginTop: 30, padding: 16,
          background: 'rgba(244,232,211,0.08)',
          border: '1px solid rgba(212,169,74,0.25)',
          borderRadius: 14,
          fontSize: 13, color: 'var(--cream)', opacity: 0.85, lineHeight: 1.6,
        }}>
          <div className="playbill" style={{ marginBottom: 8 }}>{t('tip')}</div>
          {t('joinTip')}
        </div>
      </div>
    </ScreenShell>
  );
}

// ——— WAITING ROOM ———
function LobbyScreen({ room, self, onStart, onLeave, onKick, t }) {
  const canStart = self.isHost && room.players.length >= 2;
  return (
    <ScreenShell>
      <TopBar title={t('lobby')} onBack={onLeave} backIcon="sign-out" />
      <div style={{ padding: '8px 24px 24px' }}>
        <div className="ornament-frame" style={{ textAlign: 'center', marginBottom: 20 }}>
          <span className="orn-tr" /><span className="orn-br" />
          <div className="playbill" style={{ marginBottom: 8 }}>{t('roomCode')}</div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 44, fontWeight: 700, color: 'var(--gold-l)',
            letterSpacing: '0.15em',
          }}>{room.roomCode}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 12, fontSize: 12, color: 'var(--cream)', opacity: 0.8 }}>
            <span><i className="ph-bold ph-dice-five" /> {room.diceCount} {t('dice')}</span>
            {room.blessed && <span><i className="ph-fill ph-sparkle" style={{ color: 'var(--gold)' }} /> {t('blessedOn')}</span>}
          </div>
          <button
            onClick={() => {
              const url = `${location.origin}${location.pathname}?room=${room.roomCode}`;
              if (navigator.share) {
                navigator.share({ title: 'Boastdrink', text: `房號 ${room.roomCode}`, url }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(url);
                window.sfx && window.sfx.tap();
              }
            }}
            style={{
              marginTop: 14, padding: '8px 16px',
              background: 'rgba(212,169,74,0.15)',
              border: '1px solid rgba(212,169,74,0.4)',
              color: 'var(--gold-l)', borderRadius: 999,
              fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          ><i className="ph-bold ph-share-network" /> 分享連結</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div className="playbill">{t('players')} · {room.players.length}</div>
          {self.isHost && <div style={{ fontSize: 11, color: 'var(--gold-l)', letterSpacing: '0.1em' }}>{t('youreHost')}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {room.players.map((p, i) => (
            <div key={p.id} className="player-row">
              <div style={avatarStyle(i)}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--cream)' }}>
                  {p.name}{p.id === self.id && ' (你)'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gold-l)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {p.isHost ? t('host') : t('player')}
                  {p.drinks > 0 && ` · ${p.drinks} ${t('drinks')}`}
                </div>
              </div>
              {p.isHost && <i className="ph-fill ph-crown" style={{ fontSize: 18, color: 'var(--gold)' }} />}
              {self.isHost && !p.isHost && (
                <button onClick={() => onKick(p.id)} style={iconBtnStyle}>
                  <i className="ph-bold ph-x" style={{ fontSize: 14, color: 'var(--ember)' }} />
                </button>
              )}
            </div>
          ))}
        </div>

        {self.isHost ? (
          <button
            className="btn-casino"
            style={{ width: '100%' }}
            disabled={!canStart}
            onClick={() => { window.sfx && window.sfx.tap(); onStart(); }}
          >
            <i className="ph-bold ph-play" style={{ fontSize: 18 }} />
            {canStart ? t('startGame') : t('needMorePlayers')}
          </button>
        ) : (
          <div style={{
            textAlign: 'center', padding: 16,
            background: 'rgba(244,232,211,0.08)',
            border: '1px dashed rgba(212,169,74,0.4)',
            borderRadius: 14, color: 'var(--cream)',
            fontSize: 14, fontStyle: 'italic', opacity: 0.85,
          }}>
            {t('waitingForHost')}
          </div>
        )}
      </div>
    </ScreenShell>
  );
}

// ——— SHARED: screen shell + topbar ———
function ScreenShell({ children }) {
  return (
    <div className="felt-bg" style={{
      width: '100%', height: '100%',
      overflow: 'auto',
      paddingTop: 44, paddingBottom: 30,
      position: 'relative',
    }}>
      {children}
    </div>
  );
}
function TopBar({ title, onBack, backIcon = 'arrow-left' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '4px 20px 16px', position: 'relative', zIndex: 2,
    }}>
      <button onClick={onBack} style={iconBtnStyle}>
        <i className={`ph-bold ph-${backIcon}`} style={{ fontSize: 16, color: 'var(--gold-l)' }} />
      </button>
      <div className="display-font" style={{ fontSize: 22, color: 'var(--gold-l)' }}>{title}</div>
    </div>
  );
}

// ——— styles ———
const labelStyle = {
  display: 'block',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.2em', textTransform: 'uppercase',
  color: 'var(--gold-l)',
  marginBottom: 8,
};
const iconBtnStyle = {
  width: 36, height: 36,
  display: 'grid', placeItems: 'center',
  background: 'rgba(244,232,211,0.1)',
  border: '1px solid rgba(212,169,74,0.3)',
  borderRadius: '50%', cursor: 'pointer',
  padding: 0, flexShrink: 0,
};
const settingRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 16px',
  background: 'rgba(244,232,211,0.06)',
  border: '1px solid rgba(212,169,74,0.2)',
  borderRadius: 14,
  marginBottom: 10,
};
const settingLabel = {
  fontWeight: 800, fontSize: 15, color: 'var(--cream)', marginBottom: 2,
};
const settingHelp = {
  fontSize: 12, color: 'var(--cream)', opacity: 0.6, maxWidth: 170,
};
function segStyle(on) {
  return {
    width: 38, height: 34, padding: 0,
    background: on ? 'var(--gold)' : 'transparent',
    color: on ? 'var(--wine-d)' : 'var(--cream)',
    border: '1.5px solid var(--gold)',
    borderRadius: 8,
    fontFamily: 'JetBrains Mono, monospace',
    fontWeight: 700, fontSize: 15,
    cursor: 'pointer',
  };
}
const AVATAR_COLORS = ['#F26B3A', '#7952D8', '#2C9E5E', '#3A8CCC', '#D99A2B', '#C8452E', '#C87353', '#9F7B24', '#8B2E3E'];
function avatarStyle(i) {
  return {
    width: 40, height: 40, borderRadius: '50%',
    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
    color: 'var(--bone)',
    display: 'grid', placeItems: 'center',
    fontFamily: 'Gloock, serif', fontSize: 20,
    border: '2px solid var(--gold)',
    boxShadow: '0 2px 0 rgba(0,0,0,0.4)',
    flexShrink: 0,
  };
}

Object.assign(window, {
  LoginScreen, LandingScreen, CreateScreen, JoinScreen, LobbyScreen,
  ScreenShell, TopBar, iconBtnStyle, labelStyle, avatarStyle, AVATAR_COLORS,
});
