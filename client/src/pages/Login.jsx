
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      alert("Please fill in all fields");
      return;
    }

    // Demo only. Connect login API later.
    navigate("/");
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div className="panel rounded-2xl w-full max-w-[430px] p-7 md:p-9">

        <Link to="/" className="brand block text-center text-3xl mb-7">
          WATCH PARTY
        </Link>

        <h1 className="text-2xl font-bold text-center">
          Welcome Back
        </h1>

        <p className="text-xs text-gray-400 text-center mt-2 mb-7">
          Login to continue watching together
        </p>

        <form onSubmit={handleSubmit}>

          <label className="text-xs font-semibold">
            Email Address
          </label>

          <div className="relative mt-2 mb-5">
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

          <label className="text-xs font-semibold">
            Password
          </label>

          <div className="relative mt-2 mb-3">
            <Lock
              size={17}
              className="absolute left-3 top-3.5 text-gray-500"
            />

            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="input-dark pl-10 pr-11"
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

          <div className="text-right mb-6">
            <button
              type="button"
              className="text-xs text-red-500 hover:text-red-400"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="red-btn rounded-lg w-full py-3 text-sm font-bold"
          >
            Login
          </button>

        </form>

        <div className="flex items-center gap-3 my-6">
          <span className="h-px bg-white/10 flex-1" />
          <span className="text-[10px] text-gray-500">OR</span>
          <span className="h-px bg-white/10 flex-1" />
        </div>

        <button
          type="button"
          className="ghost-btn rounded-lg w-full py-3 text-sm"
        >
          Continue with Google
        </button>

        <p className="text-center text-xs text-gray-400 mt-7">
          Don't have an account?{" "}
          <Link to="/signup" className="text-red-500 font-bold">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Login;
