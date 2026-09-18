import React, { useState } from 'react'
import { showToast } from '../../components/Toast'

const departmentOptions = [
  'Operations',
  'Quality Assurance',
  'Learning & Development',
  'IT Department',
  'HR Department',
  'Finance',
  'Bid Desk',
]

const roleOptions = [
  'Super Admin',
  'Admin',
  'Manager',
  'Supervisor',
]

function AddAdmin() {
  const [showPassword, setShowPassword] = useState(false)

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev)
  }

  return (
    <div className="lms-form-panel">
      <header>
        <div>
          <p className="eyebrow">Administrative Access</p>
          <h2>Add New Admin</h2>
          <p className="panel-subtitle">Create administrative accounts with system access privileges.</p>
        </div>
        <button type="button" className="ghost-btn">
          Save As Draft
        </button>
      </header>

      <form
        className="lms-form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          showToast('Admin account created successfully (demo only).', 'success')
        }}
      >
        <div className="form-row">
          <label>
            <span>Admin ID *</span>
            <input type="text" placeholder="ADM-1001" required />
          </label>
          <label>
            <span>Full Name *</span>
            <input type="text" placeholder="e.g., John Doe" required />
          </label>
        </div>

        <div className="form-row">
          <label>
            <span>Email Address *</span>
            <input type="email" placeholder="admin@ptis.com" required />
          </label>
          <label>
            <span>Phone Number</span>
            <input type="tel" placeholder="+92 300 1234567" />
          </label>
        </div>

        <div className="form-row">
          <label>
            <span>Department *</span>
            <select required>
              <option value="">Select Department</option>
              {departmentOptions.map((dept, index) => (
                <option key={index} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Role *</span>
            <select required>
              <option value="">Select Role</option>
              {roleOptions.map((role, index) => (
                <option key={index} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span>Username *</span>
          <input type="text" placeholder="Create unique username" required />
        </label>

        <label>
          <span>Password *</span>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Create strong password"
              required
              style={{ paddingRight: '45px' }}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#8c8c94',
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#8c8c94', marginTop: '6px' }}>
            Minimum 8 characters with uppercase, lowercase, number and special character
          </p>
        </label>

        <label>
          <span>Access Level *</span>
          <select required>
            <option value="">Select Access Level</option>
            <option value="full">Full Access - All Modules</option>
            <option value="lms">LMS Only</option>
            <option value="portal">Portal Only</option>
            <option value="cv-gen">Job Log Description Only</option>
            <option value="iso">ISO Forms Only</option>
            <option value="custom">Custom Access</option>
          </select>
        </label>

        <div className="form-row">
          <label className="checkbox-label">
            <input type="checkbox" />
            <span>Allow Multi-Device Login</span>
          </label>

          <label className="checkbox-label">
            <input type="checkbox" defaultChecked />
            <span>Send Welcome Email</span>
          </label>
        </div>

        <label>
          <span>Additional Notes</span>
          <textarea
            rows="4"
            placeholder="Add any special instructions or access requirements..."
          ></textarea>
        </label>

        <div className="form-actions">
          <button type="button" className="ghost-btn">
            Cancel
          </button>
          <button type="submit" className="primary-btn">
            Create Admin Account
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddAdmin
