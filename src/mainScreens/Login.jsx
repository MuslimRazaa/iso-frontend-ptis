import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Phone, X, HelpCircle } from "lucide-react";
import "../assets/style.css";
import ptisLogo from "/ptisLogo.png";
import { API_ENDPOINTS } from "../config/api";
import { showToast } from "../components/Toast";

const SUPPORT_NUMBERS = ["+92 329 2201880", "+92 307 2912241"];

function Login() {
  const [loginType, setLoginType] = useState("user");
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
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
        // A previous employee login on this same browser (or an admin who
        // signed in as a specific person to test something) leaves their
        // identity in localStorage. Every audit log entry (JLR, ISO Forms,
        // etc.) reads that identity as "who did this" — left uncleared, it
        // silently attributes an admin's actions to whoever logged in last,
        // instead of "Admin".
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userEmployeeId');
        localStorage.removeItem('userFullName');
        localStorage.removeItem('userPermissions');
        localStorage.setItem('userType', 'admin');
        localStorage.setItem('adminPassword', formData.password);
        setIsLoading(false);
        showToast("Welcome back!", "success");
        navigate("/dashboard");
        return;
      }
      setShowError(true);
      setErrorMessage("Invalid admin password");
      setIsLoading(false);
      showToast("Invalid admin password", "error");
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
        showToast(`Welcome back, ${employee.full_name}!`, "success");
        navigate("/user/dashboard");
      } else {
        const errorData = await response.json();
        setShowError(true);
        setErrorMessage(errorData.error || "Invalid credentials");
        setIsLoading(false);
        showToast(errorData.error || "Invalid credentials", "error");
      }
    } catch (error) {
      console.error('Login error:', error);
      setShowError(true);
      setErrorMessage("Network error. Please try again.");
      setIsLoading(false);
      showToast("Network error. Please try again.", "error");
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
              <div style={{ position: "relative" }}>
                <style>{`
                  @keyframes fadeSwap {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                  }
                  .password-toggle-btn {
                    transition: color 0.2s ease, transform 0.2s ease, background 0.2s ease;
                  }
                  .password-toggle-btn:hover {
                    color: #ffffff;
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-50%) scale(1.12);
                  }
                  .password-toggle-btn:active {
                    transform: translateY(-50%) scale(0.92);
                  }
                  .password-toggle-icon {
                    display: flex;
                    animation: fadeSwap 0.25s ease;
                  }
                  .password-text-fade {
                    animation: fadeSwap 0.25s ease;
                  }
                `}</style>
                <input
                  key={showPassword ? "text" : "password"}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="form-input password-text-fade"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoFocus={formData.password.length > 0}
                  style={{ paddingRight: "45px", transition: "border-color 0.2s ease, box-shadow 0.2s ease" }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    borderRadius: "6px",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                    padding: "6px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span key={showPassword ? "on" : "off"} className="password-toggle-icon">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </button>
              </div>
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
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowHelpModal(true);
                }}
              >
                Need Help?
              </a>
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

      {showHelpModal && (
        <>
          <style>{`
            @keyframes helpBackdropIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes helpModalIn {
              from { opacity: 0; transform: translateY(12px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .help-modal-backdrop {
              animation: helpBackdropIn 0.2s ease;
            }
            .help-modal-card {
              animation: helpModalIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .help-modal-close {
              transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease;
            }
            .help-modal-close:hover {
              color: #ffffff;
              background: rgba(255, 255, 255, 0.12);
              transform: rotate(90deg);
            }
            .help-modal-number {
              transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
            }
            .help-modal-number:hover {
              border-color: rgba(255, 93, 93, 0.6);
              background: rgba(255, 93, 93, 0.08);
              transform: translateX(4px);
            }
          `}</style>
          <div
            className="help-modal-backdrop"
            onClick={() => setShowHelpModal(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(4, 5, 10, 0.72)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
              padding: 20,
            }}
          >
            <div
              className="help-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 380,
                background: "rgba(18, 20, 30, 0.98)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 18,
                padding: "26px 26px 22px",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 38, height: 38, borderRadius: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(255, 93, 93, 0.14)", color: "#ff8a8a", flexShrink: 0,
                    }}
                  >
                    <HelpCircle size={20} />
                  </span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#ffffff" }}>Need Help?</h3>
                </div>
                <button
                  type="button"
                  className="help-modal-close"
                  onClick={() => setShowHelpModal(false)}
                  aria-label="Close"
                  style={{
                    background: "none", border: "none", color: "rgba(255, 255, 255, 0.55)",
                    cursor: "pointer", padding: 6, borderRadius: 8, display: "flex",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.5 }}>
                Trouble logging in? Reach out to IT Support and we'll get you sorted.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SUPPORT_NUMBERS.map((number) => (
                  <a
                    key={number}
                    href={`tel:${number.replace(/\s+/g, "")}`}
                    className="help-modal-number"
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      background: "rgba(255, 255, 255, 0.04)",
                      textDecoration: "none",
                    }}
                  >
                    <span
                      style={{
                        width: 32, height: 32, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255, 93, 93, 0.16)", color: "#ff8a8a", flexShrink: 0,
                      }}
                    >
                      <Phone size={15} />
                    </span>
                    <span style={{ color: "#ffffff", fontSize: 14.5, fontWeight: 600 }}>{number}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Login;
