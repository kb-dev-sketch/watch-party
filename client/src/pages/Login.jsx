import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getApiError } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      await login({ email, password });
      navigate(location.state?.from?.pathname || "/my-rooms", { replace: true });
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  };

  return (
    <main className="auth-page">
      <Link to="/" className="auth-back"><ArrowLeft size={16} /> Back home</Link>
      <section className="auth-card">
        <Link to="/" className="brand auth-brand">WATCH PARTY</Link>
        <span className="eyebrow">YOUR WATCH SPACE AWAITS</span>
        <h1>Welcome back</h1>
        <p className="auth-intro">Log in to pick up where your friends are watching.</p>
        <form onSubmit={submit} className="form-stack">
          <label htmlFor="email">Email address</label>
          <span className="field-icon"><Mail size={16} /><input id="email" className="input-dark" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></span>
          <label htmlFor="password">Password</label>
          <span className="field-icon"><LockKeyhole size={16} /><input id="password" className="input-dark" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required /></span>
          <div className="forgot-password-link"><Link to="/forgot-password">Forgot password?</Link></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
        </form>
        {location.state?.notice && <p className="form-notice" role="status">{location.state.notice}</p>}
        {error.toLowerCase().includes("verify your email") && <p className="auth-switch"><Link to="/verify-email" state={{ email }}>Verify your email</Link> to continue.</p>}
        <p className="auth-switch">New to Watch Party? <Link to="/signup">Create an account</Link></p>
      </section>
    </main>
  );
}
