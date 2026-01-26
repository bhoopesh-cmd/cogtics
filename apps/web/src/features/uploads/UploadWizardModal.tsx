import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileSpreadsheet,
  FileText,
  Upload,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { startCsvUpload, completeCsvUpload, startPdfUpload, completePdfUpload, deleteUpload, analyzeCSVUpload, CSVAnalysisResult, FieldCategory } from '@/lib/api/endpoints';

interface UploadWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type UploadStep = 'select-type' | 'upload-file' | 'configure-mapping' | 'review';
type UploadType = 'csv' | 'pdf';

// Upload limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 10;

// Extended column mapping with category info (internal use only)
interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  category: FieldCategory;
  metadataKey?: string;
  confidence?: number;
}

// Required fields per entity type (must be mapped before upload)
const REQUIRED_FIELDS: Record<string, { field: string; label: string }[]> = {
  customer: [
    { field: 'external_id', label: 'Unique ID' },
    { field: 'name', label: 'Name' },
  ],
  invoice: [
    { field: 'external_id', label: 'Unique ID' },
    { field: 'customer_id', label: 'Customer ID' },
    { field: 'invoice_date', label: 'Invoice Date' },
    { field: 'amount', label: 'Amount' },
  ],
  contract: [
    { field: 'external_id', label: 'Unique ID' },
    { field: 'customer_id', label: 'Customer ID' },
    { field: 'start_date', label: 'Start Date' },
    { field: 'total_value', label: 'Total Value' },
  ],
  payment: [
    { field: 'external_id', label: 'Unique ID' },
    { field: 'amount', label: 'Amount' },
    { field: 'payment_date', label: 'Payment Date' },
  ],
  product: [
    { field: 'external_id', label: 'Unique ID' },
    { field: 'name', label: 'Name' },
  ],
  subscription: [
    { field: 'external_id', label: 'Unique ID' },
    { field: 'customer_id', label: 'Customer ID' },
    { field: 'start_date', label: 'Start Date' },
    { field: 'mrr', label: 'Monthly Revenue (MRR)' },
  ],
  usage: [
    { field: 'external_id', label: 'Unique ID' },
    { field: 'customer_id', label: 'Customer ID' },
    { field: 'quantity', label: 'Quantity' },
    { field: 'timestamp', label: 'Timestamp' },
  ],
  credit_memo: [
    { field: 'external_id', label: 'Unique ID' },
    { field: 'customer_id', label: 'Customer ID' },
    { field: 'amount', label: 'Amount' },
  ],
  unknown: [
    { field: 'external_id', label: 'Unique ID' },
  ],
};

// Grouped field options for the dropdown (user-friendly labels)
const FIELD_OPTIONS = [
  {
    label: 'Identity',
    options: [
      { value: 'external_id', label: 'Unique ID' },
      { value: 'name', label: 'Name' },
      { value: 'customer_id', label: 'Customer ID' },
    ],
  },
  {
    label: 'Contact',
    options: [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'billing_address', label: 'Billing Address' },
    ],
  },
  {
    label: 'Financial',
    options: [
      { value: 'amount', label: 'Amount' },
      { value: 'total_value', label: 'Total Value' },
      { value: 'mrr', label: 'Monthly Revenue (MRR)' },
      { value: 'currency', label: 'Currency' },
      { value: 'tax_amount', label: 'Tax Amount' },
      { value: 'discount_amount', label: 'Discount Amount' },
    ],
  },
  {
    label: 'Dates',
    options: [
      { value: 'invoice_date', label: 'Invoice Date' },
      { value: 'due_date', label: 'Due Date' },
      { value: 'start_date', label: 'Start Date' },
      { value: 'end_date', label: 'End Date' },
      { value: 'payment_date', label: 'Payment Date' },
      { value: 'created_at', label: 'Created Date' },
    ],
  },
  {
    label: 'Reference',
    options: [
      { value: 'invoice_id', label: 'Invoice ID' },
      { value: 'invoice_number', label: 'Invoice Number' },
      { value: 'contract_id', label: 'Contract ID' },
      { value: 'tax_id', label: 'Tax ID' },
      { value: 'status', label: 'Status' },
    ],
  },
  {
    label: 'Usage & Metrics',
    options: [
      { value: 'quantity', label: 'Quantity' },
      { value: 'timestamp', label: 'Timestamp' },
      { value: 'metric_name', label: 'Metric Name' },
      { value: 'unit', label: 'Unit' },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'auto_renew', label: 'Auto Renew' },
      { value: 'billing_frequency', label: 'Billing Frequency' },
      { value: 'payment_method', label: 'Payment Method' },
      { value: 'reference', label: 'Reference' },
    ],
  },
];

// Custom Select component matching the app theme
function Select({ 
  value, 
  onChange, 
  children,
  className = '',
}: { 
  value: string; 
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-3 py-2 pr-8 bg-black border border-zinc-700 rounded-lg text-sm text-white 
                   focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                   hover:border-zinc-600 transition-colors cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown 
        size={16} 
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" 
      />
    </div>
  );
}

export function UploadWizardModal({ isOpen, onClose, onComplete }: UploadWizardModalProps) {
  const [step, setStep] = useState<UploadStep>('select-type');
  const [uploadType, setUploadType] = useState<UploadType | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [entityType, setEntityType] = useState<string>('customer');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadIds, setUploadIds] = useState<string[]>([]);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  
  // AI analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<CSVAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Track uploading state
  const [isUploading, setIsUploading] = useState(false);

  // Complete upload mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (uploadIds.length === 0) throw new Error('No upload IDs');
      
      const results = [];
      
      for (const uploadId of uploadIds) {
        if (uploadType === 'csv') {
          const mapping = columnMappings.length > 0 ? {
            entityType,
            columns: columnMappings.map(m => ({
              sourceColumn: m.sourceColumn,
              targetField: m.targetField,
              category: m.category,
              metadataKey: m.metadataKey,
            })),
            skipHeaderRow: true,
            delimiter: ',',
          } : undefined;

          const res = await completeCsvUpload(uploadId, mapping, true); // autoProcess = true
          if (!res.ok) throw new Error(res.error);
          results.push(res.data);
        } else {
          const res = await completePdfUpload(uploadId, true); // autoProcess = true
          if (!res.ok) throw new Error(res.error);
          results.push(res.data);
        }
      }
      
      return results;
    },
    onSuccess: () => {
      onComplete();
      resetWizard();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Upload failed');
    },
  });

  const resetWizard = () => {
    setStep('select-type');
    setUploadType(null);
    setFiles([]);
    setEntityType('customer');
    setUploadProgress({});
    setUploadIds([]);
    setCurrentUploadIndex(0);
    setError(null);
    setCsvHeaders([]);
    setColumnMappings([]);
    setIsUploading(false);
    setIsAnalyzing(false);
    setAiAnalysis(null);
    setAiError(null);
  };

  // Parse CSV content to get headers and sample rows
  const parseCSVContent = (text: string): { headers: string[]; sampleRows: string[][] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], sampleRows: [] };
    
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseLine(lines[0]);
    const sampleRows: string[][] = [];
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      sampleRows.push(parseLine(lines[i]));
    }
    
    return { headers, sampleRows };
  };

  // Run AI analysis on CSV
  const runAIAnalysis = async (headers: string[], sampleRows: string[][], fileName: string) => {
    setIsAnalyzing(true);
    setAiError(null);
    
    try {
      const res = await analyzeCSVUpload({
        headers,
        sampleRows,
        fileName,
      });
      
      if (!res.ok) {
        setAiError(res.error || 'AI analysis failed');
        return;
      }
      
      const analysis = res.data;
      setAiAnalysis(analysis);
      
      // Auto-set entity type from AI suggestion
      if (analysis.entityType && analysis.entityTypeConfidence > 0.5) {
        setEntityType(analysis.entityType);
      }
      
      // Set ALL column mappings from AI - every column is mapped
      if (analysis.columnMappings && analysis.columnMappings.length > 0) {
        const mappings: ColumnMapping[] = analysis.columnMappings.map(m => ({
          sourceColumn: m.sourceColumn,
          targetField: m.targetField,
          category: m.category || 'metadata',
          metadataKey: m.metadataKey,
          confidence: m.confidence,
        }));
        setColumnMappings(mappings);
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setAiError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setFiles(acceptedFiles);
    setError(null);
    setAiAnalysis(null);
    setAiError(null);
    
    // Initialize progress for all files
    const initialProgress: Record<string, number> = {};
    acceptedFiles.forEach(f => { initialProgress[f.name] = 0; });
    setUploadProgress(initialProgress);

    // Parse CSV headers and sample data from the first CSV file
    if (uploadType === 'csv') {
      const firstCsv = acceptedFiles.find(f => f.name.endsWith('.csv'));
      if (firstCsv) {
        // Read more content for AI analysis (first 8KB)
        const text = await firstCsv.slice(0, 8192).text();
        const { headers, sampleRows } = parseCSVContent(text);
        
        if (headers.length > 0) {
          setCsvHeaders(headers);
          
          // Run AI analysis in background
          runAIAnalysis(headers, sampleRows, firstCsv.name);
        }
      }
    }
  }, [uploadType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: uploadType === 'csv' 
      ? { 'text/csv': ['.csv'] }
      : { 'application/pdf': ['.pdf'] },
    multiple: true,
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    onDropRejected: (rejections) => {
      const errors: string[] = [];
      for (const rejection of rejections) {
        for (const error of rejection.errors) {
          if (error.code === 'file-too-large') {
            errors.push(`${rejection.file.name}: File exceeds 50MB limit`);
          } else if (error.code === 'too-many-files') {
            errors.push(`Maximum ${MAX_FILES} files allowed at once`);
          } else if (error.code === 'file-invalid-type') {
            errors.push(`${rejection.file.name}: Invalid file type`);
          } else {
            errors.push(`${rejection.file.name}: ${error.message}`);
          }
        }
      }
      setError([...new Set(errors)].join('. '));
    },
  });

  const handleUploadFile = async () => {
    if (files.length === 0) return;
    setError(null);
    setIsUploading(true);

    const newUploadIds: string[] = [];
    const successfulUploadIds: string[] = [];

    try {
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentUploadIndex(i);

        // Start upload to get presigned URL
        let presignedUrl: string;
        let newUploadId: string;

        if (uploadType === 'csv') {
          const res = await startCsvUpload({
            fileName: file.name,
            contentType: 'text/csv',
            fileSize: file.size,
            entityType,
          });
          if (!res.ok) throw new Error(res.error);
          presignedUrl = res.data.presignedUrl;
          newUploadId = res.data.uploadId;
        } else {
          const res = await startPdfUpload({
            fileName: file.name,
            contentType: 'application/pdf',
            fileSize: file.size,
            entityType: 'contract',
          });
          if (!res.ok) throw new Error(res.error);
          presignedUrl = res.data.presignedUrl;
          newUploadId = res.data.uploadId;
        }

        newUploadIds.push(newUploadId);

        // Upload file to S3
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: Math.round((e.loaded / e.total) * 100),
            }));
          }
        });

        await new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed for ${file.name}: ${xhr.statusText || 'Storage error'}`));
            }
          };
          xhr.onerror = () => reject(new Error(`Upload failed for ${file.name}: Network error`));
          xhr.open('PUT', presignedUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

        // Mark this upload as successfully uploaded to S3
        successfulUploadIds.push(newUploadId);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      }

      setUploadIds(successfulUploadIds);
      
      // For CSV, go to mapping step; for PDF, go directly to review
      if (uploadType === 'csv') {
        setStep('configure-mapping');
      } else {
        setStep('review');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      
      // Clean up any database records for failed uploads
      // Only delete uploads that were created but not successfully uploaded to S3
      const failedUploadIds = newUploadIds.filter(id => !successfulUploadIds.includes(id));
      for (const uploadId of failedUploadIds) {
        try {
          await deleteUpload(uploadId);
        } catch {
          // Ignore cleanup errors - the record will be orphaned but that's better than crashing
          console.warn(`Failed to clean up upload ${uploadId}`);
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleComplete = () => {
    completeMutation.mutate();
  };

  const canProceed = () => {
    switch (step) {
      case 'select-type':
        return uploadType !== null;
      case 'upload-file':
        return files.length > 0 && Object.values(uploadProgress).every(p => p === 0);
      case 'configure-mapping':
        return true; // Optional
      case 'review':
        return true;
      default:
        return false;
    }
  };
  
  const totalProgress = files.length > 0 
    ? Math.round(Object.values(uploadProgress).reduce((a, b) => a + b, 0) / files.length)
    : 0;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-medium text-white">Upload Data</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {((): UploadStep[] => {
              const steps: UploadStep[] = ['select-type', 'upload-file'];
              if (uploadType === 'csv') steps.push('configure-mapping');
              steps.push('review');
              return steps;
            })().map((s, i, arr) => (
                <React.Fragment key={s}>
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                      step === s
                        ? 'bg-accent/20 text-accent'
                        : arr.indexOf(step) > i
                        ? 'text-green-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {arr.indexOf(step) > i ? (
                      <Check size={14} />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">
                        {i + 1}
                      </span>
                    )}
                    <span className="capitalize">{s.replace('-', ' ')}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight size={14} className="text-zinc-600" />
                  )}
                </React.Fragment>
              ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 'select-type' && (
              <motion.div
                key="select-type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-zinc-400 mb-4">Select the type of data you want to upload:</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setUploadType('csv')}
                    className={`p-6 rounded-xl border transition-all text-left ${
                      uploadType === 'csv'
                        ? 'border-accent bg-accent/10'
                        : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700'
                    }`}
                  >
                    <FileSpreadsheet size={32} className={uploadType === 'csv' ? 'text-accent' : 'text-green-400'} />
                    <h3 className="text-white font-medium mt-3">CSV File</h3>
                    <p className="text-zinc-500 text-sm mt-1">Upload customer, invoice, or contract data in CSV format.</p>
                  </button>

                  <button
                    onClick={() => setUploadType('pdf')}
                    className={`p-6 rounded-xl border transition-all text-left ${
                      uploadType === 'pdf'
                        ? 'border-accent bg-accent/10'
                        : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700'
                    }`}
                  >
                    <FileText size={32} className={uploadType === 'pdf' ? 'text-accent' : 'text-red-400'} />
                    <h3 className="text-white font-medium mt-3">PDF Contract</h3>
                    <p className="text-zinc-500 text-sm mt-1">Upload contract documents for text extraction and analysis.</p>
                  </button>
                </div>

                {uploadType === 'csv' && (
                  <div className="mt-4">
                    <label className="block text-sm text-zinc-400 mb-2">What type of data is this?</label>
                    <Select value={entityType} onChange={setEntityType}>
                      <option value="customer">Customers</option>
                      <option value="invoice">Invoices</option>
                      <option value="contract">Contracts</option>
                      <option value="payment">Payments</option>
                      <option value="product">Products</option>
                      <option value="subscription">Subscriptions</option>
                      <option value="usage">Usage Data</option>
                    </Select>
                    <p className="text-xs text-zinc-500 mt-1.5">Don't worry, we'll auto-detect this from your file</p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'upload-file' && (
              <motion.div
                key="upload-file"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-accent bg-accent/10'
                      : files.length > 0
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <input {...getInputProps()} />
                  {files.length > 0 ? (
                    <>
                      {uploadType === 'csv' ? (
                        <FileSpreadsheet size={48} className="mx-auto mb-3 text-green-400" />
                      ) : (
                        <FileText size={48} className="mx-auto mb-3 text-red-400" />
                      )}
                      <p className="text-white font-medium">
                        {files.length === 1 ? files[0].name : `${files.length} files selected`}
                      </p>
                      <p className="text-zinc-500 text-sm">
                        {(files.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)} KB total
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload size={48} className="mx-auto mb-3 text-zinc-500" />
                      <p className="text-white">Drop your {uploadType?.toUpperCase()} files here</p>
                      <p className="text-zinc-500 text-sm mt-1">or click to browse</p>
                      <p className="text-zinc-600 text-xs mt-2">Max {MAX_FILES} files, 50MB each</p>
                    </>
                  )}
                </div>

                {/* File list when multiple files selected */}
                {files.length > 1 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {files.map((file, idx) => (
                      <div key={file.name} className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {uploadType === 'csv' ? (
                            <FileSpreadsheet size={16} className="text-green-400" />
                          ) : (
                            <FileText size={16} className="text-red-400" />
                          )}
                          <span className="text-sm text-white truncate max-w-[200px]">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</span>
                          {uploadProgress[file.name] > 0 && (
                            <span className={`text-xs ${uploadProgress[file.name] === 100 ? 'text-green-400' : 'text-accent'}`}>
                              {uploadProgress[file.name]}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${totalProgress}%` }}
                      />
                    </div>
                    <p className="text-center text-sm text-zinc-400">
                      Uploading file {currentUploadIndex + 1} of {files.length}... {totalProgress}%
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'configure-mapping' && (
              <motion.div
                key="configure-mapping"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Header with data type selector */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-300 font-medium">Review column mappings</p>
                    <p className="text-zinc-500 text-sm">We've matched your columns. Adjust any that need changing.</p>
                  </div>
                  <Select value={entityType} onChange={setEntityType} className="w-36">
                    <option value="customer">Customers</option>
                    <option value="invoice">Invoices</option>
                    <option value="contract">Contracts</option>
                    <option value="payment">Payments</option>
                    <option value="product">Products</option>
                    <option value="subscription">Subscriptions</option>
                    <option value="usage">Usage Data</option>
                  </Select>
                </div>

                {/* Loading state */}
                {isAnalyzing && (
                  <div className="flex items-center justify-center py-6 text-zinc-400">
                    <Loader2 size={20} className="animate-spin mr-2" />
                    Analyzing your file...
                  </div>
                )}

                {aiError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <AlertCircle size={14} className="text-zinc-400 flex-shrink-0" />
                    <span className="text-zinc-400 text-sm">Auto-detection unavailable. Please map columns manually.</span>
                  </div>
                )}

                {/* Required fields checklist */}
                {(() => {
                  const required = REQUIRED_FIELDS[entityType] || REQUIRED_FIELDS.unknown;
                  const mappedFields = columnMappings.map(m => m.targetField);
                  const missingRequired = required.filter(r => !mappedFields.includes(r.field));
                  const hasAllRequired = missingRequired.length === 0;
                  
                  return (
                    <div className={`p-3 rounded-lg border ${
                      hasAllRequired 
                        ? 'bg-green-500/10 border-green-500/20' 
                        : 'bg-amber-500/10 border-amber-500/20'
                    }`}>
                      <p className={`text-sm font-medium mb-2 ${hasAllRequired ? 'text-green-400' : 'text-amber-300'}`}>
                        {hasAllRequired ? (
                          <>
                            <CheckCircle2 size={14} className="inline mr-1.5 -mt-0.5" />
                            All required fields mapped
                          </>
                        ) : (
                          <>
                            <AlertCircle size={14} className="inline mr-1.5 -mt-0.5" />
                            Map these required fields to continue:
                          </>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {required.map(({ field, label }) => {
                          const isMapped = mappedFields.includes(field);
                          return (
                            <span 
                              key={field}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                isMapped 
                                  ? 'bg-green-500/20 text-green-300' 
                                  : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {isMapped ? (
                                <Check size={12} />
                              ) : (
                                <X size={12} />
                              )}
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Column mappings - simplified UI */}
                {columnMappings.length > 0 ? (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {columnMappings.map((mapping) => {
                      const isMatched = mapping.targetField !== 'metadata_json';
                      // Get all target fields currently in use (except metadata_json and current mapping)
                      const usedTargets = columnMappings
                        .filter(m => m.sourceColumn !== mapping.sourceColumn && m.targetField !== 'metadata_json')
                        .map(m => m.targetField);
                      
                      return (
                        <div 
                          key={mapping.sourceColumn} 
                          className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                            isMatched 
                              ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700' 
                              : 'bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700'
                          }`}
                        >
                          {/* Status indicator */}
                          {isMatched ? (
                            <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                          ) : (
                            <Circle size={16} className="text-zinc-600 flex-shrink-0" />
                          )}
                          
                          {/* Source column name */}
                          <span className="w-1/3 text-white truncate text-sm font-medium" title={mapping.sourceColumn}>
                            {mapping.sourceColumn}
                          </span>
                          
                          <ArrowRight size={14} className="text-zinc-600 flex-shrink-0" />
                          
                          {/* Target field selector */}
                          <Select
                            value={mapping.targetField}
                            onChange={(newTarget) => {
                              const isMetadata = newTarget === 'metadata_json';
                              setColumnMappings(prev => prev.map(m => 
                                m.sourceColumn === mapping.sourceColumn 
                                  ? { 
                                      ...m, 
                                      targetField: newTarget,
                                      category: isMetadata ? 'metadata' : (m.category === 'metadata' ? 'standard' : m.category),
                                      metadataKey: isMetadata ? mapping.sourceColumn.toLowerCase().replace(/[^a-z0-9]/g, '_') : undefined,
                                    }
                                  : m
                              ));
                            }}
                            className="flex-1"
                          >
                            <option value="metadata_json">Keep as extra data</option>
                            <option disabled>──────────</option>
                            {FIELD_OPTIONS.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {group.options.map((opt) => {
                                  const isUsed = usedTargets.includes(opt.value);
                                  return (
                                    <option 
                                      key={opt.value} 
                                      value={opt.value}
                                      disabled={isUsed}
                                    >
                                      {opt.label}{isUsed ? ' (already mapped)' : ''}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            ))}
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                ) : csvHeaders.length > 0 ? (
                  <div className="flex items-center justify-center py-8 text-zinc-500">
                    <Loader2 size={20} className="animate-spin mr-2" />
                    Analyzing your file...
                  </div>
                ) : (
                  <p className="text-zinc-500 text-center py-4">No column headers detected.</p>
                )}

                {/* Summary - what will happen */}
                {columnMappings.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                    <p className="text-xs text-zinc-400">
                      <span className="text-green-400 font-medium">
                        {columnMappings.filter(m => m.targetField !== 'metadata_json').length} columns
                      </span>
                      {' '}will be imported as standard fields.
                      {columnMappings.filter(m => m.targetField === 'metadata_json').length > 0 && (
                        <>
                          {' '}
                          <span className="text-zinc-300">
                            {columnMappings.filter(m => m.targetField === 'metadata_json').length} columns
                          </span>
                          {' '}will be kept as extra data for reference.
                        </>
                      )}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-zinc-400">Review your upload settings:</p>

                {/* AI Badge */}
                {aiAnalysis?.aiPowered && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/10 border border-accent/20">
                    <Sparkles size={16} className="text-accent" />
                    <span className="text-accent text-sm">Configuration auto-detected by AI</span>
                  </div>
                )}

                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">File Type</span>
                    <span className="text-white uppercase">{uploadType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Files</span>
                    <span className="text-white">{files.length} file{files.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total Size</span>
                    <span className="text-white">{(files.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)} KB</span>
                  </div>
                  {uploadType === 'csv' && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">Data Type</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white capitalize">{entityType}</span>
                          {aiAnalysis && aiAnalysis.entityType === entityType && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <Sparkles size={10} /> Auto-detected
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">Columns Found</span>
                        <span className="text-white">{columnMappings.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">Matched Fields</span>
                        <span className="text-green-400">{columnMappings.filter(m => m.targetField !== 'metadata_json').length}</span>
                      </div>
                      {columnMappings.filter(m => m.targetField === 'metadata_json').length > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Extra Data</span>
                          <span className="text-zinc-400">{columnMappings.filter(m => m.targetField === 'metadata_json').length} columns</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <div className="space-y-2 max-h-24 overflow-y-auto">
                    {files.map((file) => (
                      <div key={file.name} className="flex items-center justify-between px-3 py-1.5 bg-zinc-800/30 rounded">
                        <span className="text-sm text-zinc-300 truncate max-w-[250px]">{file.name}</span>
                        <span className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-zinc-500 text-sm">
                  Click "Complete Upload" to start processing your data.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-between">
          <button
            onClick={() => {
              if (step === 'select-type') {
                onClose();
              } else if (step === 'upload-file') {
                setStep('select-type');
                setFiles([]);
                setUploadProgress({});
              } else if (step === 'configure-mapping') {
                setStep('upload-file');
              } else if (step === 'review') {
                setStep(uploadType === 'csv' ? 'configure-mapping' : 'upload-file');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {step === 'upload-file' && files.length > 0 && !isUploading && totalProgress === 0 && (
            <button
              onClick={handleUploadFile}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              Upload {files.length > 1 ? `${files.length} Files` : 'File'}
            </button>
          )}

          {step === 'select-type' && uploadType && (
            <button
              onClick={() => setStep('upload-file')}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
            >
              Next
              <ArrowRight size={16} />
            </button>
          )}

          {step === 'configure-mapping' && (() => {
            const required = REQUIRED_FIELDS[entityType] || REQUIRED_FIELDS.unknown;
            const mappedFields = columnMappings.map(m => m.targetField);
            const hasAllRequired = required.every(r => mappedFields.includes(r.field));
            
            return (
              <button
                onClick={() => setStep('review')}
                disabled={!hasAllRequired}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  hasAllRequired
                    ? 'bg-accent hover:bg-accent/90 text-white'
                    : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                }`}
                title={hasAllRequired ? undefined : 'Map all required fields to continue'}
              >
                Next
                <ArrowRight size={16} />
              </button>
            );
          })()}

          {step === 'review' && (
            <button
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {completeMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Complete Upload
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default UploadWizardModal;
