// OnlineApp.jsx — Supabase-backed multiplayer mode
// Reuses screens from Screens_Lobby.jsx and Screens_Game.jsx.
// Mounts to #root when tweaks.mode === 'online'.

const { useState: uState, useEffect: uEffect, useRef: uRef } = React;

function OnlineApp({ tweaks, setTweaks, t }) {
  const [tweaksOpen, setTweaksOpen] = uState(false);
  const [screen, setScreen] = uState('login');
  const [self, setSelf] = uState(null);  // { id, name }
  const [roomCode, setRoomCode] = uState(null);
  const [serverRoom, setServerRoom] = uState(null);  // rooms row
  const [players, setPlayers] = uState([]);
  const [diceRows, setDiceRows] = uState([]);
  const [history, setHistory] = uState([]);
  const [error, setError] = uState(null);
  const [connecting, setConnecting] = uState(false);

  const unsubRef = uRef(null);
  const hbRef = uRef(null);

  uEffect(() => {
    const h = (e) => {
      if (e.data && e.data.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data && e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', h);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', h);
  }, []);

  // Detect mobile viewport — use frame only on desktop
  const [isMobile, setIsMobile] = uState(() => window.innerWidth < 600);
  uEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // URL-room support: ?room=XXXX
  const [pendingRoom, setPendingRoom] = uState(() => {
    try {
      const u = new URL(window.location.href);
      const r = u.searchParams.get('room');
      return r && /^\d{4}$/.test(r) ? r : null;
    } catch { return null; }
  });

  // Restore session
  uEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('bd_online') || 'null');
      if (s && s.self && s.roomCode) {
        setSelf(s.self);
        setRoomCode(s.roomCode);
        connectToRoom(s.roomCode, s.self.id);
      } else if (s && s.self) {
        setSelf(s.self);
        setScreen(pendingRoom ? 'join' : 'landing');
      }
    } catch {}
  }, []);
  uEffect(() => {
    localStorage.setItem('bd_online', JSON.stringify({ self, roomCode }));
  }, [self, roomCode]);

  async function refreshState(code, myIdOverride) {
    const myId = myIdOverride || self?.id;
    const s = await window.BD.fetchRoomState({ code });
    if (!s.room) {
      // Room gone — eject
      disconnect();
      localStorage.removeItem('bd_online');
      setRoomCode(null); setServerRoom(null); setPlayers([]); setDiceRows([]);
      setError(tweaks?.lang === 'en' ? 'Room closed' : '房間已關閉');
      setScreen('landing');
      return;
    }
    if (myId && s.players.length && !s.players.find(p => p.id === myId)) {
      // I'm not in this room anymore
      disconnect();
      localStorage.removeItem('bd_online');
      setRoomCode(null); setServerRoom(null); setPlayers([]); setDiceRows([]);
      setError(tweaks?.lang === 'en' ? 'You left the room' : '你已離開房間');
      setScreen('landing');
      return;
    }
    setServerRoom(s.room);
    setPlayers(s.players);
    setHistory(s.history);
    const dice = await window.BD.fetchDice({ code });
    setDiceRows(dice);
  }

  function connectToRoom(code, myId) {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = window.BD.subscribe({
      code,
      onChange: () => refreshState(code, myId),
    });
    refreshState(code, myId).then(() => {
      // Only land in lobby if we're still connected after refresh
      if (unsubRef.current) setScreen('lobby');
    });
    // heartbeat + host-side pruning
    clearInterval(hbRef.current);
    hbRef.current = setInterval(async () => {
      try {
        await window.BD.heartbeat({ myId });
        // Use current React state rather than a fresh round-trip
        if (window.BD.amIHost) {
          if (await window.BD.amIHost({ code, myId })) await window.BD.pruneStale({ code });
        }
      } catch (e) { /* non-fatal */ }
    }, 3000);
  }

  function disconnect() {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    clearInterval(hbRef.current); hbRef.current = null;
  }

  uEffect(() => () => disconnect(), []);

  async function handleLogin(name) {
    setSelf({ id: null, name });
    setScreen(pendingRoom ? 'join' : 'landing');
  }
  function handleLogout() {
    disconnect();
    localStorage.removeItem('bd_online');
    setSelf(null); setRoomCode(null); setServerRoom(null);
    setPlayers([]); setDiceRows([]); setScreen('login');
  }

  async function handleCreated({ blessed, diceCount }) {
    setConnecting(true);
    try {
      const r = await window.BD.createRoom({ name: self.name, diceCount, blessed });
      const me = { id: r.myId, name: r.myName };
      setSelf(me);
      setRoomCode(r.code);
      connectToRoom(r.code, r.myId);
    } catch (e) { setError(String(e.message || e)); }
    setConnecting(false);
  }

  async function handleJoined({ roomCode: code }) {
    setConnecting(true); setError(null);
    try {
      const r = await window.BD.joinRoom({ code, name: self.name });
      const me = { id: r.myId, name: r.myName };
      setSelf(me);
      setRoomCode(code);
      connectToRoom(code, r.myId);
    } catch (e) {
      if (e.message === 'NOT_FOUND') setError(t('roomNotFound') || '找不到房間');
      else if (e.message === 'EXPIRED') setError(t('roomExpired') || '房間已過期');
      else setError(String(e.message || e));
    }
    setConnecting(false);
  }

  // Bug #3: if I was in a room but server says I'm no longer there, kick to landing
  uEffect(() => {
    if (roomCode && self?.id && players.length > 0 && !players.find(p => p.id === self.id)) {
      disconnect();
      setRoomCode(null); setServerRoom(null); setPlayers([]); setDiceRows([]);
      setError(tweaks.lang === 'en' ? 'You left the room' : '你已離開房間');
      setScreen('landing');
    }
  }, [players, self, roomCode]);

  async function handleLeave() {
    if (roomCode && self?.id) await window.BD.leaveRoom({ code: roomCode, myId: self.id });
    disconnect();
    setRoomCode(null); setServerRoom(null); setPlayers([]); setDiceRows([]);
    setScreen('landing');
  }

  async function handleKick(playerId) {
    if (roomCode) await window.BD.kickPlayer({ code: roomCode, playerId });
  }

  async function handleStart() {
    await window.BD.startRound({ code: roomCode, roundNum: 1 });
  }

  const myPlayer = players.find(p => p.id === self?.id);
  const myDice = diceRows.find(d => d.player_id === self?.id);
  const amHost = !!myPlayer?.is_host;

  const room = serverRoom && {
    roomCode: serverRoom.code,
    blessed: serverRoom.blessed,
    diceCount: serverRoom.dice_count,
    round: serverRoom.round,
    totalDice: diceRows.reduce((a, d) => a + (d.values?.length || 0), 0) || (players.length * serverRoom.dice_count),
    players: players.map((p, i) => ({
      id: p.id, name: p.name, isHost: p.is_host, colorIdx: p.color_idx, drinks: p.drinks,
    })),
  };
  const selfForScreens = self && myPlayer ? {
    id: self.id, name: self.name, isHost: amHost, colorIdx: myPlayer.color_idx,
  } : self && { id: self.id, name: self.name, isHost: false, colorIdx: 0 };

  // Determine current player based on server phase
  const phase = serverRoom?.phase;
  const currentPlayer = room && phase && (phase === 'bid'
    ? room.players[serverRoom.bidder_idx % room.players.length]
    : room.players[serverRoom.shake_idx % room.players.length]);

  // Shake handler: my shake complete
  async function handleShakeDone() {
    if (!roomCode || !self) return;
    await window.BD.markShaken({ code: roomCode, myId: self.id });
  }
  async function handleViewedResult() {
    await window.BD.markViewed({ code: roomCode, myId: self.id });
  }
  async function handleBid({ count, face }) {
    await window.BD.placeBid({
      code: roomCode, byId: self.id, byName: self.name,
      count, face,
      nextBidderIdx: (serverRoom.bidder_idx + 1) % players.length,
      prevOnesLocked: serverRoom.ones_locked,
    });
  }
  async function handleChallenge() {
    const bid = serverRoom.current_bid;
    const challengerIdx = serverRoom.bidder_idx;
    const challengedIdx = (challengerIdx - 1 + players.length) % players.length;
    const challenger = players[challengerIdx];
    const challenged = players[challengedIdx];
    // Count real total
    let actual = 0;
    for (const d of diceRows) {
      for (const v of (d.values || [])) {
        if (v === bid.face) actual++;
        else if (v === 1 && !serverRoom.ones_locked && bid.face !== 1) actual++;
      }
    }
    const loser = actual >= bid.count ? challenger : challenged;
    const allDice = diceRows.map(d => {
      const p = players.find(x => x.id === d.player_id);
      return {
        id: d.player_id, name: p?.name || '?',
        dice: d.values, isBlessedHolder: d.player_id === serverRoom.blessed_holder,
      };
    });
    await window.BD.challengeBid({
      code: roomCode, challengerId: challenger.id, challengedId: challenged.id,
      challengerName: challenger.name, challengedName: challenged.name,
      bid: { ...bid, _round: serverRoom.round },
      actualCount: actual, loser: { id: loser.id, name: loser.name },
      allDice,
    });
  }
  async function handleNextRound() {
    if (!amHost) return;
    const nextR = serverRoom.round + 1;
    if ((nextR - 1) % 3 === 0 && nextR > 1) {
      await window.BD.goToContinueVote({ code: roomCode });
    } else {
      await window.BD.startRound({ code: roomCode, roundNum: nextR });
    }
  }
  async function handleContinueVote(yes) {
    await window.BD.castContinueVote({ code: roomCode, myId: self.id, vote: yes });
    // If all voted, host applies
    const allVoted = players.every(p => ((serverRoom.continue_votes || {})[p.id] !== undefined) || p.id === self.id);
    if (allVoted && amHost) {
      setTimeout(async () => {
        await window.BD.applyContinueVotesAndNextRound({ code: roomCode, nextRound: serverRoom.round + 1 });
      }, 1500);
    }
  }

  // ───── render ─────
  const screenEl = (() => {
    if (!self) return <LoginScreen onSubmit={handleLogin} lang={tweaks.lang} t={t} />;
    if (screen === 'login') return <LoginScreen onSubmit={handleLogin} lang={tweaks.lang} t={t} />;
    if (connecting) return <LoadingScreen t={t} />;
    if (screen === 'landing') return <LandingScreen name={self.name} onCreate={() => setScreen('create')} onJoin={() => setScreen('join')} onHistory={() => setScreen('history')} onLogout={handleLogout} t={t} />;
    if (screen === 'create') return <CreateScreen name={self.name} onCreated={handleCreated} onBack={() => setScreen('landing')} t={t} />;
    if (screen === 'join') return <JoinScreen name={self.name} initialCode={pendingRoom} onJoined={(args) => { setPendingRoom(null); handleJoined(args); }} onBack={() => { setError(null); setPendingRoom(null); setScreen('landing'); }} t={t} />;
    if (screen === 'history') return <HistoryScreen history={history.map(h => ({
      round: h.round, time: new Date(h.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      bid: h.bid, loser: h.loser, challenger: h.challenger, actual: h.actual,
    }))} onBack={() => setScreen(roomCode ? 'lobby' : 'landing')} t={t} />;

    if (!serverRoom) return <LoadingScreen t={t} />;

    if (phase === 'lobby') {
      return <LobbyScreen room={room} self={selfForScreens} onStart={handleStart} onLeave={handleLeave} onKick={handleKick} t={t} />;
    }
    if (phase === 'shake' || phase === 'view') {
      // Parallel: everyone shakes/views at the same time
      if (!myDice) return <LoadingScreen t={t} />;
      // If I've already shaken/viewed, show waiting screen
      const done = phase === 'shake' ? myDice.shaken : myDice.viewed;
      if (done) {
        const waitingFor = (phase === 'shake' ? diceRows.filter(d => !d.shaken) : diceRows.filter(d => !d.viewed))
          .map(d => players.find(p => p.id === d.player_id)?.name).filter(Boolean);
        return <WaitingScreen room={room} waitingFor={waitingFor} phase={phase} myDice={myDice?.values} isBlessedHolder={myDice?.player_id === serverRoom.blessed_holder} t={t} />;
      }
      return <GameScreen
        room={room} currentPlayer={selfForScreens} phase={phase}
        currentBid={serverRoom.current_bid}
        cupState={'idle'} dice={myDice.values}
        isBlessedHolder={myDice.player_id === serverRoom.blessed_holder}
        onShakeDone={handleShakeDone}
        onBid={handleBid}
        onChallenge={handleChallenge}
        onViewedResult={handleViewedResult}
        t={t} />;
    }
    if (phase === 'bid') {
      const isMyTurn = currentPlayer?.id === self.id;
      if (!isMyTurn) return <WaitingScreen room={room} currentPlayer={currentPlayer} phase={phase} currentBid={serverRoom.current_bid} myDice={myDice?.values} isBlessedHolder={myDice?.player_id === serverRoom.blessed_holder} t={t} />;
      return <GameScreen
        room={room} currentPlayer={currentPlayer} phase={phase}
        currentBid={serverRoom.current_bid}
        cupState={'idle'} dice={myDice?.values || []}
        isBlessedHolder={myDice?.player_id === serverRoom.blessed_holder}
        onShakeDone={handleShakeDone}
        onBid={handleBid}
        onChallenge={handleChallenge}
        onViewedResult={handleViewedResult}
        t={t} />;
    }
    if (phase === 'result') {
      const r = serverRoom.result;
      return <ResultScreen
        room={room}
        challenge={{
          challenger: { id: r.challenger_id, name: r.challenger_name },
          challenged: { id: r.challenged_id, name: r.challenged_name },
          bid: r.bid, actualCount: r.actual,
          loser: { id: r.loser_id, name: r.loser_name },
        }}
        allDice={r.all_dice}
        onNext={amHost ? handleNextRound : () => {}}
        t={t} />;
    }
    if (phase === 'continue') {
      return <ContinueScreen
        room={room}
        votes={serverRoom.continue_votes || {}}
        onVote={handleContinueVote}
        self={selfForScreens} t={t} />;
    }
    return null;
  })();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center',
      padding: isMobile ? 0 : 20, background: isMobile ? 'var(--felt)' : '#1a0a0f',
      width: '100%', maxWidth: '100vw', overflowX: 'hidden',
    }}>
      {isMobile ? (
        <div style={{ width: '100%', minHeight: '100vh', background: 'var(--felt)', position: 'relative' }}>
          {screenEl}
          {error && <div className="toast" onClick={() => setError(null)}>{error}</div>}
        </div>
      ) : (
        <IOSDevice dark={true} width={390} height={844}>
          <div style={{ width: '100%', height: '100%', background: 'var(--felt)', position: 'relative' }}>
            {screenEl}
            {error && <div className="toast" onClick={() => setError(null)}>{error}</div>}
          </div>
        </IOSDevice>
      )}
      {tweaksOpen && window.TweaksPanel && <window.TweaksPanel tweaks={tweaks} setTweaks={setTweaks} onClose={() => setTweaksOpen(false)} />}
    </div>
  );
}

function LoadingScreen({ t }) {
  return (
    <ScreenShell>
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <div className="cup" style={{ width: 90, height: 100, transform: 'rotate(-8deg)' }} />
        <div style={{ fontFamily: 'Gloock, serif', color: 'var(--gold-l)', fontSize: 20 }}>連線中...</div>
      </div>
    </ScreenShell>
  );
}

function WaitingScreen({ room, currentPlayer, waitingFor, phase, currentBid, myDice, isBlessedHolder, t }) {
  const label = phase === 'shake' ? t('nowShake') : phase === 'view' ? t('nowView') : t('nowBid');
  const headline = waitingFor && waitingFor.length
    ? (waitingFor.length === 1 ? waitingFor[0] : `${waitingFor.length} 人`)
    : (currentPlayer?.name || '—');
  return (
    <ScreenShell>
      <div style={{ padding: '40px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div className="playbill">{label}</div>
        <div className="display-font" style={{ fontSize: 36, color: 'var(--gold-l)' }}>
          {headline}
        </div>
        <div style={avatarStyle(currentPlayer?.colorIdx || 0)} />

        {/* My own dice — visible while waiting (only after viewing in shake/view phases is unnecessary; in bid phase always show) */}
        {myDice && myDice.length > 0 && phase === 'bid' && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="playbill" style={{ fontSize: 11 }}>{t('myDice')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 280 }}>
              {myDice.map((v, i) => (
                <ShufflingDie
                  key={i} finalValue={v} size={36}
                  color={i === 0 && isBlessedHolder ? 'gold' : 'ivory'}
                  blessed={i === 0 && isBlessedHolder}
                  isShuffling={false}
                  revealDelay={0}
                />
              ))}
            </div>
          </div>
        )}

        {phase !== 'bid' && (
          <div className={`cup ${phase === 'shake' ? 'shaking' : ''}`}
            style={{ width: 120, height: 140, marginTop: 12, transform: 'rotate(-4deg)' }} />
        )}

        <div style={{ fontSize: 14, color: 'var(--cream)', opacity: 0.75, fontStyle: 'italic', marginTop: 8 }}>
          {phase === 'shake' && '等他搖骰...'}
          {phase === 'view' && '等他看骰...'}
          {phase === 'bid' && (currentBid
            ? `上一喊:${currentBid.count} 個 ${currentBid.face} 點 — 等他喊或開`
            : '等他開喊...')}
        </div>

        {/* Player list with live drinks count */}
        <div style={{ width: '100%', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {room.players.map(p => (
            <div key={p.id} className="player-row" style={{ padding: '8px 12px' }}>
              <div style={{ ...avatarStyle(p.colorIdx), width: 32, height: 32, fontSize: 16 }}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, textAlign: 'left', fontSize: 14, color: 'var(--cream)', fontWeight: 700 }}>{p.name}</div>
              {p.drinks > 0 && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--gold-l)' }}>🍻 {p.drinks}</span>}
            </div>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}

Object.assign(window, { OnlineApp });
