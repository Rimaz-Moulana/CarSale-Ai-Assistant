import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  RotateCw,
  Eye,
  FileText,
  Calendar,
  FolderOpen,
  UserCheck,
  Folder,
  ArrowLeft,
  ChevronRight,
  Play,
  ChevronLeftSquare,
  ChevronRightSquare
} from 'lucide-react';
import { ImageVerificationService, DropboxFolder } from '@/services/ImageVerificationService';
import { CarsService } from '@/services/CarsService';
import type { CarImageVerification, Car } from '@/services/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export function ImageVerification() {
  const [activeTab, setActiveTab] = useState<'history' | 'browser'>('history');
  const [history, setHistory] = useState<CarImageVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected Audit Modal
  const [selectedAudit, setSelectedAudit] = useState<CarImageVerification | null>(null);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [overrideStatus, setOverrideStatus] = useState<'Passed' | 'Failed' | 'Pending Review'>('Passed');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  // Slider Index states for details modal
  const [dbImgIdx, setDbImgIdx] = useState(0);
  const [dropboxImgIdx, setDropboxImgIdx] = useState(0);

  // Folder Browser state
  const [currentPath, setCurrentPath] = useState<string>('');
  const [folders, setFolders] = useState<DropboxFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // Manual folder verification modal
  const [selectedFolderToVerify, setSelectedFolderToVerify] = useState<string | null>(null);
  const [matchedCar, setMatchedCar] = useState<Car | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [verifyingFolder, setVerifyingFolder] = useState(false);
  const [searchingCar, setSearchingCar] = useState(false);
  const [carSearchQuery, setCarSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Car[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'browser') {
      loadFolders(currentPath);
    }
  }, [activeTab, currentPath]);

  async function loadHistory() {
    setLoading(true);
    try {
      const data = await ImageVerificationService.getHistory();
      setHistory(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load verification history");
    } finally {
      setLoading(false);
    }
  }

  async function loadFolders(path: string) {
    setLoadingFolders(true);
    try {
      const data = await ImageVerificationService.getFolders(path);
      setFolders(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to browse Dropbox folders");
    } finally {
      setLoadingFolders(false);
    }
  }

  async function handleScanAll() {
    setVerifying(true);
    toast.info("Scanning sync folder and verifying vehicle photos...");
    try {
      const results = await ImageVerificationService.verifyAll();
      toast.success(`Scan completed. Processed ${results.length} vehicle folders.`);
      loadHistory();
    } catch (err) {
      console.error(err);
      toast.error("Scan failed. Ensure AI service is running.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleOpenDetails(audit: CarImageVerification) {
    setSelectedAudit(audit);
    setOverrideStatus(audit.status);
    setOverrideNotes('');
    setImageFiles([]);
    setDbImgIdx(0);
    setDropboxImgIdx(0);

    try {
      const files = await ImageVerificationService.getFiles(audit.chassisNumber);
      setImageFiles(files);
    } catch (err) {
      console.error("Failed to load image files", err);
    }
  }

  async function handleSaveOverride() {
    if (!selectedAudit) return;
    setSavingOverride(true);
    try {
      const updated = await ImageVerificationService.overrideStatus(
        selectedAudit.id,
        overrideStatus,
        overrideNotes
      );
      toast.success("Manual override saved successfully");
      setSelectedAudit(null);
      loadHistory();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save manual override");
    } finally {
      setSavingOverride(false);
    }
  }

  async function handleOpenVerifyFolder(folderPath: string) {
    setSelectedFolderToVerify(folderPath);
    setSearchingCar(true);
    setMatchedCar(null);
    setSelectedCarId('');
    setCarSearchQuery('');
    setSearchResults([]);

    try {
      const segments = folderPath.split('/').map(s => s.trim()).filter(Boolean);

      let candidateSegments = segments.filter(s => s.length === 17);
      if (candidateSegments.length === 0) {
        candidateSegments = segments.filter(s => s.length >= 5 && s.toLowerCase() !== 'all files');
      }
      if (candidateSegments.length === 0 && segments.length > 0) {
        candidateSegments = [segments[segments.length - 1]];
      }

      let foundCar: Car | null = null;

      for (const query of candidateSegments) {
        const response = await CarsService.getCars(1, 10, query);
        const match = response.data.find(c =>
          folderPath.toLowerCase().includes(c.vin.toLowerCase()) ||
          c.vin.toLowerCase().includes(query.toLowerCase())
        );
        if (match) {
          foundCar = match;
          break;
        }
      }

      if (!foundCar) {
        const response = await CarsService.getCars(1, 100);
        const match = response.data.find(c => folderPath.toLowerCase().includes(c.vin.toLowerCase()));
        if (match) {
          foundCar = match;
        }
      }

      if (foundCar) {
        setMatchedCar(foundCar);
        setSelectedCarId(foundCar.id.toString());
        toast.success(`Automatically matched vehicle: ${foundCar.brand || foundCar.make} ${foundCar.model} (VIN: ${foundCar.vin})`);
      } else {
        toast.warning("No matching vehicle found in database for this directory path.");
      }
    } catch (err) {
      console.error("Error matching vehicle to directory:", err);
    } finally {
      setSearchingCar(false);
    }
  }

  async function handleSearchCar(query: string) {
    setCarSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchingCar(true);
    try {
      const response = await CarsService.getCars(1, 10, query);
      setSearchResults(response.data);
    } catch (err) {
      console.error("Error searching cars:", err);
    } finally {
      setSearchingCar(false);
    }
  }

  function handleSelectCar(car: Car) {
    setMatchedCar(car);
    setSelectedCarId(car.id.toString());
    setSearchResults([]);
    setCarSearchQuery('');
    toast.success(`Selected vehicle: ${car.brand || car.make} ${car.model} (VIN: ${car.vin})`);
  }

  async function handleVerifyFolderSubmit() {
    if (!selectedFolderToVerify) return;
    if (!matchedCar) {
      toast.error("Please select or match a vehicle first.");
      return;
    }
    setVerifyingFolder(true);
    toast.info("Running automated visual matching audit...");

    try {
      const result = await ImageVerificationService.verifyMatch(matchedCar.vin);
      toast.success(`Verification completed: Status ${result.status} (Decision: ${result.decision})`);
      setSelectedFolderToVerify(null);
      setActiveTab('history');
      loadHistory();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to run image matching audit.");
    } finally {
      setVerifyingFolder(false);
    }
  }

  function navigateToFolder(path: string) {
    setCurrentPath(path);
  }

  function navigateUp() {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  }

  // Statistics
  const total = history.length;
  const passed = history.filter(h => h.status === 'Passed').length;
  const failed = history.filter(h => h.status === 'Failed').length;
  const pending = history.filter(h => h.status === 'Pending Review').length;

  // Filter history
  const filteredHistory = history.filter(h => {
    const matchesSearch = h.chassisNumber.toLowerCase().includes(search.toLowerCase()) ||
      (h.car?.brand?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (h.car?.model?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (h.car?.make?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'All' || h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Breadcrumbs builder
  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dropbox Image Verification</h2>
          <p className="text-slate-500 text-sm mt-1">Audit vehicle photo uploads against database configurations using AI vision.</p>
        </div>
        <Button onClick={handleScanAll} disabled={verifying || loading} className="sm:w-auto w-full">
          <RotateCw className={`w-4 h-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
          {verifying ? 'Scanning...' : 'Scan Sync Folders'}
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Audits Run</CardTitle>
            <FileText className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Passed Checks</CardTitle>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{loading ? '...' : passed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Flagged Mismatches</CardTitle>
            <XCircle className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{loading ? '...' : failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{loading ? '...' : pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'history'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          Audit History
        </button>
        <button
          onClick={() => setActiveTab('browser')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'browser'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          Dropbox Folder Browser
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'history' ? (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by VIN, Make, or Model..."
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="All">All Statuses</option>
                      <option value="Passed">Passed</option>
                      <option value="Failed">Failed (Mismatched)</option>
                      <option value="Pending Review">Pending Review</option>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chassis No (VIN)</TableHead>
                      <TableHead>Expected Vehicle</TableHead>
                      <TableHead>Dropbox Upload Directory</TableHead>
                      <TableHead>Audit Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [1, 2, 3, 4].map(i => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="w-24 h-4" /></TableCell>
                          <TableCell><Skeleton className="w-32 h-4" /></TableCell>
                          <TableCell><Skeleton className="w-48 h-4" /></TableCell>
                          <TableCell><Skeleton className="w-24 h-4" /></TableCell>
                          <TableCell><Skeleton className="w-16 h-6 rounded-full" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="w-8 h-8 rounded-md ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <EmptyState
                            icon={<AlertCircle className="w-6 h-6" />}
                            title="No verification history found"
                            description="Click 'Scan Sync Folders' above to search your Dropbox structure for new uploads."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((audit) => (
                        <TableRow key={audit.id}>
                          <TableCell className="font-mono text-sm font-semibold">{audit.chassisNumber.toUpperCase()}</TableCell>
                          <TableCell>
                            {audit.car ? (
                              <div>
                                <div className="font-medium">{audit.car.brand || audit.car.make} {audit.car.model}</div>
                                <div className="text-xs text-slate-500">{audit.car.color} | {audit.car.year}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400">Loading car details...</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-500 max-w-xs truncate" title={audit.dropboxPath}>
                            <FolderOpen className="inline-block w-4 h-4 mr-1 text-slate-400" />
                            {audit.dropboxPath || 'Root'}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {new Date(audit.checkedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${audit.status === 'Passed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                              audit.status === 'Failed' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' :
                                'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              }`}>
                              {audit.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDetails(audit)} title="View Details">
                              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="browser-tab"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
                {/* Folder Path Breadcrumbs */}
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 flex-wrap gap-1 font-medium">
                  <button
                    onClick={() => navigateToFolder('')}
                    className="hover:text-blue-600 font-semibold"
                  >
                    Dropbox Root
                  </button>
                  {pathParts.map((part, idx) => {
                    const fullSubPath = '/' + pathParts.slice(0, idx + 1).join('/');
                    return (
                      <React.Fragment key={idx}>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <button
                          onClick={() => navigateToFolder(fullSubPath)}
                          className="hover:text-blue-600 max-w-[120px] truncate"
                        >
                          {part}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-4">
                  {currentPath && (
                    <Button variant="outline" size="sm" onClick={navigateUp}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                  )}
                  <span className="text-xs text-slate-500">
                    Browse subfolders recursively to match custom upload layouts (e.g. `All files/VIN/YardName/Date`)
                  </span>
                </div>

                <div className="grid gap-2">
                  {loadingFolders ? (
                    [1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-5 h-5 rounded" />
                          <Skeleton className="w-32 h-4" />
                        </div>
                        <Skeleton className="w-24 h-8 rounded" />
                      </div>
                    ))
                  ) : folders.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      <Folder className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No subfolders found</h4>
                      <p className="text-xs text-slate-400 mt-1">This directory does not contain any subdirectories.</p>
                      {currentPath && (
                        <Button
                          onClick={() => handleOpenVerifyFolder(currentPath)}
                          className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                          size="sm"
                        >
                          <Play className="w-3.5 h-3.5 mr-2" /> Verify Current Directory
                        </Button>
                      )}
                    </div>
                  ) : (
                    folders.map((folder) => (
                      <div
                        key={folder.path}
                        className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                      >
                        <button
                          onClick={() => navigateToFolder(folder.path)}
                          className="flex items-center gap-3 font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 text-sm"
                        >
                          <Folder className="w-5 h-5 text-blue-500 fill-blue-500/20" />
                          {folder.name.length === 17 ? folder.name.toUpperCase() : folder.name}
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenVerifyFolder(folder.path)}
                          className="border-blue-500/30 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                        >
                          <Play className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          Run AI Audit
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details & Override Dialog */}
      <Dialog open={selectedAudit !== null} onOpenChange={() => setSelectedAudit(null)}>
        <DialogContent className="max-w-4xl" onClose={() => setSelectedAudit(null)}>
          {selectedAudit && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>Verification Audit details for VIN: </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">{selectedAudit.chassisNumber.toUpperCase()}</span>
                </DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column: Specs & DB Info */}
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2 border border-slate-100 dark:border-slate-800">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Official Database Specs</h4>
                      {selectedAudit.car ? (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-slate-500">Brand:</span> {selectedAudit.car.brand || selectedAudit.car.make}</div>
                          <div><span className="text-slate-500">Model:</span> {selectedAudit.car.model}</div>
                          <div><span className="text-slate-500">Color:</span> {selectedAudit.car.color}</div>
                          <div><span className="text-slate-500">Year:</span> {selectedAudit.car.year}</div>
                        </div>
                      ) : (
                        <p className="text-xs text-rose-500">Database specs missing.</p>
                      )}
                    </div>

                    {/* Overall Vector Status Metrics */}
                    {selectedAudit.overallScore !== undefined && (
                      <div className="p-4 bg-blue-50/50 dark:bg-blue-955/20 border border-blue-200 dark:border-blue-800/40 rounded-lg grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Similarity</div>
                          <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {(selectedAudit.overallScore * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Confidence</div>
                          <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {selectedAudit.confidence}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Decision</div>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                            selectedAudit.decision === 'MATCH' ? 'bg-emerald-100 text-emerald-700' :
                            selectedAudit.decision === 'NO_MATCH' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {selectedAudit.decision}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2 border border-slate-100 dark:border-slate-800">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">AI Diagnostic Notes</h4>
                      <div className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto font-mono">
                        {selectedAudit.resultNotes || 'No logs generated.'}
                      </div>
                    </div>

                    {/* Manual Override Form */}
                    <div className="p-4 bg-amber-50/50 dark:bg-amber-955/10 rounded-lg border border-amber-200 dark:border-amber-900/30 space-y-4">
                      <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4" />
                        Manual Audit Override
                      </h4>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">Override Status</label>
                          <Select
                            value={overrideStatus}
                            onChange={(e) => setOverrideStatus(e.target.value as any)}
                          >
                            <option value="Passed">Pass / Match Verified</option>
                            <option value="Failed">Fail / Flag Mismatch</option>
                            <option value="Pending Review">Mark Pending Review</option>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">Auditor Notes / Rationale</label>
                          <Input
                            value={overrideNotes}
                            onChange={(e) => setOverrideNotes(e.target.value)}
                            placeholder="Explain reason for manual override..."
                          />
                        </div>
                        <Button
                          onClick={handleSaveOverride}
                          disabled={savingOverride}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {savingOverride ? 'Saving...' : 'Save Override'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Matched Image Pairs Side by Side */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Matched Image Pairs Analysis
                    </h4>

                    {selectedAudit.matches && selectedAudit.matches.length > 0 ? (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {selectedAudit.matches.map((match: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-slate-500">Reference Photo</span>
                                <div className="relative aspect-[4/3] rounded overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800">
                                  <img src={match.applicationImage} alt="Ref" className="w-full h-full object-cover" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-slate-500 truncate block">Dropbox: {match.dropboxImageName}</span>
                                <div className="relative aspect-[4/3] rounded overflow-hidden bg-slate-955 border border-slate-200 dark:border-slate-800">
                                  <img
                                    src={ImageVerificationService.getImageUrl(selectedAudit.chassisNumber, match.dropboxImageName)}
                                    alt="Dropbox upload"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5 text-xs">
                              <div>
                                <span className="text-slate-500">Similarity: </span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{(match.similarity * 100).toFixed(1)}%</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                match.decision === 'MATCH' ? 'bg-emerald-100 text-emerald-700' :
                                match.decision === 'NO_MATCH' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {match.decision}
                              </span>
                            </div>
                            {match.explanation && (
                              <div className="text-[11px] bg-slate-100 dark:bg-slate-800 p-2 rounded text-slate-600 dark:text-slate-400 italic">
                                {match.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Fallback if no matching records exist (e.g. for legacy records)
                      <div className="space-y-4">
                        <p className="text-xs text-amber-600 font-semibold bg-amber-50 dark:bg-amber-955/20 p-2 rounded">
                          Legacy Audit Record: Detailed similarity analysis not recorded.
                        </p>
                        {imageFiles.length > 0 && (
                          <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 group">
                            <div className="absolute top-2 left-2 z-10 bg-slate-950/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                              {imageFiles[dropboxImgIdx % imageFiles.length]}
                            </div>
                            <img
                              src={ImageVerificationService.getImageUrl(selectedAudit.chassisNumber, imageFiles[dropboxImgIdx % imageFiles.length])}
                              alt="Dropbox legacy view"
                              className="w-full h-full object-cover"
                            />
                            {imageFiles.length > 1 && (
                              <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                <button
                                  onClick={() => setDropboxImgIdx(prev => (prev - 1 + imageFiles.length) % imageFiles.length)}
                                  className="bg-black/70 hover:bg-black/90 text-white rounded p-1"
                                >
                                  <ChevronLeftSquare className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-white font-mono bg-black/60 px-2 py-0.5 rounded">
                                  {dropboxImgIdx % imageFiles.length + 1}/{imageFiles.length}
                                </span>
                                <button
                                  onClick={() => setDropboxImgIdx(prev => (prev + 1) % imageFiles.length)}
                                  className="bg-black/70 hover:bg-black/90 text-white rounded p-1"
                                >
                                  <ChevronRightSquare className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedAudit(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Verify Selection Modal */}
      <Dialog open={selectedFolderToVerify !== null} onOpenChange={() => setSelectedFolderToVerify(null)}>
        <DialogContent className="max-w-md" onClose={() => setSelectedFolderToVerify(null)}>
          {selectedFolderToVerify && (
            <>
              <DialogHeader>
                <DialogTitle>Verify Dropbox Folder</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Selected Folder Path:</span>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded font-mono text-xs break-all text-slate-700 dark:text-slate-300">
                    {selectedFolderToVerify}
                  </div>
                </div>

                {searchingCar && !matchedCar ? (
                  <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-lg space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : matchedCar ? (
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Matched Database Vehicle
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                        Selected
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {matchedCar.brand || matchedCar.make} {matchedCar.model} ({matchedCar.year})
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                      <div><span className="font-semibold">VIN:</span> <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono">{matchedCar.vin}</code></div>
                      <div><span className="font-semibold">Color:</span> {matchedCar.color}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/20 rounded-lg text-center">
                    <AlertCircle className="w-5 h-5 text-rose-500 mx-auto mb-1.5" />
                    <div className="text-xs font-semibold text-rose-800 dark:text-rose-400">
                      No Vehicle Matched
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Please use the search below to manually find the vehicle.
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Search / Change Vehicle
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Type VIN, Make or Model to search..."
                      className="pl-9"
                      value={carSearchQuery}
                      onChange={(e) => handleSearchCar(e.target.value)}
                    />
                  </div>
                  {searchingCar && carSearchQuery && <div className="text-[10px] text-slate-400 animate-pulse">Searching database...</div>}
                  {searchResults.length > 0 && (
                    <div className="mt-1 border border-slate-200 dark:border-slate-800 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950 shadow-md">
                      {searchResults.map((car) => (
                        <button
                          key={car.id}
                          onClick={() => handleSelectCar(car)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              {car.brand || car.make} {car.model} ({car.year})
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{car.vin}</div>
                          </div>
                          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">{car.color}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {carSearchQuery && searchResults.length === 0 && !searchingCar && (
                    <div className="text-[11px] text-slate-400 text-center py-2">
                      No vehicles found matching "{carSearchQuery}"
                    </div>
                  )}
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedFolderToVerify(null)}>Cancel</Button>
                <Button
                  onClick={handleVerifyFolderSubmit}
                  disabled={verifyingFolder || !selectedCarId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {verifyingFolder ? 'Auditing...' : 'Run Audit'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
