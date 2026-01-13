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
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { startCsvUpload, completeCsvUpload, startPdfUpload, completePdfUpload } from '@/lib/api/endpoints';

interface UploadWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type UploadStep = 'select-type' | 'upload-file' | 'configure-mapping' | 'review';
type UploadType = 'csv' | 'pdf';

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  required: boolean;
}

export function UploadWizardModal({ isOpen, onClose, onComplete }: UploadWizardModalProps) {
  const [step, setStep] = useState<UploadStep>('select-type');
  const [uploadType, setUploadType] = useState<UploadType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState<string>('customer');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

  // Start CSV upload mutation
  const startCsvMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      const res = await startCsvUpload({
        fileName: file.name,
        contentType: 'text/csv',
        entityType,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  // Start PDF upload mutation
  const startPdfMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      const res = await startPdfUpload({
        fileName: file.name,
        contentType: 'application/pdf',
        entityType: 'contract',
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  // Complete upload mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!uploadId) throw new Error('No upload ID');
      
      if (uploadType === 'csv') {
        const mapping = columnMappings.length > 0 ? {
          entityType,
          columns: columnMappings.map(m => ({
            sourceColumn: m.sourceColumn,
            targetField: m.targetField,
          })),
          skipHeaderRow: true,
          delimiter: ',',
        } : undefined;

        const res = await completeCsvUpload(uploadId, mapping);
        if (!res.ok) throw new Error(res.error);
        return res.data;
      } else {
        const res = await completePdfUpload(uploadId);
        if (!res.ok) throw new Error(res.error);
        return res.data;
      }
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
    setFile(null);
    setEntityType('customer');
    setUploadProgress(0);
    setUploadId(null);
    setError(null);
    setCsvHeaders([]);
    setColumnMappings([]);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const droppedFile = acceptedFiles[0];
    if (!droppedFile) return;

    setFile(droppedFile);
    setError(null);

    // Parse CSV headers if CSV
    if (uploadType === 'csv' && droppedFile.name.endsWith('.csv')) {
      const text = await droppedFile.slice(0, 4096).text();
      const firstLine = text.split('\n')[0];
      const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      setCsvHeaders(headers);
      
      // Auto-map obvious columns
      const autoMappings: ColumnMapping[] = [];
      const targetFields = [
        { patterns: ['id', 'external_id', 'customer_id'], field: 'external_id', required: true },
        { patterns: ['name', 'company', 'company_name'], field: 'name', required: true },
        { patterns: ['email', 'e-mail'], field: 'email', required: false },
        { patterns: ['phone', 'telephone'], field: 'phone', required: false },
        { patterns: ['address', 'billing_address'], field: 'billing_address', required: false },
      ];

      for (const header of headers) {
        const lower = header.toLowerCase();
        for (const target of targetFields) {
          if (target.patterns.some(p => lower.includes(p))) {
            autoMappings.push({
              sourceColumn: header,
              targetField: target.field,
              required: target.required,
            });
            break;
          }
        }
      }
      setColumnMappings(autoMappings);
    }
  }, [uploadType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: uploadType === 'csv' 
      ? { 'text/csv': ['.csv'] }
      : { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleUploadFile = async () => {
    if (!file) return;
    setError(null);

    try {
      // Start upload to get presigned URL
      let presignedUrl: string;
      let newUploadId: string;

      if (uploadType === 'csv') {
        const data = await startCsvMutation.mutateAsync();
        presignedUrl = data.presignedUrl;
        newUploadId = data.uploadId;
      } else {
        const data = await startPdfMutation.mutateAsync();
        presignedUrl = data.presignedUrl;
        newUploadId = data.uploadId;
      }

      setUploadId(newUploadId);

      // Upload file to S3
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setUploadProgress(100);
      
      // For CSV, go to mapping step; for PDF, go directly to review
      if (uploadType === 'csv') {
        setStep('configure-mapping');
      } else {
        setStep('review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
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
        return file !== null && uploadProgress === 0;
      case 'configure-mapping':
        return true; // Optional
      case 'review':
        return true;
      default:
        return false;
    }
  };

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
                    <label className="block text-sm text-zinc-400 mb-2">Entity Type</label>
                    <select
                      value={entityType}
                      onChange={(e) => setEntityType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-accent focus:outline-none"
                    >
                      <option value="customer">Customers</option>
                      <option value="invoice">Invoices</option>
                      <option value="contract">Contracts</option>
                      <option value="payment">Payments</option>
                      <option value="product">Products</option>
                    </select>
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
                      : file
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <input {...getInputProps()} />
                  {file ? (
                    <>
                      {uploadType === 'csv' ? (
                        <FileSpreadsheet size={48} className="mx-auto mb-3 text-green-400" />
                      ) : (
                        <FileText size={48} className="mx-auto mb-3 text-red-400" />
                      )}
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-zinc-500 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                    </>
                  ) : (
                    <>
                      <Upload size={48} className="mx-auto mb-3 text-zinc-500" />
                      <p className="text-white">Drop your {uploadType?.toUpperCase()} file here</p>
                      <p className="text-zinc-500 text-sm mt-1">or click to browse</p>
                    </>
                  )}
                </div>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-center text-sm text-zinc-400">Uploading... {uploadProgress}%</p>
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
                <p className="text-zinc-400">Map your CSV columns to the target fields:</p>

                {csvHeaders.length > 0 ? (
                  <div className="space-y-3">
                    {csvHeaders.map((header) => {
                      const mapping = columnMappings.find(m => m.sourceColumn === header);
                      return (
                        <div key={header} className="flex items-center gap-3">
                          <span className="w-1/3 text-white truncate">{header}</span>
                          <ArrowRight size={14} className="text-zinc-600" />
                          <select
                            value={mapping?.targetField ?? ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                setColumnMappings(prev => [
                                  ...prev.filter(m => m.sourceColumn !== header),
                                  { sourceColumn: header, targetField: e.target.value, required: false },
                                ]);
                              } else {
                                setColumnMappings(prev => prev.filter(m => m.sourceColumn !== header));
                              }
                            }}
                            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-accent focus:outline-none text-sm"
                          >
                            <option value="">-- Skip --</option>
                            <option value="external_id">External ID</option>
                            <option value="name">Name</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="billing_address">Billing Address</option>
                            <option value="tax_id">Tax ID</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-zinc-500">No headers detected. Proceeding with default mapping.</p>
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

                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">File Type</span>
                    <span className="text-white uppercase">{uploadType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">File Name</span>
                    <span className="text-white">{file?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">File Size</span>
                    <span className="text-white">{file ? (file.size / 1024).toFixed(1) : 0} KB</span>
                  </div>
                  {uploadType === 'csv' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Entity Type</span>
                        <span className="text-white capitalize">{entityType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Mapped Columns</span>
                        <span className="text-white">{columnMappings.length}</span>
                      </div>
                    </>
                  )}
                </div>

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
                setFile(null);
                setUploadProgress(0);
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

          {step === 'upload-file' && file && uploadProgress === 0 && (
            <button
              onClick={handleUploadFile}
              disabled={startCsvMutation.isPending || startPdfMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {startCsvMutation.isPending || startPdfMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              Upload
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

          {step === 'configure-mapping' && (
            <button
              onClick={() => setStep('review')}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
            >
              Next
              <ArrowRight size={16} />
            </button>
          )}

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
