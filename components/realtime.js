// realtime.js — Supabase wrapper for Boastdrink
// Exposes: window.BD (connect, createRoom, joinRoom, heartbeat, subscribe, actions...)

(function () {
  const SUPABASE_URL = 'https://hhcubvixldieuwdeqnwc.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoY3Vidml4bGRpZXV3ZGVxbndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjcyNDYsImV4cCI6MjA5MTE0MzI0Nn0.zkWxfm0FugSEL9zW6pwDFWPqmRJ3ystOZfU8yRL2lPo';

  let sb = null;
  function client() {
    if (!sb) sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
    return sb;
  }

  function uuid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  function rollDice(n) {
    return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
  }

  async function generateRoomCode() {
    const c = client();
    for (let i = 0; i < 10; i++) {
      const code = String(1000 + Math.floor(Math.random() * 9000));
      const { data } = await c.from('rooms').select('code').eq('code', code).maybeSingle();
      if (!data) return code;
    }
    throw new Error('Could not generate unique room code');
  }

  async function uniqueName(roomCode, desired) {
    const c = client();
    const { data: existing } = await c.from('players').select('name').eq('room_code', roomCode);
    const names = new Set((existing || []).map(p => p.name));
    if (!names.has(desired)) return desired;
    // Try A, B, C, ... Z
    for (let i = 0; i < 26; i++) {
      const n = desired + String.fromCharCode(65 + i);
      if (!names.has(n)) return n;
    }
    return desired + Math.floor(Math.random() * 1000);
  }

  async function createRoom({ name, diceCount, blessed }) {
    const c = client();
    const code = await generateRoomCode();
    const myId = uuid();
    const finalName = await uniqueName(code, name);
    const { error: re } = await c.from('rooms').insert({
      code, host_id: myId, dice_count: diceCount, blessed, phase: 'lobby',
    });
    if (re) throw re;
    const { error: pe } = await c.from('players').insert({
      id: myId, room_code: code, name: finalName, color_idx: 0, is_host: true, order_idx: 0,
    });
    if (pe) throw pe;
    return { code, myId, myName: finalName };
  }

  async function joinRoom({ code, name }) {
    const c = client();
    const { data: room, error: re } = await c.from('rooms').select('*').eq('code', code).maybeSingle();
    if (re) throw re;
    if (!room) throw new Error('NOT_FOUND');
    if (new Date(room.expires_at) < new Date()) throw new Error('EXPIRED');
    const { data: players } = await c.from('players').select('*').eq('room_code', code).order('order_idx');
    const orderIdx = (players && players.length) ? Math.max(...players.map(p => p.order_idx)) + 1 : 0;
    const finalName = await uniqueName(code, name);
    const myId = uuid();
    const colorIdx = orderIdx % 9;
    const { error: pe } = await c.from('players').insert({
      id: myId, room_code: code, name: finalName, color_idx: colorIdx,
      is_host: false, order_idx: orderIdx,
    });
    if (pe) throw pe;
    return { code, myId, myName: finalName };
  }

  async function leaveRoom({ code, myId }) {
    const c = client();
    await c.from('players').delete().eq('id', myId);
    // If I was host, reassign
    const { data: room } = await c.from('rooms').select('host_id').eq('code', code).maybeSingle();
    if (room && room.host_id === myId) {
      const { data: rest } = await c.from('players').select('id,order_idx').eq('room_code', code).order('order_idx');
      if (rest && rest.length) {
        const newHost = rest[Math.floor(Math.random() * rest.length)];
        await c.from('rooms').update({ host_id: newHost.id }).eq('code', code);
        await c.from('players').update({ is_host: true }).eq('id', newHost.id);
      } else {
        await c.from('rooms').delete().eq('code', code);
      }
    }
  }

  async function kickPlayer({ code, playerId }) {
    await client().from('players').delete().eq('id', playerId).eq('room_code', code);
  }

  async function amIHost({ code, myId }) {
    const { data } = await client().from('rooms').select('host_id').eq('code', code).maybeSingle();
    return !!data && data.host_id === myId;
  }

  async function heartbeat({ myId }) {
    await client().from('players').update({ last_seen: new Date().toISOString() }).eq('id', myId);
  }

  async function pruneStale({ code }) {
    // Run by host: kick anyone whose last_seen is >7s ago
    const c = client();
    const cutoff = new Date(Date.now() - 7000).toISOString();
    await c.from('players').delete().eq('room_code', code).lt('last_seen', cutoff);
  }

  async function fetchRoomState({ code }) {
    const c = client();
    const [roomRes, playersRes, historyRes] = await Promise.all([
      c.from('rooms').select('*').eq('code', code).maybeSingle(),
      c.from('players').select('*').eq('room_code', code).order('order_idx'),
      c.from('history').select('*').eq('room_code', code).order('created_at', { ascending: false }).limit(30),
    ]);
    return {
      room: roomRes.data,
      players: playersRes.data || [],
      history: historyRes.data || [],
    };
  }

  async function fetchDice({ code, myId }) {
    const { data } = await client().from('dice').select('*').eq('room_code', code);
    return data || [];
  }

  // Host starts a round: roll everyone's dice
  async function startRound({ code, roundNum }) {
    const c = client();
    const { data: room } = await c.from('rooms').select('*').eq('code', code).maybeSingle();
    const { data: players } = await c.from('players').select('*').eq('room_code', code).order('order_idx');
    const blessedIdx = room.blessed ? Math.floor(Math.random() * players.length) : -1;
    const blessedHolder = blessedIdx >= 0 ? players[blessedIdx].id : null;
    // Delete prior dice for this room
    await c.from('dice').delete().eq('room_code', code);
    // Insert fresh dice
    const diceRows = players.map((p, i) => ({
      room_code: code, player_id: p.id,
      values: rollDice(room.dice_count + (i === blessedIdx ? 1 : 0)),
      shaken: false, viewed: false,
    }));
    await c.from('dice').insert(diceRows);
    await c.from('rooms').update({
      phase: 'shake',
      round: roundNum,
      shake_idx: 0,
      bidder_idx: 0,
      current_bid: null,
      ones_locked: false,
      result: null,
      continue_votes: {},
      blessed_holder: blessedHolder,
    }).eq('code', code);
  }

  async function markShaken({ code, myId, nextShakeIdx, totalPlayers }) {
    const c = client();
    await c.from('dice').update({ shaken: true }).eq('room_code', code).eq('player_id', myId);
    if (nextShakeIdx >= totalPlayers) {
      // Move to view phase
      await c.from('rooms').update({ phase: 'view', shake_idx: 0 }).eq('code', code);
    } else {
      await c.from('rooms').update({ shake_idx: nextShakeIdx }).eq('code', code);
    }
  }

  async function markViewed({ code, myId, nextIdx, totalPlayers }) {
    const c = client();
    await c.from('dice').update({ viewed: true }).eq('room_code', code).eq('player_id', myId);
    if (nextIdx >= totalPlayers) {
      await c.from('rooms').update({ phase: 'bid', shake_idx: 0, bidder_idx: 0 }).eq('code', code);
    } else {
      await c.from('rooms').update({ shake_idx: nextIdx }).eq('code', code);
    }
  }

  async function placeBid({ code, byId, byName, count, face, nextBidderIdx, prevOnesLocked }) {
    const onesLocked = prevOnesLocked || face === 1;
    await client().from('rooms').update({
      current_bid: { by: byName, by_id: byId, count, face, ones_locked: onesLocked },
      ones_locked: onesLocked,
      bidder_idx: nextBidderIdx,
    }).eq('code', code);
  }

  async function challengeBid({ code, challengerId, challengedId, challengerName, challengedName, bid, actualCount, loser, allDice }) {
    const c = client();
    // Update loser drinks
    const { data: loserP } = await c.from('players').select('drinks').eq('id', loser.id).maybeSingle();
    await c.from('players').update({ drinks: (loserP?.drinks || 0) + 1 }).eq('id', loser.id);
    // Record history
    await c.from('history').insert({
      room_code: code, round: bid._round || 1, bid,
      challenger: challengerName, challenged: challengedName,
      loser: loser.name, actual: actualCount,
    });
    // Set result
    await c.from('rooms').update({
      phase: 'result',
      result: {
        challenger_id: challengerId, challenger_name: challengerName,
        challenged_id: challengedId, challenged_name: challengedName,
        bid, actual: actualCount, loser_id: loser.id, loser_name: loser.name,
        all_dice: allDice,
      },
    }).eq('code', code);
  }

  async function goToContinueVote({ code }) {
    await client().from('rooms').update({ phase: 'continue', continue_votes: {} }).eq('code', code);
  }

  async function castContinueVote({ code, myId, vote }) {
    const c = client();
    const { data: room } = await c.from('rooms').select('continue_votes').eq('code', code).maybeSingle();
    const votes = { ...(room?.continue_votes || {}), [myId]: vote };
    await c.from('rooms').update({ continue_votes: votes }).eq('code', code);
  }

  async function applyContinueVotesAndNextRound({ code, nextRound }) {
    const c = client();
    const { data: room } = await c.from('rooms').select('*').eq('code', code).maybeSingle();
    const votes = room.continue_votes || {};
    // Remove players who voted no
    const quitters = Object.keys(votes).filter(id => votes[id] === false);
    if (quitters.length) await c.from('players').delete().in('id', quitters);
    // Ensure host exists
    const { data: remaining } = await c.from('players').select('*').eq('room_code', code).order('order_idx');
    if (!remaining.length) { await c.from('rooms').delete().eq('code', code); return false; }
    if (remaining.length < 2) return false;
    if (!remaining.find(p => p.is_host)) {
      const newHost = remaining[Math.floor(Math.random() * remaining.length)];
      await c.from('players').update({ is_host: true }).eq('id', newHost.id);
      await c.from('rooms').update({ host_id: newHost.id }).eq('code', code);
    }
    // Next round
    await startRound({ code, roundNum: nextRound });
    return true;
  }

  // Subscribe to all room-scoped changes, invoke onChange() on any change
  function subscribe({ code, onChange }) {
    const c = client();
    const channel = c
      .channel(`room:${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms',   filter: `code=eq.${code}`      }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${code}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dice',    filter: `room_code=eq.${code}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history', filter: `room_code=eq.${code}` }, onChange)
      .subscribe();
    return () => { c.removeChannel(channel); };
  }

  window.BD = {
    createRoom, joinRoom, leaveRoom, kickPlayer,
    heartbeat, pruneStale, amIHost,
    fetchRoomState, fetchDice,
    startRound, markShaken, markViewed,
    placeBid, challengeBid,
    goToContinueVote, castContinueVote, applyContinueVotesAndNextRound,
    subscribe,
    uuid, rollDice,
  };
})();
