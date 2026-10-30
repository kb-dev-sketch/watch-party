
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  Users,
  Send,
  Copy,
  LogOut,
  Play,
  Pause,
  Settings,
  MoreVertical,
  Crown,
  ShieldCheck,
  Plus,
  PlaySquare,
  X,
} from "lucide-react";

import { movies } from "../data/dummyData";

const initialPeople = [
  {
    id: 1,
    name: "Aarav",
    role: "Host",
    avatar: "https://i.pravatar.cc/80?img=12",
  },
  {
    id: 2,
    name: "Priya",
    role: "Moderator",
    avatar: "https://i.pravatar.cc/80?img=47",
  },
  {
    id: 3,
    name: "Rohan",
    role: "Participant",
    avatar: "https://i.pravatar.cc/80?img=13",
  },
  {
    id: 4,
    name: "Sneha",
    role: "Participant",
    avatar: "https://i.pravatar.cc/80?img=44",
  },
  {
    id: 5,
    name: "Karan",
    role: "Participant",
    avatar: "https://i.pravatar.cc/80?img=11",
  },
  {
    id: 6,
    name: "Neha",
    role: "Participant",
    avatar: "https://i.pravatar.cc/80?img=49",
  },
];

const initialMessages = [
  {
    name: "Aarav",
    time: "9:12 PM",
    text: "This scene is epic! 🔥",
    avatar: initialPeople[0].avatar,
  },
  {
    name: "Priya",
    time: "9:12 PM",
    text: "Totally agree!",
    avatar: initialPeople[1].avatar,
  },
  {
    name: "Rohan",
    time: "9:13 PM",
    text: "Mind blowing visuals 😍",
    avatar: initialPeople[2].avatar,
  },
  {
    name: "Sneha",
    time: "9:14 PM",
    text: "Next we should watch the trailer",
    avatar: initialPeople[3].avatar,
  },
  {
    name: "Karan",
    time: "9:14 PM",
    text: "Yes! 👍",
    avatar: initialPeople[4].avatar,
  },
];

const reactions = ["❤️", "😂", "🔥", "🎉", "👏", "😍"];

const WatchRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [people, setPeople] = useState(initialPeople);
  const [messages, setMessages] = useState(initialMessages);

  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("Chat");

  const [playing, setPlaying] = useState(false);
  const [videoId, setVideoId] = useState("zSWdZVtXT7E");

  const [videoInput, setVideoInput] = useState("");
  const [showAddVideo, setShowAddVideo] = useState(false);

  const [isHost, setIsHost] = useState(true);

  const currentUser = {
    name: "Karan",
    avatar: "https://i.pravatar.cc/80?img=11",
  };

  // SEND CHAT MESSAGE
  const sendMessage = (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    const newMessage = {
      name: currentUser.name,
      time: "Now",
      text: message.trim(),
      avatar: currentUser.avatar,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
  };

  // SEND REACTION
  const sendReaction = (emoji) => {
    setMessages((prev) => [
      ...prev,
      {
        name: currentUser.name,
        time: "Now",
        text: emoji,
        avatar: currentUser.avatar,
      },
    ]);
  };

  // CHANGE VIDEO
  const addVideo = () => {
    const match = videoInput.trim().match(
      /(?:v=|youtu\.be\/|embed\/)([\w-]{11})/
    );

    const extractedId = match ? match[1] :
      /^[\w-]{11}$/.test(videoInput.trim()) ? videoInput.trim() : null;

    if (!extractedId) {
      alert("Please enter a valid YouTube URL or video ID");
      return;
    }

    setVideoId(extractedId);
    setVideoInput("");
    setShowAddVideo(false);
  };

  // MODERATOR MANAGEMENT
  const toggleModerator = (id) => {
    setPeople((prev) =>
      prev.map((person) =>
        person.id === id
          ? {
              ...person,
              role:
                person.role === "Moderator"
                  ? "Participant"
                  : "Moderator",
            }
          : person
      )
    );
  };

  // REMOVE PARTICIPANT
  const removeParticipant = (id) => {
    if (!window.confirm("Remove this participant?")) return;

    setPeople((prev) =>
      prev.filter((person) => person.id !== id)
    );
  };

  // TRANSFER HOST
  const transferHost = (id) => {
    const selectedPerson = people.find((p) => p.id === id);

    if (!selectedPerson) return;

    if (!window.confirm(`Transfer host to ${selectedPerson.name}?`)) {
      return;
    }

    setPeople((prev) =>
      prev.map((person) => {
        if (person.id === id) {
          return { ...person, role: "Host" };
        }

        if (person.role === "Host") {
          return { ...person, role: "Participant" };
        }

        return person;
      })
    );

    setIsHost(false);
  };

  // COPY INVITATION LINK
  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Room link copied!");
    } catch {
      alert("Unable to copy link");
    }
  };

  // LEAVE ROOM
  const leaveRoom = () => {
    if (window.confirm("Are you sure you want to leave this room?")) {
      navigate("/my-rooms");
    }
  };

  return (
    <div className="app-shell min-h-screen text-white">

      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-7 py-4 border-b border-white/10">

        <div className="flex items-center gap-5">

          <Link to="/" className="brand text-2xl">
            WATCH PARTY
          </Link>

          <span className="hidden sm:block text-sm font-semibold">
            Movie Night 🍿
          </span>

          <span className="text-[10px] text-gray-500 border border-white/10 px-2 py-1 rounded">
            ROOM {roomCode}
          </span>

        </div>

        <div className="flex gap-2">

          <button
            onClick={copyRoomLink}
            className="ghost-btn rounded-lg px-3 py-2 text-xs flex items-center gap-2"
          >
            <Copy size={14} />
            Copy Link
          </button>

          <button
            onClick={leaveRoom}
            className="rounded-lg bg-red-950 border border-red-800 text-red-400 px-3 py-2 text-xs flex items-center gap-2"
          >
            <LogOut size={14} />
            Leave Room
          </button>

        </div>

      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-[1600px] mx-auto p-3 md:p-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_310px] gap-4">

        {/* VIDEO AND CHAT */}
        <section className="panel rounded-xl p-3 md:p-4 min-w-0">

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-3">

            {/* VIDEO PLAYER */}
            <div className="min-w-0">

              <div className="video-frame">
                <iframe
                  key={videoId}
                  src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                  title="YouTube Watch Party video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* VIDEO DETAILS */}
              <div className="flex items-center justify-between gap-3 py-4">

                <div>
                  <p className="text-sm font-bold">
                    Now Watching
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    YouTube video · Shared watch party
                  </p>
                </div>

                <div className="flex gap-2">

                  <button
                    onClick={() => setPlaying(!playing)}
                    className="ghost-btn rounded-lg px-3 py-2 text-xs flex gap-2 items-center"
                  >
                    {playing ? <Pause size={14} /> : <Play size={14} />}

                    {playing ? "Pause" : "Play"}
                  </button>

                  <button className="ghost-btn rounded-lg px-3 py-2">
                    <Settings size={15} />
                  </button>

                </div>

              </div>

              {/* CHANGE VIDEO */}
              {isHost && (
                <div className="border-t border-white/10 pt-3">

                  {!showAddVideo ? (
                    <button
                      onClick={() => setShowAddVideo(true)}
                      className="ghost-btn rounded-lg px-4 py-2 text-xs flex items-center gap-2"
                    >
                      <Plus size={15} />
                      Add YouTube Video
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2">

                      <input
                        value={videoInput}
                        onChange={(e) => setVideoInput(e.target.value)}
                        placeholder="Paste YouTube URL or video ID"
                        className="input-dark flex-1 min-w-[200px] text-xs"
                      />

                      <button
                        onClick={addVideo}
                        className="red-btn rounded-lg px-4 text-xs font-bold"
                      >
                        Play Video
                      </button>

                      <button
                        onClick={() => setShowAddVideo(false)}
                        className="ghost-btn rounded-lg px-3"
                        aria-label="Cancel"
                      >
                        <X size={15} />
                      </button>

                    </div>
                  )}

                </div>
              )}

              <p className="text-[10px] text-gray-500 mt-3">
                Demo player: synchronized playback will be connected
                using the YouTube IFrame API and Socket.IO.
              </p>

            </div>

            {/* CHAT PANEL */}
            <div className="panel rounded-xl flex flex-col min-h-[420px] overflow-hidden">

              {/* CHAT TABS */}
              <div className="grid grid-cols-3 border-b border-white/10">

                {["Chat", "Participants", "Reactions"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 text-xs ${
                      activeTab === tab
                        ? "text-white border-b-2 border-red-500"
                        : "text-gray-500"
                    }`}
                  >
                    {tab}
                  </button>
                ))}

              </div>

              {/* CHAT CONTENT */}
              {activeTab === "Chat" && (
                <>
                  <div className="flex-1 p-3 space-y-4 overflow-y-auto small-scroll">

                    {messages.map((msg, index) => (
                      <div key={index} className="flex gap-2">

                        <img
                          src={msg.avatar}
                          className="w-7 h-7 rounded-full"
                          alt={msg.name}
                        />

                        <div className="min-w-0">

                          <p className="text-[10px]">
                            <b>{msg.name}</b>

                            <span className="text-gray-600 ml-2">
                              {msg.time}
                            </span>
                          </p>

                          <p className="text-xs text-gray-200 mt-1 break-words">
                            {msg.text}
                          </p>

                        </div>
                      </div>
                    ))}

                  </div>

                  <form
                    onSubmit={sendMessage}
                    className="p-2 border-t border-white/10 flex gap-2"
                  >

                    <input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="input-dark text-xs"
                    />

                    <button
                      type="submit"
                      className="red-btn rounded-lg px-3"
                      aria-label="Send message"
                    >
                      <Send size={15} />
                    </button>

                  </form>
                </>
              )}

              {/* PARTICIPANTS TAB */}
              {activeTab === "Participants" && (
                <div className="p-3 space-y-3 overflow-y-auto">

                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-2"
                    >

                      <img
                        src={person.avatar}
                        className="w-7 h-7 rounded-full"
                        alt={person.name}
                      />

                      <span className="text-xs flex-1">
                        {person.name}
                      </span>

                      <span className="text-[9px] text-gray-400">
                        {person.role}
                      </span>

                    </div>
                  ))}

                </div>
              )}

              {/* REACTIONS TAB */}
              {activeTab === "Reactions" && (
                <div className="grid grid-cols-3 gap-3 p-5">

                  {reactions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      className="panel rounded-xl py-4 text-2xl hover:border-red-500"
                    >
                      {emoji}
                    </button>
                  ))}

                </div>
              )}

            </div>

          </div>

          {/* QUICK REACTIONS */}
          <div className="mt-4 flex flex-wrap gap-2">

            {reactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="ghost-btn rounded-full w-10 h-10 text-lg"
              >
                {emoji}
              </button>
            ))}

          </div>

        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-3">

          {/* PARTICIPANTS */}
          <section className="panel rounded-xl p-4">

            <div className="flex justify-between items-center mb-4">

              <h3 className="font-bold text-sm">
                Participants ({people.length})
              </h3>

              <Users size={16} className="text-gray-500" />

            </div>

            <div className="space-y-3">

              {people.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center gap-2"
                >

                  <img
                    src={person.avatar}
                    className="w-7 h-7 rounded-full"
                    alt={person.name}
                  />

                  <span className="text-xs flex-1">
                    {person.name}
                  </span>

                  {person.role === "Host" ? (
                    <Crown size={14} className="text-amber-400" />
                  ) : person.role === "Moderator" ? (
                    <ShieldCheck size={14} className="text-emerald-400" />
                  ) : (
                    <span className="text-[9px] text-gray-500">
                      Participant
                    </span>
                  )}

                  {isHost && person.role !== "Host" && (
                    <div className="relative group">

                      <button className="text-gray-500">
                        <MoreVertical size={15} />
                      </button>

                      <div className="hidden group-hover:flex absolute right-0 top-4 z-20 panel rounded-lg p-2 w-40 flex-col gap-3">

                        <button
                          onClick={() => toggleModerator(person.id)}
                          className="text-left text-[10px] hover:text-red-400"
                        >
                          {person.role === "Moderator"
                            ? "Remove moderator"
                            : "Make moderator"}
                        </button>

                        <button
                          onClick={() => transferHost(person.id)}
                          className="text-left text-[10px] hover:text-amber-400"
                        >
                          Transfer host
                        </button>

                        <button
                          onClick={() => removeParticipant(person.id)}
                          className="text-left text-[10px] text-red-400"
                        >
                          Remove participant
                        </button>

                      </div>

                    </div>
                  )}

                </div>
              ))}

            </div>

          </section>

          {/* VIDEO QUEUE */}
          <section className="panel rounded-xl p-4">

            <div className="flex justify-between items-center mb-4">

              <h3 className="font-bold text-sm">
                Video Queue ({movies.length})
              </h3>

              <Youtube size={17} className="text-red-500" />

            </div>

            <div className="space-y-3">

              {movies.slice(0, 3).map((movie, index) => (
                <div
                  key={movie.title}
                  className="flex gap-2 items-center"
                >

                  <span className="text-[10px] text-gray-500">
                    {index + 1}
                  </span>

                  <img
                    src={movie.image}
                    className="w-16 h-10 object-cover rounded"
                    alt={movie.title}
                  />

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold truncate">
                      {movie.title}
                    </p>

                    <p className="text-[9px] text-gray-500">
                      {movie.duration}
                    </p>
                  </div>

                </div>
              ))}

            </div>

          </section>

          {/* ROOM DETAILS */}
          <section className="panel rounded-xl p-4">

            <h3 className="font-bold text-sm mb-2">
              Room Details
            </h3>

            <p className="text-[10px] text-gray-400">
              Share this code with friends to invite them.
            </p>

            <div className="flex gap-2 mt-3">

              <code className="bg-black rounded p-2 text-xs flex-1">
                {roomCode}
              </code>

              <button
                onClick={copyRoomLink}
                className="ghost-btn rounded px-3"
                aria-label="Copy room link"
              >
                <Copy size={14} />
              </button>

            </div>

          </section>

        </aside>

      </main>

    </div>
  );
};

export default WatchRoom;
