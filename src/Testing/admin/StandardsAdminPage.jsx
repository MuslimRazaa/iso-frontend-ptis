import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Trash2, BookOpen, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL as HOST_API_BASE_URL } from '../../config/api';
import PaginationBar from '../../components/PaginationBar';
import ClearFilterButton from '../../components/ClearFilterButton';
import { getActorId, getActorName } from '../../utils/actorIdentity';
import '../PTIS_App.css';

const StandardsAdminPage = ({ onBack, showToast, onSaved }) => {
  const API_BASE_URL = (HOST_API_BASE_URL || '').replace(/\/$/, '');
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [standards, setStandards] = useState([]);
  const [infos, setInfos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentStandard, setCurrentStandard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [standardsCurrentPage, setStandardsCurrentPage] = useState(1);
  const [templateFile, setTemplateFile] = useState(null);
  const [templateUploading, setTemplateUploading] = useState(false);
  const templateInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    Standard_List: '',
    Short_Name: '',
    Total_Questions: '',
    Passing_Criteria: '',
    Hours: '0',
    Minutes: '0',
    Seconds: '0',
    Negative_Marking: 'Yes',
    Certificate_Template: '',
    Practical_Required: 'No'
  });

  const isMobile = viewportWidth <= 768;
  const isTablet = viewportWidth <= 1024;
  const twoColumnGrid = isMobile ? '1fr' : '1fr 1fr';
  const TEMPLATE_MAX_BYTES = 25 * 1024 * 1024;
  const templateAllowedMimeTypes = new Set(['application/pdf']);
  const templateAllowedExtensions = new Set(['.pdf']);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Color scheme based on theme
  const colors = {
    pageBg: isDarkMode ? '#0f172a' : '#ecf0f1',
    cardBg: isDarkMode ? '#1e293b' : 'white',
    cardAltBg: isDarkMode ? '#0f172a' : '#f8f9fa',
    border: isDarkMode ? '#334155' : '#e9ecef',
    text: isDarkMode ? '#ffffff' : '#2c3e50',
    textMuted: isDarkMode ? '#d1d5db' : '#7f8c8d',
    inputBg: isDarkMode ? '#0f172a' : 'white',
    inputBorder: isDarkMode ? '#334155' : '#dee2e6',
    tableHeaderBg: '#0F172A',
    tableRowBg: '#2d3748',
    rowHover: isDarkMode ? '#3d4a5a' : '#f8f9fa',
    modalBg: isDarkMode ? '#1e293b' : 'white',
    modalOverlay: 'rgba(26, 26, 46, 0.85)'
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getTemplateBaseName = (fileName) => {
    const safeName = String(fileName || '').trim();
    if (!safeName) return '';
    const dotIndex = safeName.lastIndexOf('.');
    return dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
  };


  // Practical_Required is stored locally as a fallback since the backend
  // standards table may not have this column yet — keeps the flag working
  // purely on the frontend regardless of backend support.
  const PRACTICAL_REQUIRED_STORAGE_KEY = 'ptis_practical_required_standards';

  const getPracticalRequiredMap = () => {
    try {
      return JSON.parse(localStorage.getItem(PRACTICAL_REQUIRED_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const savePracticalRequiredFlag = (standardName, value) => {
    try {
      const map = getPracticalRequiredMap();
      map[standardName] = value;
      localStorage.setItem(PRACTICAL_REQUIRED_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore storage errors
    }
  };

  const fetchData = async () => {
    try {
      const [standardsRes, infosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/standards/legacy`),
        fetch(`${API_BASE_URL}/api/standards/legacy/info`)
      ]);

      if (!standardsRes.ok || !infosRes.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const standardsData = await standardsRes.json();
      const infosData = await infosRes.json();
      const practicalMap = getPracticalRequiredMap();

      // Ensure data is array
      const normalizedStandards = (Array.isArray(standardsData) ? standardsData : []).map(s => ({
        ...s,
        Practical_Required: s.Practical_Required || practicalMap[s.Standard_List] || 'No'
      }));
      setStandards(normalizedStandards);
      setInfos(Array.isArray(infosData) ? infosData : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (showToast) showToast('Failed to load standards data', 'error');
      setStandards([]);
      setInfos([]);
      setLoading(false);
    }
  };

  const getInfoForStandard = (standardName) => {
    if (!Array.isArray(infos)) return null;
    return infos.find(info => info.Standard_List === standardName) || null;
  };

  const handleAdd = () => {
    setEditMode(false);
    setCurrentStandard(null);
    setTemplateFile(null);
    if (templateInputRef.current) templateInputRef.current.value = '';
    setFormData({
      Standard_List: '',
      Short_Name: '',
      Total_Questions: '',
      Passing_Criteria: '',
      Hours: '0',
      Minutes: '0',
      Seconds: '0',
      Negative_Marking: 'Yes',
      Certificate_Template: '',
      Practical_Required: 'No'
    });
    setShowModal(true);
  };

  const handleEdit = (standard) => {
    setEditMode(true);
    setCurrentStandard(standard.Standard_List);
    setTemplateFile(null);
    if (templateInputRef.current) templateInputRef.current.value = '';
    const info = getInfoForStandard(standard.Standard_List);
    
    setFormData({
      Standard_List: standard.Standard_List,
      Short_Name: standard.Short_Name,
      Total_Questions: info?.Total_Questions || '',
      Passing_Criteria: info?.Passing_Criteria || '',
      Hours: info?.Hours || '0',
      Minutes: info?.Minutes || '0',
      Seconds: info?.Seconds || '0',
      Negative_Marking: standard.Negative_Marking || 'Yes',
      Certificate_Template: standard.Certificate_Template || '',
      Practical_Required: standard.Practical_Required || 'No'
    });
    setShowModal(true);
  };

  const handleDelete = async (standardName) => {
    if (!window.confirm(`Are you sure you want to delete "${standardName}"? This will also delete its configuration.`)) {
      return;
    }

    try {
      const actorId = getActorId();
      const actorName = getActorName();
      await fetch(`${API_BASE_URL}/api/standards/legacy/${encodeURIComponent(standardName)}?actorId=${encodeURIComponent(actorId)}&actorName=${encodeURIComponent(actorName)}`, {
        method: 'DELETE'
      });

      if (showToast) showToast('Standard deleted successfully!', 'success');
      fetchData();
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Error deleting standard:', error);
      if (showToast) showToast('Failed to delete standard', 'error');
    }
  };

  const resetTemplateFile = () => {
    setTemplateFile(null);
    if (templateInputRef.current) templateInputRef.current.value = '';
  };

  const handleTemplateFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      resetTemplateFile();
      return;
    }

    const ext = `.${String(file.name || '').split('.').pop()}`.toLowerCase();
    const extOk = templateAllowedExtensions.has(ext);
    const mimeOk = templateAllowedMimeTypes.has(file.type);

    if (!extOk && !mimeOk) {
      if (showToast) showToast('Only PDF templates are allowed.', 'error');
      resetTemplateFile();
      return;
    }

    if (file.size > TEMPLATE_MAX_BYTES) {
      if (showToast) showToast('Template must be 25MB or smaller.', 'error');
      resetTemplateFile();
      return;
    }

    setTemplateFile(file);
  };

  const uploadTemplateForStandard = async (standardName) => {
    if (!templateFile) return null;
    const safeStandard = String(standardName || '').trim();
    if (!safeStandard) {
      if (showToast) showToast('Standard name is required before uploading template', 'error');
      return null;
    }

    const formDataPayload = new FormData();
    formDataPayload.append('template', templateFile);
    formDataPayload.append('standard', safeStandard);
    const baseName = getTemplateBaseName(templateFile.name);
    if (baseName) {
      formDataPayload.append('template_name', baseName);
    }

    setTemplateUploading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/certificates/legacy/templates`, {
        method: 'POST',
        body: formDataPayload
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload template';
        try {
          const payload = await response.json();
          if (payload?.error) errorMessage = payload.error;
        } catch (_) {
          // Ignore JSON parsing errors.
        }
        if (showToast) showToast(errorMessage, 'error');
        return null;
      }

      const payload = await response.json();
      const templateName = payload?.template || baseName;
      if (templateName) {
        setFormData(prev => ({ ...prev, Certificate_Template: templateName }));
      }
      if (showToast) showToast('Template uploaded successfully!', 'success');
      resetTemplateFile();
      return templateName || null;
    } catch (error) {
      console.error('Template upload error:', error);
      if (showToast) showToast('Failed to upload template', 'error');
      return null;
    } finally {
      setTemplateUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const targetStandard = String(formData.Standard_List || '').trim();
      if (!targetStandard) {
        if (showToast) showToast('Standard name is required', 'error');
        return;
      }

      // Combined standard + info payload (host upserts a single standards row)
      const payload = {
        Standard_List: formData.Standard_List,
        Short_Name: formData.Short_Name,
        Negative_Marking: formData.Negative_Marking,
        Certificate_Template: formData.Certificate_Template,
        Total_Questions: parseInt(formData.Total_Questions),
        Passing_Criteria: formData.Passing_Criteria,
        Hours: parseInt(formData.Hours),
        Minutes: parseInt(formData.Minutes),
        Seconds: parseInt(formData.Seconds),
        Practical_Required: formData.Practical_Required,
        actorId: getActorId(),
        actorName: getActorName()
      };

      // Persist locally too — backend may not have a column for this yet,
      // so the flag must keep working purely on the frontend.
      savePracticalRequiredFlag(targetStandard, formData.Practical_Required);

      if (editMode) {
        await fetch(`${API_BASE_URL}/api/standards/legacy/${encodeURIComponent(currentStandard)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (templateFile) {
          await uploadTemplateForStandard(targetStandard);
        }
        if (showToast) showToast('Standard updated successfully!', 'success');
      } else {
        await fetch(`${API_BASE_URL}/api/standards/legacy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (templateFile) {
          await uploadTemplateForStandard(targetStandard);
        }
        if (showToast) showToast('Standard created successfully!', 'success');
      }

      setShowModal(false);
      resetTemplateFile();
      fetchData();
      // Notify the parent (Testing module) so dependent views — e.g. practical
      // eligibility that reads the Practical_Required flag — refresh immediately
      // without a manual page reload.
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Error saving standard:', error);
      if (showToast) showToast('Failed to save standard', 'error');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Filter standards by search query
  const filteredStandards = standards.filter(standard => 
    standard.Standard_List.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const standardsItemsPerPage = 100;
  const totalStandardPages = Math.ceil(filteredStandards.length / standardsItemsPerPage);
  const paginatedStandards = filteredStandards.slice(
    (standardsCurrentPage - 1) * standardsItemsPerPage,
    standardsCurrentPage * standardsItemsPerPage
  );

  useEffect(() => {
    setStandardsCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (totalStandardPages > 0 && standardsCurrentPage > totalStandardPages) {
      setStandardsCurrentPage(totalStandardPages);
    }
  }, [standardsCurrentPage, totalStandardPages]);

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading standards...</div>;
  }

  return (
    <>
      {/* Hidden trigger button */}
      <button 
        id="standards-add-btn" 
        onClick={() => {
          setEditMode(false);
          setCurrentStandard(null);
          setFormData({
            Standard_List: '',
            Short_Name: '',
            Total_Questions: '',
            Passing_Criteria: '',
            Hours: '0',
            Minutes: '0',
            Seconds: '0',
            Negative_Marking: 'Yes',
            Certificate_Template: ''
          });
          setShowModal(true);
        }} 
        style={{ display: 'none' }} 
      />
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: isMobile ? '0 6px' : 0 }}>
        {/* Search/Filter Card */}
        <article className="panel" style={{ marginBottom: '25px', padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            padding: '20px 28px',
            borderBottom: '1px solid #ececf0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#fff5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookOpen size={20} color="#d7263d" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p className="eyebrow" style={{ margin: 0 }}>Standards Management</p>
              <h3 style={{ margin: 0, marginTop: 4, fontSize: '1.1em', fontWeight: '600', textAlign: 'left' }}>View and manage all testing standards</h3>
            </div>
          </div>

          {/* Search Filter */}
          <div style={{ 
            padding: '20px 25px', 
            backgroundColor: colors.cardAltBg,
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: '1', minWidth: isMobile ? '100%' : '250px' }}>
              <input
                type="text"
                placeholder="Search by standard name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: '16px',
                  fontSize: '0.95em',
                  boxSizing: 'border-box',
                  outline: 'none',
                  backgroundColor: colors.inputBg,
                  color: colors.text
                }}
              />
            </div>
            <ClearFilterButton
              visible={Boolean(searchQuery)}
              onClick={() => {
                setSearchQuery('');
                setStandardsCurrentPage(1);
              }}
            />
          </div>
        </article>

        {/* Table Card */}
        <article className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ececf0' }}>
                  <th style={{ padding: '18px 20px', textAlign: 'center', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95' }}>S.No</th>
                  <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95' }}>Standard Name</th>
                  <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95' }}>Short Name</th>
                  <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95' }}>Total Questions</th>
                  <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95' }}>Passing Criteria</th>
                  <th style={{ padding: '18px 20px', textAlign: 'left', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95' }}>Time Limit</th>
                  <th style={{ padding: '18px 20px', textAlign: 'center', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95' }}>Negative Marking</th>
                  <th style={{ padding: '18px 20px', textAlign: 'center', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95' }}>Practical</th>
                  <th style={{ padding: '18px 20px', textAlign: 'center', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStandards.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '60px 20px', textAlign: 'center', color: colors.textMuted, fontSize: '1.1em' }}>
                      {searchQuery ? 'No matching standards found' : 'No standards found. Click "Add New Standard" to create one.'}
                    </td>
                  </tr>
                ) : (
                  paginatedStandards.map((standard, index) => {
                    const info = getInfoForStandard(standard.Standard_List);
                    const serialNo = (standardsCurrentPage - 1) * standardsItemsPerPage + index + 1;
                    return (
                      <tr
                        key={index}
                        style={{
                          borderBottom: `1px solid ${colors.border}`,
                          transition: 'background-color 0.2s ease',
                          backgroundColor: isDarkMode ? colors.tableRowBg : colors.cardBg
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = colors.rowHover}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = isDarkMode ? colors.tableRowBg : colors.cardBg}
                      >
                        <td style={{ padding: '16px 20px', color: colors.textMuted, textAlign: 'center' }}>{serialNo}</td>
                        <td style={{ padding: '16px 20px', color: colors.text, fontWeight: '500' }}>{standard.Standard_List}</td>
                        <td style={{ padding: '16px 20px', color: colors.text }}>{standard.Short_Name}</td>
                        <td style={{ padding: '16px 20px', color: colors.text }}>
                          <span style={{ 
                            backgroundColor: '#e8f5e9', 
                            color: '#27ae60', 
                            padding: '4px 12px', 
                            borderRadius: '28px',
                            fontSize: '0.9em',
                            fontWeight: '600'
                          }}>
                            {info ? info.Total_Questions : 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', color: colors.text, fontWeight: '500' }}>
                          {info ? info.Passing_Criteria : 'N/A'}
                        </td>
                        <td style={{ padding: '16px 20px', color: colors.textMuted, fontFamily: 'monospace', fontSize: '0.95em' }}>
                          {info ? `${info.Hours}h ${info.Minutes}m ${info.Seconds}s` : 'N/A'}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: (standard.Negative_Marking === 'Yes' || standard.Negative_Marking === 'yes') ? '#fee' : '#efe',
                            color: (standard.Negative_Marking === 'Yes' || standard.Negative_Marking === 'yes') ? '#c00' : '#060',
                            padding: '6px 12px',
                            borderRadius: '28px',
                            fontSize: '0.85em',
                            fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            {standard.Negative_Marking === 'Yes' || standard.Negative_Marking === 'yes' ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: (standard.Practical_Required === 'Yes' || standard.Practical_Required === 'yes') ? '#fee' : '#f1f1f4',
                            color: (standard.Practical_Required === 'Yes' || standard.Practical_Required === 'yes') ? '#c00' : '#8a8a95',
                            padding: '6px 12px',
                            borderRadius: '28px',
                            fontSize: '0.85em',
                            fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            {standard.Practical_Required === 'Yes' || standard.Practical_Required === 'yes' ? 'Required' : 'Not Required'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleEdit(standard)}
                            style={{
                              padding: '8px',
                              backgroundColor: '#1a1a2e',
                              color: 'white',
                              border: '2px solid #1a1a2e',
                              borderRadius: '28px',
                              cursor: 'pointer',
                              marginRight: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            title="Edit Standard"
                            onMouseOver={e => {
                              e.currentTarget.style.backgroundColor = '#e1e2e2ff';
                              e.currentTarget.style.color = '#1a1a2e';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.backgroundColor = '#1a1a2e';
                              e.currentTarget.style.color = 'white';
                            }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(standard.Standard_List)}
                            style={{
                              padding: '8px',
                              background: 'linear-gradient(120deg, #b91c3c, #d7263d)',
                              color: 'white',
                              border: '2px solid transparent',
                              borderRadius: '28px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            title="Delete Standard"
                            onMouseOver={e => {
                              e.currentTarget.style.background = '#e1e2e2ff';
                              e.currentTarget.style.border = '2px solid #c0392b';
                              e.currentTarget.style.color = '#c0392b';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'linear-gradient(120deg, #b91c3c, #d7263d)';
                              e.currentTarget.style.border = '2px solid transparent';
                              e.currentTarget.style.color = 'white';
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <PaginationBar
            page={standardsCurrentPage}
            totalPages={totalStandardPages}
            totalItems={filteredStandards.length}
            pageSize={standardsItemsPerPage}
            onPageChange={setStandardsCurrentPage}
            itemLabel="standards"
          />
        </article>
      </div>

      {/* Modern Modal for Add/Edit */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.modalOverlay,
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
          marginLeft: 0
        }}>
          <div style={{
            backgroundColor: colors.modalBg,
            padding: isMobile ? '22px 16px' : '35px',
            borderRadius: '28px',
            width: '100%',
            maxWidth: isMobile ? '100%' : '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              borderBottom: '3px solid #d7263d',
              paddingBottom: '15px'
            }}>
              <h3 style={{
                margin: 0,
                color: colors.text,
                fontSize: '1.6em',
                fontWeight: '600'
              }}>
                {editMode ? 'Edit Standard' : 'Add New Standard'}
              </h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => { setShowModal(false); resetTemplateFile(); }}
                style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '22px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: colors.text,
                  fontSize: '0.95em'
                }}>
                  Standard Name:
                </label>
                <input
                  type="text"
                  name="Standard_List"
                  value={formData.Standard_List}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: `2px solid ${colors.inputBorder}`,
                    borderRadius: '4px',
                    fontSize: '15px',
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = '#1a1a2e'}
                  onBlur={e => e.target.style.borderColor = colors.inputBorder}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: colors.text,
                  fontSize: '0.95em'
                }}>
                  Short Name:
                </label>
                <input
                  type="text"
                  name="Short_Name"
                  value={formData.Short_Name}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: `2px solid ${colors.inputBorder}`,
                    borderRadius: '4px',
                    fontSize: '15px',
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = '#1a1a2e'}
                  onBlur={e => e.target.style.borderColor = colors.inputBorder}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: twoColumnGrid, gap: '15px', marginBottom: '22px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: colors.text,
                    fontSize: '0.95em'
                  }}>
                    Total Questions:
                  </label>
                  <input
                    type="number"
                    name="Total_Questions"
                    value={formData.Total_Questions}
                    onChange={handleChange}
                    required
                    min="1"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: `2px solid ${colors.inputBorder}`,
                      borderRadius: '4px',
                    fontSize: '15px',
                    backgroundColor: colors.inputBg,
                      color: colors.text,
                      transition: 'border-color 0.2s ease',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = '#1a1a2e'}
                    onBlur={e => e.target.style.borderColor = colors.inputBorder}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: colors.text,
                    fontSize: '0.95em'
                  }}>
                    Passing Criteria:
                  </label>
                  <input
                    type="text"
                    name="Passing_Criteria"
                    value={formData.Passing_Criteria}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 70%"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: `2px solid ${colors.inputBorder}`,
                      borderRadius: '4px',
                    fontSize: '15px',
                    backgroundColor: colors.inputBg,
                      color: colors.text,
                      transition: 'border-color 0.2s ease',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = '#1a1a2e'}
                    onBlur={e => e.target.style.borderColor = colors.inputBorder}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontWeight: '600',
                  color: colors.text,
                  fontSize: '0.95em'
                }}>
                  Time Limit:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', color: colors.textMuted, fontWeight: '500', marginBottom: '6px', display: 'block' }}>Hours</label>
                    <input
                      type="number"
                      name="Hours"
                      value={formData.Hours}
                      onChange={handleChange}
                      min="0"
                      style={{
                        width: '100%',
                        padding: '12px 15px',
                        border: `2px solid ${colors.inputBorder}`,
                        borderRadius: '4px',
                        fontSize: '15px',
                        textAlign: 'center',
                        backgroundColor: colors.inputBg,
                        color: colors.text,
                        transition: 'border-color 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#1a1a2e'}
                      onBlur={e => e.target.style.borderColor = colors.inputBorder}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', color: colors.textMuted, fontWeight: '500', marginBottom: '6px', display: 'block' }}>Minutes</label>
                    <input
                      type="number"
                      name="Minutes"
                      value={formData.Minutes}
                      onChange={handleChange}
                      min="0"
                      max="59"
                      style={{
                        width: '100%',
                        padding: '12px 15px',
                        border: `2px solid ${colors.inputBorder}`,
                        borderRadius: '4px',
                        fontSize: '15px',
                        textAlign: 'center',
                        backgroundColor: colors.inputBg,
                        color: colors.text,
                        transition: 'border-color 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#1a1a2e'}
                      onBlur={e => e.target.style.borderColor = colors.inputBorder}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', color: colors.textMuted, fontWeight: '500', marginBottom: '6px', display: 'block' }}>Seconds</label>
                    <input
                      type="number"
                      name="Seconds"
                      value={formData.Seconds}
                      onChange={handleChange}
                      min="0"
                      max="59"
                      style={{
                        width: '100%',
                        padding: '12px 15px',
                        border: `2px solid ${colors.inputBorder}`,
                        borderRadius: '4px',
                        fontSize: '15px',
                        textAlign: 'center',
                        backgroundColor: colors.inputBg,
                        color: colors.text,
                        transition: 'border-color 0.2s ease',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#1a1a2e'}
                      onBlur={e => e.target.style.borderColor = colors.inputBorder}
                    />
                  </div>
                </div>
              </div>

              {/* Certificate Template Upload */}
              <div style={{ marginTop: '20px' }}>
                <label style={{
                  fontSize: '14px',
                  color: colors.text,
                  fontWeight: '600',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Upload Certificate Template (PDF)
                  <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 'normal', marginLeft: '8px' }}>
                    Optional. This will attach the uploaded template to this standard.
                  </span>
                </label>
                {formData.Certificate_Template && !templateFile && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: colors.cardAltBg,
                    border: `1px solid ${colors.inputBorder}`,
                    marginBottom: '10px'
                  }}>
                    <span style={{ color: colors.text, fontSize: '0.9em' }}>
                      Current: {formData.Certificate_Template}.pdf
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => templateInputRef.current?.click()}
                    disabled={templateUploading}
                    onMouseEnter={(e) => {
                      if (templateUploading) return;
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.color = '#c0392b';
                      e.currentTarget.style.border = '2px solid #c0392b';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(192, 57, 43, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      if (templateUploading) return;
                      e.currentTarget.style.background = 'linear-gradient(120deg, #b91c3c, #d7263d)';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.border = '2px solid transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    style={{
                      padding: '10px 16px',
                      background: templateUploading ? '#95a5a6' : 'linear-gradient(120deg, #b91c3c, #d7263d)',
                      color: '#fff',
                      border: '2px solid transparent',
                      borderRadius: '8px',
                      cursor: templateUploading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                      opacity: templateUploading ? 0.75 : 1
                    }}
                  >
                    Choose PDF
                  </button>
                  <span style={{ fontSize: '12px', color: colors.textMuted }}>
                    {templateFile
                      ? templateFile.name
                      : formData.Certificate_Template
                        ? `${formData.Certificate_Template}.pdf`
                        : 'No file chosen'}
                  </span>
                </div>
                <input
                  ref={templateInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleTemplateFileChange}
                  style={{ display: 'none' }}
                />
                {templateUploading && (
                  <div style={{ marginTop: '8px', color: colors.textMuted, fontSize: '12px' }}>
                    Uploading template...
                  </div>
                )}
              </div>

              {/* Negative Marking Toggle */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '14px', color: colors.text, fontWeight: '600', marginBottom: '12px', display: 'block' }}>
                  Negative Marking (-0.25 per wrong answer)
                </label>
                <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                  <label style={{
                    flex: 1,
                    padding: '15px',
                    border: `2px solid ${formData.Negative_Marking === 'Yes' ? '#d7263d' : colors.inputBorder}`,
                    borderRadius: '28px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    backgroundColor: formData.Negative_Marking === 'Yes' ? (isDarkMode ? '#2d1f1f' : '#fee') : colors.inputBg
                  }}>
                    <input
                      type="radio"
                      name="Negative_Marking"
                      value="Yes"
                      checked={formData.Negative_Marking === 'Yes'}
                      onChange={handleChange}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontWeight: '600', color: formData.Negative_Marking === 'Yes' ? '#d7263d' : colors.textMuted }}>
                      Enabled
                    </span>
                  </label>
                  <label style={{
                    flex: 1,
                    padding: '15px',
                    border: `2px solid ${formData.Negative_Marking === 'No' ? '#27ae60' : colors.inputBorder}`,
                    borderRadius: '28px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    backgroundColor: formData.Negative_Marking === 'No' ? (isDarkMode ? '#1f2d1f' : '#efe') : colors.inputBg
                  }}>
                    <input
                      type="radio"
                      name="Negative_Marking"
                      value="No"
                      checked={formData.Negative_Marking === 'No'}
                      onChange={handleChange}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontWeight: '600', color: formData.Negative_Marking === 'No' ? '#27ae60' : colors.textMuted }}>
                      Disabled
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: 10,
                  fontWeight: '600',
                  color: colors.text,
                  fontSize: '0.9em'
                }}>
                  Practical Required
                </label>
                <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                  <label style={{
                    flex: 1,
                    padding: '15px',
                    border: `2px solid ${formData.Practical_Required === 'Yes' ? '#d7263d' : colors.inputBorder}`,
                    borderRadius: '28px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    backgroundColor: formData.Practical_Required === 'Yes' ? (isDarkMode ? '#2d1f1f' : '#fee') : colors.inputBg
                  }}>
                    <input
                      type="radio"
                      name="Practical_Required"
                      value="Yes"
                      checked={formData.Practical_Required === 'Yes'}
                      onChange={handleChange}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontWeight: '600', color: formData.Practical_Required === 'Yes' ? '#d7263d' : colors.textMuted }}>
                      Yes — practical is compulsory
                    </span>
                  </label>
                  <label style={{
                    flex: 1,
                    padding: '15px',
                    border: `2px solid ${formData.Practical_Required === 'No' ? '#27ae60' : colors.inputBorder}`,
                    borderRadius: '28px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    backgroundColor: formData.Practical_Required === 'No' ? (isDarkMode ? '#1f2d1f' : '#efe') : colors.inputBg
                  }}>
                    <input
                      type="radio"
                      name="Practical_Required"
                      value="No"
                      checked={formData.Practical_Required === 'No'}
                      onChange={handleChange}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontWeight: '600', color: formData.Practical_Required === 'No' ? '#27ae60' : colors.textMuted }}>
                      No — theory only
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetTemplateFile();
                  }}
                  style={{
                    padding: '12px 28px',
                    backgroundColor: colors.inputBg,
                    color: colors.textMuted,
                    border: `2px solid ${colors.border}`,
                    borderRadius: '28px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    width: isMobile ? '100%' : 'auto',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={e => e.currentTarget.classList.add('grad-hover-outline')}
                  onMouseOut={e => e.currentTarget.classList.remove('grad-hover-outline')}
                >
                  <span className="grad-label">Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={templateUploading}
                  style={{
                    padding: '12px 30px',
                    background: templateUploading ? colors.inputBorder : 'linear-gradient(120deg, #b91c3c, #d7263d)',
                    color: templateUploading ? colors.textMuted : 'white',
                    border: 'none',
                    borderRadius: '18px',
                    cursor: templateUploading ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    width: isMobile ? '100%' : 'auto',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={e => {
                    if (templateUploading) return;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(215, 38, 61, 0.4)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {templateUploading ? 'Uploading...' : (editMode ? 'Update Standard' : 'Create Standard')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default StandardsAdminPage;






