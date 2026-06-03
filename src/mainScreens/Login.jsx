import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/style.css";
import ptisLogo from "/ptisLogo.png";
import { API_ENDPOINTS } from "../config/api";

function Login() {
  const [loginType, setLoginType] = useState("user");
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "", // Can be email or employee ID
    password: "",
  });
  const navigate = useNavigate();

  const featureHighlights = [
    // { title: "Inspection Ops", detail: "07 live projects" },
    // { title: "Compliance", detail: "ISO 17020 aligned" },
    // { title: "Insights", detail: "Power BI heartbeat" },
  ];

  const signalCards = [
    // { label: "Security", value: "Multi-factor ready", accent: "ok" },
    // { label: "Sessions", value: "14 active staff", accent: "neutral" },
    // { label: "Alerts", value: "2 pending tickets", accent: "warn" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setShowError(false);
    setErrorMessage("");
    
    // ADMIN LOGIN
    if (loginType === "admin") {
      if (formData.password === "admin123") {
        setShowError(false);
        localStorage.setItem('userType', 'admin');
        localStorage.setItem('adminPassword', formData.password);
        setIsLoading(false);
        navigate("/dashboard");
        return;
      }
      setShowError(true);
      setErrorMessage("Invalid admin password");
      setIsLoading(false);
      return;
    }

    // USER LOGIN - Dynamic Backend Authentication
    try {
      // Try to login with employee_id (identifier could be email or employee_id)
      const response = await fetch(`${API_ENDPOINTS.EMPLOYEES}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: formData.identifier,
          password: formData.password
        })
      });

      if (response.ok) {
        const data = await response.json();
        const employee = data.employee;

        // Store user info
        localStorage.setItem('userType', 'user');
        localStorage.setItem('userEmail', employee.email);
        localStorage.setItem('userEmployeeId', employee.employee_id);
        localStorage.setItem('userFullName', employee.full_name);

        // Fetch user permissions by email
        const permissionsResponse = await fetch(
          `${API_ENDPOINTS.EMPLOYEES}/permissions/email/${employee.email}`
        );

        if (permissionsResponse.ok) {
          const permissions = await permissionsResponse.json();
          localStorage.setItem('userPermissions', JSON.stringify(permissions));
        } else {
          // Default permissions if fetch fails
          localStorage.setItem('userPermissions', JSON.stringify({
            lms: false,
            portal: false,
            cvs: false,
            reports: false,
            testing: false
          }));
        }

        setIsLoading(false);
        navigate("/user/dashboard");
      } else {
        const errorData = await response.json();
        setShowError(true);
        setErrorMessage(errorData.error || "Invalid credentials");
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setShowError(true);
      setErrorMessage("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setShowError(false);
  };

  return (
    <div className="login-backdrop">
      <div className="login-main-container">
        {/* Left Side - Branding */}
        <div className="login-right-container">
          <div className="orbit-ring" />
          <div className="glow-pulse" />
          <div className="branding-content">
            <div className="logo-wrapper">
              <img src={ptisLogo} alt="PTIS Logo" className="ptis-logo" />
            </div>
            <p className="eyebrow">PTIS Admin Network</p>
            <h1 className="branding-title">
              Premier Tubular Inspection Service
            </h1>
            <p className="branding-subtitle">
              Seamless oversight for inspection, compliance, and enterprise data.
            </p>

            <div className="highlight-grid">
              {featureHighlights.map((item) => (
                <div className="highlight-card" key={item.title}>
                  <span>{item.title}</span>
                  <strong>{item.detail}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-container">
          <div className="form-header">
            <div className="session-chip">Secure Session</div>
            <h2 className="form-title">Welcome back</h2>
            <p className="form-subtitle">
              Authenticate to enter the PTIS enterprise console.
            </p>
          </div>

          <div className="signal-grid">
            {signalCards.map((signal) => (
              <div
                key={signal.label}
                className={`signal-card ${signal.accent}`}
              >
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
              </div>
            ))}
          </div>

          {/* Login Type Selector */}
          <div className="login-type-selector">
            <div
              className={`type-option ${loginType === "user" ? "active" : ""}`}
              onClick={() => {
                setLoginType("user");
                setShowError(false);
                setErrorMessage("");
                setFormData({ identifier: "", password: "" });
              }}
            >
              <div className="type-label">User</div>
            </div>
            <div
              className={`type-option ${loginType === "admin" ? "active" : ""}`}
               onClick={() => {
                setLoginType("admin");
                setShowError(false);
                setErrorMessage("");
                setFormData({ identifier: "", password: "" });
              }}
            >
              <div className="type-label">Admin</div>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            {loginType === "user" && (
              <div className="form-group">
                <label className="form-label">Email or Employee ID</label>
                <input
                  type="text"
                  name="identifier"
                  className="form-input"
                  placeholder="Enter your email or employee ID"
                  value={formData.identifier}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {showError && (
              <p style={{ 
                color: "#ff5d5d", 
                fontSize: "13px", 
                marginTop: "10px",
                padding: "10px",
                background: "rgba(255, 93, 93, 0.1)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 93, 93, 0.3)"
              }}>
                {errorMessage}
              </p>
            )}

            <div className="forgot-link">
              <a>Need Help?</a>
            </div>

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? "Authenticating..." : `${loginType === "user" ? "User" : "Admin"} Login`}
            </button>

            <div className="compliance-note">
              PTIS security gateway · ISO 9001 + 17020 aligned
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
