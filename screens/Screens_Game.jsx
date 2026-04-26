// Screens_Game.jsx — main play, result, history
// Exposes: GameScreen, ResultScreen, ContinueScreen, HistoryScreen, PassScreen

// ========================================
// PASS SCREEN — "Hand the phone to X"
// ========================================
function PassScreen({ toPlayer, phase, onReady, t }) {
  const [revealed, setRevealed] = React.useState(false);
  const title = phase === 'shake' ? t('yourTurnShake')
    : phase === 'bid' ? t('yourTurnBid')
    : t('yourTurnView');
  return (
    <ScreenShell>
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 40, textAlign: 'center', gap: 20,
      }}>
        <div className="playbill">{t('passPhone')}</div>
        <div className="display-font" style={{ fontSize: 48, color: 'var(--gold-l)' }}>
          {toPlayer.name}
        </div>
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: `linear-gradient(145deg, ${AVATAR_COLORS[toPlayer.colorIdx % AVATAR_COLORS.length]}, ${AVATAR_COLORS[(toPlayer.colorIdx+1) % AVATAR_COLORS.length]})`,
          border: '3px solid var(--gold)',
          display: 'grid', placeItems: 'center',
          fontFamily: 'Gloock, serif', fontSize: 56, color: 'var(--bone)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
        }}>{toPlayer.name.charAt(0).toUpperCase()}</div>
        <div style={{ fontSize: 17, color: 'var(--cream)', maxWidth: 260, lineHeight: 1.5 }}>
          {title}
        </div>
        <button
          className="btn-casino"
          style={{ marginTop: 10, minWidth: 200 }}
          onClick={() => { window.sfx && window.sfx.tap(); onReady(); }}
        >
          <i className="ph-bold ph-hand" style={{ fontSize: 18 }} />
          {t('imReady')}
        </button>
      </div>
    </ScreenShell>
  );
}

// ========================================
// GAME — main shake + bid screen, per-player
// ========================================
function GameScreen({ room, currentPlayer, phase, currentBid, onShakeDone, onBid, onChallenge, onViewedResult, dice, cupState, isBlessedHolder, t }) {
  // phase: 'shake' | 'bid' | 'view'
  const [shaking, setShaking] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);
  const [shakeStart, setShakeStart] = React.useState(0);
  const [shakeProgress, setShakeProgress] = React.useState(0);
  const pressTimerRef = React.useRef(null);
  const motionAccumRef = React.useRef(0);
  const motionHandlerRef = React.useRef(null);

  // Reel values
  const [bidCount, setBidCount] = React.useState(currentBid ? currentBid.count + 1 : (room.players.length * room.diceCount / 2 | 0) + 1);
  const [bidFace, setBidFace] = React.useState(currentBid ? (currentBid.face === 6 ? 2 : currentBid.face + 1) : 3);

  // cupState: 'idle' | 'shaking' | 'settled' | 'lifting' | 'revealed'
  const cupCls = cupState === 'shaking' || shaking ? 'shaking' : cupState === 'lifting' ? 'lifting' : '';

  // DeviceMotion — accumulate acceleration while pressing
  React.useEffect(() => {
    if (phase !== 'shake' || !shaking) return;
    if (typeof DeviceMotionEvent === 'undefined') return;
    const handler = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;
      const mag = Math.sqrt((a.x||0)**2 + (a.y||0)**2 + (a.z||0)**2);
      motionAccumRef.current += Math.max(0, mag - 10) * 0.1;
    };
    window.addEventListener('devicemotion', handler);
    motionHandlerRef.current = handler;
    return () => window.removeEventListener('devicemotion', handler);
  }, [phase, shaking]);

  function startShake(e) {
    e.preventDefault();
    if (phase !== 'shake' || revealed) return;
    setShaking(true);
    setShakeStart(Date.now());
    motionAccumRef.current = 0;
    if (window.sfx) window.sfx.startShake();
    // Request motion permission on iOS (must be user-initiated)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().catch(() => {});
    }
    // Progress ticker
    pressTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - shakeStart) / 1000;
      const motion = motionAccumRef.current;
      setShakeProgress(Math.min(1, (elapsed + motion) / 1.2));
    }, 50);
  }
  function endShake() {
    if (!shaking) return;
    if (window.sfx) window.sfx.stopShake();
    clearInterval(pressTimerRef.current);
    const elapsed = (Date.now() - shakeStart) / 1000;
    const motion = motionAccumRef.current;
    const enough = (elapsed + motion) >= 1.0;
    setShaking(false);
    if (enough) {
      setShakeProgress(1);
      setTimeout(() => onShakeDone(), 200);
    } else {
      setShakeProgress(0);
    }
  }

  React.useEffect(() => () => {
    clearInterval(pressTimerRef.current);
    if (window.sfx) window.sfx.stopShake();
  }, []);

  // Lift-to-open for VIEW phase
  const [liftStartY, setLiftStartY] = React.useState(null);
  const [liftOffset, setLiftOffset] = React.useState(0);
  function liftStart(e) {
    if (revealed) return;
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setLiftStartY(y);
  }
  function liftMove(e) {
    if (liftStartY == null) return;
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    setLiftOffset(Math.min(0, y - liftStartY));
  }
  function liftEnd() {
    if (liftStartY == null) return;
    if (liftOffset < -50) {
      setRevealed(true);
      if (window.sfx) window.sfx.open();
      // No auto-advance — user must tap "看完了" to confirm
    }
    setLiftStartY(null);
    setLiftOffset(0);
  }

  React.useEffect(() => {
    if (liftStartY == null) return;
    const onMove = (e) => liftMove(e);
    const onUp = () => liftEnd();
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
  }, [liftStartY, liftOffset]);

  return (
    <ScreenShell>
      {/* Header: round + current player + HUD */}
      <div style={{
        padding: '8px 20px 8px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="playbill">{t('round')} {room.round} {t('roundSuffix')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={avatarStyle(currentPlayer.colorIdx)}>
            {currentPlayer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--gold-l)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {phase === 'shake' ? t('nowShake') : phase === 'bid' ? t('nowBid') : t('nowView')}
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--cream)' }}>{currentPlayer.name}</div>
          </div>
        </div>
      </div>

      {/* Current bid banner */}
      {currentBid && phase === 'bid' && (
        <div style={{
          margin: '6px 24px 0', padding: '12px 16px',
          background: 'var(--wine-d)',
          border: '1.5px solid var(--gold)',
          borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <i className="ph-fill ph-speakerphone-high" style={{ fontSize: 20, color: 'var(--gold)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--gold-l)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {currentBid.by} {t('called')}
            </div>
            <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--gold-l)', fontFamily: 'Gloock, serif' }}>
              {currentBid.count} 個 · {currentBid.face} 點
              {currentBid.onesLocked && <span style={{ fontSize: 11, marginLeft: 8, background: 'var(--ember)', color: 'var(--bone)', padding: '2px 6px', borderRadius: 4 }}>1 LOCK</span>}
            </div>
          </div>
        </div>
      )}

      {/* Cup + dice stage */}
      <div style={{
        position: 'relative', height: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '10px 0',
      }}>
        {/* Dice revealed underneath - show in view-revealed AND bid phase */}
        {((phase === 'view' && revealed) || cupState === 'revealed' || (phase === 'bid' && dice && dice.length > 0)) ? (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(3, dice.length)}, 1fr)`,
            gap: 10,
            padding: 20,
          }}>
            {dice.map((v, i) => (
              <ShufflingDie
                key={i} finalValue={v} size={52}
                color={i === 0 && isBlessedHolder ? 'gold' : 'ivory'}
                blessed={i === 0 && isBlessedHolder}
                isShuffling={false}
                revealDelay={i * 90}
              />
            ))}
          </div>
        ) : null}

        {/* The cup itself - hide during bid phase too since dice are shown */}
        {cupState !== 'revealed' && !(phase === 'view' && revealed) && phase !== 'bid' && (
          <div
            className={`cup ${cupCls}`}
            style={{
              transform: liftOffset ? `translateY(${liftOffset}px)` : undefined,
              cursor: phase === 'view' ? 'grab' : (phase === 'shake' ? 'pointer' : 'default'),
              transition: liftStartY == null ? 'transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
              touchAction: 'none',
            }}
            onMouseDown={phase === 'shake' ? startShake : (phase === 'view' ? liftStart : undefined)}
            onMouseUp={phase === 'shake' ? endShake : undefined}
            onMouseLeave={phase === 'shake' ? endShake : undefined}
            onTouchStart={phase === 'shake' ? startShake : (phase === 'view' ? liftStart : undefined)}
            onTouchEnd={phase === 'shake' ? endShake : undefined}
          />
        )}

        {/* Shake progress ring */}
        {phase === 'shake' && shaking && (
          <div style={{
            position: 'absolute', bottom: 18, left: '50%',
            transform: 'translateX(-50%)',
            width: 200, height: 6, borderRadius: 3,
            background: 'rgba(0,0,0,0.4)', overflow: 'hidden',
          }}>
            <div style={{
              width: `${shakeProgress * 100}%`, height: '100%',
              background: 'linear-gradient(90deg, var(--gold), var(--gold-glow))',
              transition: 'width 120ms',
            }} />
          </div>
        )}
      </div>

      {/* Bottom action area */}
      <div style={{ padding: '10px 24px 24px' }}>
        {phase === 'shake' && !revealed && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 14, color: 'var(--cream)', opacity: 0.85, marginBottom: 10,
              fontStyle: 'italic', minHeight: 40,
            }}>
              {shaking ? t('keepShaking') : t('holdToShake')}
              {isBlessedHolder && <div style={{ color: 'var(--gold)', fontWeight: 800, marginTop: 4 }}>
                <i className="ph-fill ph-sparkle" /> {t('youreBlessed')}
              </div>}
            </div>
          </div>
        )}

        {phase === 'view' && !revealed && (
          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--cream)', opacity: 0.85, fontStyle: 'italic' }}>
            <i className="ph-bold ph-arrow-up" /> {t('swipeToOpen')}
          </div>
        )}

        {phase === 'view' && revealed && (
          <div style={{ textAlign: 'center' }}>
            <div className="playbill" style={{ marginBottom: 8 }}>{t('yourHand')}</div>
            <div style={{ fontSize: 14, color: 'var(--cream)', fontStyle: 'italic', opacity: 0.85, marginBottom: 14 }}>
              {t('rememberThenPass')}
            </div>
            <button
              className="btn-primary"
              onClick={() => onViewedResult && onViewedResult()}
              style={{ minWidth: 200 }}
            >
              {t('doneViewing')}
            </button>
          </div>
        )}

        {phase === 'bid' && (
          <GameBidControls
            currentBid={currentBid}
            bidCount={bidCount} setBidCount={setBidCount}
            bidFace={bidFace} setBidFace={setBidFace}
            maxCount={room.totalDice}
            onBid={onBid}
            onChallenge={onChallenge}
            canChallenge={!!currentBid}
            t={t}
          />
        )}
      </div>
    </ScreenShell>
  );
}

// ——— Bid controls: two reels + 喊 / 開 buttons ———
function GameBidControls({ currentBid, bidCount, setBidCount, bidFace, setBidFace, maxCount, onBid, onChallenge, canChallenge, t }) {
  // validity: newBid must beat currentBid
  const valid = !currentBid || (
    (bidCount > currentBid.count) ||
    (bidCount === currentBid.count && bidFace > currentBid.face)
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginBottom: 16 }}>
        <Reel value={bidCount} onChange={setBidCount} min={1} max={maxCount} color="gold" label={t('count')} />
        <div style={{
          alignSelf: 'center', marginTop: 26,
          fontFamily: 'Gloock, serif', fontSize: 28, color: 'var(--gold-l)',
        }}>個</div>
        <Reel value={bidFace} onChange={setBidFace} min={1} max={6} color="gold" label={t('face')} />
        <div style={{
          alignSelf: 'center', marginTop: 26,
          fontFamily: 'Gloock, serif', fontSize: 28, color: 'var(--gold-l)',
        }}>點</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: canChallenge ? '1fr 1fr' : '1fr', gap: 10 }}>
        <button
          className="btn-casino"
          disabled={!valid}
          onClick={() => { window.sfx && window.sfx.call(); onBid({ count: bidCount, face: bidFace }); }}
        >
          <i className="ph-bold ph-megaphone" style={{ fontSize: 18 }} />
          {t('call')}
        </button>
        {canChallenge && (
          <button
            onClick={() => { window.sfx && window.sfx.challenge(); onChallenge(); }}
            style={{
              padding: '16px 24px', borderRadius: 9999,
              background: 'linear-gradient(180deg, #F46C54 0%, var(--ember) 50%, #B83D24 100%)',
              color: 'var(--bone)',
              border: '1.5px solid var(--wine-d)',
              fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 17,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              boxShadow: '0 4px 0 var(--wine-d)',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <i className="ph-bold ph-hand-palm" style={{ fontSize: 18 }} />
            {t('challenge')}
          </button>
        )}
      </div>
      {!valid && currentBid && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ember)', marginTop: 10 }}>
          {t('mustBeat')}
        </div>
      )}
    </div>
  );
}

// ========================================
// RESULT — challenge reveal
// ========================================
function ResultScreen({ room, challenge, allDice, onNext, t }) {
  // challenge: { challenger, challenged, bid, actualCount, loser }
  const { challenger, challenged, bid, actualCount, loser } = challenge;
  const [sparkles, setSparkles] = React.useState([]);

  React.useEffect(() => {
    if (window.sfx) setTimeout(() => window.sfx.open(), 100);
    setTimeout(() => {
      if (window.sfx) window.sfx.lose();
      // sparkles
      const sp = [];
      for (let i = 0; i < 14; i++) {
        sp.push({
          id: i,
          left: 50 + (Math.random() - 0.5) * 60,
          top: 50 + (Math.random() - 0.5) * 30,
          dx: (Math.random() - 0.5) * 200,
          dy: -80 - Math.random() * 180,
          rot: Math.random() * 360,
          delay: Math.random() * 400,
          color: Math.random() > 0.5 ? 'var(--gold)' : 'var(--ember)',
        });
      }
      setSparkles(sp);
    }, 1200);
  }, []);

  return (
    <ScreenShell>
      <div style={{
        padding: '20px 24px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div className="playbill">{t('openDice')}</div>
        <div className="display-font" style={{ fontSize: 32, color: 'var(--gold-l)', lineHeight: 1.1 }}>
          {challenger.name} {t('challenged')} {challenged.name}
        </div>
        <div style={{
          padding: 14, background: 'var(--wine-d)',
          border: '1.5px solid var(--gold)', borderRadius: 14,
          fontFamily: 'Gloock, serif', fontSize: 22, color: 'var(--gold-l)',
        }}>
          {challenged.name}: {bid.count} 個 {bid.face} 點
        </div>

        {/* Full reveal of all dice */}
        <div style={{ position: 'relative', padding: '10px 0' }}>
          {sparkles.map(s => (
            <div
              key={s.id} className="sparkle"
              style={{
                left: `${s.left}%`, top: `${s.top}%`,
                '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--rot': `${s.rot}deg`,
                animationDelay: `${s.delay}ms`,
                width: 12, height: 12,
                background: s.color,
                clipPath: 'polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
              }}
            />
          ))}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(room.diceCount, 5)}, 1fr)`,
            gap: 8, justifyItems: 'center',
          }}>
            {allDice.map((player, pi) => (
              <React.Fragment key={player.id}>
                {player.dice.map((v, di) => {
                  const isTarget = v === bid.face || v === 1;
                  const isBlessed = di === 0 && player.isBlessedHolder;
                  return (
                    <div key={`${pi}-${di}`} style={{
                      opacity: isTarget ? 1 : 0.35,
                      transition: 'opacity 300ms',
                      transitionDelay: `${pi * 100 + di * 50 + 1400}ms`,
                    }}>
                      <ShufflingDie
                        finalValue={v} size={42}
                        color={v === bid.face ? 'wine' : v === 1 ? 'gold' : 'ivory'}
                        blessed={isBlessed}
                        isShuffling={false}
                        revealDelay={pi * 120 + di * 60 + 200}
                      />
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{
          padding: '14px 16px', background: 'rgba(244,232,211,0.08)',
          border: '1px solid rgba(212,169,74,0.3)', borderRadius: 14,
        }}>
          <div style={{ fontSize: 13, color: 'var(--cream)', opacity: 0.85, marginBottom: 4 }}>
            {t('actualCount')}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 32, fontWeight: 700, color: 'var(--gold-l)',
          }}>
            {actualCount} <span style={{ fontSize: 14, opacity: 0.7 }}>/ {bid.count}</span>
          </div>
        </div>

        <div className="ornament-frame" style={{
          background: 'var(--ember)', borderColor: 'var(--gold)',
          color: 'var(--bone)', padding: 20,
        }}>
          <span className="orn-tr" /><span className="orn-br" />
          <div style={{
            fontFamily: 'Gloock, serif', fontSize: 30, marginBottom: 8,
          }}>
            {loser.name} {t('drinks')}!
          </div>
          <div style={{ fontSize: 14, letterSpacing: '0.04em', opacity: 0.92 }}>
            🍻 {actualCount >= bid.count ? t('itWasTrue') : t('itWasBoast')}
          </div>
        </div>

        <button
          className="btn-casino"
          style={{ width: '100%' }}
          onClick={() => { window.sfx && window.sfx.tap(); onNext(); }}
        >
          <i className="ph-bold ph-arrow-right" style={{ fontSize: 18 }} />
          {t('nextRound')}
        </button>
      </div>
    </ScreenShell>
  );
}

// ========================================
// CONTINUE vote — every 3 rounds
// ========================================
function ContinueScreen({ room, votes, onVote, self, t }) {
  const remaining = room.players.filter(p => votes[p.id] === undefined);
  const alreadyVoted = votes[self.id] !== undefined;
  const yesCount = Object.values(votes).filter(v => v === true).length;
  const noCount = Object.values(votes).filter(v => v === false).length;

  return (
    <ScreenShell>
      <div style={{ padding: '20px 24px', textAlign: 'center' }}>
        <div className="playbill" style={{ marginBottom: 12 }}>{t('intermission')}</div>
        <div className="display-font" style={{ fontSize: 32, color: 'var(--gold-l)', lineHeight: 1.15, marginBottom: 18 }}>
          {t('keepPlaying')}
        </div>
        <div style={{ fontSize: 14, color: 'var(--cream)', opacity: 0.8, marginBottom: 20 }}>
          {t('afterNRounds', room.round)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {room.players.map(p => {
            const v = votes[p.id];
            return (
              <div key={p.id} className="player-row">
                <div style={avatarStyle(p.colorIdx)}>{p.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, textAlign: 'left', fontWeight: 800, color: 'var(--cream)' }}>{p.name}</div>
                {v === true && <i className="ph-fill ph-check-circle" style={{ fontSize: 22, color: 'var(--leaf)' }} />}
                {v === false && <i className="ph-fill ph-x-circle" style={{ fontSize: 22, color: 'var(--ember)' }} />}
                {v === undefined && <span style={{ fontSize: 11, color: 'var(--gold-l)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('voting')}</span>}
              </div>
            );
          })}
        </div>

        {!alreadyVoted && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--cream)', marginBottom: 10, opacity: 0.85 }}>
              {self.name}, {t('yourVote')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                className="btn-casino"
                onClick={() => { window.sfx && window.sfx.tap(); onVote(true); }}
              >
                <i className="ph-bold ph-thumbs-up" style={{ fontSize: 18 }} />
                {t('continue')}
              </button>
              <button
                className="btn-ghost-cream"
                onClick={() => { window.sfx && window.sfx.tap(); onVote(false); }}
              >
                <i className="ph-bold ph-thumbs-down" style={{ fontSize: 16 }} />
                {t('imOut')}
              </button>
            </div>
          </div>
        )}
        {alreadyVoted && (
          <div style={{ fontSize: 14, color: 'var(--gold-l)', fontStyle: 'italic' }}>
            {t('waitingOthers')} · {yesCount} {t('yes')} / {noCount} {t('no')}
          </div>
        )}
      </div>
    </ScreenShell>
  );
}

// ========================================
// HISTORY
// ========================================
function HistoryScreen({ history, onBack, t }) {
  return (
    <ScreenShell>
      <TopBar title={t('records')} onBack={onBack} />
      <div style={{ padding: '8px 24px 24px' }}>
        {history.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 40,
            color: 'var(--cream)', opacity: 0.6,
            fontStyle: 'italic',
          }}>
            <i className="ph-duotone ph-scroll" style={{ fontSize: 60, color: 'var(--gold)', display: 'block', marginBottom: 12 }} />
            {t('noRecords')}
          </div>
        ) : history.map((h, i) => (
          <div key={i} style={{
            padding: 14, marginBottom: 10,
            background: 'rgba(244,232,211,0.06)',
            border: '1px solid rgba(212,169,74,0.2)',
            borderRadius: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div className="playbill">{t('round')} {h.round} {t('roundSuffix')}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--gold-l)' }}>{h.time}</div>
            </div>
            <div style={{ color: 'var(--cream)', fontSize: 14, lineHeight: 1.5 }}>
              <strong>{h.bid.by}</strong>: {h.bid.count} 個 {h.bid.face} 點 →
              <strong style={{ color: 'var(--ember)' }}> {h.loser}</strong> {t('drank')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--cream)', opacity: 0.6, marginTop: 4 }}>
              {t('actual')}: {h.actual} · {h.challenger} 開
            </div>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}

Object.assign(window, {
  PassScreen, GameScreen, ResultScreen, ContinueScreen, HistoryScreen,
});
