import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Edit2, Trash2, Upload, FileSpreadsheet, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL as HOST_API_BASE_URL } from '../../config/api';
import PaginationBar from '../../components/PaginationBar';
import ClearFilterButton from '../../components/ClearFilterButton';
import StyledSelect from '../../components/StyledSelect';
import SearchableSelect from '../../components/SearchableSelect';
import { getActorId, getActorName } from '../../utils/actorIdentity';
import '../PTIS_App.css';

const QuestionsAdminPage = ({ onBack, showToast }) => {
  const API_BASE_URL = (HOST_API_BASE_URL || '').replace(/\/$/, '');
  const { theme, isDarkMode } = useTheme();
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [questions, setQuestions] = useState([]);
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [filterStandard, setFilterStandard] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [uploadErrors, setUploadErrors] = useState([]);
  const fileInputRef = useRef(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // True DB counts (from /api/questions/count)
  const [totalDbCount, setTotalDbCount] = useState(null);
  const [unmatchedCount, setUnmatchedCount] = useState(null);

  // Bulk selection state
  const [selectedNos, setSelectedNos] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    Question: '',
    Opt_A: '',
    Opt_B: '',
    Opt_C: '',
    Opt_D: '',
    Answer: '',
    Standard_List: ''
  });

  const isMobile = viewportWidth <= 768;
  const isTablet = viewportWidth <= 1024;
  const twoColumnGrid = isMobile ? '1fr' : '1fr 1fr';

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

  const fetchData = async () => {
    try {
      const [questionsRes, standardsRes, countRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/questions/legacy`),
        fetch(`${API_BASE_URL}/api/standards/legacy`),
        fetch(`${API_BASE_URL}/api/questions/legacy/count`)
      ]);
      
      if (!questionsRes.ok || !standardsRes.ok) {
        throw new Error('Failed to fetch data from server');
      }
      
      const [questionsData, standardsData] = await Promise.all([
        questionsRes.json(),
        standardsRes.json()
      ]);

      if (countRes.ok) {
        const countData = await countRes.json();
        setTotalDbCount(countData.total ?? null);
        setUnmatchedCount(countData.unmatched ?? null);
      }
      
      // Ensure data is array
      setStandards(Array.isArray(standardsData) ? standardsData : []);
      setQuestions(Array.isArray(questionsData) ? questionsData : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (showToast) showToast('Failed to load questions data', 'error');
      setStandards([]);
      setQuestions([]);
      setLoading(false);
    }
  };

  // Set of known standard names (trimmed+lowercased) for unmatched detection
  const knownStandardSet = useMemo(
    () => new Set(standards.map(s => (s.Standard_List || '').trim().toLowerCase())),
    [standards]
  );

  const filteredQuestions = useMemo(() => {
    const filtered = questions.filter(q => {
      const questionStandard = (q.Standard_List || q.Standard || '').trim().toLowerCase();
      let matchesStandard;
      if (!filterStandard) {
        matchesStandard = true;
      } else if (filterStandard === '__UNMATCHED__') {
        // Show questions whose standard is empty OR not in the known standards list
        matchesStandard = !questionStandard || !knownStandardSet.has(questionStandard);
      } else {
        matchesStandard = questionStandard === filterStandard.trim().toLowerCase();
      }
      const matchesSearch = !searchQuery || 
        q.Question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.Opt_A?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.Opt_B?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.Opt_C?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.Opt_D?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStandard && matchesSearch;
    });
    return filtered;
  }, [questions, filterStandard, searchQuery, knownStandardSet]);

  // Paginated questions
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredQuestions.slice(startIndex, endIndex);
  }, [filteredQuestions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStandard, searchQuery]);

  const handleAdd = () => {
    setEditMode(false);
    setCurrentQuestion(null);
    setFormData({
      Question: '',
      Opt_A: '',
      Opt_B: '',
      Opt_C: '',
      Opt_D: '',
      Answer: 'A',
      Standard_List: standards[0]?.Standard_List || ''
    });
    setShowModal(true);
  };

  const handleEdit = (question) => {
    setEditMode(true);
    setCurrentQuestion(question.NO);
    setFormData({
      Question: question.Question,
      Opt_A: question.Opt_A,
      Opt_B: question.Opt_B,
      Opt_C: question.Opt_C,
      Opt_D: question.Opt_D,
      Answer: question.Answer,
      Standard_List: question.Standard_List || question.Standard
    });
    setShowModal(true);
  };

  const handleDelete = async (questionNo) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const actorId = getActorId();
      const actorName = getActorName();
      const response = await fetch(`${API_BASE_URL}/api/questions/legacy/${questionNo}?actorId=${encodeURIComponent(actorId)}&actorName=${encodeURIComponent(actorName)}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete failed');
      if (showToast) showToast('Question deleted successfully!', 'success');
      fetchData();
    } catch (error) {
      console.error('Error deleting question:', error);
      if (showToast) showToast('Failed to delete question', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNos.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedNos.size} selected question(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/questions/legacy/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nos: Array.from(selectedNos),
          actorId: getActorId(),
          actorName: getActorName()
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Bulk delete failed');
      if (showToast) showToast(`${data.deleted} Questions Deleted Successfully!`, 'success');
      setSelectedNos(new Set());
      fetchData();
    } catch (error) {
      console.error('Bulk delete error:', error);
      if (showToast) showToast(`Failed to delete selected questions: ${error.message}`, 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedNos(new Set(filteredQuestions.map(q => q.NO)));
    } else {
      setSelectedNos(new Set());
    }
  };

  const handleRowSelect = (no, checked) => {
    setSelectedNos(prev => {
      const next = new Set(prev);
      if (checked) next.add(no);
      else next.delete(no);
      return next;
    });
  };

  const exportCSV = () => {
    const source = selectedNos.size > 0
      ? filteredQuestions.filter(q => selectedNos.has(q.NO))
      : filteredQuestions;
    if (source.length === 0) { if (showToast) showToast('No questions to export', 'error'); return; }
    const header = ['NO', 'Question', 'Opt_A', 'Opt_B', 'Opt_C', 'Opt_D', 'Answer', 'Standard'];
    const rows = source.map(q => [
      q.NO,
      `"${String(q.Question || '').replace(/"/g, '""')}"`,
      `"${String(q.Opt_A || '').replace(/"/g, '""')}"`,
      `"${String(q.Opt_B || '').replace(/"/g, '""')}"`,
      `"${String(q.Opt_C || '').replace(/"/g, '""')}"`,
      `"${String(q.Opt_D || '').replace(/"/g, '""')}"`,
      q.Answer,
      `"${String(q.Standard_List || q.Standard || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const label = filterStandard && filterStandard !== '__UNMATCHED__' ? filterStandard : 'All';
    link.download = `Questions_${label}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (showToast) showToast(`${source.length} questions exported!`, 'success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      actorId: getActorId(),
      actorName: getActorName()
    };

    try {
      if (editMode) {
        const response = await fetch(`${API_BASE_URL}/api/questions/legacy/${currentQuestion}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Update failed');
        }
        if (showToast) showToast('Question updated successfully!', 'success');
      } else {
        const response = await fetch(`${API_BASE_URL}/api/questions/legacy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Create failed');
        }
        if (showToast) showToast('Question created successfully!', 'success');
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving question:', error);
      if (showToast) showToast(`Failed to save question: ${error.message}`, 'error');
    }
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Excel file handling
  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      if (showToast) showToast('File size exceeds 100 MB limit. Please upload a smaller file.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setExcelFile(file);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate columns
        if (jsonData.length > 0) {
          const requiredColumns = ['Question', 'Opt_A', 'Opt_B', 'Opt_C', 'Opt_D', 'Answer', 'Standard_List'];
          const columns = Object.keys(jsonData[0]);
          const missingColumns = requiredColumns.filter(col => !columns.includes(col));
          
          if (missingColumns.length > 0) {
            if (showToast) showToast(`Missing columns: ${missingColumns.join(', ')}. Required: Question, Opt_A, Opt_B, Opt_C, Opt_D, Answer, Standard_List`, 'error');
            setExcelFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }
          
          setExcelData(jsonData);
          setShowExcelUploadModal(true);
          setUploadSummary(null);
          setUploadErrors([]);
        }
      } catch (error) {
        console.error('Error parsing Excel:', error);
        if (showToast) showToast('Failed to parse Excel file. Please check the file format.', 'error');
        setExcelFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleBulkUpload = async () => {
    if (!excelData || excelData.length === 0) {
      if (showToast) showToast('No Data To Upload', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('Uploading', excelData.length, 'questions...');
      
      const response = await fetch(`${API_BASE_URL}/api/questions/legacy/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ questions: excelData })
      });

      console.log('Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server Error:', errorText);
        throw new Error(`Server Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload Result:', result);

      const skipped = result.skipped || 0;
      setUploadSummary({
        success: result.success || 0,
        failed: result.failed || 0,
        skipped,
        total: result.total || excelData.length
      });
      setUploadErrors(Array.isArray(result.errors) ? result.errors : []);

      if (showToast) {
        const toastType = (result.failed > 0 || skipped > 0) ? 'info' : 'success';
        const extra = [
          result.failed > 0 ? `Failed: ${result.failed}` : '',
          skipped > 0 ? `Skipped duplicates: ${skipped}` : ''
        ].filter(Boolean).join(', ');
        showToast(
          `Successfully Added ${result.success} Questions!${extra ? ` (${extra})` : ''}`,
          toastType
        );
      }

      fetchData();
      // Keep the modal open and show the summary; the user closes it with "Done".
    } catch (error) {
      console.error('Error Uploading Questions:', error);
      if (showToast) showToast(`Failed To Upload Questions: ${error.message || 'Unknown Error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        Question: 'Another Name For A Self-Emulsifying Penetrant Process Is:',
        Opt_A: 'Solvent removable',
        Opt_B: 'Water washable',
        Opt_C: 'Post emulsifiable',
        Opt_D: 'Solvent emulsifiable',
        Answer: 'B',
        Standard_List: 'Penetrant Testing (Specific)'
      },
      {
        Question: 'Which Of The Following Produces A Circular Field?',
        Opt_A: 'Coil',
        Opt_B: 'Head Shot',
        Opt_C: 'Yoke',
        Opt_D: 'All of the above',
        Answer: 'B',
        Standard_List: 'MPT (General)'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
    XLSX.writeFile(workbook, 'Questions_Sample_Template.xlsx');
  };

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading questions...</div>;
  }

  return (
    <>
      {/* Hidden trigger button */}
      <button 
        id="questions-add-btn" 
        onClick={() => {
          setEditMode(false);
          setCurrentQuestion(null);
          setFormData({
            Question: '',
            Opt_A: '',
            Opt_B: '',
            Opt_C: '',
            Opt_D: '',
            Answer: 'A',
            Standard_List: standards[0]?.Standard_List || ''
          });
          setShowModal(true);
        }} 
        style={{ display: 'none' }} 
      />
      
      {/* Modern Filters */}
      <article className="panel" style={{ marginBottom: '25px', padding: 0, overflow: 'hidden' }}>
        {/* Filter Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid #ececf0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#fff5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d7263d" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Filter & Search Questions</p>
              <h3 style={{ margin: 0, marginTop: 4, fontSize: '1.1em', fontWeight: '600' }}>Filter by standard or search in question text</h3>
            </div>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#fff5f5',
            color: '#d7263d',
            borderRadius: '28px',
            fontSize: '0.9em',
            fontWeight: '600'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11H3m6 0a3 3 0 0 1 6 0m-6 0a3 3 0 0 0 6 0m6 0h-6"></path>
            </svg>
            {filteredQuestions.length} / {totalDbCount != null ? totalDbCount : questions.length} Questions
            {totalDbCount != null && unmatchedCount > 0 && (
              <span style={{ fontSize: '0.78em', opacity: 0.8, marginLeft: '4px' }}>
                ({unmatchedCount} unmatched)
              </span>
            )}
          </span>
        </div>
        
        {/* Filter Content */}
        <div style={{ padding: '25px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : 'minmax(200px, 1fr) minmax(300px, 2fr)', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '10px',
                fontWeight: '600',
                fontSize: '0.9em',
                color: colors.text,
                letterSpacing: '0.3px'
              }}>                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #b91c3c, #d7263d)'
                }}></span>
                Filter by Standard
              </label>
              <SearchableSelect
                value={filterStandard}
                onChange={setFilterStandard}
                options={standards.map(std => std.Standard_List)}
                emptyOptionLabel="All Standards"
                placeholder="Type to search…"
                extraOptions={[{ value: '__UNMATCHED__', label: `⚠ Unmatched Standard ${unmatchedCount != null ? `(${unmatchedCount})` : ''}` }]}
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  fontSize: '14px',
                  border: `2px solid ${colors.inputBorder}`,
                  borderRadius: '16px',
                  backgroundColor: colors.cardAltBg,
                  color: colors.text,
                  fontWeight: '500',
                  cursor: 'text',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '10px',
                fontWeight: '600',
                fontSize: '0.9em',
                color: colors.text,
                letterSpacing: '0.3px'
              }}>                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #b91c3c, #d7263d)'
                }}></span>
                Search Questions
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search in question text, options A, B, C, D..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 15px 12px 45px',
                    fontSize: '14px',
                    border: `2px solid ${colors.inputBorder}`,
                    borderRadius: '16px',
                    backgroundColor: colors.cardAltBg,
                    color: colors.text,
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = colors.text;
                    e.target.style.backgroundColor = colors.inputBg;
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = colors.inputBorder;
                    e.target.style.backgroundColor = colors.cardAltBg;
                  }}
                />
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={colors.textMuted}
                  strokeWidth="2"
                  style={{
                    position: 'absolute',
                    left: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Buttons Row: Clear Filter + Export CSV + Bulk Delete */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>

            {/* Export CSV Button */}
            <button
              onClick={exportCSV}
              title={selectedNos.size > 0 ? `Export ${selectedNos.size} selected questions` : `Export all ${filteredQuestions.length} filtered questions`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#16a085',
                color: 'white',
                border: '2px solid #16a085',
                borderRadius: '22px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(22, 160, 133, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={e => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
                e.currentTarget.style.color = '#16a085';
                e.currentTarget.style.borderColor = '#16a085';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(22, 160, 133, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.backgroundColor = '#16a085';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = '#16a085';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 160, 133, 0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {selectedNos.size > 0 ? `Export Selected (${selectedNos.size})` : `Export CSV (${filteredQuestions.length})`}
            </button>

            {/* Bulk Delete Button — only when rows selected */}
            {selectedNos.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: bulkDeleting ? '#aaa' : 'linear-gradient(120deg, #b91c3c, #d7263d)',
                  color: 'white',
                  border: '2px solid transparent',
                  borderRadius: '22px',
                  cursor: bulkDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: bulkDeleting ? 'none' : '0 4px 12px rgba(215, 38, 61, 0.3)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={e => {
                  if (!bulkDeleting) {
                    e.currentTarget.style.background = '#f5f5f5';
                    e.currentTarget.style.color = '#c0392b';
                    e.currentTarget.style.border = '2px solid #c0392b';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(192, 57, 43, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={e => {
                  if (!bulkDeleting) {
                    e.currentTarget.style.background = 'linear-gradient(120deg, #b91c3c, #d7263d)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.border = '2px solid transparent';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(215, 38, 61, 0.3)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <Trash2 size={18} />
                {bulkDeleting ? 'Deleting…' : `Delete Selected (${selectedNos.size})`}
              </button>
            )}

            {/* Clear Selection — only when rows selected */}
            {selectedNos.size > 0 && (
              <button
                onClick={() => setSelectedNos(new Set())}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: colors.inputBg,
                  color: colors.textMuted,
                  border: `2px solid ${colors.inputBorder}`,
                  borderRadius: '22px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = '#7f8c8d';
                  e.currentTarget.style.color = colors.text;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = colors.inputBorder;
                  e.currentTarget.style.color = colors.textMuted;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Clear Selection ({selectedNos.size})
              </button>
            )}

            {/* Clear Filter */}
            <ClearFilterButton
              visible={Boolean(filterStandard || searchQuery)}
              onClick={() => { setFilterStandard(''); setSearchQuery(''); }}
            />
          </div>
        </div>
      </article>

      {/* Excel Upload Section */}
      <article className="panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{
          margin: '0 0 16px 0',
          color: colors.text,
          fontSize: '18px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FileSpreadsheet size={20} />
          Bulk Question Import
        </h3>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            onChange={handleExcelFileChange}
            style={{ display: 'none' }}
          />
          
          {/* Upload from Excel Button */}
          <button
            id="questions-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#16a085',
              color: 'white',
              border: '2px solid #16a085',
              borderRadius: '22px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(22, 160, 133, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={e => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
              e.currentTarget.style.color = '#16a085';
              e.currentTarget.style.borderColor = '#16a085';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(22, 160, 133, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.backgroundColor = '#16a085';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = '#16a085';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 160, 133, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload from Excel
          </button>

          {/* Download Sample Template Button */}
          <button
            onClick={downloadSampleExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'linear-gradient(120deg, #b91c3c, #d7263d)',
              color: 'white',
              border: '2px solid transparent',
              borderRadius: '22px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(215, 38, 61, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#f5f5f5';
              e.currentTarget.style.color = '#c0392b';
              e.currentTarget.style.border = '2px solid #c0392b';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(192, 57, 43, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'linear-gradient(120deg, #b91c3c, #d7263d)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.border = '2px solid transparent';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(215, 38, 61, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Sample Template
          </button>
        </div>

        {excelFile && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: '#e8f5e9',
            border: '1px solid #81c784',
            borderRadius: '8px',
            color: '#2e7d32',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FileSpreadsheet size={16} />
            <span>Selected: {excelFile.name} ({excelData?.length || 0} questions)</span>
          </div>
        )}
      </article>

      {/* Questions Table */}
      <article className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ececf0' }}>
                <th style={{ padding: '15px', textAlign: 'center', width: '44px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    title="Select all visible questions"
                    checked={filteredQuestions.length > 0 && filteredQuestions.every(q => selectedNos.has(q.NO))}
                    onChange={e => handleSelectAll(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                  />
                </th>
                <th style={{ padding: '15px', textAlign: 'left', width: '60px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95', fontWeight: 700 }}>S.No.</th>
                <th style={{ padding: '15px', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95', fontWeight: 700 }}>Question</th>
                <th style={{ padding: '15px', textAlign: 'left', width: '150px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95', fontWeight: 700 }}>Standard</th>
                <th style={{ padding: '15px', textAlign: 'left', width: '80px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95', fontWeight: 700 }}>Answer</th>
                <th style={{ padding: '15px', textAlign: 'center', width: '180px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a8a95', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuestions.map((question, index) => (
                <tr key={question.NO} style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: selectedNos.has(question.NO) ? (isDarkMode ? '#1e3a5f' : '#eff6ff') : 'inherit' }}>
                  <td style={{ padding: '12px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                    <input
                      type="checkbox"
                      checked={selectedNos.has(question.NO)}
                      onChange={e => handleRowSelect(question.NO, e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                    />
                  </td>
                  <td style={{ padding: '12px', border: `1px solid ${colors.border}`, color: colors.text }}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td style={{ padding: '12px', border: `1px solid ${colors.border}` }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: colors.text }}>{question.Question}</div>
                    <div style={{ fontSize: '13px', color: colors.textMuted, lineHeight: '1.6' }}>
                      <div><strong>A:</strong> {question.Opt_A}</div>
                      <div><strong>B:</strong> {question.Opt_B}</div>
                      <div><strong>C:</strong> {question.Opt_C}</div>
                      <div><strong>D:</strong> {question.Opt_D}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px', border: `1px solid ${colors.border}`, color: colors.text }}>{question.Standard_List || question.Standard}</td>
                  <td style={{ padding: '12px', border: `1px solid ${colors.border}`, textAlign: 'center', fontWeight: 'bold', color: '#27ae60' }}>
                    {question.Answer}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                    <button
                      onClick={() => handleEdit(question)}
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
                      title="Edit Question"
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
                      onClick={() => handleDelete(question.NO)}
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
                      title="Delete Question"
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
              ))}
              {filteredQuestions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: colors.textMuted }}>
                    No questions found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <PaginationBar
          page={currentPage}
          totalPages={totalPages}
          totalItems={filteredQuestions.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
          itemLabel="questions"
        />
      </article>

      {/* Modal for Add/Edit */}
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
            maxWidth: isMobile ? '100%' : '700px',
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
                {editMode ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowModal(false)}
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
                  Standard:
                </label>
                <StyledSelect
                  value={formData.Standard_List}
                  onChange={(v) => handleChange({ target: { name: 'Standard_List', value: v } })}
                  options={standards.map(std => std.Standard_List)}
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
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
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
                  Question Text:
                </label>
                <textarea
                  name="Question"
                  value={formData.Question}
                  onChange={handleChange}
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: `2px solid ${colors.inputBorder}`,
                    borderRadius: '4px',
                    fontSize: '15px',
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = colors.text}
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
                    Option A:
                  </label>
                  <input
                    type="text"
                    name="Opt_A"
                    value={formData.Opt_A}
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
                    onFocus={e => e.target.style.borderColor = colors.text}
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
                    Option B:
                  </label>
                  <input
                    type="text"
                    name="Opt_B"
                    value={formData.Opt_B}
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
                    onFocus={e => e.target.style.borderColor = colors.text}
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
                    Option C:
                  </label>
                  <input
                    type="text"
                    name="Opt_C"
                    value={formData.Opt_C}
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
                    onFocus={e => e.target.style.borderColor = colors.text}
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
                    Option D:
                  </label>
                  <input
                    type="text"
                    name="Opt_D"
                    value={formData.Opt_D}
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
                    onFocus={e => e.target.style.borderColor = colors.text}
                    onBlur={e => e.target.style.borderColor = colors.inputBorder}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: colors.text,
                  fontSize: '0.95em'
                }}>
                  Correct Answer:
                </label>
                <StyledSelect
                  value={formData.Answer}
                  onChange={(v) => handleChange({ target: { name: 'Answer', value: v } })}
                  options={['A', 'B', 'C', 'D']}
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
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  style={{
                    padding: '12px 30px',
                    background: 'linear-gradient(120deg, #b91c3c, #d7263d)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '18px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    width: isMobile ? '100%' : 'auto',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(215, 38, 61, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {editMode ? 'Update Question' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Preview Modal */}
      {showExcelUploadModal && excelData && (
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
            padding: isMobile ? '20px 14px' : '35px',
            borderRadius: '28px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative',
            border: `2px solid ${colors.border}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{
                margin: 0,
                color: colors.text,
                fontSize: '28px',
                fontWeight: '700',
                letterSpacing: '-0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <FileSpreadsheet size={32} color="#27ae60" />
                Preview Excel Data
              </h2>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => {
                  setShowExcelUploadModal(false);
                  setExcelData(null);
                  setExcelFile(null);
                  setUploadSummary(null);
                  setUploadErrors([]);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#e8f5e9',
              borderRadius: '16px',

              marginBottom: '24px',
              border: '1px solid #81c784'
            }}>
              <p style={{
                margin: 0,
                color: '#2e7d32',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                {excelData.length} Questions Found In File
              </p>
            </div>

            {uploadSummary && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                marginBottom: '20px',
                backgroundColor: (uploadSummary.failed > 0 || (uploadSummary.skipped || 0) > 0) ? '#fff3cd' : '#e8f5e9',
                border: `1px solid ${(uploadSummary.failed > 0 || (uploadSummary.skipped || 0) > 0) ? '#ffeeba' : '#81c784'}`,
                color: (uploadSummary.failed > 0 || (uploadSummary.skipped || 0) > 0) ? '#856404' : '#2e7d32',
                fontWeight: '600'
              }}>
                Upload Summary: {uploadSummary.success} added, {uploadSummary.skipped || 0} skipped (duplicate), {uploadSummary.failed} failed (Total {uploadSummary.total})
              </div>
            )}

            {/* Preview Table */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: '16px',

              marginBottom: '24px'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}>
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  backgroundcolor: '#1a1a2e',
                  color: 'white',
                  zIndex: 1
                }}>
                  <tr>
                    <th style={{ padding: '12px 8px', textAlign: 'left', minWidth: '50px' }}>#</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', minWidth: '250px' }}>Question</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', minWidth: '120px' }}>Option A</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', minWidth: '120px' }}>Option B</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', minWidth: '120px' }}>Option C</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', minWidth: '120px' }}>Option D</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', minWidth: '80px' }}>Answer</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', minWidth: '120px' }}>Standard</th>
                  </tr>
                </thead>
                <tbody>
                  {excelData.map((row, index) => (
                    <tr key={index} style={{
                      backgroundColor: index % 2 === 0 ? colors.cardAltBg : colors.cardBg,
                      borderBottom: `1px solid ${colors.inputBorder}`
                    }}>
                      <td style={{ padding: '10px 8px', color: colors.textMuted, fontWeight: '600' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '10px 8px', color: colors.text }}>
                        {row.Question}
                      </td>
                      <td style={{ padding: '10px 8px', color: colors.text }}>
                        {row.Opt_A}
                      </td>
                      <td style={{ padding: '10px 8px', color: colors.text }}>
                        {row.Opt_B}
                      </td>
                      <td style={{ padding: '10px 8px', color: colors.text }}>
                        {row.Opt_C}
                      </td>
                      <td style={{ padding: '10px 8px', color: colors.text }}>
                        {row.Opt_D}
                      </td>
                      <td style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        fontWeight: '700',
                        color: '#27ae60'
                      }}>
                        {row.Answer}
                      </td>
                      <td style={{ padding: '10px 8px', color: colors.text, fontWeight: '500' }}>
                        {row.Standard_List}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {uploadErrors.length > 0 && (
              <div style={{
                marginBottom: '24px'
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  color: colors.text,
                  fontSize: '18px',
                  fontWeight: '700'
                }}>
                  Failed Questions (Reason)
                </h3>
                <div style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: '12px'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: colors.cardAltBg }}>
                      <tr>
                        <th style={{ padding: '10px 8px', textAlign: 'left', width: '60px' }}>Row</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', width: '220px' }}>Reason</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Question</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadErrors.map((errItem, idx) => (
                        <tr key={`${errItem.row || idx}-${idx}`} style={{
                          borderBottom: `1px solid ${colors.inputBorder}`,
                          backgroundColor: idx % 2 === 0 ? colors.cardBg : colors.cardAltBg
                        }}>
                          <td style={{ padding: '8px', color: colors.textMuted }}>{errItem.row ?? '-'}</td>
                          <td style={{ padding: '8px', color: colors.text }}>{errItem.error || 'Unknown error'}</td>
                          <td style={{ padding: '8px', color: colors.text }}>{errItem.question || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              flexWrap: 'wrap'
            }}>
              {uploadSummary ? (
                // Upload already done — show a single "Done" button to close.
                <button
                  type="button"
                  onClick={() => {
                    setShowExcelUploadModal(false);
                    setExcelData(null);
                    setExcelFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    setUploadSummary(null);
                    setUploadErrors([]);
                  }}
                  style={{
                    padding: '12px 32px',
                    backgroundColor: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '28px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    width: isMobile ? '100%' : 'auto',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(39, 174, 96, 0.4)';
                    e.currentTarget.style.backgroundColor = '#229954';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.3)';
                    e.currentTarget.style.backgroundColor = '#27ae60';
                  }}
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExcelUploadModal(false);
                      setExcelData(null);
                      setExcelFile(null);
                      setUploadSummary(null);
                      setUploadErrors([]);
                    }}
                    style={{
                      padding: '12px 28px',
                      backgroundColor: colors.inputBg,
                      color: colors.textMuted,
                      border: `2px solid ${colors.inputBorder}`,
                      borderRadius: '28px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '600',
                      width: isMobile ? '100%' : 'auto',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = '#95a5a6';
                      e.currentTarget.style.color = colors.text;
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = colors.inputBorder;
                      e.currentTarget.style.color = colors.textMuted;
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkUpload}
                    style={{
                      padding: '12px 32px',
                      backgroundColor: '#27ae60',
                      color: 'white',
                      border: 'none',
                      borderRadius: '28px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '600',
                      width: isMobile ? '100%' : 'auto',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(39, 174, 96, 0.4)';
                      e.currentTarget.style.backgroundColor = '#229954';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.3)';
                      e.currentTarget.style.backgroundColor = '#27ae60';
                    }}
                  >
                    <Upload size={18} />
                    Upload {excelData.length} Questions
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestionsAdminPage;







