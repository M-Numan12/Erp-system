import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/ForgotPassword.scss";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleReset = () => {
    console.log("Reset link sent to:", email);
  };

  return (
    <div className="fp-container">
      <div className="fp-box">
        <h2>Forgot Password</h2>

        <input
          type="email"
          placeholder="Enter your email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <button onClick={handleReset}>Send Reset Link</button>

        {/* 👇 BACK BUTTON */}
        <span className="back" onClick={() => navigate("/")}>
          Back to Login
        </span>
      </div>
    </div>
  );
}
