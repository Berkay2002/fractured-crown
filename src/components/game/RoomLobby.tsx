import { bgUrl, BACKGROUNDS } from '@/lib/backgroundImage';
import { Button } from '@/components/ui/button';
import { Crown, Copy, Link as LinkIcon, Users, Wifi, WifiOff, Lock, Check, Share2, QrCode, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import HowToPlayModal from './HowToPlayModal';
import SigilAvatar, { SIGILS, sigilImageUrl } from './SigilAvatar';
import { useLobbyPresence } from '@/hooks/useLobbyPresence';
import { LobbyPresenceCursor } from '@/components/lobby/LobbyPresenceCursor';
import RoyalDecrees, { type GameSettings, parseSettings } from './RoyalDecrees';
import LobbyChat from './LobbyChat';

interface Player {
  id: number;
  user_id: string;
  display_name: string;
  seat_order: number;
  joined_at: string;
  sigil?: string;
  is_ready?: boolean;
  is_spectator?: boolean;
}

interface Room {
  id: number;
  room_code: string;
  host_player_id: number | null;
  status: string;
  player_count: number;
  settings?: unknown;
}

interface RoomLobbyProps {
  room: Room;
  players: Player[];
  currentPlayerId: number | null;
  onlinePlayers: Set<number>;
}

const MAX_SLOTS = 10;

const RoomLobby = ({ room, players, currentPlayerId, onlinePlayers }: RoomLobbyProps) => {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [selectedSigil, setSelectedSigil] = useState<string | null>(null);
  const [transferringTo, setTransferringTo] = useState<number | null>(null);
  const [confirmingTransfer, setConfirmingTransfer] = useState<number | null>(null);
  const [showQR, setShowQR] = useState(false);
  const isHost = currentPlayerId && room.host_player_id === currentPlayerId;
  const gameSettings = parseSettings(room.settings);
  const showTransferUI = isHost && players.length > 1;

  const myPlayer = players.find(p => p.id === currentPlayerId);
  const mySigil = selectedSigil || myPlayer?.sigil || 'crown';
  const isSpectator = myPlayer?.is_spectator === true;

  // Ready system: non-spectator players
  const activePlayers = players.filter(p => !p.is_spectator);
  const allReady = activePlayers.length >= 5 && activePlayers.every(p => p.is_ready);
  const canStart = isHost && allReady && activePlayers.length >= 5 && activePlayers.length <= 10;

  const myPresencePayload = useMemo(
    () => myPlayer ? { id: myPlayer.id, username: myPlayer.display_name, sigil: mySigil } : null,
    [myPlayer?.id, myPlayer?.display_name, mySigil]
  );
  const { cursors, updateCursor } = useLobbyPresence(room.room_code, myPresencePayload);

  // Build set of sigils taken by OTHER players in this room
  const takenSigils = new Set(
    players
      .filter(p => p.id !== currentPlayerId)
      .map(p => p.sigil || 'crown')
  );

  const inviteUrl = `https://fractured-crown.lovable.app/join/${room.room_code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(room.room_code);
    toast({ title: 'Copied!', description: 'Room code copied to clipboard' });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast({ title: 'Copied!', description: 'Invite link copied to clipboard' });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Fractured Crown game',
          text: `Join the council! Room code: ${room.room_code}`,
          url: inviteUrl,
        });
      } catch { /* user cancelled */ }
    }
  };

  const handleStartGame = async () => {
    setStarting(true);
    const { data, error } = await supabase.functions.invoke('start-game', {
      body: { room_id: room.id },
    });
    setStarting(false);
    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message || 'Failed to start game', variant: 'destructive' });
    }
  };

  const handleTransferHost = async (targetPlayerId: number) => {
    setTransferringTo(targetPlayerId);
    const { data, error } = await supabase.functions.invoke('transfer-host', {
      body: { room_id: room.id, new_host_player_id: targetPlayerId },
    });
    setTransferringTo(null);
    setConfirmingTransfer(null);
    if (error || data?.error) {
      toast({ title: 'Transfer Failed', description: data?.error || error?.message || 'Could not transfer the crown', variant: 'destructive' });
    } else {
      toast({ title: 'Crown Transferred', description: 'The host role has been passed on.' });
    }
  };

  const handleSelectSigil = async (sigil: string) => {
    if (!currentPlayerId) return;
    if (takenSigils.has(sigil)) return;
    const previousSigil = selectedSigil;
    setSelectedSigil(sigil);
    const { error } = await supabase
      .from('players')
      .update({ sigil })
      .eq('id', currentPlayerId);
    if (error) {
      console.error('Failed to update sigil:', error);
      setSelectedSigil(previousSigil);
      toast({ title: 'Error', description: error.message.includes('unique_sigil_per_room')
        ? 'That sigil was just claimed by another player!'
        : 'Failed to update sigil', variant: 'destructive' });
    }
  };

  const handleToggleReady = async () => {
    if (!currentPlayerId || !myPlayer) return;
    const newReady = !myPlayer.is_ready;
    await supabase.from('players').update({ is_ready: newReady }).eq('id', currentPlayerId);
  };

  // ── Ghost slot for empty player positions ──
  const ghostSlot = (idx: number) => (
    <div
      key={`ghost-${idx}`}
      className="flex flex-col items-center justify-center w-full aspect-square rounded-lg border border-dashed border-primary/20 bg-card/40 opacity-40"
    >
      <div className="w-1/3 aspect-square rounded-full border border-dashed border-primary/30" />
      <span className="text-[10px] text-muted-foreground mt-2">Empty</span>
    </div>
  );

  // ── Shared sub-components rendered in both layouts ──

  const roomCodeCard = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="rounded-lg border border-primary/20 bg-card p-6 text-center"
    >
      <p className="mb-2 text-sm text-muted-foreground">Room Code</p>
      <div className="flex items-center justify-center gap-3">
        <span className="font-mono text-4xl lg:text-5xl tracking-[0.4em] text-primary">
          {room.room_code}
        </span>
        <button
          onClick={copyCode}
          className="rounded p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Copy code"
        >
          <Copy className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-3 flex flex-col items-center gap-2">
        <button
          onClick={copyLink}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <LinkIcon className="h-4 w-4" />
          Copy invite link
        </button>

        {/* QR Code toggle */}
        <button
          onClick={() => setShowQR(!showQR)}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <QrCode className="h-4 w-4" />
          {showQR ? 'Hide QR' : 'Show QR'}
        </button>

        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-lg border border-primary/20 bg-card p-3">
                <QRCodeSVG
                  value={inviteUrl}
                  size={120}
                  bgColor="#1c1612"
                  fgColor="#c9a84c"
                  level="M"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Native share (mobile only) */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            onClick={handleNativeShare}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary lg:hidden"
          >
            <Share2 className="h-4 w-4" />
            Share Invite
          </button>
        )}
      </div>
    </motion.div>
  );

  const howToPlay = (
    <div>
      <HowToPlayModal />
    </div>
  );

  const royalDecrees = (
    <RoyalDecrees
      roomId={room.id}
      settings={gameSettings}
      isHost={!!isHost}
    />
  );

  const footerLinks = (
    <footer className="flex gap-3 font-body text-xs text-muted-foreground">
      <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
      <span>·</span>
      <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
    </footer>
  );

  const playerCount = (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Users className="h-5 w-5" />
      <span className="font-body text-lg">
        {players.length} / 10 players
      </span>
    </div>
  );

  const waitingMessage = activePlayers.length < 5 ? (
    <p className="text-sm italic text-muted-foreground">
      Waiting for at least {5 - activePlayers.length} more player{5 - activePlayers.length !== 1 ? 's' : ''} to begin...
    </p>
  ) : null;

  const readyButton = currentPlayerId && !isSpectator ? (
    <Button
      onClick={handleToggleReady}
      size="sm"
      variant={myPlayer?.is_ready ? 'outline' : 'default'}
      className={`font-display tracking-wider ${
        myPlayer?.is_ready
          ? 'border-primary text-primary hover:bg-primary/10'
          : 'gold-shimmer text-primary-foreground'
      }`}
    >
      {myPlayer?.is_ready ? (
        <>
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Ready
        </>
      ) : (
        'Ready Up'
      )}
    </Button>
  ) : null;

  const sigilPicker = currentPlayerId && !isSpectator ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex w-full flex-col items-center"
    >
      <p className="mb-2 text-center font-display text-xs uppercase tracking-widest text-muted-foreground">
        Choose Your Sigil
      </p>
      <div className="inline-grid grid-cols-5 gap-1.5 md:grid md:w-full md:gap-2">
        {SIGILS.map(sigil => {
          const isSelected = mySigil === sigil;
          const isTaken = takenSigils.has(sigil);
          return (
            <button
              key={sigil}
              onClick={() => handleSelectSigil(sigil)}
              disabled={isTaken}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-2 md:p-1.5 md:aspect-square md:w-full transition-all flex-shrink-0 ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-[0_0_10px_hsl(var(--primary)/0.3)]'
                  : isTaken
                  ? 'border-border bg-card opacity-30 cursor-not-allowed'
                  : 'border-border bg-card hover:border-muted-foreground/40'
              }`}
              title={isTaken ? `${sigil} — taken` : sigil}
            >
              <div className="relative flex h-10 w-10 md:h-14 md:w-14 items-center justify-center overflow-hidden rounded-full">
                <img
                  src={sigilImageUrl(sigil)}
                  alt={sigil}
                  className="h-10 w-10 md:h-14 md:w-14 rounded-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                {isTaken && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <span className={`font-display text-[9px] md:text-[10px] uppercase tracking-wider ${
                isSelected ? 'text-primary' : 'text-muted-foreground/60'
              }`}>
                {sigil}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  ) : null;

  const playerGrid = (
    <div className="grid w-full grid-cols-3 gap-2">
      {players.map((player, idx) => {
        const isPlayerHost = room.host_player_id === player.id;
        const isOnline = onlinePlayers.has(player.id);
        const isConfirming = confirmingTransfer === player.id;
        const isTransferring = transferringTo === player.id;
        const canTransferTo = showTransferUI && !isPlayerHost && !transferringTo;
        const isMe = player.id === currentPlayerId;
        const playerSigil = isMe && selectedSigil ? selectedSigil : (player.sigil || 'crown');
        const playerIsSpectator = player.is_spectator === true;
        const playerIsReady = player.is_ready === true;

        return (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx }}
            className={`group relative flex min-w-0 w-full aspect-square overflow-hidden flex-col items-center justify-center gap-1 rounded-lg border bg-card p-2 ${
              playerIsReady && !playerIsSpectator
                ? 'border-primary/50 shadow-[0_0_8px_hsl(var(--primary)/0.2)]'
                : 'border-border'
            }`}
          >
            <div className="absolute right-1.5 top-1.5">
              {isOnline ? (
                <Wifi className="h-3 w-3 text-primary" />
              ) : (
                <WifiOff className="h-3 w-3 text-muted-foreground/50" />
              )}
            </div>

            <div className="flex h-5 items-center justify-center">
              <AnimatePresence mode="wait">
                {isPlayerHost && (
                  <motion.div
                    key={`crown-${player.id}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.4 }}
                  >
                    <motion.div
                      animate={{ filter: ['drop-shadow(0 0 3px hsl(var(--primary) / 0.4))', 'drop-shadow(0 0 8px hsl(var(--primary) / 0.7))', 'drop-shadow(0 0 3px hsl(var(--primary) / 0.4))'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Crown className="h-4 w-4 text-primary" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className={`flex h-12 w-12 lg:h-20 lg:w-20 items-center justify-center rounded-full border-2 overflow-hidden ${
              isPlayerHost ? 'border-primary bg-primary/10' : 'border-border bg-muted'
            }`}>
              <SigilAvatar sigil={playerSigil} displayName={player.display_name} size="h-12 w-12 lg:h-20 lg:w-20" />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-center font-body text-sm lg:text-base text-foreground truncate max-w-[80px] lg:max-w-[100px]">
                {player.display_name}
              </span>
            </div>

            {/* Ready / Spectator indicator */}
            {playerIsSpectator ? (
              <span className="flex items-center gap-1 rounded border border-muted-foreground/30 bg-muted/50 px-2 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                <Eye className="h-3 w-3" />
                Spectator
              </span>
            ) : playerIsReady ? (
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-primary">
                <Check className="h-3 w-3" />
                Ready
              </span>
            ) : null}

            {canTransferTo && !isConfirming && (
              <button
                onClick={() => setConfirmingTransfer(player.id)}
                className="absolute left-1.5 top-1.5 rounded p-1 text-primary/0 transition-all duration-200 hover:bg-primary/10 group-hover:text-primary/70 hover:!text-primary"
                title={`Transfer host to ${player.display_name}`}
              >
                <Crown className="h-3.5 w-3.5" />
              </button>
            )}

            <AnimatePresence>
              {isConfirming && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-2 w-full"
                >
                  <div className="rounded-md border border-primary/30 bg-muted/80 px-2 py-2.5 text-center">
                    <p className="mb-2 font-display text-[10px] leading-tight uppercase tracking-widest text-primary">
                      Transfer Crown?
                    </p>
                    <div className="flex justify-center gap-1.5">
                      <Button
                        size="sm"
                        disabled={isTransferring}
                        onClick={() => handleTransferHost(player.id)}
                        className="h-6 px-2 font-display text-[10px] tracking-wider text-primary-foreground"
                      >
                        {isTransferring ? '...' : 'Confirm'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isTransferring}
                        onClick={() => setConfirmingTransfer(null)}
                        className="h-6 px-2 font-display text-[10px] tracking-wider border-border text-muted-foreground"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
      {/* Ghost slots */}
      {Array.from({ length: Math.max(0, MAX_SLOTS - players.length) }).map((_, i) => ghostSlot(i))}
    </div>
  );

  const actionButtons = (
    <>
      {isHost && !isSpectator && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full"
        >
          <Button
            disabled={!canStart || starting}
            className="gold-shimmer h-14 w-full lg:w-full px-8 font-display text-lg tracking-wider text-primary-foreground disabled:opacity-40"
            size="lg"
            onClick={handleStartGame}
            title={!allReady && activePlayers.length >= 5 ? 'Waiting for all players to ready up' : undefined}
          >
            {starting ? 'Starting...' : 'Begin the Council'}
          </Button>
          {!allReady && activePlayers.length >= 5 && (
            <p className="mt-2 text-center text-xs italic text-muted-foreground">
              Waiting for all players to ready up
            </p>
          )}
        </motion.div>
      )}

      {!isHost && currentPlayerId && (
        <div className="flex flex-col items-center gap-3">
          <p className="italic text-muted-foreground font-body">
            Waiting for the host to begin...
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('players')
                  .delete()
                  .eq('room_id', room.id)
                  .eq('user_id', user.id);
              }
              navigate('/');
            }}
            className="border-border font-display text-xs tracking-wider text-muted-foreground hover:text-foreground"
          >
            Leave Room
          </Button>
        </div>
      )}

      {!currentPlayerId && (
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">You are not in this room.</p>
          <Button
            variant="outline"
            onClick={() => navigate(`/join/${room.room_code}`)}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            Join this room
          </Button>
        </div>
      )}
    </>
  );

  const cursorOverlays = !window.matchMedia('(hover: none)').matches
    ? Object.values(cursors).map((cursor) => (
        <LobbyPresenceCursor key={cursor.playerId} cursor={cursor} />
      ))
    : null;

  const lobbyChat = (
    <LobbyChat
      roomId={room.id}
      currentPlayerId={currentPlayerId}
      players={players}
    />
  );

  return (
    <div
      className="noise-overlay relative min-h-screen overflow-hidden"
      onMouseMove={(e) => {
        if (window.matchMedia('(hover: none)').matches) return;
        const rect = e.currentTarget.getBoundingClientRect();
        updateCursor(
          ((e.clientX - rect.left) / rect.width) * 100,
          ((e.clientY - rect.top) / rect.height) * 100
        );
      }}
    >
      {/* Full-screen background — must be first child */}
      <div className="fixed inset-0 w-screen h-screen overflow-hidden -z-10 pointer-events-none">
        <img src={bgUrl(BACKGROUNDS.lobby)} alt="" className="w-full h-full object-cover object-center" aria-hidden="true" />
        <div className="absolute inset-0 bg-[#0f0d0b]/75" />
      </div>
      {/* ── Mobile + Tablet layout (below lg) ── */}
      <div className="relative z-10 flex flex-col items-center px-4 py-8 md:max-w-2xl md:mx-auto lg:hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <Crown className="mx-auto mb-2 h-8 w-8 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-wider text-primary">
            The Council Gathers
          </h1>
          <div className="mt-3">{howToPlay}</div>
        </motion.div>

        <div className="mb-8 w-full max-w-md md:max-w-none">{roomCodeCard}</div>
        {royalDecrees}

        {/* Player count + grid in surface card on md */}
        <div className="mb-6 w-full max-w-lg md:max-w-none md:rounded-lg md:border md:border-primary/20 md:bg-card md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5" />
              <span className="font-body text-lg">
                {players.length} / 10 players
              </span>
            </div>
            {readyButton}
          </div>
          {waitingMessage && <div className="mb-4">{waitingMessage}</div>}
          {playerGrid}
        </div>

        {sigilPicker && <div className="mb-6 w-full max-w-2xl">{sigilPicker}</div>}
        <div className="mb-6 w-full max-w-lg md:max-w-none">{lobbyChat}</div>
        <div className="flex flex-col items-center md:w-full md:mt-6">{actionButtons}</div>
        <div className="mt-8 flex justify-center">{footerLinks}</div>
      </div>

      {/* ── Desktop layout (lg+) ── */}
      <div className="hidden lg:flex lg:flex-col relative z-10 mx-auto max-w-5xl h-screen px-4 py-10 overflow-hidden">
        {/* Full-width centered header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center flex-shrink-0"
        >
          <Crown className="mx-auto mb-2 h-8 w-8 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-wider text-primary">
            The Council Gathers
          </h1>
          <div className="mt-3">{howToPlay}</div>
        </motion.div>

        {/* Two-column grid with gold divider as middle column */}
        <div className="grid grid-cols-[5fr_1px_6fr] gap-0 flex-1 min-h-0">
          {/* Left column — static, no scrolling */}
          <div className="flex flex-col h-full overflow-hidden px-8">
            <div className="flex flex-col gap-6 flex-shrink-0">
              {roomCodeCard}
              {royalDecrees}
            </div>
            {/* Chat fills remaining space */}
            <div className="flex-1 min-h-0 mt-6 flex flex-col">
              <LobbyChat
                roomId={room.id}
                currentPlayerId={currentPlayerId}
                players={players}
                className="flex-1 min-h-0"
              />
            </div>
          </div>

          {/* Gold divider */}
          <div className="h-full self-stretch" style={{ background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.2) 20%, rgba(201,168,76,0.2) 80%, transparent)' }} />

          {/* Right column — scrollable content + sticky footer */}
          <div className="flex flex-col h-full overflow-hidden px-8">
            <div className="flex-1 min-h-0 overflow-y-auto lobby-right-scroll pr-2" style={{ scrollbarGutter: 'stable' }}>
              <div className="flex flex-col gap-6">
                {/* Player count + grid in a surface card */}
                <div className="rounded-lg border border-primary/20 bg-card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-5 w-5" />
                      <span className="font-body text-lg">
                        {players.length} / 10 players
                      </span>
                    </div>
                    {readyButton}
                  </div>
                  {waitingMessage && <div className="mb-4">{waitingMessage}</div>}
                  {playerGrid}
                </div>

                {sigilPicker && <div className="w-full">{sigilPicker}</div>}
              </div>
            </div>

            {/* Sticky footer — always visible */}
            <div className="flex-shrink-0 pt-4 pb-2 flex flex-col items-center w-full">
              {actionButtons}
            </div>
          </div>
        </div>

        {/* Full-width centered footer */}
        <div className="mt-4 flex justify-center flex-shrink-0">
          {footerLinks}
        </div>
      </div>

      {/* Cursor overlays */}
      {cursorOverlays}
    </div>
  );
};

export default RoomLobby;
