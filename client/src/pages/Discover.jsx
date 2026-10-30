
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Compass, TrendingUp } from "lucide-react";

import Navbar from "../components/Navbar";
import MovieCard from "../components/MovieCard";
import { movies, roomsSeed } from "../data/dummyData";

const Discover = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = [
    "All",
    "Movie Trailers",
    "Music Videos",
    "Documentaries",
    "Live Streams",
    "Anime",
    "Gaming",
  ];

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const matchesSearch =
        movie.title.toLowerCase().includes(query.toLowerCase()) ||
        movie.category.toLowerCase().includes(query.toLowerCase());

      const matchesCategory =
        category === "All" || movie.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [query, category]);

  return (
    <div className="app-shell min-h-screen text-white">

      <Navbar />

      <main className="max-w-7xl mx-auto px-5 md:px-8 py-10">

        {/* PAGE HEADER */}
        <div className="mb-8">

          <div className="flex items-center gap-2 text-red-500">
            <Compass size={17} />
            <span className="text-[10px] uppercase tracking-[.2em] font-bold">
              Find your next watch
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold mt-3">
            Discover
          </h1>

          <p className="text-sm text-gray-400 mt-2">
            Explore videos and invite your friends to watch together.
          </p>

        </div>

        {/* SEARCH */}
        <div className="flex items-center gap-3 max-w-xl mb-7">

          <Search className="text-gray-500" />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos or categories..."
            className="input-dark"
          />

        </div>

        {/* CATEGORY FILTERS */}
        <div className="flex gap-2 overflow-x-auto pb-5 small-scroll">

          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`rounded-full px-4 py-2 text-xs whitespace-nowrap border transition ${
                category === item
                  ? "bg-red-600 border-red-600 text-white"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}

        </div>

        {/* VIDEO GRID */}
        <section>

          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-red-500" />

            <h2 className="font-bold text-lg">
              Videos for your next Watch Party
            </h2>
          </div>

          {filteredMovies.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">

              {filteredMovies.map((movie) => (
                <MovieCard
                  key={movie.title}
                  movie={movie}
                  onClick={() => navigate("/room/MOVIE24")}
                />
              ))}

            </div>
          ) : (
            <div className="panel rounded-xl p-12 text-center">
              <p className="text-gray-400">
                No videos found. Try another search.
              </p>
            </div>
          )}

        </section>

        {/* POPULAR ROOMS */}
        <section className="mt-12">

          <h2 className="text-lg font-bold mb-5">
            Popular Watch Parties
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">

            {roomsSeed.map((room) => (
              <button
                key={room.code}
                onClick={() => navigate(`/room/${room.code}`)}
                className="panel rounded-xl p-3 text-left hover:border-red-500/50 transition"
              >
                <img
                  src={room.image}
                  alt={room.name}
                  className="w-full aspect-video object-cover rounded-lg"
                />

                <h3 className="text-sm font-bold mt-3">
                  {room.name}
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  {room.count} participants
                </p>
              </button>
            ))}

          </div>

        </section>

      </main>
    </div>
  );
};

export default Discover;
