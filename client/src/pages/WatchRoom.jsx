import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { ArrowLeft, Check, Copy, Crown, Link2, ListVideo, LogOut, MessageCircle, MoreHorizontal, Pause, Play, Send, ShieldCheck, SkipForward, Trash2, Users, X } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { api, getApiError } from "../lib/api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:5003";
const quickReactions = ["❤️", "😂", "🔥", "👏", "😍", "😮"];
let youtubeApiPromise;

function summarizeReactions(reactions = [], currentUserId) {
  const summary = new Map();
  for (const reaction of reactions) {
    const current = summary.get(reaction.emoji) || { emoji: reaction.emoji, count: 0, mine: false };
    current.count += 1;
    const reactionUserId = reaction.user?._id || reaction.user;
    current.mine ||= reactionUserId?.toString() === currentUserId;
    summary.set(reaction.emoji, current);
  }
  return summary;
}

function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT); };
    if (!document.querySelector("script[data-youtube-iframe-api]")) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.youtubeIframeApi = "true";
      document.head.appendChild(script);
    }
  });
  return youtubeApiPromise;
}

function YoutubePlayer({ videoId, playerRef, onState }) {
  const elementRef = useRef(null);
  const onStateRef = useRef(onState);
  useEffect(() => { onStateRef.current = onState; }, [onState]);

  useEffect(() => {
    let player;
    let active = true;
    loadYoutubeApi().then((YT) => {
      if (!active || !elementRef.current) return;
      player = new YT.Player(elementRef.current, {
        videoId,
        playerVars: { controls: 0, rel: 0, playsinline: 1, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: (event) => { playerRef.current = event.target; },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) onStateRef.current?.("playing", event.target.getCurrentTime());
            if (event.data === YT.PlayerState.PAUSED) onStateRef.current?.("paused", event.target.getCurrentTime());
          },
        },
      });
    });
    return () => {
      active = false;
      playerRef.current = null;
      player?.destroy();
    };
  }, [videoId, playerRef]);

  return <div className="video-frame"><div ref={elementRef} /></div>;
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function WatchRoom() {
  const { roomCode = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socketStatus, setSocketStatus] = useState("connecting");
  const [activeTab, setActiveTab] = useState("chat");
  const [messageText, setMessageText] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [queueInput, setQueueInput] = useState("");
  const [joinStatus, setJoinStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingJoins, setPendingJoins] = useState([]);
  const [controlRequests, setControlRequests] = useState([]);
  const [requestNotice, setRequestNotice] = useState("");
  const socketRef = useRef(null);
  const roomRef = useRef(null);
  const playerRef = useRef(null);
  const applyingRemoteRef = useRef(false);

  useEffect(() => { roomRef.current = room; }, [room]);

  const refreshRoom = useCallback(async () => {
    const response = await api.get(`/rooms/${encodeURIComponent(roomCode)}`);
    const nextRoom = response.data.data;
    setRoom(nextRoom);
    setJoinStatus(nextRoom.joinRequestStatus === "pending" ? "Your request is waiting for host approval." : "");
    return nextRoom;
  }, [roomCode]);

  const refreshMessages = useCallback(async () => {
    const response = await api.get(`/rooms/${encodeURIComponent(roomCode)}/messages`);
    setMessages(response.data.data.messages || []);
  }, [roomCode]);

  const joinSocketRoom = useCallback((socket) => {
    socket.emit("join-room", roomCode, async (response) => {
      if (!response?.success) {
        setError(response?.message || "Could not join this room.");
        return;
      }
      setError("");
      try { await refreshMessages(); } catch (requestError) { setError(getApiError(requestError)); }
      if (roomRef.current?.isHost) {
        socket.emit("get-pending-control-requests", roomCode, (result) => setControlRequests(result?.data || []));
        try {
          const { data } = await api.get(`/rooms/${encodeURIComponent(roomCode)}/requests`);
          setPendingJoins(data.data || []);
        } catch (requestError) { setError(getApiError(requestError)); }
      }
    });
  }, [refreshMessages, roomCode]);

  useEffect(() => {
    let active = true;
    setError("");
    refreshRoom().then((nextRoom) => {
      if (!active) return;
      if (!nextRoom.isParticipant) setJoinStatus(nextRoom.joinRequestStatus === "pending" ? "Your request is waiting for host approval." : "");
      if (nextRoom.isParticipant && socketRef.current?.connected) {
        joinSocketRoom(socketRef.current);
      }
    }).catch((requestError) => { if (active) setError(getApiError(requestError)); });
    return () => { active = false; };
  }, [joinSocketRoom, refreshRoom]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { withCredentials: true, transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      setSocketStatus("connected");
      const currentRoom = roomRef.current;
      if (currentRoom?.isParticipant) joinSocketRoom(socket);
    });
    socket.on("connect_error", () => setSocketStatus("disconnected"));
    socket.on("disconnect", () => setSocketStatus("disconnected"));
    socket.on("sync-state", (data) => {
      setRoom((current) => current ? { ...current, videoUrl: data.videoUrl || "", playbackState: data.playbackState, currentTime: data.currentTime } : current);
      applyPlayback(data.playbackState, data.currentTime);
    });
    socket.on("join-approved", async (data) => {
      if (data.roomCode?.toUpperCase() !== roomCode.toUpperCase()) return;
      setJoinStatus("Your request was approved. Joining…");
      try {
        const nextRoom = await refreshRoom();
        if (nextRoom.isParticipant && socket.connected) joinSocketRoom(socket);
      } catch (requestError) { setError(getApiError(requestError)); }
    });
    socket.on("new-message", (message) => setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]));
    socket.on("message-reaction-updated", ({ messageId, reactions }) => setMessages((current) => current.map((item) => item._id === messageId ? { ...item, reactions } : item)));
    socket.on("join-request-received", (request) => {
      if (request.roomCode?.toUpperCase() !== roomCode.toUpperCase()) return;
      setPendingJoins((current) => [
        { _id: request.requestId, user: request.user, requestedAt: request.requestedAt },
        ...current.filter((item) => item._id !== request.requestId),
      ]);
    });
    socket.on("join-request-updated", ({ roomCode: updatedCode, requestId }) => {
      if (updatedCode?.toUpperCase() === roomCode.toUpperCase()) {
        setPendingJoins((current) => current.filter((item) => item._id !== requestId));
      }
    });
    socket.on("host-transferred", async (event) => {
      if (event.roomCode?.toUpperCase() !== roomCode.toUpperCase()) return;
      try {
        const nextRoom = await refreshRoom();
        if (nextRoom.isHost) {
          socket.emit("get-pending-control-requests", roomCode, (result) => setControlRequests(result?.data || []));
          const { data } = await api.get(`/rooms/${encodeURIComponent(roomCode)}/requests`);
          setPendingJoins(data.data || []);
        } else {
          setControlRequests([]);
          setPendingJoins([]);
        }
      } catch (requestError) { setError(getApiError(requestError)); }
    });
    socket.on("user-joined", refreshRoom);
    socket.on("user-left", refreshRoom);
    socket.on("role-updated", refreshRoom);
    socket.on("participant-removed", ({ userId }) => {
      if (userId === user?._id) { setJoinStatus("You were removed from this room."); navigate("/my-rooms"); }
      else refreshRoom();
    });
    socket.on("removed-from-room", () => { setJoinStatus("You were removed from this room."); navigate("/my-rooms"); });
    socket.on("control-request-received", (request) => setControlRequests((current) => [request, ...current.filter((item) => item.requestId !== request.requestId)]));
    socket.on("control-request-updated", ({ requestId }) => setControlRequests((current) => current.filter((item) => item.requestId !== requestId)));
    socket.on("control-request-result", ({ message }) => setRequestNotice(message || "Your request was updated."));
    socket.on("video-played", ({ currentTime }) => applyPlayback("playing", currentTime));
    socket.on("video-paused", ({ currentTime }) => applyPlayback("paused", currentTime));
    socket.on("video-seeked", ({ currentTime, playbackState }) => applyPlayback(playbackState || roomRef.current?.playbackState, currentTime));
    socket.on("video-queue-updated", ({ roomCode: updatedCode, queue }) => {
      if (updatedCode?.toUpperCase() === roomCode.toUpperCase()) {
        setRoom((current) => current ? { ...current, videoQueue: queue || [] } : current);
      }
    });
    socket.on("video-changed", async ({ videoUrl, currentTime = 0 }) => {
      setRoom((current) => current ? { ...current, videoUrl, currentTime, playbackState: "paused" } : current);
      await refreshRoom();
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [joinSocketRoom, navigate, refreshRoom, roomCode, user?._id]);

  const videoId = useMemo(() => {
    const value = room?.videoUrl || "";
    return value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/)?.[1] || (/^[\w-]{11}$/.test(value) ? value : "");
  }, [room?.videoUrl]);
  const isModerator = room?.moderators?.some((item) => item._id === user?._id || item === user?._id) || false;
  const canControl = Boolean(room?.isHost || isModerator);

  function applyPlayback(state, time = 0) {
    const player = playerRef.current;
    if (!player || !Number.isFinite(Number(time))) return;
    applyingRemoteRef.current = true;
    try {
      player.seekTo(Math.max(0, Number(time)), true);
      if (state === "playing") player.playVideo();
      else if (state === "paused") player.pauseVideo();
    } catch { /* The player may still be initializing. */ }
    window.setTimeout(() => { applyingRemoteRef.current = false; }, 800);
  }

  const onPlayerState = useCallback((state, time) => {
    if (applyingRemoteRef.current || !canControl || !socketRef.current?.connected) return;
    socketRef.current.emit(state === "playing" ? "play-video" : "pause-video", { roomCode, currentTime: time });
  }, [canControl, roomCode]);

  const requestJoin = async () => {
    setBusy(true); setError("");
    try {
      const { data } = await api.post(`/rooms/${encodeURIComponent(roomCode)}/request`);
      setJoinStatus(data.message || "Your request is waiting for host approval.");
      setRoom((current) => current ? { ...current, joinRequestStatus: "pending" } : current);
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  };

  const sendChat = (event, text = messageText) => {
    event?.preventDefault();
    const value = text.trim();
    if (!value || !socketRef.current?.connected) return;
    socketRef.current.emit("send-message", { roomCode, text: value, videoTime: playerRef.current?.getCurrentTime?.() ?? null }, (result) => {
      if (result?.success) setMessageText("");
      else setError(result?.message || "Message could not be sent.");
    });
  };

  const reactToMessage = (messageId, emoji) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit("react-to-message", { roomCode, messageId, emoji }, (response) => {
      if (!response?.success) setError(response?.message || "Reaction could not be saved.");
      else setMessages((current) => current.map((item) => item._id === messageId ? { ...item, reactions: response.reactions || [] } : item));
    });
  };

  const addVideoToQueue = (event) => {
    event.preventDefault();
    if (!queueInput.trim() || !socketRef.current?.connected) return;
    socketRef.current.emit("add-video-to-queue", { roomCode, videoUrl: queueInput.trim() }, (response) => {
      if (!response?.success) setError(response?.message || "Video could not be added to the queue.");
      else { setRoom((current) => current ? { ...current, videoQueue: response.queue || [] } : current); setQueueInput(""); }
    });
  };

  const removeQueuedVideo = (queueItemId) => {
    socketRef.current?.emit("remove-video-from-queue", { roomCode, queueItemId }, (response) => {
      if (!response?.success) setError(response?.message || "Video could not be removed from the queue.");
      else setRoom((current) => current ? { ...current, videoQueue: response.queue || [] } : current);
    });
  };

  const playNextVideo = () => {
    socketRef.current?.emit("play-next-video", { roomCode }, (response) => {
      if (!response?.success) { setError(response?.message || "Could not play the next video."); return; }
      setRoom((current) => current ? { ...current, videoUrl: response.videoUrl, playbackState: "paused", currentTime: 0, videoQueue: response.queue || [] } : current);
    });
  };

  const control = (action, payload = {}) => {
    const socket = socketRef.current;
    if (!socket?.connected) return setError("Reconnecting to the room. Try again in a moment.");
    if (!canControl) {
      socket.emit("request-control", { roomCode, action, payload }, (response) => {
        setRequestNotice(response?.success ? "Control request sent to the host." : response?.message || "Could not request control.");
      });
      return;
    }
    if (action === "change-video") {
      socket.emit("change-video", { roomCode, videoUrl: payload.videoUrl }, (response) => {
        if (!response?.success) {
          setError(response?.message || "Video could not be changed.");
          return;
        }
        setRoom((current) => current ? { ...current, videoUrl: payload.videoUrl, playbackState: "paused", currentTime: 0 } : current);
      });
      return;
    }
    const time = payload.currentTime ?? playerRef.current?.getCurrentTime?.() ?? room?.currentTime ?? 0;
    const eventName = action === "play" ? "play-video" : action === "pause" ? "pause-video" : "seek-video";
    socket.emit(eventName, { roomCode, currentTime: time }, (response) => {
      if (!response?.success) setError(response?.message || "Playback control failed.");
      else if (action === "play" || action === "pause") applyPlayback(action === "play" ? "playing" : "paused", time);
      else applyPlayback(room?.playbackState, time);
    });
  };

  const changeVideo = (event) => {
    event.preventDefault();
    if (!videoInput.trim()) return;
    control("change-video", { videoUrl: videoInput.trim() });
    setVideoInput("");
  };

  const moderate = async (person, role) => {
    setError("");
    try {
      await api.patch(`/rooms/${encodeURIComponent(roomCode)}/participants/${person._id}/role`, { role });
      await refreshRoom();
    } catch (requestError) { setError(getApiError(requestError)); }
  };

  const removePerson = async (person) => {
    setError("");
    try { await api.delete(`/rooms/${encodeURIComponent(roomCode)}/participants/${person._id}`); await refreshRoom(); }
    catch (requestError) { setError(getApiError(requestError)); }
  };

  const transferHost = async (person) => {
    setError("");
    try { await api.patch(`/rooms/${encodeURIComponent(roomCode)}/transfer-host`, { newHostId: person._id }); await refreshRoom(); }
    catch (requestError) { setError(getApiError(requestError)); }
  };

  const reviewJoin = async (requestId, action) => {
    try {
      await api.patch(`/rooms/${encodeURIComponent(roomCode)}/requests/${requestId}`, { action });
      setPendingJoins((current) => current.filter((item) => item._id !== requestId));
      await refreshRoom();
    } catch (requestError) { setError(getApiError(requestError)); }
  };

  const reviewControl = (requestId, approve) => {
    socketRef.current?.emit(approve ? "approve-control" : "reject-control", { roomCode, requestId }, (response) => {
      if (!response?.success) setError(response?.message || "Could not review control request.");
      else setControlRequests((current) => current.filter((item) => item.requestId !== requestId));
    });
  };

  const leave = async () => {
    setBusy(true);
    try { await api.delete(`/rooms/${encodeURIComponent(roomCode)}/leave`); navigate("/my-rooms"); }
    catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  };

  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setJoinStatus("Invite link copied."); }
    catch { setJoinStatus(`Room code: ${roomCode}`); }
  };

  if (!room && error) return <div className="app-shell"><Navbar /><main className="page-content"><div className="inline-error">{error}</div><button className="button button-secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button></main></div>;
  if (!room) return <div className="page-loading">Loading room…</div>;

  if (!room.isParticipant) return (
    <div className="app-shell"><Navbar /><main className="join-gate"><div className="join-gate-card"><span className="eyebrow">PRIVATE ROOM · {room.roomCode}</span><h1>Request access</h1><p>The host must approve your request before you can join this watch party.</p>{joinStatus && <div className="form-notice" role="status">{joinStatus}</div>}{error && <div className="form-error" role="alert">{error}</div>}<div className="join-gate-actions"><button className="button button-primary" onClick={requestJoin} disabled={busy || room.joinRequestStatus === "pending"}>{room.joinRequestStatus === "pending" ? "Request pending" : busy ? "Sending…" : "Request to join"}</button><button className="button button-secondary" onClick={() => navigate("/discover")}>Back</button></div></div></main></div>
  );

  const people = room.participants || [];
  const hostId = room.host?._id || room.host;

  return (
    <div className="app-shell watch-shell">
      <header className="watch-topbar"><Link to="/" className="brand">WATCH PARTY</Link><div className="watch-room-title"><strong>{room.name}</strong><span>ROOM {room.roomCode}</span></div><div className="watch-actions"><span className={`connection-state ${socketStatus}`}><i />{socketStatus === "connected" ? "Connected" : "Reconnecting"}</span><button className="button button-secondary button-small" onClick={copyInvite}><Link2 size={15} /> Copy invite</button><button className="button button-danger button-small" onClick={leave} disabled={busy}><LogOut size={15} /> Leave</button></div></header>
      <main className="watch-layout">
        <section className="watch-main-column">
          <div className="watch-player-card">
            {videoId ? <YoutubePlayer key={videoId} videoId={videoId} playerRef={playerRef} onState={onPlayerState} /> : <div className="player-empty"><Play size={28} /><h2>Choose a video to watch</h2><p>Add a YouTube link to start the room.</p></div>}
            <div className="player-toolbar"><div><span className="eyebrow">NOW WATCHING</span><h1>{room.name}</h1></div><div className="playback-controls"><button className="icon-button" onClick={() => control(room.playbackState === "playing" ? "pause" : "play")} aria-label={room.playbackState === "playing" ? "Pause video" : "Play video"}>{room.playbackState === "playing" ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}</button><label className="seek-control"><span className="sr-only">Seek video</span><input type="range" min="0" max="100" defaultValue="0" onMouseUp={(event) => { const duration = playerRef.current?.getDuration?.() || 0; control("seek", { currentTime: (Number(event.currentTarget.value) / 100) * duration }); }} onTouchEnd={(event) => { const duration = playerRef.current?.getDuration?.() || 0; control("seek", { currentTime: (Number(event.currentTarget.value) / 100) * duration }); }} /></label></div></div>
            {canControl && <form className="video-add-form" onSubmit={changeVideo}><input className="input-dark" value={videoInput} onChange={(event) => setVideoInput(event.target.value)} placeholder="Add a YouTube video URL" aria-label="YouTube URL" /><button className="button button-secondary" disabled={!videoInput.trim()}>Change video</button></form>}
            {!canControl && <p className="control-hint">Playback is controlled by the host. Use the play button to request a change.</p>}
          </div>
          {error && <div className="inline-error" role="alert">{error}</div>}
          <section className="chat-card">
            <div className="chat-heading"><div><MessageCircle size={17} /><h2>Room chat</h2><span className="chat-count">{messages.length}</span></div><span className="live-label"><i /> LIVE</span></div>
            <div className="chat-messages" aria-live="polite">{messages.length ? messages.map((item) => { const reactions = summarizeReactions(item.reactions, user?._id); return <article className="chat-message" key={item._id}><div className="message-avatar">{(item.sender?.username || "?").slice(0, 1).toUpperCase()}</div><div className="message-content"><div className="message-meta"><strong>{item.sender?.username || "Member"}</strong><time>{formatTime(item.createdAt)}</time></div><p>{item.text}</p>{item.videoTime != null && <small>At {Math.floor(item.videoTime / 60)}:{String(Math.floor(item.videoTime % 60)).padStart(2, "0")}</small>}<div className="message-reactions">{[...quickReactions].map((emoji) => { const reaction = reactions.get(emoji); return <button className={reaction?.mine ? "active" : ""} key={emoji} type="button" onClick={() => reactToMessage(item._id, emoji)} aria-label={`React with ${emoji}`}>{emoji}{reaction?.count ? <small>{reaction.count}</small> : null}</button>; })}</div></div></article>; }) : <div className="chat-empty">No messages yet. Say hello to your room.</div>}</div>
            <form className="chat-compose" onSubmit={sendChat}><input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a message…" maxLength={1000} aria-label="Chat message" /><button type="submit" className="send-button" aria-label="Send message" disabled={!messageText.trim() || socketStatus !== "connected"}><Send size={17} /></button></form>
          </section>
        </section>

        <aside className="watch-sidebar">
          <section className="sidebar-card"><div className="sidebar-heading"><div><h2>People here</h2><span>{people.length} {people.length === 1 ? "participant" : "participants"}</span></div><Users size={17} /></div><div className="participant-list">{people.map((person) => { const id = person._id || person; const isHost = id === hostId; const isMod = room.moderators?.some((moderator) => (moderator._id || moderator) === id); return <div className="participant-row" key={id}><span className="participant-avatar">{(person.username || "?").slice(0, 1).toUpperCase()}</span><span className="participant-name">{person.username || "Member"}{id === user?._id && <small>you</small>}</span>{isHost ? <Crown size={15} className="role-host" title="Host" /> : isMod ? <ShieldCheck size={15} className="role-mod" title="Moderator" /> : null}{room.isHost && !isHost && <details className="participant-menu"><summary aria-label={`Manage ${person.username}`}><MoreHorizontal size={17} /></summary><div className="menu-popover"><button onClick={() => moderate(person, isMod ? "participant" : "moderator")}>{isMod ? "Remove moderator" : "Make moderator"}</button><button onClick={() => transferHost(person)}>Transfer host</button><button className="danger-text" onClick={() => removePerson(person)}>Remove from room</button></div></details>}</div>; })}</div></section>

          <section className="sidebar-card queue-card"><div className="sidebar-heading"><div><h2><ListVideo size={15} /> Video queue</h2><span>{room.videoQueue?.length || 0} queued</span></div>{canControl && room.videoQueue?.length > 0 && <button className="queue-next" onClick={playNextVideo}><SkipForward size={14} /> Play next</button>}</div><form className="queue-form" onSubmit={addVideoToQueue}><input value={queueInput} onChange={(event) => setQueueInput(event.target.value)} placeholder="YouTube video URL" aria-label="Video queue URL" /><button type="submit" disabled={!queueInput.trim() || socketStatus !== "connected"}>Add</button></form>{room.videoQueue?.length ? <ol className="queue-list">{room.videoQueue.map((item) => { const addedById = item.addedBy?._id || item.addedBy; const mayRemove = canControl || addedById === user?._id; return <li key={item._id}><span className="queue-index">{room.videoQueue.indexOf(item) + 1}</span><div><strong>{item.title || `YouTube video ${item.videoId}`}</strong><small>Added by {item.addedBy?.username || "a participant"}</small></div>{mayRemove && <button className="queue-remove" onClick={() => removeQueuedVideo(item._id)} aria-label="Remove queued video"><Trash2 size={14} /></button>}</li>; })}</ol> : <p className="sidebar-empty">Add a video for everyone to watch next.</p>}</section>

          {room.isHost && <section className="sidebar-card"><div className="sidebar-heading"><div><h2>Join requests</h2><span>{pendingJoins.length} waiting</span></div></div>{pendingJoins.length ? pendingJoins.map((item) => <div className="request-row" key={item._id}><span className="participant-avatar">{(item.user?.username || "?").slice(0, 1).toUpperCase()}</span><span>{item.user?.username || "Member"}</span><button aria-label="Approve" onClick={() => reviewJoin(item._id, "approve")}><Check size={15} /></button><button aria-label="Reject" onClick={() => reviewJoin(item._id, "reject")}><X size={15} /></button></div>) : <p className="sidebar-empty">No one is waiting to join.</p>}</section>}

          {room.isHost && <section className="sidebar-card"><div className="sidebar-heading"><div><h2>Playback requests</h2><span>{controlRequests.length} waiting</span></div></div>{controlRequests.length ? controlRequests.map((item) => <div className="control-request" key={item.requestId}><p><strong>{item.requester?.username || "A participant"}</strong> requested {item.action === "change-video" ? "a video change" : `to ${item.action}`}.</p><div><button className="button button-primary button-small" onClick={() => reviewControl(item.requestId, true)}>Approve</button><button className="button button-secondary button-small" onClick={() => reviewControl(item.requestId, false)}>Decline</button></div></div>) : <p className="sidebar-empty">No playback requests.</p>}</section>}

          <section className="sidebar-card room-info-card"><div className="sidebar-heading"><div><h2>Private room</h2><span>Invite code required</span></div></div><p>Share this code with friends. The host approves every request before they can join.</p><div className="invite-code"><code>{room.roomCode}</code><button onClick={copyInvite} aria-label="Copy room link"><Copy size={15} /></button></div>{joinStatus && <small className="form-notice">{joinStatus}</small>}</section>
        </aside>
      </main>
    </div>
  );
}
