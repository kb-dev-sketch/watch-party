
const MovieCard = ({ movie, onClick }) => {
  return (
    <button onClick={onClick} className="text-left min-w-0 group">
      <div className="poster aspect-[16/9]">
        <img src={movie.image} alt={movie.title} />

        <span className="absolute z-10 bottom-2 right-2 text-[10px] bg-black/80 px-1.5 py-1 rounded">
          {movie.duration}
        </span>

        <span className="absolute z-10 bottom-2 left-2 text-[10px] font-bold uppercase tracking-wide">
          {movie.category}
        </span>
      </div>

      <p className="text-xs font-semibold mt-2 truncate group-hover:text-red-400">
        {movie.title}
      </p>

      <p className="text-[10px] text-gray-500 mt-1">
        YouTube · Watch together
      </p>
    </button>
  );
};

export default MovieCard;
