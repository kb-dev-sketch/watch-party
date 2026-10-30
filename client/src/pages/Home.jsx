
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Link2, Plus, LockKeyhole } from "lucide-react";

import Navbar from "../components/Navbar";
import MovieCard from "../components/MovieCard";
import RoomCard from "../components/RoomCard";
import SectionTitle from "../components/SectionTitle";

import { movies, roomsSeed } from "../data/dummyData";

const Home = () => {
  const navigate = useNavigate();

  const [roomName, setRoomName] = useState("Movie Night 🍿");
  const [roomCode, setRoomCode] = useState("");
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);

  const createRoom = () => {
    if (!roomName.trim()) {
      alert("Please enter a room name");
      return;
    }

    // Temporary demo navigation.
    // We will connect the create-room API later.
    navigate("/room/MOVIE24");
  };

  const joinRoom = () => {
    if (!roomCode.trim()) {
      alert("Please enter a room code");
      return;
    }

    navigate(`/room/${roomCode.trim().toUpperCase()}`);
  };

  const thumbnails = movies.slice(0, 4);

  return (
    <main className="app-shell min-h-screen text-white p-3 md:p-5">
      <div className="max-w-[1600px] mx-auto">

        <div className="grid grid-cols-1 xl:grid-cols-[1.75fr_.95fr] gap-5">

          {/* LEFT SECTION */}
          <section className="panel rounded-xl overflow-hidden">

            <Navbar />

            {/* HERO SECTION */}
            <div className="hero-bg min-h-[370px] md:min-h-[390px] flex items-center px-6 md:px-10 py-12">

              <div className="max-w-[520px]">

                <p className="text-red-500 uppercase tracking-[.2em] text-[10px] font-bold mb-3">
                  Your people. Your videos.
                </p>

                <h1 className="text-[38px] md:text-[48px] font-extrabold leading-[1.08] tracking-tight">
                  Watch YouTube{" "}
                  <span className="text-red-500">Together</span>
                  <br />
                  in Real Time
                </h1>

                <p className="text-sm md:text-[15px] text-gray-300 mt-4 max-w-[430px] leading-6">
                  Create a room, invite friends, and enjoy YouTube
                  videos together with synchronized playback,
                  live chat and more.
                </p>

                <div className="flex flex-wrap gap-3 mt-6">

                  <button
                    onClick={createRoom}
                    className="red-btn rounded-lg px-5 py-3 text-sm font-bold flex items-center gap-2"
                  >
                    <Play size={16} fill="white" />
                    Create a Room
                  </button>

                  <button
                    onClick={() =>
                      document.getElementById("join-code")?.focus()
                    }
                    className="ghost-btn rounded-lg px-5 py-3 text-sm font-semibold flex items-center gap-2"
                  >
                    <Link2 size={16} />
                    Join with Code
                  </button>

                </div>
              </div>
            </div>

            {/* TRENDING VIDEOS */}
            <div className="px-5 md:px-8 pb-6">

              <SectionTitle action="See All">
                Trending on YouTube
              </SectionTitle>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-6 gap-4">

                {movies.map((movie) => (
                  <MovieCard
                    key={movie.title}
                    movie={movie}
                    onClick={() => navigate("/room/MOVIE24")}
                  />
                ))}

              </div>

              {/* POPULAR ROOMS */}
              <div className="mt-7">

                <SectionTitle action="See All">
                  Popular Rooms
                </SectionTitle>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">

                  {roomsSeed.map((room) => (
                    <RoomCard
                      key={room.code}
                      room={room}
                      onClick={() =>
                        navigate(`/room/${room.code}`)
                      }
                    />
                  ))}

                </div>
              </div>
            </div>
          </section>

          {/* RIGHT SECTION */}
          <aside className="auth-bg rounded-xl border border-white/10 min-h-[520px] flex items-center justify-center p-5">

            <div className="panel rounded-xl p-6 md:p-7 w-full max-w-[430px]">

              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">
                  Create a Room
                </h2>

                <p className="text-xs text-gray-400 mt-1">
                  Start watching together in seconds
                </p>
              </div>

              {/* ROOM NAME */}
              <label className="text-xs font-semibold text-gray-300">
                Room Name
              </label>

              <input
                className="input-dark mt-2 mb-5 text-sm"
                value={roomName}
                maxLength={50}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Movie Night 🍿"
              />

              {/* THUMBNAILS */}
              <label className="text-xs font-semibold text-gray-300">
                Choose a Thumbnail{" "}
                <span className="text-gray-500">(optional)</span>
              </label>

              <div className="grid grid-cols-5 gap-2 mt-3 mb-5">

                <button
                  onClick={() => setSelectedThumbnail(-1)}
                  className={`h-12 rounded-lg border flex items-center justify-center ${
                    selectedThumbnail === -1
                      ? "border-red-500 bg-red-500/10"
                      : "border-white/15 bg-white/5"
                  }`}
                >
                  <Plus size={19} />
                </button>

                {thumbnails.map((movie, index) => (
                  <button
                    key={movie.title}
                    onClick={() => setSelectedThumbnail(index)}
                    className={`poster h-12 border-2 ${
                      selectedThumbnail === index
                        ? "border-red-500"
                        : "border-transparent"
                    }`}
                  >
                    <img src={movie.image} alt={movie.title} />
                  </button>
                ))}

              </div>

              <button
                onClick={createRoom}
                className="red-btn w-full rounded-lg py-3 text-sm font-bold"
              >
                Create Room
              </button>

              {/* DIVIDER */}
              <div className="flex items-center gap-3 my-6">
                <span className="h-px bg-white/10 flex-1" />
                <span className="text-[10px] text-gray-500">OR</span>
                <span className="h-px bg-white/10 flex-1" />
              </div>

              {/* JOIN ROOM */}
              <h3 className="font-bold text-lg mb-3">
                Join a Room
              </h3>

              <div className="flex gap-2">

                <input
                  id="join-code"
                  value={roomCode}
                  onChange={(e) =>
                    setRoomCode(e.target.value.toUpperCase())
                  }
                  className="input-dark min-w-0 text-sm"
                  placeholder="Enter Room Code"
                />

                <button
                  onClick={joinRoom}
                  className="red-btn rounded-lg px-5 text-sm font-bold"
                >
                  Join
                </button>

              </div>

              <p className="text-[10px] text-gray-500 mt-3 flex items-center gap-1">
                <LockKeyhole size={11} />
                Login is required to join a private watch party.
              </p>

            </div>
          </aside>
        </div>
      </div>

      <footer className="text-center text-[10px] text-gray-600 py-5">
        © 2026 WATCH PARTY · Watch together, wherever you are.
      </footer>
    </main>
  );
};

export default Home;
