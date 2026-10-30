
import { Search, Bell, Menu } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

const Navbar = () => {
  const links = [
    { name: "Home", path: "/" },
    { name: "My Rooms", path: "/my-rooms" },
    { name: "Discover", path: "/discover" },
  ];

  return (
    <nav className="relative flex items-center justify-between gap-4 px-5 md:px-8 py-4 border-b border-white/10 bg-black/60">
      <Link to="/" className="brand text-2xl whitespace-nowrap">
        WATCH PARTY
      </Link>

      <div className="hidden md:flex items-center gap-6">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            {link.name}
          </NavLink>
        ))}
      </div>

      <div className="hidden lg:flex items-center gap-2 rounded-full bg-[#111317] border border-white/10 px-4 py-2 w-[300px]">
        <Search size={16} className="text-gray-400" />
        <input
          placeholder="Search YouTube videos, channels, or rooms..."
          className="bg-transparent outline-none text-xs w-full text-white placeholder:text-gray-500"
        />
      </div>

      <div className="flex items-center gap-4">
        <button aria-label="Notifications" className="relative">
          <Bell size={19} />
          <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
        </button>

        <img
          src="https://i.pravatar.cc/100?img=11"
          alt="Profile"
          className="w-9 h-9 rounded-full border border-white/20"
        />

        <button className="md:hidden" aria-label="Menu">
          <Menu />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
