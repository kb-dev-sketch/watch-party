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
  const [username, setUsername] = useState(location.state?.username || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [error, setError] = useState(location.state?.error || "");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    if (password !== confirmPassword) {
      setError("Passwords do not match"); setBusy(false); return;
    }
    try {
      await verifyEmail({ email, otp, username, password });
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
          <label htmlFor="verify-username">Choose your username</label>
          <input id="verify-username" className="input-dark" autoComplete="username" minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Choose a username" required />
          <label htmlFor="verify-password">Set your password</label>
          <input id="verify-password" className="input-dark" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required />
          <label htmlFor="verify-password-confirm">Confirm your password</label>
          <input id="verify-password-confirm" className="input-dark" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" required />
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <button className="button button-primary button-full" disabled={busy || otp.length !== 6}>{busy ? "Verifying…" : "Verify email and create account"}</button>
        </form>
        <button className="text-button" type="button" onClick={resend} disabled={busy || !email.trim()}>Resend verification code</button>
        <p className="auth-switch">Already verified? <Link to="/login">Log in</Link></p>
      </section>
    </main>
  );
}
