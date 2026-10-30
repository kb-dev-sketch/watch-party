
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Clock3, Search } from "lucide-react";

import Navbar from "../components/Navbar";
import RoomCard from "../components/RoomCard";
import { roomsSeed } from "../data/dummyData";

const MyRooms = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Created by me");
  const [search, setSearch] = useState("");

  const filteredRooms = roomsSeed.filter((room) =>
    room.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-shell min-h-screen text-white">

      <Navbar />

      <main className="max-w-7xl mx-auto px-5 md:px-8 py-10">

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">

          <div>
            <p className="text-red-500 text-[10px] uppercase tracking-[.2em] font-bold">
              Your watch space
            </p>

            <h1 className="text-3xl font-extrabold mt-2">
              My Rooms
            </h1>

            <p className="text-sm text-gray-400 mt-2">
              Pick up where you left off or start a new watch party.
            </p>
          </div>

          <button
            onClick={() => navigate("/")}
            className="red-btn rounded-lg px-5 py-3 text-sm font-bold flex items-center gap-2"
          >
            <Plus size={17} />
            Create Room
          </button>

        </div>

        {/* SEARCH */}
        <div className="flex items-center gap-2 max-w-md mb-7">
          <Search size={18} className="text-gray-500" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your rooms..."
            className="input-dark text-sm"
          />
        </div>

        {/* TABS */}
        <div className="flex gap-6 border-b border-white/10 mb-7">

          {["Created by me", "Joined Rooms"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm transition ${
                activeTab === tab
                  ? "text-white border-b-2 border-red-500"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}

        </div>

        {/* ROOM CARDS */}
        {filteredRooms.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">

            {filteredRooms.map((room) => (
              <div key={room.code} className="space-y-3">

                <RoomCard
                  room={room}
                  onClick={() => navigate(`/room/${room.code}`)}
                />

                <div className="flex items-center justify-between px-1">

                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock3 size={12} />
                    Recently created
                  </span>

                  <button
                    onClick={() => navigate(`/room/${room.code}`)}
                    className="text-xs text-red-500 hover:text-red-400 font-semibold"
                  >
                    Enter Room
                  </button>

                </div>

              </div>
            ))}

          </div>
        ) : (
          <div className="panel rounded-xl py-16 text-center">
            <Users size={35} className="mx-auto text-gray-500" />

            <h3 className="font-bold mt-4">No rooms found</h3>

            <p className="text-sm text-gray-500 mt-2">
              Try another search or create a new room.
            </p>

            <button
              onClick={() => navigate("/")}
              className="red-btn rounded-lg px-5 py-2 mt-5 text-sm"
            >
              Create Room
            </button>
          </div>
        )}

      </main>
    </div>
  );
};

export default MyRooms;
