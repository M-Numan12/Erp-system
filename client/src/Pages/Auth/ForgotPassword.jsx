import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "../../Styles/ForgotPassword.scss";
import { KeyRound, Mail, User, Lock, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: request, 2: verify, 3: reset, 4: success
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    role: "Wholesale", // Default to Wholesale
    code: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/forgot-password", {
        email: formData.email,
        username: formData.username,
        role: formData.role
      });
      setSuccessMsg(response.data.msg || "Verification code sent to your email.");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to send code. Please verify details.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/verify-code", {
        email: formData.email,
        code: formData.code
      });
      setSuccessMsg(response.data.msg || "Code verified successfully.");
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.msg || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/reset-password", {
        email: formData.email,
        code: formData.code,
        password: formData.password
      });
      setSuccessMsg(response.data.msg || "Password reset successful.");
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-container">
      <div className="fp-box">
        {step === 1 && (
          <>
            <div className="fp-header">
              <div className="logo-icon">
                <KeyRound size={40} color="#2563eb" />
              </div>
              <h2>Forgot Password</h2>
              <p>Verify your account details to receive a reset code.</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleRequestCode} className="fp-form">
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Username / Name</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Role / Module</label>
                <div className="input-wrapper">
                  <ShieldCheck className="input-icon" size={18} />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="Wholesale">Wholesale</option>
                    <option value="Retail 1">Retail 1</option>
                    <option value="Retail 2">Retail 2</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="fp-btn" disabled={loading}>
                {loading ? "Sending..." : "Send Verification Code"}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="fp-header">
              <div className="logo-icon">
                <Mail size={40} color="#2563eb" />
              </div>
              <h2>Enter Code</h2>
              <p>We've sent a 6-digit verification code to <br /><strong>{formData.email}</strong></p>
            </div>

            {error && <div className="error-message">{error}</div>}
            {successMsg && <div className="success-message">{successMsg}</div>}

            <form onSubmit={handleVerifyCode} className="fp-form">
              <div className="form-group">
                <label>Verification Code</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                  style={{ textAlign: "center", letterSpacing: "4px", fontSize: "18px" }}
                />
              </div>

              <button type="submit" className="fp-btn" disabled={loading}>
                {loading ? "Verifying..." : "Verify Code"}
              </button>
            </form>

            <span className="back-step" onClick={() => setStep(1)}>
              <ArrowLeft size={14} style={{ marginRight: '4px' }} /> Back to details
            </span>
          </>
        )}

        {step === 3 && (
          <>
            <div className="fp-header">
              <div className="logo-icon">
                <Lock size={40} color="#2563eb" />
              </div>
              <h2>New Password</h2>
              <p>Set a secure new password for your account.</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleResetPassword} className="fp-form">
              <div className="form-group">
                <label>New Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="fp-btn" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </>
        )}

        {step === 4 && (
          <>
            <div className="fp-header" style={{ marginBottom: "0" }}>
              <div className="logo-icon success-icon">
                <CheckCircle2 size={48} color="#22c55e" />
              </div>
              <h2>Password Reset!</h2>
              <p style={{ marginBottom: "24px" }}>Your password has been successfully updated.</p>
              
              <button onClick={() => navigate("/")} className="fp-btn">
                Log In Now
              </button>
            </div>
          </>
        )}

        {step !== 4 && (
          <span className="back" onClick={() => navigate("/")}>
            Back to Login
          </span>
        )}
      </div>
    </div>
  );
}
