
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MyRooms from "./pages/MyRooms";
import Discover from "./pages/Discover";
import WatchRoom from "./pages/WatchRoom";
import RequireAuth from "./components/RequireAuth";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<RequireAuth />}>
        <Route path="/my-rooms" element={<MyRooms />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/room/:roomCode" element={<WatchRoom />} />
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}

export default App;
