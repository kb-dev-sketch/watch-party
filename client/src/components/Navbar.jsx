import { LogOut } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Watch Party home">WATCH PARTY</Link>
      <nav className="primary-nav" aria-label="Main navigation">
        {[
          ["Home", "/"],
          ["My Rooms", "/my-rooms"],
          ["Join a room", "/discover"],
        ].map(([label, path]) => (
          <NavLink key={path} end={path === "/"} to={path} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="nav-actions">
        {user ? (
          <>
            <span className="user-chip" title={user.email}>{user.username}</span>
            <button className="icon-button" onClick={async () => { await logout(); navigate("/"); }} aria-label="Log out" title="Log out">
              <LogOut size={17} />
            </button>
          </>
        ) : (
          <>
            <Link className="nav-auth-link" to="/login">Log in</Link>
            <Link className="button button-primary button-small" to="/signup">Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}
