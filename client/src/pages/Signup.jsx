
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    // Demo only. Connect registration API later.
    navigate("/login");
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div className="panel rounded-2xl w-full max-w-[440px] p-7 md:p-9">

        <Link to="/" className="brand block text-center text-3xl mb-6">
          WATCH PARTY
        </Link>

        <h1 className="text-2xl font-bold text-center">
          Create Your Account
        </h1>

        <p className="text-xs text-gray-400 text-center mt-2 mb-6">
          Join your friends and start watching together
        </p>

        <form onSubmit={handleSubmit}>

          <label className="text-xs font-semibold">Username</label>

          <div className="relative mt-2 mb-4">
            <User
              size={17}
              className="absolute left-3 top-3.5 text-gray-500"
            />

            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              className="input-dark pl-10"
              required
            />
          </div>

          <label className="text-xs font-semibold">Email Address</label>

          <div className="relative mt-2 mb-4">
            <Mail
              size={17}
              className="absolute left-3 top-3.5 text-gray-500"
            />

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="input-dark pl-10"
              required
            />
          </div>

          <label className="text-xs font-semibold">Password</label>

          <div className="relative mt-2 mb-4">
            <Lock
              size={17}
              className="absolute left-3 top-3.5 text-gray-500"
            />

            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              className="input-dark pl-10 pr-11"
              minLength={6}
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-gray-500"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <label className="text-xs font-semibold">
            Confirm Password
          </label>

          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            className="input-dark mt-2 mb-6"
            required
          />

          <button
            type="submit"
            className="red-btn rounded-lg w-full py-3 text-sm font-bold"
          >
            Create Account
          </button>

        </form>

        <p className="text-center text-xs text-gray-400 mt-7">
          Already have an account?{" "}
          <Link to="/login" className="text-red-500 font-bold">
            Login
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Signup;
