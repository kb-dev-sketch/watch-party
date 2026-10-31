import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { api, getApiError } from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await api.post("/auth/forgot-password", { email });
      setNotice(response.data.message || "If an account exists for that email, a reset link has been sent.");
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  };

  return (
    <main className="auth-page">
      <Link to="/login" className="auth-back"><ArrowLeft size={16} /> Back to login</Link>
      <section className="auth-card">
        <Link to="/" className="brand auth-brand">WATCH PARTY</Link>
        <span className="eyebrow"><Mail size={14} /> ACCOUNT RECOVERY</span>
        <h1>Reset your password</h1>
        <p className="auth-intro">Enter your account email. If it’s registered, we’ll send you a secure reset link.</p>
        <form onSubmit={submit} className="form-stack">
          <label htmlFor="reset-email">Email address</label>
          <span className="field-icon"><Mail size={16} /><input id="reset-email" className="input-dark" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></span>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <button className="button button-primary button-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
        <p className="auth-switch">Remembered your password? <Link to="/login">Log in</Link></p>
      </section>
    </main>
  );
}
