import React from "react";

const industryOptions = [
  "Oil & Gas",
  "Energy",
  "Manufacturing",
  "Construction",
  "Marine",
  "Aviation",
  "Other",
];

const countryOptions = [
  "Pakistan",
  "Saudi Arabia",
  "UAE",
  "Qatar",
  "Kuwait",
  "Oman",
  "Other",
];

function AddClient() {
  return (
    <div className="lms-form-panel">
      <header>
        <div>
          <p className="eyebrow">Client Management</p>
          <h2>Add New Client</h2>
          <p className="panel-subtitle">
            Register a new client organization with complete details.
          </p>
        </div>
        <button type="button" className="ghost-btn">
          Save As Draft
        </button>
      </header>

      <form
        className="lms-form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          alert("Client added successfully (demo only).");
        }}
      >
        <div className="form-row">
          <div className="form-row">
            <label>
              <span>Client Name *</span>
              <input type="text" placeholder="e.g., ABC Corporation" required />
            </label>
          </div>

          <label>
            <span>Country *</span>
            <select required>
              <option value="">Select Country</option>
              {countryOptions.map((country, index) => (
                <option key={index} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            <span>Email Address *</span>
            <input type="email" placeholder="contact@client.com" required />
          </label>
          <label>
            <span>Phone Number *</span>
            <input type="tel" placeholder="+92 300 1234567" required />
          </label>
        </div>

        <label>
          <span>Company Address *</span>
          <textarea
            rows="3"
            placeholder="Enter complete address"
            required
          ></textarea>
        </label>

        <div className="form-row">
          <label>
            <span>City</span>
            <input type="text" placeholder="e.g., Karachi" />
          </label>
          <label>
            <span>Postal Code</span>
            <input type="text" placeholder="e.g., 75500" />
          </label>
        </div>

        <label>
          <span>Website</span>
          <input type="url" placeholder="https://www.client.com" />
        </label>

        <div className="form-row">
          <label>
            <span>Tax/Registration Number</span>
            <input type="text" placeholder="e.g., NTN-123456" />
          </label>
          <label>
            <span>Client Type</span>
            <select>
              <option value="">Select Type</option>
              <option value="corporate">Corporate</option>
              <option value="government">Government</option>
              <option value="private">Private</option>
              <option value="international">International</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked />
            <span>Active Client</span>
          </label>

          <label className="checkbox-label">
            <input type="checkbox" />
            <span>VIP Client</span>
          </label>
        </div>

        <label>
          <span>Notes / Comments</span>
          <textarea
            rows="4"
            placeholder="Add any additional information about the client..."
          ></textarea>
        </label>

        <div className="form-actions">
          <button type="button" className="ghost-btn">
            Cancel
          </button>
          <button type="submit" className="primary-btn">
            Add Client
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddClient;
