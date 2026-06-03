import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';

const ManageUserAccess = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [permissions, setPermissions] = useState({
    lms: false,
    portal: false,
    cvs: false,
    reports: false,
    testing: false,
    // JLR (Job Log) department-level access
    jlr_operations: false,
    jlr_qhse: false,
    jlr_inventory: false,
    jlr_accounts: false,
    jlr_it: false,
    jlr_full: false,
  });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.EMPLOYEES);
      const data = await response.json();
      setEmployees(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setLoading(false);
    }
  };

  const handleAssignRoles = (employee) => {
    setSelectedEmployee(employee);
    
    // Load existing permissions from database
    setPermissions({
      lms: employee.lms_access === 1,
      portal: employee.portal_access === 1,
      cvs: employee.cvs_access === 1,
      reports: employee.reports_access === 1,
      testing: employee.testing_access === 1,
      jlr_operations: employee.jlr_operations_access === 1,
      jlr_qhse:       employee.jlr_qhse_access       === 1,
      jlr_inventory:  employee.jlr_inventory_access  === 1,
      jlr_accounts:   employee.jlr_accounts_access   === 1,
      jlr_it:         employee.jlr_it_access         === 1,
      jlr_full:       employee.jlr_full_access       === 1,
    });
    
    setShowModal(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedEmployee) return;
    
    try {
      const response = await fetch(`${API_ENDPOINTS.EMPLOYEES}/${selectedEmployee.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lms_access: permissions.lms,
          portal_access: permissions.portal,
          cvs_access: permissions.cvs,
          reports_access: permissions.reports,
          testing_access: permissions.testing,
          jlr_operations_access: permissions.jlr_operations,
          jlr_qhse_access:       permissions.jlr_qhse,
          jlr_inventory_access:  permissions.jlr_inventory,
          jlr_accounts_access:   permissions.jlr_accounts,
          jlr_it_access:         permissions.jlr_it,
          jlr_full_access:       permissions.jlr_full,
        })
      });
      
      if (response.ok) {
        alert(`Permissions updated for ${selectedEmployee.full_name}`);
        fetchEmployees(); // Refresh the list
        setShowModal(false);
        setSelectedEmployee(null);
      } else {
        alert('Failed to update permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Error updating permissions');
    }
  };

  const togglePermission = (module) => {
    setPermissions(prev => {
      const next = { ...prev, [module]: !prev[module] };
      // "Full Access" master switch — turning it ON enables every JLR department
      if (module === 'jlr_full' && next.jlr_full) {
        next.jlr_operations = true;
        next.jlr_qhse       = true;
        next.jlr_inventory  = true;
        next.jlr_accounts   = true;
        next.jlr_it         = true;
      }
      // Turning OFF any individual JLR department also drops the full-access flag
      if (module.startsWith('jlr_') && module !== 'jlr_full' && !next[module]) {
        next.jlr_full = false;
      }
      return next;
    });
  };

  if (loading) {
    return <div className="loading">Loading employees...</div>;
  }

  return (
    <div className="manage-access-container">
      <div className="access-header">
        <h2>Manage User Access & Permissions</h2>
        <p>Assign portal access rights to employees</p>
      </div>

      <div className="employees-table">
        <table>
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Status</th>
              <th>Assigned Modules</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const assignedModules = [];
              if (employee.lms_access === 1) assignedModules.push('LMS');
              if (employee.portal_access === 1) assignedModules.push('Portal');
              if (employee.cvs_access === 1) assignedModules.push('CVs');
              if (employee.reports_access === 1) assignedModules.push('Reports');
              if (employee.testing_access === 1) assignedModules.push('Testing');
              if (employee.jlr_full_access === 1) {
                assignedModules.push('JLR: Full');
              } else {
                if (employee.jlr_operations_access === 1) assignedModules.push('JLR: Operations');
                if (employee.jlr_qhse_access       === 1) assignedModules.push('JLR: QHSE');
                if (employee.jlr_inventory_access  === 1) assignedModules.push('JLR: Inventory');
                if (employee.jlr_accounts_access   === 1) assignedModules.push('JLR: Accounts');
                if (employee.jlr_it_access         === 1) assignedModules.push('JLR: IT');
              }
              
              return (
                <tr key={employee.id}>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-avatar">{employee.full_name.charAt(0)}</div>
                      {employee.full_name}
                    </div>
                  </td>
                  <td>{employee.email}</td>
                  <td>{employee.department_name || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${employee.status || 'active'}`}>
                      {employee.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    {assignedModules.length > 0 ? (
                      <div className="module-badges">
                        {assignedModules.map((module) => (
                          <span key={module} className="module-badge">{module}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="no-modules">No modules assigned</span>
                    )}
                  </td>
                  <td>
                    <button 
                      className="assign-btn"
                      onClick={() => handleAssignRoles(employee)}
                    >
                      Assign Roles
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Permission Modal */}
      {showModal && selectedEmployee && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Access Permissions</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="employee-info">
                <div className="employee-avatar large">{selectedEmployee.full_name.charAt(0)}</div>
                <div>
                  <h4>{selectedEmployee.full_name}</h4>
                  <p>{selectedEmployee.email}</p>
                </div>
              </div>

              <div className="permissions-section">
                <h4>Select Modules to Grant Access:</h4>
                
                <div className="permission-item">
                  <div className="permission-info">
                    <div className="permission-icon lms">🎓</div>
                    <div>
                      <strong>Learning Management System (LMS)</strong>
                      <p>Access to courses, training materials, and certificates</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={permissions.lms}
                      onChange={() => togglePermission('lms')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="permission-item">
                  <div className="permission-info">
                    <div className="permission-icon portal">🔐</div>
                    <div>
                      <strong>PTIS Portal</strong>
                      <p>Access to inspection records and client information</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={permissions.portal}
                      onChange={() => togglePermission('portal')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="permission-item">
                  <div className="permission-info">
                    <div className="permission-icon cvs">📄</div>
                    <div>
                      <strong>Job Log Description & Library</strong>
                      <p>Access to generate and manage CVs for bids and clients</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={permissions.cvs}
                      onChange={() => togglePermission('cvs')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="permission-item">
                  <div className="permission-info">
                    <div className="permission-icon reports">📊</div>
                    <div>
                      <strong>Reports & Analytics</strong>
                      <p>Access to generate and view detailed reports</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={permissions.reports}
                      onChange={() => togglePermission('reports')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="permission-item">
                  <div className="permission-info">
                    <div className="permission-icon" style={{ background: 'linear-gradient(135deg, #fde2e2 0%, #f8b4b4 100%)', border: '1px solid #f29a9a' }}>🧪</div>
                    <div>
                      <strong>Testing & Certification</strong>
                      <p>Access to take assigned standard tests and view certificates</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={permissions.testing}
                      onChange={() => togglePermission('testing')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* ── JLR Department-level access ────────────────── */}
              <div className="permissions-section" style={{ marginTop: 28 }}>
                <h4 style={{ display:'flex', alignItems:'center', gap:8 }}>
                  📋 Job Log (JLR) — Department Access
                </h4>
                <p style={{ fontSize: 13, color:'#666', margin:'4px 0 16px' }}>
                  User sirf inhi department ki fields edit kar sakega. "Full Access" sab unlock kar deta hai.
                </p>

                {/* Full access master toggle */}
                <div className="permission-item" style={{
                  background: permissions.jlr_full ? 'rgba(215,38,61,0.06)' : 'transparent',
                  borderRadius: 10, padding: 10,
                }}>
                  <div className="permission-info">
                    <div className="permission-icon" style={{ background:'#d7263d', color:'#fff' }}>👑</div>
                    <div>
                      <strong>JLR Full Access</strong>
                      <p>Admin-level — sab departments unlock kar deta hai</p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={permissions.jlr_full}
                      onChange={() => togglePermission('jlr_full')} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {[
                  { key:'jlr_operations', icon:'🏗️', label:'Operations',
                    desc:'Client, work order, inspector, location, dates, vehicle, man-power, status, remark' },
                  { key:'jlr_qhse', icon:'🛡️', label:'QHSE',
                    desc:'TRA, Equipment Checklist, V.Log, TBT, ISO, REPT, Submission Date' },
                  { key:'jlr_inventory', icon:'📦', label:'Inventory',
                    desc:'Stock Requisition, GIN, Consumption, Gate Pass' },
                  { key:'jlr_accounts', icon:'💰', label:'Accounts',
                    desc:'Expenses, Accounts sign-off' },
                  { key:'jlr_it', icon:'💻', label:'IT',
                    desc:'IT department sign-off' },
                ].map(item => (
                  <div className="permission-item" key={item.key}>
                    <div className="permission-info">
                      <div className="permission-icon" style={{ background:'#f4f4f7', fontSize:18 }}>
                        {item.icon}
                      </div>
                      <div>
                        <strong>{item.label}</strong>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox"
                        checked={permissions[item.key] || permissions.jlr_full}
                        disabled={permissions.jlr_full}
                        onChange={() => togglePermission(item.key)} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSavePermissions}>
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .manage-access-container {
          padding: 30px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
          border: 1px solid rgb(255 255 255 / 67%);
        }

        .access-header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid rgba(102, 126, 234, 0.15);
        }

        .access-header h2 {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
          font-size: 28px;
          font-weight: 700;
        }

        .access-header p {
          color: #666;
          font-size: 15px;
        }

        .employees-table {
          overflow-x: auto;
          background: radial-gradient(circle at 20% 20%, #2a2b36 0%, transparent 45%),    radial-gradient(circle at 80% 0%, rgba(255, 0, 0, 0.15) 0%, transparent 40%),    #0e0f14;
          border-radius: 12px;
          border: 1px solid;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #00000069;
          color: white;
          padding: 16px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        th:first-child {
          border-top-left-radius: 12px;
        }

        th:last-child {
          border-top-right-radius: 12px;
        }

        td {
          padding: 16px;
          border-bottom: 1px solid rgba(102, 126, 234, 0.08);
        }

        tbody tr {
          transition: background 0.2s ease;
        }

        tbody tr:hover {
          background: rgba(102, 126, 234, 0.03);
        }

        .employee-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .employee-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 15px;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .employee-avatar.large {
          width: 70px;
          height: 70px;
          font-size: 28px;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
        }

        .status-badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-badge.active {
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          color: #2e7d32;
          border: 1px solid #81c784;
        }

        .module-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .module-badge {
          padding: 6px 12px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          color: #667eea;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid rgba(102, 126, 234, 0.2);
        }

        .no-modules {
          color: #999;
          font-size: 13px;
          font-style: italic;
        }

        .assign-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .assign-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.5);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          max-width: 650px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 12px 48px rgba(102, 126, 234, 0.3);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          padding: 28px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 20px 20px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 24px;
          cursor: pointer;
          color: white;
          line-height: 1;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .modal-body {
          padding: 28px;
        }

        .employee-info {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 24px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
          border-radius: 16px;
          margin-bottom: 28px;
          border: 1px solid rgba(102, 126, 234, 0.15);
        }

        .employee-info h4 {
          margin: 0 0 6px 0;
          font-size: 18px;
          color: #333;
        }

        .employee-info p {
          margin: 0;
          color: #667eea;
          font-size: 14px;
          font-weight: 500;
        }

        .permissions-section h4 {
          margin-bottom: 20px;
          color: #333;
          font-size: 16px;
          font-weight: 600;
        }

        .permission-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border: 2px solid rgba(102, 126, 234, 0.15);
          border-radius: 14px;
          margin-bottom: 14px;
          transition: all 0.3s ease;
          background: white;
        }

        .permission-item:hover {
          border-color: #667eea;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
          transform: translateY(-2px);
        }

        .permission-info {
          display: flex;
          gap: 16px;
          flex: 1;
        }

        .permission-info strong {
          font-size: 15px;
          color: #333;
          margin-bottom: 4px;
          display: block;
        }

        .permission-info p {
          font-size: 13px;
          color: #666;
          margin: 0;
        }

        .permission-icon {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          flex-shrink: 0;
        }

        .permission-icon.lms {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border: 1px solid #90caf9;
        }

        .permission-icon.portal {
          background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
          border: 1px solid #ce93d8;
        }

        .permission-icon.cvs {
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
          border: 1px solid #ffcc80;
        }

        .permission-icon.reports {
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          border: 1px solid #a5d6a7;
        }

        .toggle-switch {
          position: relative;
          width: 60px;
          height: 34px;
          display: inline-block;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ddd;
          transition: 0.4s;
          border-radius: 34px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        input:checked + .toggle-slider {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }

        .modal-footer {
          padding: 24px 28px;
          background: rgba(102, 126, 234, 0.03);
          border-radius: 0 0 20px 20px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .cancel-btn, .save-btn {
          padding: 12px 28px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.3s ease;
          font-size: 14px;
        }

        .cancel-btn {
          background: rgba(0, 0, 0, 0.04);
          color: #666;
        }

        .cancel-btn:hover {
          background: rgba(0, 0, 0, 0.08);
        }

        .save-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .save-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        }

        .save-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .save-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
      `}</style>
    </div>
  );
};

export default ManageUserAccess;
