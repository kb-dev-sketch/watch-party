import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import Navbar from "../components/Navbar";
import RoomCard from "../components/RoomCard";
import { useAuth } from "../context/AuthContext";
import { api, getApiError } from "../lib/api";

export default function MyRooms() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [tab, setTab] = useState("created");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/rooms/mine")
      .then(({ data }) => { if (active) setRooms(data.data || []); })
      .catch((requestError) => { if (active) setError(getApiError(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleRooms = useMemo(() => rooms.filter((room) => {
    const created = room.host?._id === user?._id || room.host === user?._id;
    const matchesTab = tab === "created" ? created : !created;
    return matchesTab && room.name.toLowerCase().includes(query.trim().toLowerCase());
  }), [rooms, user, tab, query]);

  return (
    <div className="app-shell"><div className="site-frame"><Navbar />
      <main className="page-content">
        <section className="page-heading-row"><div><span className="eyebrow">YOUR WATCH SPACE</span><h1>My rooms</h1><p>Every watch party you host or join, in one place.</p></div><button className="button button-primary" onClick={() => navigate("/")}><Plus size={17} /> Create a room</button></section>
        <div className="room-toolbar"><div className="tab-list" role="tablist"><button className={tab === "created" ? "tab active" : "tab"} onClick={() => setTab("created")}>Created by me</button><button className={tab === "joined" ? "tab active" : "tab"} onClick={() => setTab("joined")}>Joined rooms</button></div><label className="search-control"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your rooms" /></label></div>
        {error && <div className="inline-error" role="alert">{error}</div>}
        {loading ? <div className="loading-grid"><span /><span /><span /></div> : visibleRooms.length ? <div className="room-grid">{visibleRooms.map((room) => <RoomCard key={room._id} room={room} owned={room.host?._id === user?._id || room.host === user?._id} onClick={() => navigate(`/room/${room.roomCode}`)} />)}</div> : <div className="empty-panel empty-room"><Users size={24} /><h2>{query ? "No matching rooms" : tab === "created" ? "No rooms created yet" : "No joined rooms yet"}</h2><p>{query ? "Try another room name." : "Create a room or join one with an invite code to see it here."}</p><button className="button button-secondary" onClick={() => navigate("/")}>Go to home</button></div>}
      </main>
    </div></div>
  );
}
