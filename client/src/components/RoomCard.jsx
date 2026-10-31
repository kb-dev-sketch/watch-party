import { ArrowUpRight, LockKeyhole, Users } from "lucide-react";

export default function RoomCard({ room, onClick, owned = false }) {
  const participantCount = room.participantCount ?? room.participants?.length ?? 0;
  const hostName = room.host?.username || "Host";

  return (
    <button type="button" className="room-card" onClick={onClick}>
      <span className="room-art" aria-hidden="true"><span className="room-art-glow" /><span className="room-art-mark">{room.name?.trim()?.[0]?.toUpperCase() || "W"}</span></span>
      <span className="room-card-body">
        <span className="room-card-title-row">
          <span className="room-card-title">{room.name}</span>
          <LockKeyhole size={13} className="room-lock" aria-label="Private room" />
        </span>
        <span className="room-card-meta"><span><Users size={14} /> {participantCount} {participantCount === 1 ? "person" : "people"}</span><span>{owned ? "Created by you" : `Hosted by ${hostName}`}</span></span>
        <span className="room-card-footer"><span className="room-code">{room.roomCode}</span><ArrowUpRight size={16} /></span>
      </span>
    </button>
  );
}
