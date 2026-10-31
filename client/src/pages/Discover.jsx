import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import Navbar from "../components/Navbar";
import { api, getApiError } from "../lib/api";

export default function Discover() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true); setNotice(""); setError("");
    try {
      const { data } = await api.get(`/rooms/${encodeURIComponent(code)}`);
      if (data.data.isParticipant) {
        navigate(`/room/${code}`);
        return;
      }
      if (data.data.joinRequestStatus === "pending") {
        setNotice("Your request is pending host approval.");
        return;
      }
      const request = await api.post(`/rooms/${encodeURIComponent(code)}/request`);
      setNotice(request.data.message || "Your request was sent to the host.");
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  };

  return (
    <div className="app-shell"><div className="site-frame"><Navbar />
      <main className="join-page">
        <section className="join-page-card">
          <span className="join-icon"><KeyRound size={22} /></span>
          <span className="eyebrow">INVITE ONLY</span>
          <h1>Join a private room</h1>
          <p>Enter the invite code from your host. They’ll approve your request before you can watch.</p>
          <form className="join-code-form" onSubmit={submit}>
            <label htmlFor="invite-code">Room code</label>
            <div><input id="invite-code" className="input-dark" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="Enter invite code" maxLength={8} required /><button className="button button-primary" disabled={busy}>{busy ? "Checking…" : <><span>Continue</span><ArrowRight size={16} /></>}</button></div>
          </form>
          {notice && <p className="form-notice" role="status">{notice}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="private-promise"><ShieldCheck size={16} /><span>Room names and activity stay private. Only invited members can request access.</span></div>
        </section>
      </main>
    </div></div>
  );
}
