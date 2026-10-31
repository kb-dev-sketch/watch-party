import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { api, getApiError } from "../lib/api";

export default function ResetPassword() {
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setBusy(true);
    try {
      const response = await api.post("/auth/reset-password", { token, password });
      navigate("/login", { replace: true, state: { notice: response.data.message } });
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  };

  return (
    <main className="auth-page">
      <Link to="/login" className="auth-back"><ArrowLeft size={16} /> Back to login</Link>
      <section className="auth-card">
        <Link to="/" className="brand auth-brand">WATCH PARTY</Link>
        <span className="eyebrow"><LockKeyhole size={14} /> SECURE YOUR ACCOUNT</span>
        <h1>Choose a new password</h1>
        <p className="auth-intro">Your reset link is single-use and expires after one hour.</p>
        <form onSubmit={submit} className="form-stack">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" className="input-dark" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" className="input-dark" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" required />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</button>
        </form>
      </section>
    </main>
  );
}
