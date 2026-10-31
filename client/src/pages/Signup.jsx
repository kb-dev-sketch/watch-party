import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getApiError } from "../lib/api";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    try { await register(form); navigate("/my-rooms", { replace: true }); }
    catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  };

  return (
    <main className="auth-page">
      <Link to="/" className="auth-back"><ArrowLeft size={16} /> Back home</Link>
      <section className="auth-card">
        <Link to="/" className="brand auth-brand">WATCH PARTY</Link>
        <span className="eyebrow">MAKE IT A MOVIE NIGHT</span>
        <h1>Create your account</h1>
        <p className="auth-intro">One account for all the rooms you’ll watch together.</p>
        <form onSubmit={submit} className="form-stack">
          <label htmlFor="username">Username</label>
          <span className="field-icon"><UserRound size={16} /><input id="username" name="username" className="input-dark" autoComplete="username" value={form.username} onChange={change} minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" placeholder="Choose a username" required /></span>
          <label htmlFor="email">Email address</label>
          <span className="field-icon"><Mail size={16} /><input id="email" name="email" className="input-dark" type="email" autoComplete="email" value={form.email} onChange={change} placeholder="you@example.com" required /></span>
          <label htmlFor="password">Password</label>
          <span className="field-icon"><LockKeyhole size={16} /><input id="password" name="password" className="input-dark" type="password" autoComplete="new-password" value={form.password} onChange={change} minLength={8} maxLength={72} placeholder="At least 8 characters" required /></span>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </section>
    </main>
  );
}
