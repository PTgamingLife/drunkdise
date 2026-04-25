// App.jsx — orchestrates flows, state, game logic, i18n, tweaks
// Attaches <App /> to #root

const { useState, useEffect, useRef, useMemo } = React;

// ───────── i18n ─────────
const I18N = {
  zh: {
    tagline: '一擲定江山,一杯定輸贏',
    enterName: '請輸入你的江湖名號',
    namePlaceholder: '輸入名字...',
    enter: '入場',
    welcome: '歡迎光臨',
    createRoom: '開設酒團',
    joinRoom: '加入酒團',
    viewRecords: '查看戰績',
    roomCode: '房號',
    shareCode: '把這組數字傳給酒友',
    diceCount: '骰子數量',
    diceCountHelp: '每人配發的骰子',
    blessedDie: '祝福骰子',
    blessedDieHelp: '隨機選一位多一個骰子',
    openRoom: '開張',
    enterRoomCode: '輸入房號',
    join: '加入',
    tip: '小提示',
    joinTip: '4 位數字房號由團長給你。若找不到,請對方重開一次。',
    lobby: '酒團大廳',
    dice: '骰',
    blessedOn: '祝福骰開啟',
    players: '酒友',
    youreHost: '你是團長',
    host: '團長',
    player: '酒友',
    drinks: '杯',
    startGame: '開始遊戲',
    needMorePlayers: '至少 2 人',
    waitingForHost: '等團長開始遊戲...',
    round: '第',
    roundSuffix: '局',
    nowShake: '搖骰中',
    nowBid: '喊數中',
    nowView: '查看骰子',
    passPhone: '手機交給',
    yourTurnShake: '輪到你搖骰。準備好就開始吧',
    yourTurnBid: '輪到你喊數 — 或是開上家的骰',
    yourTurnView: '這回合剛開始,先看看自己的骰',
    imReady: '我準備好了',
    holdToShake: '長按骰盅開始搖',
    keepShaking: '繼續搖!搖夠了再放',
    youreBlessed: '你拿到祝福骰 — 多一個骰子',
    swipeToOpen: '向上滑動骰盅打開',
    yourHand: '你的手牌',
    rememberThenPass: '記住點數,然後傳給下一位',
    called: '喊',
    count: '個',
    face: '點',
    call: '喊!',
    challenge: '開!',
    mustBeat: '必須比上家大 (數量變多或點數變大)',
    openDice: '開骰!',
    challenged: '開了',
    actualCount: '實際點數',
    itWasTrue: '上家沒吹牛,開者輸',
    itWasBoast: '上家吹過頭,被開者輸',
    nextRound: '下一局',
    intermission: '中場休息',
    keepPlaying: '要繼續喝下去嗎?',
    afterNRounds: (n) => `已經玩了 ${n} 局。每 3 局問一次,不強求`,
    yourVote: '你的一票',
    voting: '投票中',
    continue: '繼續',
    imOut: '我不玩了',
    waitingOthers: '等其他人投票',
    yes: '繼續',
    no: '退出',
    records: '戰績',
    noRecords: '還沒有戰績。快開一局吧。',
    drank: '喝了',
    actual: '實際',
  },
  en: {
    tagline: 'One roll, one drink.',
    enterName: 'Your tavern name',
    namePlaceholder: 'Type a name...',
    enter: 'Enter',
    welcome: 'Welcome',
    createRoom: 'Open a table',
    joinRoom: 'Join a table',
    viewRecords: 'View records',
    roomCode: 'Room code',
    shareCode: 'Share this with your drinking buddies',
    diceCount: 'Dice per player',
    diceCountHelp: 'Starter dice each',
    blessedDie: 'Blessed die',
    blessedDieHelp: 'One random player gets an extra die',
    openRoom: 'Open the table',
    enterRoomCode: 'Enter room code',
    join: 'Join',
    tip: 'Tip',
    joinTip: 'Your host has the 4-digit code. Ask them for it.',
    lobby: 'Table lobby',
    dice: 'dice',
    blessedOn: 'Blessed die ON',
    players: 'Drinkers',
    youreHost: 'You host',
    host: 'Host',
    player: 'Drinker',
    drinks: 'drinks',
    startGame: 'Start game',
    needMorePlayers: 'Need 2+',
    waitingForHost: 'Waiting for host to start...',
    round: 'Round',
    roundSuffix: '',
    nowShake: 'Shaking',
    nowBid: 'Bidding',
    nowView: 'Viewing',
    passPhone: 'Pass phone to',
    yourTurnShake: 'Your turn to shake. Ready when you are',
    yourTurnBid: 'Call higher — or challenge the last bid',
    yourTurnView: 'Round just started. Check your dice',
    imReady: 'I\'m ready',
    holdToShake: 'Hold the cup to shake',
    keepShaking: 'Keep shaking! Release when done',
    youreBlessed: 'You got the blessed die — one extra',
    swipeToOpen: 'Swipe cup up to open',
    yourHand: 'Your hand',
    rememberThenPass: 'Remember these, then pass the phone',
    called: 'called',
    count: 'count',
    face: 'face',
    call: 'Call!',
    challenge: 'Challenge!',
    mustBeat: 'Must beat previous bid (higher count or higher face)',
    openDice: 'Open!',
    challenged: 'challenged',
    actualCount: 'Actual count',
    itWasTrue: 'Not a boast — challenger drinks',
    itWasBoast: 'They over-called — caller drinks',
    nextRound: 'Next round',
    intermission: 'Intermission',
    keepPlaying: 'Keep drinking?',
    afterNRounds: (n) => `${n} rounds in. We ask every 3.`,
    yourVote: 'Your vote',
    voting: 'Voting',
    continue: 'Continue',
    imOut: 'I\'m out',
    waitingOthers: 'Waiting on others',
    yes: 'in',
    no: 'out',
    records: 'Records',
    noRecords: 'No records yet. Go start a round.',
    drank: 'drank',
    actual: 'Actual',
  },
};

function makeT(lang) {
  return (key, arg) => {
    const v = I18N[lang][key] || I18N.zh[key] || key;
    if (typeof v === 'function') return v(arg);
    if (typeof v === 'string' && v.includes('__') && arg !== undefined) {
      return v.replace('__', arg);
    }
    return v;
  };
}

// ───────── Tweaks defaults ─────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "lang": "zh",
  "diceStyle": "ivory",
  "soundOn": true,
  "mockPlayers": 4,
  "mode": "online"
}/*EDITMODE-END*/;

// ───────── Mock players (names from common drinking-friend names) ─────────
const MOCK_NAMES = ['阿泰', '小美', '志豪', '婉君', 'Jason', 'Nina', '阿凱', '文彬'];

// ───────── Game logic helpers ─────────
function rollDice(n) {
  return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
}
function countFace(allPlayersDice, targetFace, onesLocked) {
  let total = 0;
  for (const p of allPlayersDice) {
    for (const d of p.dice) {
      if (d === targetFace) total++;
      else if (d === 1 && !onesLocked && targetFace !== 1) total++;
    }
  }
  return total;
}

// ───────── Tweaks panel (floating) ─────────
function TweaksPanel({ tweaks, setTweaks, onClose }) {
  const update = (patch) => {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
  };
  return (
    <div className="tweaks-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4>Tweaks</h4>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--cream)',
          fontSize: 18, cursor: 'pointer', padding: 4,
        }}><i className="ph-bold ph-x" /></button>
      </div>

      <div className="row">
        <div className="label">Mode</div>
        <div className="seg-group">
          {[['local', 'Local'], ['online', 'Online']].map(([k, label]) => (
            <button key={k}
              className={`seg ${tweaks.mode === k ? 'on' : ''}`}
              onClick={() => update({ mode: k })}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="row">
        <div className="label">Language</div>
        <div className="seg-group">
          {['zh', 'en'].map(l => (
            <button key={l}
              className={`seg ${tweaks.lang === l ? 'on' : ''}`}
              onClick={() => update({ lang: l })}
            >{l.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div className="row">
        <div className="label">Dice style</div>
        <div className="seg-group">
          {['ivory', 'gold', 'wine'].map(s => (
            <button key={s}
              className={`seg ${tweaks.diceStyle === s ? 'on' : ''}`}
              onClick={() => update({ diceStyle: s })}
            >{s.slice(0,3).toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div className="row">
        <div className="label">Sound</div>
        <div
          className={`switch ${tweaks.soundOn ? 'on' : ''}`}
          onClick={() => { const v = !tweaks.soundOn; update({ soundOn: v }); window.sfx && window.sfx.setEnabled(v); }}
        />
      </div>

      <div className="row">
        <div className="label">Mock players</div>
        <div className="seg-group">
          {[2, 3, 4, 6].map(n => (
            <button key={n}
              className={`seg ${tweaks.mockPlayers === n ? 'on' : ''}`}
              onClick={() => update({ mockPlayers: n })}
            >{n}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--gold-l)', opacity: 0.7, marginTop: 10, letterSpacing: '0.05em' }}>
        Changes persist across reloads.
      </div>
    </div>
  );
}

// ───────── Main App ─────────
function App() {
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  // screen: login | landing | create | join | lobby | pass | game | result | continue | history
  const [screen, setScreen] = useState('login');
  const [prevScreen, setPrevScreen] = useState(null);
  const [self, setSelf] = useState(null);
  const [room, setRoom] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [passNextScreen, setPassNextScreen] = useState(null);
  const [history, setHistory] = useState([]);

  const t = makeT(tweaks.lang);

  // Persist screen across refreshes for dev
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bd_state');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.self) { setSelf(s.self); setScreen(s.screen || 'landing'); setRoom(s.room); setHistory(s.history || []); setGameState(s.gameState || null); }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('bd_state', JSON.stringify({ screen, self, room, history, gameState }));
    } catch {}
  }, [screen, self, room, history, gameState]);

  // Edit-mode wiring: register listener then announce
  useEffect(() => {
    const handler = (e) => {
      if (e.data && e.data.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data && e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => { if (window.sfx) window.sfx.setEnabled(tweaks.soundOn); }, [tweaks.soundOn]);

  // ───────── Flow handlers ─────────
  function handleLogin(name) {
    setSelf({ id: 'self', name, isHost: false, colorIdx: 0 });
    setScreen('landing');
  }
  function handleLogout() {
    localStorage.removeItem('bd_state');
    setSelf(null); setRoom(null); setGameState(null);
    setScreen('login');
  }
  function handleCreated({ roomCode, blessed, diceCount }) {
    const mockN = Math.max(1, tweaks.mockPlayers - 1);
    const players = [
      { id: 'self', name: self.name, isHost: true, colorIdx: 0, drinks: 0 },
      ...MOCK_NAMES.slice(0, mockN).map((n, i) => ({
        id: `bot${i}`, name: n, isHost: false, colorIdx: i + 1, drinks: 0,
      })),
    ];
    const totalDice = players.length * diceCount + (blessed ? 1 : 0);
    setRoom({ roomCode, blessed, diceCount, players, round: 1, totalDice });
    setSelf({ ...self, id: 'self', isHost: true, colorIdx: 0 });
    setScreen('lobby');
  }
  function handleJoined({ roomCode }) {
    // Simulate: we're joining a room that already has a mock host + some players
    const mockN = Math.max(1, tweaks.mockPlayers - 1);
    const players = [
      { id: 'bot0', name: MOCK_NAMES[0], isHost: true, colorIdx: 1, drinks: 0 },
      { id: 'self', name: self.name, isHost: false, colorIdx: 0, drinks: 0 },
      ...MOCK_NAMES.slice(1, mockN).map((n, i) => ({
        id: `bot${i+1}`, name: n, isHost: false, colorIdx: i + 2, drinks: 0,
      })),
    ];
    const diceCount = 5;
    const blessed = true;
    setRoom({ roomCode, blessed, diceCount, players, round: 1, totalDice: players.length * diceCount + 1 });
    setSelf({ ...self, id: 'self', isHost: false, colorIdx: 0 });
    setScreen('lobby');
  }
  function handleLeave() {
    setRoom(null); setGameState(null); setScreen('landing');
  }
  function handleKick(id) {
    setRoom({ ...room, players: room.players.filter(p => p.id !== id) });
  }

  // ───────── Game start ─────────
  function startRound(roundN) {
    const blessedIdx = room.blessed ? Math.floor(Math.random() * room.players.length) : -1;
    const playerDice = room.players.map((p, i) => ({
      id: p.id,
      dice: rollDice(room.diceCount + (i === blessedIdx ? 1 : 0)),
      isBlessedHolder: i === blessedIdx,
    }));
    const totalDice = playerDice.reduce((a, b) => a + b.dice.length, 0);
    setGameState({
      round: roundN,
      playerDice,
      turnIdx: 0, // start with player[0] = host
      phase: 'shake', // each player shakes in sequence
      shakeIdx: 0,
      viewedSet: {}, // who has viewed their dice
      currentBid: null,
      bidderIdx: 0, // whoever's turn to bid next
      onesLocked: false,
      cupState: 'idle',
      totalDice,
    });
    setRoom({ ...room, round: roundN, totalDice });
    setPassNextScreen('game');
    const first = room.players[0];
    setScreen(first.id === 'self' ? 'game' : 'pass');
  }
  function handleStart() {
    startRound(1);
  }

  // ───────── Game: shake phase ─────────
  function handleShakeDone() {
    // next shaker
    const nextIdx = gameState.shakeIdx + 1;
    if (nextIdx >= room.players.length) {
      // All shaken — move to view phase, each views their own dice, then bidding
      setGameState(gs => ({ ...gs, shakeIdx: 0, phase: 'view', cupState: 'idle' }));
      const first = room.players[0];
      if (first.id === 'self') setScreen('game');
      else { setPassNextScreen('game'); setScreen('pass'); }
    } else {
      setGameState(gs => ({ ...gs, shakeIdx: nextIdx }));
      const nextP = room.players[nextIdx];
      if (nextP.id === 'self') setScreen('game');
      else {
        setPassNextScreen('game');
        setScreen('pass');
      }
    }
  }

  // simulate bot shake auto-done when pass→ready
  function handlePassReady() {
    if (passNextScreen === 'game') {
      if (gameState.phase === 'shake') {
        // if current shaker is a bot, auto-done after brief animation
        const p = room.players[gameState.shakeIdx];
        if (p.id !== 'self') {
          // Show shaking animation on their "turn" then auto-advance
          setScreen('game');
          // GameScreen will read phase=shake, currentPlayer=bot and we auto-advance
          setGameState(gs => ({ ...gs, cupState: 'shaking' }));
          setTimeout(() => { setGameState(gs => ({ ...gs, cupState: 'idle' })); handleShakeDone(); }, 1400);
          return;
        }
      }
      if (gameState.phase === 'view') {
        const p = room.players[gameState.shakeIdx];
        if (p.id !== 'self') {
          setScreen('game');
          // bot "views" silently then hands off
          setTimeout(() => { handleViewedResult(); }, 900);
          return;
        }
      }
      if (gameState.phase === 'bid') {
        const p = room.players[gameState.bidderIdx];
        if (p.id !== 'self') {
          setScreen('game');
          // bot decides: continue bidding or challenge
          setTimeout(() => { botTurn(); }, 1100);
          return;
        }
      }
      setScreen('game');
    }
  }

  function handleViewedResult() {
    const nextIdx = gameState.shakeIdx + 1;
    if (nextIdx >= room.players.length) {
      // Everybody viewed — bidding begins with player 0 (host for round 1)
      setGameState(gs => ({ ...gs, phase: 'bid', shakeIdx: 0, bidderIdx: 0 }));
      const first = room.players[0];
      if (first.id === 'self') setScreen('game');
      else { setPassNextScreen('game'); setScreen('pass'); }
    } else {
      setGameState(gs => ({ ...gs, shakeIdx: nextIdx }));
      const nextP = room.players[nextIdx];
      if (nextP.id === 'self') setScreen('game');
      else { setPassNextScreen('game'); setScreen('pass'); }
    }
  }

  // ───────── Game: bid phase ─────────
  function handleBid(bid) {
    const currentP = room.players[gameState.bidderIdx];
    const by = currentP.name;
    const onesLocked = gameState.onesLocked || bid.face === 1;
    const newBid = { ...bid, by, onesLocked };
    const nextBidder = (gameState.bidderIdx + 1) % room.players.length;
    setGameState(gs => ({ ...gs, currentBid: newBid, onesLocked, bidderIdx: nextBidder }));
    // pass to next
    const nextP = room.players[nextBidder];
    if (nextP.id === 'self') setScreen('game');
    else { setPassNextScreen('game'); setScreen('pass'); }
  }

  function handleChallenge() {
    // current bidder is challenging the PREVIOUS bidder
    const challengerIdx = gameState.bidderIdx;
    const challengedIdx = (gameState.bidderIdx - 1 + room.players.length) % room.players.length;
    const challenger = room.players[challengerIdx];
    const challenged = room.players[challengedIdx];
    const bid = gameState.currentBid;
    const actualCount = countFace(gameState.playerDice, bid.face, gameState.onesLocked);
    const loser = actualCount >= bid.count ? challenger : challenged;

    // update drinks
    setRoom(r => ({
      ...r,
      players: r.players.map(p => p.id === loser.id ? { ...p, drinks: p.drinks + 1 } : p),
    }));
    setHistory(h => [{
      round: gameState.round,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      bid, challenger: challenger.name, challenged: challenged.name,
      actual: actualCount, loser: loser.name,
    }, ...h].slice(0, 30));

    setGameState(gs => ({
      ...gs, phase: 'result',
      challenge: {
        challenger, challenged, bid,
        actualCount, loser,
        allDice: gameState.playerDice.map((pd, i) => ({
          ...pd, name: room.players[i].name,
        })),
      },
    }));
    setScreen('result');
  }

  // Bot AI: super simple
  function botTurn() {
    const botIdx = gameState.bidderIdx;
    const bot = room.players[botIdx];
    const botDice = gameState.playerDice.find(p => p.id === bot.id).dice;
    const bid = gameState.currentBid;

    // Count bot's own matching dice
    function botHand(face) {
      let c = 0;
      for (const d of botDice) {
        if (d === face) c++;
        else if (d === 1 && !gameState.onesLocked && face !== 1) c++;
      }
      return c;
    }

    // If no bid, make a conservative opening
    if (!bid) {
      const bestFace = [2,3,4,5,6].sort((a,b) => botHand(b) - botHand(a))[0];
      const base = Math.max(2, Math.ceil(gameState.totalDice / 4));
      handleBid({ count: base, face: bestFace });
      return;
    }

    // Decide: challenge or raise
    // Estimate: bot's own matches + expected from others
    const otherDice = gameState.totalDice - botDice.length;
    const expectedOthers = otherDice * (gameState.onesLocked ? 1/6 : 2/6);
    const estimate = botHand(bid.face) + expectedOthers;
    const credible = estimate >= bid.count - 0.5;

    if (!credible && Math.random() < 0.7) {
      handleChallenge();
      return;
    }

    // Raise: prefer raising count with a face bot has
    const raiseFace = botHand(bid.face) > 0 ? bid.face : [2,3,4,5,6].sort((a,b) => botHand(b) - botHand(a))[0];
    let newCount = bid.count;
    let newFace = raiseFace;
    if (raiseFace > bid.face) {
      // same count, higher face
      newCount = bid.count;
      newFace = raiseFace;
    } else {
      newCount = bid.count + 1;
      newFace = raiseFace;
    }
    if (newCount > gameState.totalDice) { handleChallenge(); return; }
    handleBid({ count: newCount, face: newFace });
  }

  function handleNextRound() {
    const nextR = (gameState.round || 1) + 1;
    // every 3 rounds, continue vote
    if ((nextR - 1) % 3 === 0 && nextR > 1) {
      setGameState(gs => ({ ...gs, phase: 'continue', votes: {} }));
      setScreen('continue');
    } else {
      startRound(nextR);
    }
  }

  function handleContinueVote(yes) {
    const newVotes = { ...(gameState.votes || {}), self: yes };
    // auto-vote bots
    room.players.forEach(p => {
      if (p.id !== 'self' && newVotes[p.id] === undefined) {
        newVotes[p.id] = Math.random() > 0.15;
      }
    });
    setGameState(gs => ({ ...gs, votes: newVotes }));
    setTimeout(() => {
      const yesCount = Object.values(newVotes).filter(v => v === true).length;
      const stayingIds = Object.keys(newVotes).filter(id => newVotes[id] === true);
      let newPlayers = room.players.filter(p => stayingIds.includes(p.id));
      // If host left, random new host
      if (!newPlayers.find(p => p.isHost)) {
        if (newPlayers.length === 0) { handleLeave(); return; }
        const newHostIdx = Math.floor(Math.random() * newPlayers.length);
        newPlayers = newPlayers.map((p, i) => ({ ...p, isHost: i === newHostIdx }));
      }
      if (newPlayers.length < 2) { handleLeave(); return; }
      setRoom(r => ({ ...r, players: newPlayers, totalDice: newPlayers.length * r.diceCount + (r.blessed ? 1 : 0) }));
      // Rebuild self if role changed
      const selfInRoom = newPlayers.find(p => p.id === 'self');
      if (selfInRoom) setSelf(s => ({ ...s, isHost: selfInRoom.isHost }));
      startRound(gameState.round + 1);
    }, 1200);
  }

  // ───────── Render active screen ─────────
  const screenEl = (() => {
    if (!self) return <LoginScreen onSubmit={handleLogin} lang={tweaks.lang} t={t} />;
    if (screen === 'login') return <LoginScreen onSubmit={handleLogin} lang={tweaks.lang} t={t} />;
    if (screen === 'landing') return <LandingScreen name={self.name} onCreate={() => setScreen('create')} onJoin={() => setScreen('join')} onHistory={() => setScreen('history')} onLogout={handleLogout} t={t} />;
    if (screen === 'create') return <CreateScreen name={self.name} onCreated={handleCreated} onBack={() => setScreen('landing')} t={t} />;
    if (screen === 'join') return <JoinScreen name={self.name} onJoined={handleJoined} onBack={() => setScreen('landing')} t={t} />;
    if (screen === 'lobby') return <LobbyScreen room={room} self={self} onStart={handleStart} onLeave={handleLeave} onKick={handleKick} t={t} />;
    if (screen === 'history') return <HistoryScreen history={history} onBack={() => setScreen(room ? 'lobby' : 'landing')} t={t} />;
    if (screen === 'pass') {
      // Figure out who the pass is for
      const idx = gameState.phase === 'bid' ? gameState.bidderIdx : gameState.shakeIdx;
      const to = room.players[idx];
      return <PassScreen toPlayer={to} phase={gameState.phase} onReady={handlePassReady} t={t} />;
    }
    if (screen === 'game') {
      const idx = gameState.phase === 'bid' ? gameState.bidderIdx : gameState.shakeIdx;
      const currentP = room.players[idx];
      const pd = gameState.playerDice.find(p => p.id === currentP.id);
      return (
        <GameScreen
          room={room}
          currentPlayer={currentP}
          phase={gameState.phase}
          currentBid={gameState.currentBid}
          cupState={gameState.cupState}
          dice={pd.dice}
          isBlessedHolder={pd.isBlessedHolder}
          onShakeDone={handleShakeDone}
          onBid={handleBid}
          onChallenge={handleChallenge}
          onViewedResult={handleViewedResult}
          t={t}
        />
      );
    }
    if (screen === 'result') return <ResultScreen room={room} challenge={gameState.challenge} allDice={gameState.challenge.allDice} onNext={handleNextRound} t={t} />;
    if (screen === 'continue') return <ContinueScreen room={room} votes={gameState.votes || {}} onVote={handleContinueVote} self={self} t={t} />;
    return null;
  })();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: '#1a0a0f',
    }}>
      <IOSDevice dark={true} width={390} height={844}>
        <div style={{ width: '100%', height: '100%', background: 'var(--felt)' }}>
          {screenEl}
        </div>
      </IOSDevice>
      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} onClose={() => setTweaksOpen(false)} />}
    </div>
  );
}

function Root() {
  const [tweaks, setTweaksState] = useState(TWEAK_DEFAULTS);
  const setTweaks = setTweaksState;
  const t = (k) => (I18N[tweaks.lang] || I18N.zh)[k] || k;
  // Expose TweaksPanel for OnlineApp since they're in separate babel scripts
  window.TweaksPanel = TweaksPanel;
  // Listen for tweak edits from either app so Root can swap modes
  useEffect(() => {
    const h = (e) => {
      if (e?.data?.type === '__edit_mode_set_keys' && e.data.edits) {
        setTweaksState(prev => ({ ...prev, ...e.data.edits }));
      }
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, []);
  if (tweaks.mode === 'online' && window.OnlineApp) {
    return <OnlineApp tweaks={tweaks} setTweaks={setTweaks} t={t} />;
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
