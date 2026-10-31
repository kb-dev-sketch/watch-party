import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, getApiError } from "../lib/api";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await verifyEmail({ email, otp });
      navigate("/my-rooms", { replace: true });
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await api.post("/auth/resend-otp", { email });
      setNotice(response.data.message || "If your account needs verification, a code has been sent.");
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  };

  return (
    <main className="auth-page">
      <Link to="/signup" className="auth-back"><ArrowLeft size={16} /> Back to sign up</Link>
      <section className="auth-card">
        <Link to="/" className="brand auth-brand">WATCH PARTY</Link>
        <span className="eyebrow"><Mail size={14} /> EMAIL VERIFICATION</span>
        <h1>Check your inbox</h1>
        <p className="auth-intro">Enter the 6-digit code we sent to your email. It expires in 5 minutes.</p>
        <form onSubmit={submit} className="form-stack">
          <label htmlFor="verify-email">Email address</label>
          <input id="verify-email" className="input-dark" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="otp">Verification code</label>
          <input id="otp" className="input-dark otp-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required />
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <button className="button button-primary button-full" disabled={busy || otp.length !== 6}>{busy ? "Verifying…" : "Verify email"}</button>
        </form>
        <button className="text-button" type="button" onClick={resend} disabled={busy || !email.trim()}>Resend verification code</button>
        <p className="auth-switch">Already verified? <Link to="/login">Log in</Link></p>
      </section>
    </main>
  );
}
