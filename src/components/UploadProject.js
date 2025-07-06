import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react';
import { adminAPI } from '../utils/api';
import '../styles/UploadProject.css';

const UploadProject = ({ onProjectCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Updated form data to match backend struct
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    category: '',
    gemini_api_key: '',          // Changed from geminiKey
    gemini_model: 'gemini-1.5-flash',  // Added required field
    gemini_daily_limit: 1000,        // Changed from gemini_limit
    gemini_monthly_limit: 3000,      // Add this field
    gemini_enabled: true,        // Added for backend
    temperature: 0.7,
    welcome_message: 'Hello! How can I help you today?'  // Changed from welcomeMessage
  });

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      setError('Some files were rejected. Please upload PDF, DOC, DOCX, or TXT files only.');
      return;
    }

    const newFiles = acceptedFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'pending'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Simulate upload progress for UI feedback
    newFiles.forEach(fileObj => {
      simulateUpload(fileObj);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true
  });

  const simulateUpload = (fileObj) => {
    const interval = setInterval(() => {
      setUploadedFiles(prev =>
        prev.map(file =>
          file.id === fileObj.id
            ? { ...file, progress: Math.min(file.progress + Math.random() * 20, 100) }
            : file
        )
      );
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setUploadedFiles(prev =>
        prev.map(file =>
          file.id === fileObj.id
            ? { ...file, progress: 100, status: 'completed' }
            : file
        )
      );
    }, 3000);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

const validateStep = (step) => {
  switch (step) {
    case 1:
      if (!projectData.name.trim()) {
        setError('Project name is required');
        return false;
      }
      if (projectData.name.length < 3) {
        setError('Project name must be at least 3 characters long');
        return false;
      }
      break;
    case 2:
      if (uploadedFiles.length === 0) {
        setError('Please upload at least one file');
        return false;
      }
      const incompleteFiles = uploadedFiles.filter(file => file.status !== 'completed');
      if (incompleteFiles.length > 0) {
        setError('Please wait for all files to finish uploading');
        return false;
      }
      break;
    case 3:
      if (!projectData.gemini_api_key.trim()) {
        setError('Gemini API key is required');
        return false;
      }
      if (projectData.gemini_api_key.length < 20) {
        setError('Please enter a valid Gemini API key');
        return false;
      }
      if (projectData.gemini_daily_limit <= 0 || projectData.gemini_monthly_limit <= 0) {
        setError('Usage limits must be greater than 0');
        return false;
      }
      break;
    default:
      break;
  }
  setError('');
  return true;
};


  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  // Fixed handleSubmit to match backend expectations
 const handleSubmit = async () => {
  setLoading(true);
  setError('');

  try {
    // Create project first
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/projects`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(projectData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create project');
    }

    const result = await response.json();

    // Upload files if any
    if (uploadedFiles.length > 0 && result.project && result.project.id) {
      await uploadFilesToProject(result.project.id);
    }

    setSuccess(`Project "${projectData.name}" created successfully with ${uploadedFiles.length} files uploaded!`);
    
    setTimeout(() => {
      onProjectCreated && onProjectCreated(result.project);
    }, 2000);

  } catch (error) {
    console.error('Project creation error:', error);
    setError(error.message || 'Failed to create project. Please try again.');
  } finally {
    setLoading(false);
  }
};


  // Separate function to upload files to created project
const uploadFilesToProject = async (projectId) => {
  try {
    for (const fileObj of uploadedFiles) {
      const formData = new FormData();
      // ✅ Change from 'files' to 'pdfs' to match backend
      formData.append('pdfs', fileObj.file);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/projects/${projectId}/upload-pdf`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('Upload successful:', result);
    }
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};



  const handleInputChange = (field, value) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="upload-project-container">
      <div className="upload-header">
        <h1>
          <Upload className="header-icon" />
          Create New Project
        </h1>
        <p>Set up your AI-powered chatbot project</p>
      </div>

      {/* Progress Steps */}
      <div className="progress-steps">
        {[1, 2, 3, 4].map(step => (
          <div
            key={step}
            className={`step ${currentStep >= step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
          >
            <div className="step-number">
              {currentStep > step ? <Check size={16} /> : step}
            </div>
            <span className="step-label">
              {step === 1 && 'Project Info'}
              {step === 2 && 'Upload Files'}
              {step === 3 && 'Configuration'}
              {step === 4 && 'Review'}
            </span>
          </div>
        ))}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="message error-message">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="message success-message">
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Step Content */}
      <div className="step-content">
        {/* Step 1: Project Information */}
        {currentStep === 1 && (
          <div className="form-step">
            <h3>Project Information</h3>
            <div className="form-group">
              <label>Project Name *</label>
              <input
                type="text"
                value={projectData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your project name"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={projectData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your project and its purpose"
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={projectData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="">Select a category</option>
                <option value="customer-support">Customer Support</option>
                <option value="education">Education</option>
                <option value="healthcare">Healthcare</option>
                <option value="ecommerce">E-commerce</option>
                <option value="finance">Finance</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: File Upload */}
        {currentStep === 2 && (
          <div className="form-step">
            <h3>Upload Training Documents</h3>
            <p>Upload PDF documents to train your AI chatbot</p>

            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload className="dropzone-icon" />
              <div className="dropzone-text">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
              </div>
              <div className="dropzone-subtext">
                Supports: PDF, DOC, DOCX, TXT (Max 10MB each)
              </div>
            </div>

            {/* File Preview */}
            {uploadedFiles.length > 0 && (
              <div className="file-preview">
                <h4>Uploaded Files ({uploadedFiles.length})</h4>
                {uploadedFiles.map(file => (
                  <div key={file.id} className="file-item">
                    <div className="file-info">
                      <FileText className="file-icon" />
                      <div className="file-details">
                        <div className="file-name">{file.name}</div>
                        <div className="file-size">{formatFileSize(file.size)}</div>
                        {file.status === 'pending' && (
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}
                        {file.status === 'completed' && (
                          <div className="file-status completed">
                            <Check size={14} /> Ready for Upload
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="remove-file-btn"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Configuration */}
        {currentStep === 3 && (
          <div className="form-step">
            <h3>AI Configuration</h3>
            <div className="form-group">
              <label>Gemini API Key *</label>
              <input
                type="password"
                value={projectData.gemini_api_key}
                onChange={(e) => handleInputChange('gemini_api_key', e.target.value)}
                placeholder="Enter your Gemini API key"
                required
              />
              <small>Your API key will be encrypted and stored securely</small>
            </div>
            <div className="form-group">
              <label>AI Model</label>
              <select
                value={projectData.gemini_model}
                onChange={(e) => handleInputChange('gemini_model', e.target.value)}
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-pro">Gemini Pro</option>
              </select>
            </div>
            <div className="form-group">
              <label>Daily Usage Limit</label>
              <select
                value={projectData.gemini_daily_limit}
                onChange={(e) => handleInputChange('gemini_daily_limit', parseInt(e.target.value))}
              >
                <option value={100}>100 requests/day</option>
                <option value={500}>500 requests/day</option>
                <option value={1000}>1000 requests/day</option>
                <option value={2000}>2000 requests/day</option>
                <option value={5000}>5000 requests/day</option>
              </select>
            </div>
            <div className="form-group">
              <label>Monthly Usage Limit</label>
              <select
                value={projectData.gemini_monthly_limit}
                onChange={(e) => handleInputChange('gemini_monthly_limit', parseInt(e.target.value))}
              >
                <option value={3000}>3000 requests/month</option>
                <option value={15000}>15000 requests/month</option>
                <option value={30000}>30000 requests/month</option>
                <option value={60000}>60000 requests/month</option>
              </select>
            </div>
            <div className="form-group">
              <label>Welcome Message</label>
              <textarea
                value={projectData.welcome_message}
                onChange={(e) => handleInputChange('welcome_message', e.target.value)}
                placeholder="Enter a welcome message for your chatbot"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="form-step">
            <h3>Review & Submit</h3>
            <div className="review-summary">
              <div className="summary-item">
                <span className="label">Project Name:</span>
                <span className="value">{projectData.name}</span>
              </div>
              <div className="summary-item">
                <span className="label">Description:</span>
                <span className="value">{projectData.description || 'Not provided'}</span>
              </div>
              <div className="summary-item">
                <span className="label">Category:</span>
                <span className="value">{projectData.category || 'Not selected'}</span>
              </div>
              <div className="summary-item">
                <span className="label">Files to Upload:</span>
                <span className="value">{uploadedFiles.length} files</span>
              </div>
              <div className="summary-item">
                <span className="label">AI Model:</span>
                <span className="value">{projectData.gemini_model}</span>
              </div>
              <div className="summary-item">
                <span className="label">Daily Limit:</span>
                <span className="value">{projectData.gemini_limit} requests</span>
              </div>
              <div className="summary-item">
                <span className="label">API Key:</span>
                <span className="value">
                  {projectData.gemini_api_key ? '••••••••••••' + projectData.gemini_api_key.slice(-4) : 'Not provided'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="form-navigation">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="nav-btn prev"
        >
          Previous
        </button>
        <button
          onClick={nextStep}
          disabled={loading}
          className="nav-btn next"
        >
          {loading ? (
            'Creating...'
          ) : currentStep === 4 ? (
            'Create Project'
          ) : (
            'Next'
          )}
        </button>
      </div>
    </div>
  );
};

export default UploadProject;
