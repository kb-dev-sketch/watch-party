
import { Users, Globe2 } from "lucide-react";

const RoomCard = ({ room, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="panel rounded-xl overflow-hidden text-left group hover:border-red-500/50 transition"
    >
      <div className="poster aspect-[16/8] rounded-none">
        <img src={room.image} alt={room.name} />

        <span className="absolute z-10 top-2 left-2 text-[9px] bg-black/70 px-2 py-1 rounded-full flex items-center gap-1">
          <i className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          {room.active ? "LIVE" : "ROOM"}
        </span>
      </div>

      <div className="p-3">
        <p className="text-xs font-bold truncate">{room.name}</p>

        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {room.count} participants
          </span>

          <span className="flex items-center gap-1">
            <Globe2 size={11} />
            {room.privacy}
          </span>
        </div>

        <p className="text-[10px] text-gray-500 mt-2">
          Hosted by {room.host}
        </p>
      </div>
    </button>
  );
};

export default RoomCard;
