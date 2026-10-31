import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Link2, Play, Plus, ShieldCheck, Users } from "lucide-react";
import Navbar from "../components/Navbar";
import RoomCard from "../components/RoomCard";
import { useAuth } from "../context/AuthContext";
import { api, getApiError } from "../lib/api";

export default function Home() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get("/rooms/mine")
      .then(({ data }) => setRooms(data.data || []))
      .catch((requestError) => setError(getApiError(requestError)));
  }, [user]);

  const requireLogin = () => {
    if (ready && !user) {
      navigate("/login", { state: { from: { pathname: "/" } } });
      return false;
    }
    return Boolean(user);
  };

  const createRoom = async (event) => {
    event.preventDefault();
    if (!requireLogin()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { data } = await api.post("/rooms", { name: roomName, videoUrl });
      navigate(`/room/${data.data.roomCode}`);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async (event) => {
    event.preventDefault();
    if (!requireLogin()) return;
    const code = roomCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { data } = await api.get(`/rooms/${encodeURIComponent(code)}`);
      if (data.data.isParticipant) {
        navigate(`/room/${code}`);
        return;
      }
      const request = await api.post(`/rooms/${encodeURIComponent(code)}/request`);
      setNotice(request.data.message || "Your request was sent to the host.");
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="site-frame">
        <Navbar />
        <main>
          <section className="home-grid">
            <div className="hero-panel">
              <div className="hero-content">
                <span className="eyebrow"><span className="status-dot" /> YOUR PEOPLE. YOUR VIDEOS.</span>
                <h1>Watch YouTube<br /><span>together</span> in real time.</h1>
                <p>Create a room, invite friends, and watch in sync with live chat and shared playback controls.</p>
                <div className="hero-actions">
                  <button className="button button-primary" onClick={() => document.getElementById("room-name")?.focus()}><Play size={16} fill="currentColor" /> Create a room</button>
                  <button className="button button-secondary" onClick={() => document.getElementById("join-code")?.focus()}><Link2 size={16} /> Join with code</button>
                </div>
                <div className="hero-proof"><span><Users size={15} /> Private by approval</span><span><ShieldCheck size={15} /> Synchronized playback</span></div>
              </div>
              <div className="hero-light" aria-hidden="true" />
            </div>

            <aside className="create-panel">
              <div className="panel-heading"><span className="eyebrow">START A WATCH PARTY</span><h2>Create a room</h2><p>Set the scene. Invite everyone with one code.</p></div>
              <form onSubmit={createRoom} className="form-stack">
                <label htmlFor="room-name">Room name</label>
                <input id="room-name" className="input-dark" value={roomName} maxLength={50} onChange={(event) => setRoomName(event.target.value)} placeholder="Friday movie night" required />
                <label htmlFor="video-url">YouTube video <span className="label-optional">optional</span></label>
                <input id="video-url" className="input-dark" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="Paste a YouTube link" />
                <p className="privacy-note"><ShieldCheck size={14} /> Rooms are private. People need your invite code and host approval to join.</p>
                <button className="button button-primary button-full" disabled={busy || !ready}>{busy ? "Please wait…" : <><Plus size={17} /> Create room</>}</button>
              </form>
              <div className="join-divider"><span>OR JOIN AN EXISTING ROOM</span></div>
              <form className="join-form" onSubmit={joinRoom}>
                <input id="join-code" className="input-dark" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="Enter room code" maxLength={8} />
                <button className="button button-secondary" disabled={busy || !roomCode.trim()} aria-label="Join room"><ArrowRight size={17} /></button>
              </form>
              {notice && <p className="form-notice" role="status">{notice}</p>}
              {error && <p className="form-error" role="alert">{error}</p>}
            </aside>
          </section>

          <section className="content-section">
            <div className="section-heading"><div><span className="eyebrow">YOUR WATCH SPACE</span><h2>Recent rooms</h2></div><button className="text-action" onClick={() => navigate("/my-rooms")}>My rooms <ArrowRight size={15} /></button></div>
            {!user ? <div className="empty-panel"><p>Log in to see your rooms and join private watch parties.</p><button className="button button-secondary" onClick={() => navigate("/login")}>Log in</button></div> : error ? <div className="inline-error">{error}</div> : rooms.length ? <div className="room-grid">{rooms.slice(0, 6).map((room) => <RoomCard key={room._id} room={room} owned={room.host?._id === user._id || room.host === user._id} onClick={() => navigate(`/room/${room.roomCode}`)} />)}</div> : <div className="empty-panel"><p>Your rooms will appear here after you create one or join with an invite code.</p><button className="button button-secondary" onClick={() => document.getElementById("room-name")?.focus()}>Create a room</button></div>}
          </section>
        </main>
        <footer className="site-footer">WATCH PARTY <span>Watch together, wherever you are.</span></footer>
      </div>
    </div>
  );
}
