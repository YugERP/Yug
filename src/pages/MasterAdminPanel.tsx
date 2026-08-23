import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Card, Button, Label, Input } from '../components/UI';
import { 
  School, Building, Plus, Trash2, Download, Upload, FileJson, FileText, 
  CheckCircle2, AlertTriangle, Edit, X, Cloud, Copy, Check, Clock, 
  RefreshCw, ExternalLink, Database, FileSpreadsheet, HardDrive, 
  ShieldCheck, Image as ImageIcon, Sparkles, FolderSync, CheckCircle,
  Eye, EyeOff, LogIn, Key, Lock
} from 'lucide-react';
import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadBackupToGoogleDrive, getGoogleDriveAccessToken } from '../utils/googleDrive';

export function MasterAdminPanel() {
  const { 
    schools, 
    users, 
    setCurrentUser,
    addSchool, 
    updateSchool,
    updateSchoolFeatures,
    deleteSchool, 
    activeAcademicSession, 
    setActiveAcademicSession, 
    students, 
    allStudents,
    allMarks,
    allFeeRecords,
    attendances,
    teachers,
    deleteAllStudentsInSchool,
    feeRecords, 
    academicSessions, 
    allowedSessions, 
    setAllowedSessions,
    sessionRequests,
    approveSessionRequest,
    deleteSessionRequest
  } = useStore();
  
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolMobile, setNewSchoolMobile] = useState('');
  const [newSchoolAltMobile, setNewSchoolAltMobile] = useState('');
  const [newSchoolUdise, setNewSchoolUdise] = useState('');
  const [newSchoolLogo, setNewSchoolLogo] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');

  const [pendingFeaturesMap, setPendingFeaturesMap] = useState<Record<string, string[]>>({});

  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [schoolEditForm, setSchoolEditForm] = useState<any>({});
  const [showEditPassword, setShowEditPassword] = useState(true);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Session Config States
  const [sessionConfigTarget, setSessionConfigTarget] = useState('2026-27');
  const [showFullSessionsGrid, setShowFullSessionsGrid] = useState(false);

  // Sync Hub State - defaults to 'all' for Global Master Backup
  const [syncSchoolId, setSyncSchoolId] = useState('all');
  const [syncCategory, setSyncCategory] = useState<'students' | 'imadate_drive' | 'cloud_snapshots' | 'profile'>('students');
  const [importStatus, setImportStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Google Drive Scheduler & Auto-Backup states
  const [scriptCopied, setScriptCopied] = useState(false);
  const [gdriveFolder, setGdriveFolder] = useState(() => localStorage.getItem('gdrive_folder') || 'School Management Backups');
  const [backupScheduleEnabled, setBackupScheduleEnabled] = useState(() => {
    const stored = localStorage.getItem('backup_schedule_enabled');
    return stored !== null ? stored === 'true' : true;
  });
  const [gdriveStatus, setGdriveStatus] = useState<'disconnected' | 'connecting' | 'connected'>(() => {
    return (localStorage.getItem('gdrive_status') as 'disconnected' | 'connecting' | 'connected') || 'connected';
  });
  const [gdriveUser, setGdriveUser] = useState(() => localStorage.getItem('gdrive_user') || 'shankaldeep4@gmail.com');
  const [showDriveAssistantModal, setShowDriveAssistantModal] = useState(false);
  const [lastBackupDetails, setLastBackupDetails] = useState<{ 
    fileName: string; 
    size: string; 
    studentsCount: number; 
    photosCount: number;
    gdriveUploaded?: boolean;
    gdriveFileLink?: string;
    gdriveError?: string;
    backupPackage?: any;
  } | null>(null);
  const [isDriveUploading, setIsDriveUploading] = useState(false);

  // Realtime Cloud Backups from Firestore
  const [firestoreCloudBackups, setFirestoreCloudBackups] = useState<{ id: string, schoolId: string, schoolName: string, exportedAt: string, studentsCount: number, studentsWithPhotosCount?: number, marksCount: number, attendancesCount?: number, feeRecordsCount?: number, size: string, snapshot?: string }[]>([]);

  // Subscribe to real Firestore 'school_backups' collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'school_backups'), (snap) => {
      const list: any[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const rawSnap = d.snapshot || '';
        const sizeKB = d.size || `${((d.dataLength || rawSnap.length || 1024) / 1024).toFixed(1)} KB`;
        list.push({
          id: d.id || docSnap.id,
          schoolId: d.schoolId || '',
          schoolName: d.schoolName || 'School Node Backup',
          exportedAt: d.exportedAt || new Date().toISOString(),
          studentsCount: d.studentsCount ?? (d.students?.length || 0),
          studentsWithPhotosCount: d.studentsWithPhotosCount ?? (d.studentsWithPhotos || 0),
          marksCount: d.marksCount ?? (d.marks?.length || 0),
          attendancesCount: d.attendancesCount ?? (d.attendances?.length || 0),
          feeRecordsCount: d.feeRecordsCount ?? (d.feeRecords?.length || 0),
          size: sizeKB,
          snapshot: d.snapshot
        });
      });
      list.sort((a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime());
      setFirestoreCloudBackups(list);
    }, (err) => {
      console.warn("Could not listen to school_backups:", err);
    });
    return () => unsub();
  }, []);

  // Persist Google Drive settings to localStorage
  useEffect(() => {
    localStorage.setItem('gdrive_folder', gdriveFolder);
  }, [gdriveFolder]);

  useEffect(() => {
    localStorage.setItem('backup_schedule_enabled', String(backupScheduleEnabled));
  }, [backupScheduleEnabled]);

  useEffect(() => {
    localStorage.setItem('gdrive_status', gdriveStatus);
  }, [gdriveStatus]);

  useEffect(() => {
    localStorage.setItem('gdrive_user', gdriveUser);
  }, [gdriveUser]);

  const studentInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  // Helper to extract target data for backup with complete student details & photos
  const getTargetData = (targetId: string = syncSchoolId) => {
    const isGlobal = targetId === 'all' || !targetId;
    const targetSchools = isGlobal ? schools : schools.filter(s => s.id === targetId);
    const targetStudents = isGlobal 
      ? allStudents 
      : allStudents.filter(s => s.schoolId === targetId || (!s.schoolId && targetId === 'sch1'));
    const targetMarks = isGlobal 
      ? allMarks 
      : allMarks.filter(m => m.schoolId === targetId || (!m.schoolId && targetId === 'sch1'));
    const targetAttendances = isGlobal 
      ? attendances 
      : attendances.filter(a => a.schoolId === targetId || (!a.schoolId && targetId === 'sch1'));
    const targetFeeRecords = isGlobal 
      ? allFeeRecords 
      : allFeeRecords.filter(f => f.schoolId === targetId || (!f.schoolId && targetId === 'sch1'));
    const targetTeachers = isGlobal 
      ? (teachers || []) 
      : (teachers || []).filter(t => t.schoolId === targetId || (!t.schoolId && targetId === 'sch1'));
    const targetUsers = isGlobal 
      ? (users || []) 
      : (users || []).filter(u => u.schoolId === targetId || (!u.schoolId && targetId === 'sch1'));

    const studentsWithPhotos = targetStudents.filter(s => !!(s.docStudentPhoto || s.avatar)).length;

    return {
      isGlobal,
      targetSchools,
      targetStudents,
      targetMarks,
      targetAttendances,
      targetFeeRecords,
      targetTeachers,
      targetUsers,
      studentsWithPhotos
    };
  };

  // Creates structured backup package preserving ALL details and photos
  const createFullBackupPackage = (targetId: string = syncSchoolId) => {
    const { isGlobal, targetSchools, targetStudents, targetMarks, targetAttendances, targetFeeRecords, targetTeachers, targetUsers, studentsWithPhotos } = getTargetData(targetId);
    const schoolName = isGlobal 
      ? "All Schools (Global Multi-School Database Backup)" 
      : (schools.find(s => s.id === targetId)?.name || 'Selected School Node');

    return {
      version: "2.0",
      type: isGlobal ? "global_system_backup" : "school_full_backup",
      system: "EduManage School ERP Master Suite",
      schoolId: isGlobal ? "all" : targetId,
      schoolName: schoolName,
      exportedAt: new Date().toISOString(),
      exportedBy: "Master Administrator",
      metadata: {
        totalSchools: targetSchools.length,
        totalStudents: targetStudents.length,
        studentsWithPhotos: studentsWithPhotos,
        totalMarks: targetMarks.length,
        totalAttendances: targetAttendances.length,
        totalFeeRecords: targetFeeRecords.length,
        totalTeachers: targetTeachers.length
      },
      schools: targetSchools,
      students: targetStudents, // Complete fields including docStudentPhoto, fatherPhoto, motherPhoto, docStudentSig, academicHistory, feeBalance, etc.
      marks: targetMarks,
      attendances: targetAttendances,
      feeRecords: targetFeeRecords,
      teachers: targetTeachers,
      users: targetUsers
    };
  };

  // Immediate Cloud Backup into Firestore
  const handleImmediateCloudBackup = async () => {
    setIsSyncing(true);
    setImportStatus('Creating secure, consolidated cloud restore package in Firestore...');

    try {
      const backupPackage = createFullBackupPackage(syncSchoolId);
      const targetData = getTargetData(syncSchoolId);
      const jsonStr = JSON.stringify(backupPackage, null, 2);
      const sizeKB = (jsonStr.length / 1024).toFixed(1);
      const backupId = `sb_auto_${Date.now()}`;

      // Store in dedicated Firestore 'school_backups' collection
      await setDoc(doc(db, 'school_backups', backupId), {
        id: backupId,
        schoolId: syncSchoolId === 'all' ? '' : syncSchoolId,
        schoolName: backupPackage.schoolName,
        exportedAt: backupPackage.exportedAt,
        dataLength: jsonStr.length,
        size: `${sizeKB} KB`,
        studentsCount: targetData.targetStudents.length,
        studentsWithPhotosCount: targetData.studentsWithPhotos,
        marksCount: targetData.targetMarks.length,
        attendancesCount: targetData.targetAttendances.length,
        feeRecordsCount: targetData.targetFeeRecords.length,
        teachersCount: targetData.targetTeachers.length,
        snapshot: jsonStr
      });

      setImportStatus(`Success! Created Cloud Snapshot ${backupId} (${sizeKB} KB). Total records backed up: ${targetData.targetStudents.length} Students (${targetData.studentsWithPhotos} with photos), ${targetData.targetMarks.length} Marks, ${targetData.targetFeeRecords.length} Fees.`);
    } catch (error: any) {
      setImportStatus(`Failed to upload restore point to Firestore: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Immediate Google Drive Backup (Direct Google Drive API Upload + Instant Download + Cloud Snapshot)
  const handleImmediateDriveBackup = async () => {
    setIsSyncing(true);
    setImportStatus('Compiling complete student data with photos and school records for Google Drive...');
    
    try {
      const backupPackage = createFullBackupPackage(syncSchoolId);
      const targetData = getTargetData(syncSchoolId);
      const jsonStr = JSON.stringify(backupPackage, null, 2);
      const sizeKB = (jsonStr.length / 1024).toFixed(1);

      // 1. Download file directly onto device
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (syncSchoolId === 'all' ? 'All_Schools' : (schools.find(s => s.id === syncSchoolId)?.name || 'School')).toLowerCase().replace(/[^a-z0-9.]+/g, '_');
      const fileName = `BACKUP_GDRIVE_${safeName}_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 2. Save an instant cloud restore snapshot in Firestore
      const backupId = `gdrive_snap_${Date.now()}`;
      await setDoc(doc(db, 'school_backups', backupId), {
        id: backupId,
        schoolId: syncSchoolId === 'all' ? '' : syncSchoolId,
        schoolName: backupPackage.schoolName,
        exportedAt: backupPackage.exportedAt,
        dataLength: jsonStr.length,
        size: `${sizeKB} KB`,
        studentsCount: targetData.targetStudents.length,
        studentsWithPhotosCount: targetData.studentsWithPhotos,
        marksCount: targetData.targetMarks.length,
        attendancesCount: targetData.targetAttendances.length,
        feeRecordsCount: targetData.targetFeeRecords.length,
        teachersCount: targetData.targetTeachers.length,
        snapshot: jsonStr
      });

      setLastBackupDetails({
        fileName,
        size: `${sizeKB} KB`,
        studentsCount: targetData.targetStudents.length,
        photosCount: targetData.studentsWithPhotos,
        backupPackage,
        gdriveUploaded: false
      });

      setShowDriveAssistantModal(true);

      // 3. Attempt direct Google Drive API upload
      setImportStatus('Authenticating & uploading file directly to Google Drive...');
      try {
        const driveResult = await uploadBackupToGoogleDrive(
          backupPackage,
          fileName,
          gdriveFolder,
          (msg) => setImportStatus(msg)
        );

        setLastBackupDetails(prev => prev ? {
          ...prev,
          gdriveUploaded: true,
          gdriveFileLink: driveResult.webViewLink || 'https://drive.google.com/drive/my-drive'
        } : null);

        setImportStatus(`Success! Backup file "${fileName}" was directly uploaded to Google Drive folder "${gdriveFolder}". Direct Link available.`);
      } catch (driveErr: any) {
        console.warn("Direct Drive API upload prompt needed:", driveErr);
        setLastBackupDetails(prev => prev ? {
          ...prev,
          gdriveUploaded: false,
          gdriveError: driveErr.message || 'Google Drive authentication required'
        } : null);
        setImportStatus(`Backup downloaded and saved to Cloud. Click 'Upload to Google Drive' in the dialog to grant Google Drive permission.`);
      }
    } catch (err: any) {
      setImportStatus(`Immediate Backup Error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Explicit Trigger for Google Drive Upload from Modal or Button
  const handleDirectUploadToDrive = async () => {
    if (!lastBackupDetails?.backupPackage) {
      const backupPackage = createFullBackupPackage(syncSchoolId);
      const safeName = (syncSchoolId === 'all' ? 'All_Schools' : (schools.find(s => s.id === syncSchoolId)?.name || 'School')).toLowerCase().replace(/[^a-z0-9.]+/g, '_');
      const fileName = `BACKUP_GDRIVE_${safeName}_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
      const targetData = getTargetData(syncSchoolId);
      const jsonStr = JSON.stringify(backupPackage, null, 2);
      const sizeKB = (jsonStr.length / 1024).toFixed(1);

      setLastBackupDetails({
        fileName,
        size: `${sizeKB} KB`,
        studentsCount: targetData.targetStudents.length,
        photosCount: targetData.studentsWithPhotos,
        backupPackage,
        gdriveUploaded: false
      });
    }

    const currentPkg = lastBackupDetails?.backupPackage || createFullBackupPackage(syncSchoolId);
    const targetFileName = lastBackupDetails?.fileName || `BACKUP_GDRIVE_${Date.now()}.json`;

    setIsDriveUploading(true);
    setImportStatus('Connecting to Google Drive with OAuth 2.0...');

    try {
      const driveResult = await uploadBackupToGoogleDrive(
        currentPkg,
        targetFileName,
        gdriveFolder,
        (msg) => setImportStatus(msg)
      );

      setLastBackupDetails(prev => prev ? {
        ...prev,
        gdriveUploaded: true,
        gdriveFileLink: driveResult.webViewLink || 'https://drive.google.com/drive/my-drive',
        gdriveError: undefined
      } : null);

      setImportStatus(`Success! Backup uploaded directly to your Google Drive in folder "${gdriveFolder}"!`);
    } catch (err: any) {
      setLastBackupDetails(prev => prev ? {
        ...prev,
        gdriveUploaded: false,
        gdriveError: err.message
      } : null);
      setImportStatus(`Google Drive upload error: ${err.message}`);
    } finally {
      setIsDriveUploading(false);
    }
  };

  // Restore logic executor
  const executeRestoreFromData = async (parsed: any) => {
    let successStudents = 0;
    let successMarks = 0;
    let successAttendances = 0;
    let successFeeRecords = 0;
    let successTeachers = 0;
    let successSchools = 0;

    const studentList = parsed.students || (Array.isArray(parsed) ? parsed : []);
    const marksList = parsed.marks || [];
    const attendancesList = parsed.attendances || [];
    const feeRecordsList = parsed.feeRecords || [];
    const teachersList = parsed.teachers || [];
    const schoolsList = parsed.schools || [];

    const defaultSchoolId = syncSchoolId === 'all' ? 'sch1' : (syncSchoolId || 'sch1');

    // 1. Restore Schools if any
    if (Array.isArray(schoolsList) && schoolsList.length > 0) {
      for (const sch of schoolsList) {
        if (!sch.id) continue;
        await setDoc(doc(db, 'schools', sch.id), sch);
        successSchools++;
      }
    }

    // 2. Restore Students (Full details with photo, documents, history)
    if (Array.isArray(studentList)) {
      for (const raw of studentList) {
        if (!raw.name) continue;
        const studId = raw.id || `s_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        const cleanStudent = {
          ...raw,
          id: studId,
          schoolId: raw.schoolId || defaultSchoolId,
          role: 'STUDENT',
          feeBalance: Number(raw.feeBalance) || 0,
          previousDues: Number(raw.previousDues) || 0,
          academicSession: raw.academicSession || activeAcademicSession || '2026-27',
          // Explicitly preserve photo & documents
          docStudentPhoto: raw.docStudentPhoto || raw.avatar || '',
          avatar: raw.avatar || raw.docStudentPhoto || '',
          fatherPhoto: raw.fatherPhoto || '',
          motherPhoto: raw.motherPhoto || '',
          docStudentSig: raw.docStudentSig || '',
          academicHistory: Array.isArray(raw.academicHistory) ? raw.academicHistory : []
        };
        await setDoc(doc(db, 'students', studId), cleanStudent);
        successStudents++;
      }
    }

    // 3. Restore Marks
    if (Array.isArray(marksList)) {
      for (const m of marksList) {
        if (!m.id) continue;
        const cleanMark = {
          ...m,
          schoolId: m.schoolId || defaultSchoolId
        };
        await setDoc(doc(db, 'marks', m.id), cleanMark);
        successMarks++;
      }
    }

    // 4. Restore Attendances
    if (Array.isArray(attendancesList)) {
      for (const a of attendancesList) {
        if (!a.id) continue;
        const cleanAttendance = {
          ...a,
          schoolId: a.schoolId || defaultSchoolId
        };
        await setDoc(doc(db, 'attendances', a.id), cleanAttendance);
        successAttendances++;
      }
    }

    // 5. Restore Fee Records
    if (Array.isArray(feeRecordsList)) {
      for (const f of feeRecordsList) {
        if (!f.id) continue;
        const cleanFee = {
          ...f,
          schoolId: f.schoolId || defaultSchoolId
        };
        await setDoc(doc(db, 'feeRecords', f.id), cleanFee);
        successFeeRecords++;
      }
    }

    // 6. Restore Teachers
    if (Array.isArray(teachersList)) {
      for (const t of teachersList) {
        if (!t.id) continue;
        const cleanTeacher = {
          ...t,
          schoolId: t.schoolId || defaultSchoolId
        };
        await setDoc(doc(db, 'teachers', t.id), cleanTeacher);
        successTeachers++;
      }
    }

    const totalRestored = successStudents + successMarks + successAttendances + successFeeRecords + successTeachers;
    setImportStatus(`Success! Restored: ${successStudents} Students (with Photos), ${successMarks} Marks, ${successAttendances} Attendances, ${successFeeRecords} Fees, ${successTeachers} Teachers.`);
    setImportedCount(totalRestored);
  };

  const handleRestoreFromCloudSnapshot = async (snapshotDocId: string, rawSnapshotStr?: string) => {
    if (!window.confirm("Are you absolutely sure you want to restore this cloud snapshot? All matching student profiles (including photos), marks, attendance, and fees will be updated with the backup snapshot. This cannot be undone.")) {
      return;
    }

    setIsSyncing(true);
    setImportStatus('Restoring school data from secure cloud snapshot...');

    try {
      let snapshotData: any = null;

      if (rawSnapshotStr) {
        snapshotData = JSON.parse(rawSnapshotStr);
      } else {
        const snapRef = doc(db, 'school_backups', snapshotDocId);
        const snapDoc = await getDoc(snapRef);
        if (!snapDoc.exists()) {
          throw new Error("Cloud snapshot not found in Firestore.");
        }
        const data = snapDoc.data();
        snapshotData = data.snapshot ? JSON.parse(data.snapshot) : data;
      }

      await executeRestoreFromData(snapshotData);
    } catch (error: any) {
      setImportStatus(`Failed to restore school snapshot: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteCloudSnapshot = async (backupId: string) => {
    if (!window.confirm("Are you sure you want to delete this cloud backup permanently from Firestore?")) return;
    try {
      await deleteDoc(doc(db, 'school_backups', backupId));
      setImportStatus(`Cloud snapshot ${backupId} deleted successfully.`);
    } catch (err: any) {
      alert("Error deleting backup: " + err.message);
    }
  };

  // Exporters & Importers
  const handleExportStudents = () => {
    const targetData = getTargetData(syncSchoolId);

    if (targetData.targetStudents.length === 0 && targetData.targetMarks.length === 0 && targetData.targetAttendances.length === 0 && targetData.targetFeeRecords.length === 0) {
      alert("No data records found for this selection to export.");
      return;
    }

    const backupPackage = createFullBackupPackage(syncSchoolId);
    const jsonStr = JSON.stringify(backupPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (syncSchoolId === 'all' ? 'All_Schools' : (schools.find(s => s.id === syncSchoolId)?.name || 'School')).toLowerCase().replace(/[^a-z0-9.]+/g, '_');
    a.download = `EDUMANAGE_FULL_BACKUP_${safeName}_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setImportStatus(`Successfully exported complete backup (${backupPackage.schoolName}): ${targetData.targetStudents.length} Students (${targetData.studentsWithPhotos} with photos), ${targetData.targetMarks.length} Marks, ${targetData.targetAttendances.length} Attendance, ${targetData.targetFeeRecords.length} Fees.`);
  };

  // CSV Export for Students (with Full details & Photo indicators)
  const handleExportCSV = () => {
    const targetData = getTargetData(syncSchoolId);
    const rows = targetData.targetStudents;
    if (rows.length === 0) {
      alert("No student records to export.");
      return;
    }

    const headers = [
      "ID", "Name", "Hindi Name", "Roll No", "SR No", "Admission No", "Grade", "Section",
      "Gender", "DOB", "Mobile", "Aadhar", "Father Name", "Mother Name", "Category",
      "Academic Session", "Fee Balance", "Previous Dues", "Address", "Has Photo", "Photo Base64/URL"
    ];

    const csvRows = [
      headers.join(","),
      ...rows.map(s => [
        `"${s.id || ''}"`,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.studentNameHindi || '').replace(/"/g, '""')}"`,
        `"${s.rollNo || ''}"`,
        `"${s.srNo || ''}"`,
        `"${s.admissionNo || ''}"`,
        `"${s.grade || ''}"`,
        `"${s.section || ''}"`,
        `"${s.gender || ''}"`,
        `"${s.dob || ''}"`,
        `"${s.mobile || ''}"`,
        `"${s.aadhar || ''}"`,
        `"${(s.fatherName || '').replace(/"/g, '""')}"`,
        `"${(s.motherName || '').replace(/"/g, '""')}"`,
        `"${s.category || ''}"`,
        `"${s.academicSession || ''}"`,
        `"${s.feeBalance || 0}"`,
        `"${s.previousDues || 0}"`,
        `"${(s.address || s.presentVillageMohalla || '').replace(/"/g, '""')}"`,
        `"${s.docStudentPhoto || s.avatar ? 'YES' : 'NO'}"`,
        `"${(s.docStudentPhoto || s.avatar || '').replace(/"/g, '""')}"`
      ].join(","))
    ];

    const csvBlob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (syncSchoolId === 'all' ? 'All_Schools' : (schools.find(s => s.id === syncSchoolId)?.name || 'School')).toLowerCase().replace(/[^a-z0-9.]+/g, '_');
    a.download = `STUDENTS_FULL_DATA_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setImportStatus(`CSV Export complete: ${rows.length} student records exported with full profile & photo data.`);
  };

  const handleImportStudents = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    setImportStatus('Reading backup file...');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        await executeRestoreFromData(parsed);
      } catch (err: any) {
        setImportStatus(`Failed to read/restore backup JSON: ${err.message}`);
      } finally {
        setIsSyncing(false);
        if (studentInputRef.current) studentInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // CSV Import handler
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    setImportStatus('Parsing CSV student records...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length <= 1) {
          throw new Error("CSV file is empty or missing headers.");
        }

        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        const defaultSchoolId = syncSchoolId === 'all' ? 'sch1' : syncSchoolId;
        let count = 0;

        for (let i = 1; i < lines.length; i++) {
          const rowValues = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
          const row: any = {};
          headers.forEach((h, idx) => {
            row[h] = rowValues[idx] || '';
          });

          const name = row['name'] || row['student name'] || row['studentname'];
          if (!name) continue;

          const studId = row['id'] || `s_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
          const photo = row['photo base64/url'] || row['photo'] || row['docstudentphoto'] || row['avatar'] || '';

          const studentObj = {
            id: studId,
            schoolId: defaultSchoolId,
            role: 'STUDENT',
            name: name,
            studentNameHindi: row['hindi name'] || row['studentnamehindi'] || '',
            rollNo: row['roll no'] || row['rollno'] || '',
            srNo: row['sr no'] || row['srno'] || '',
            admissionNo: row['admission no'] || row['admissionno'] || '',
            grade: row['grade'] || row['class'] || 'Class 1',
            section: row['section'] || 'A',
            gender: row['gender'] || 'Male',
            dob: row['dob'] || '',
            mobile: row['mobile'] || row['phone'] || '',
            aadhar: row['aadhar'] || row['aadhaar'] || '',
            fatherName: row['father name'] || row['fathername'] || '',
            motherName: row['mother name'] || row['mothername'] || '',
            category: row['category'] || 'GEN',
            academicSession: row['academic session'] || row['academicsession'] || activeAcademicSession || '2026-27',
            feeBalance: Number(row['fee balance'] || row['feebalance']) || 0,
            previousDues: Number(row['previous dues'] || row['previousdues']) || 0,
            address: row['address'] || '',
            docStudentPhoto: photo,
            avatar: photo
          };

          await setDoc(doc(db, 'students', studId), studentObj);
          count++;
        }

        setImportStatus(`Success! Imported ${count} students from CSV spreadsheet.`);
        setImportedCount(count);
      } catch (err: any) {
        setImportStatus(`CSV Import Error: ${err.message}`);
      } finally {
        setIsSyncing(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExportSchoolProfile = async () => {
    if (!syncSchoolId || syncSchoolId === 'all') {
      alert("Please select a specific school node to export its profile.");
      return;
    }
    setIsSyncing(true);
    setImportStatus('Compiling profile package from cloud databases...');
    
    try {
      const schoolRecord = schools.find(s => s.id === syncSchoolId);
      if (!schoolRecord) throw new Error("School metadata record not found.");

      // Fetch School Config mapping
      const configSnap = await getDoc(doc(db, 'schoolConfig', syncSchoolId));
      const configData = configSnap.exists() ? configSnap.data() : null;

      // Fetch class fees mapping
      const feesSnap = await getDoc(doc(db, 'classFees', syncSchoolId));
      const feesData = feesSnap.exists() ? feesSnap.data() : null;

      const profilePackage = {
        school: schoolRecord,
        config: configData,
        classFees: feesData,
        exportedAt: new Date().toISOString()
      };

      const jsonStr = JSON.stringify(profilePackage, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profile_config_${schoolRecord.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setImportStatus(`Successfully consolidated and exported core settings mapping for ${schoolRecord.name}.`);
    } catch (err: any) {
      setImportStatus(`Error exporting school profile: ${err.message || 'Cloud storage connection error.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportSchoolProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    setImportStatus('Validating and writing system restore schema...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.school || !parsed.school.id) {
          throw new Error("Invalid schema structure. Core school metadata block is missing.");
        }

        const targetId = syncSchoolId === 'all' ? (parsed.school.id || 'sch1') : syncSchoolId;
        
        // Overwrite standard school profile in firestore
        const restoredSchool = {
          ...parsed.school,
          id: targetId,
          name: parsed.school.name || 'Restored School'
        };
        await setDoc(doc(db, 'schools', targetId), restoredSchool);

        // Overwrite or create configs in firestore
        if (parsed.config) {
          await setDoc(doc(db, 'schoolConfig', targetId), {
            ...parsed.config,
            schoolId: targetId
          });
        }

        // Overwrite or create fees in firestore
        if (parsed.classFees) {
          await setDoc(doc(db, 'classFees', targetId), {
            ...parsed.classFees,
            schoolId: targetId
          });
        }

        setImportStatus(`Restoration process complete! Successfully synchronized settings, module activations, and fee blueprints for school ID: ${targetId}`);
        setImportedCount(3); // 3 Core tables rebuilt
      } catch (err: any) {
        setImportStatus(`Restoration aborted: ${err.message || 'JSON structure error.'}`);
      } finally {
        setIsSyncing(false);
        if (profileInputRef.current) profileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };


  const handleToggleAllowedSession = (session: string) => {
    if (allowedSessions.includes(session)) {
      if (session === activeAcademicSession) {
        alert("Cannot lock/disallow the currently active academic session. Please switch the active session first.");
        return;
      }
      setAllowedSessions(allowedSessions.filter(s => s !== session));
    } else {
      setAllowedSessions([...allowedSessions, session]);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 200; // max 200px
        
        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/webp', 0.8);
          if (isEdit) {
            setSchoolEditForm((prev: any) => ({ ...prev, logo: compressedBase64 }));
          } else {
            setNewSchoolLogo(compressedBase64);
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSchoolName && adminEmail && adminPass && newSchoolAddress && newSchoolMobile && newSchoolUdise) {
      addSchool({
        name: newSchoolName,
        address: newSchoolAddress,
        mobile: newSchoolMobile,
        altMobile: newSchoolAltMobile,
        udiseCode: newSchoolUdise,
        logo: newSchoolLogo,
        adminEmail,
        adminPass
      });
      setNewSchoolName('');
      setNewSchoolAddress('');
      setNewSchoolMobile('');
      setNewSchoolAltMobile('');
      setNewSchoolUdise('');
      setNewSchoolLogo('');
      setAdminEmail('');
      setAdminPass('');
    } else {
      alert("Please fill all required fields (Name, Address, Mobile, UDISE, Email, Password).");
    }
  };

  const ALL_FEATURES = [
    { id: 'registration', label: 'Registration' },
    { id: 'fees', label: 'Fee Management' },
    { id: 'homework', label: 'Homework' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'marks', label: 'Marks/Results' },
    { id: 'tc', label: 'Transfer Cert' },
    { id: 'idcard', label: 'ID Cards' },
    { id: 'admitcards', label: 'Admit Cards' },
    { id: 'library', label: 'Library' },
    { id: 'hostel', label: 'Hostel' },
    { id: 'transport', label: 'Transport' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-6 overflow-x-auto">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mr-4">
            <Building className="w-5 h-5 text-indigo-600" />
            Global Platform Settings
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Label className="whitespace-nowrap mb-0 mr-2">Filter School:</Label>
              <Input as="select" value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)}>
                <option value="all">All Schools</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </Input>
            </div>
            <div className="flex items-center">
              <Label className="whitespace-nowrap mb-0 mr-2">Academic Session:</Label>
              <Input as="select" value={activeAcademicSession} onChange={e => setActiveAcademicSession(e.target.value)}>
                {academicSessions.map(session => (
                  <option key={session} value={session}>{session}</option>
                ))}
              </Input>
            </div>
          </div>
        </div>

        {/* Allowed Sessions configuration panel */}
        <div className="mb-6 bg-indigo-50/55 p-4 rounded-xl border border-indigo-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-100/50 pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                Session Permissions Control (सत्र अनुमति नियंत्रण)
              </h3>
              <p className="text-[11px] text-indigo-705 text-indigo-700/80">
                School administrators and staff are restricted from registering new records inside sessions globally disallowed/locked here.
              </p>
            </div>
            
            {/* Toggle Full Grid Display Button */}
            <button
              type="button"
              onClick={() => setShowFullSessionsGrid(!showFullSessionsGrid)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 hover:bg-indigo-50 px-2.5 py-1 rounded transition-colors self-start md:self-auto"
            >
              {showFullSessionsGrid ? "Show Dropdown View (ड्रॉपडाउन देखें)" : "Show All Grid View (ग्रिड सूची देखें)"}
            </button>
          </div>

          {!showFullSessionsGrid ? (
            /* COMPACT DROPDOWN VIEW */
            <div className="flex flex-wrap items-center gap-4 bg-white/75 p-3 rounded-lg border border-indigo-50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Select Academic Session:</span>
                <select
                  value={sessionConfigTarget}
                  onChange={(e) => setSessionConfigTarget(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {academicSessions.map((session) => (
                    <option key={session} value={session}>
                      Session {session} {allowedSessions.includes(session) ? "🔓 (Permitted)" : "🔒 (Locked)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Status:</span>
                {allowedSessions.includes(sessionConfigTarget) ? (
                  <span className="bg-emerald-100 border border-emerald-200 text-emerald-850 text-emerald-800 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-black">
                    Authorized (सक्रिय)
                  </span>
                ) : (
                  <span className="bg-rose-100 border border-rose-200 text-rose-850 text-rose-800 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-black">
                    Locked / Blocked (अवरुद्ध)
                  </span>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handleToggleAllowedSession(sessionConfigTarget)}
                className={`md:ml-auto text-xs font-bold px-3 py-1 rounded transition-all shadow-sm ${
                  allowedSessions.includes(sessionConfigTarget)
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {allowedSessions.includes(sessionConfigTarget) ? "Block / Lock Session" : "Authorize / Allow Session"}
              </button>
            </div>
          ) : (
            /* EXPANDABLE FULL GRID LIST */
            <div className="flex flex-wrap gap-3">
              {academicSessions.map(session => (
                <label 
                  key={session} 
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all select-none ${
                    allowedSessions.includes(session)
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={allowedSessions.includes(session)} 
                    onChange={() => handleToggleAllowedSession(session)} 
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer accent-indigo-600"
                  />
                  <span>Session {session}</span>
                  {allowedSessions.includes(session) ? (
                    <span className="bg-indigo-500 text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded text-indigo-100 font-bold">Allowed</span>
                  ) : (
                    <span className="bg-slate-100 text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded text-slate-400 font-bold">Locked</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Academic Session Approval Requests Panel */}
        <div className="mb-8 border border-slate-200 rounded-xl p-5 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            Academic Session Approval Requests (सत्र स्वीकृति अनुरोध)
          </h3>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            School administrators submit requests for new Academic Sessions here. Approving a request instantly adds it to their permitted academic sessions, authorizing them to activate the workspace and register new students.
          </p>

          {sessionRequests.filter(req => req.status === 'Pending').length === 0 ? (
            <div className="text-center py-6 px-4 bg-white border border-slate-200 border-dashed rounded-lg">
              <p className="text-xs text-slate-500 italic">No pending academic session approval requests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">School Name</th>
                    <th className="px-4 py-3">Requested Session</th>
                    <th className="px-4 py-3">Requested By</th>
                    <th className="px-4 py-3">Requested Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessionRequests.filter(req => req.status === 'Pending').map(req => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{req.schoolName}</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600 bg-indigo-50/50">{req.session}</td>
                      <td className="px-4 py-3 text-slate-600">{req.requestedByEmail}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(req.requestedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Approve session "${req.session}" for school "${req.schoolName}"?`)) {
                                await approveSessionRequest(req.id);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 rounded text-[10px] transition-colors cursor-pointer"
                          >
                            Approve (Aprob)
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to Delete/Reject request for "${req.session}" in school "${req.schoolName}"?`)) {
                                await deleteSessionRequest(req.id);
                              }
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-2.5 py-1.5 rounded text-[10px] transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Building className="w-5 h-5 text-indigo-600" />
          Register New School
        </h2>
        <form onSubmit={handleAddSchool} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 pb-6 mb-6">
          <div>
            <Label>School Name</Label>
            <Input value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)} required placeholder="Global Academy" />
          </div>
          <div>
            <Label>UDISE Code</Label>
            <Input value={newSchoolUdise} onChange={e => setNewSchoolUdise(e.target.value)} required placeholder="e.g. 0914... " />
          </div>
          <div>
            <Label>Mobile Number</Label>
            <Input value={newSchoolMobile} onChange={e => setNewSchoolMobile(e.target.value)} required placeholder="9876543210" />
          </div>
          <div>
            <Label>Alternate Mobile Number</Label>
            <Input value={newSchoolAltMobile} onChange={e => setNewSchoolAltMobile(e.target.value)} placeholder="0123456789 (Optional)" />
          </div>
          <div className="md:col-span-2">
            <Label>School Address</Label>
            <Input value={newSchoolAddress} onChange={e => setNewSchoolAddress(e.target.value)} required placeholder="Complete School Address Details" />
          </div>
          <div>
            <Label>Admin Initial Email</Label>
            <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required placeholder="admin@globalacademy.edu" />
          </div>
          <div>
            <Label>Admin Initial Password</Label>
            <Input value={adminPass} onChange={e => setAdminPass(e.target.value)} required placeholder="Temp Password" />
          </div>
          <div>
            <Label>School Logo <span className="text-[10px] text-slate-400 font-normal ml-1">(Square shape, Max 1MB)</span></Label>
            <Input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, false)} className="text-xs" />
            {newSchoolLogo && <img src={newSchoolLogo} alt="Logo Preview" className="h-10 mt-1 object-contain border rounded" />}
          </div>
          <div className="md:col-span-3 flex items-end justify-end">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 w-full md:w-auto justify-center px-8">
              <Plus className="w-4 h-4" /> Register & Create Admin
            </Button>
          </div>
        </form>

        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <School className="w-5 h-5 text-indigo-600" />
          Active Schools Network
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">School Name</th>
                <th className="px-4 py-3 text-center">Total Students</th>
                <th className="px-4 py-3">Allowed Services (Features)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schools.filter(school => selectedSchoolId === 'all' || school.id === selectedSchoolId).map(school => {
                const schoolAdmins = users.filter(u => u.schoolId === school.id && u.role === 'ADMIN');
                const adminUsr = schoolAdmins[0];
                const schoolStudents = students.filter(s => (s.schoolId === school.id || (!s.schoolId && school.id === 'sch1')) && !s.isDeleted);
                const schoolFees = feeRecords.filter(f => f.schoolId === school.id && schoolStudents.some(s => s.id === f.studentId));
                
                const schoolFeatures = pendingFeaturesMap[school.id] ?? school.features ?? [];
                const effectiveEmail = school.email || adminUsr?.email || 'admin@school.edu';
                const effectivePass = adminUsr?.password || school.adminPass || 'Admin@1234';
                const isPassVisible = showPasswordMap[school.id] ?? false;

                const toggleFeature = (featureId: string) => {
                  const newFeatures = schoolFeatures.includes(featureId)
                    ? schoolFeatures.filter(f => f !== featureId)
                    : [...schoolFeatures, featureId];
                  setPendingFeaturesMap(prev => ({ ...prev, [school.id]: newFeatures }));
                };

                const handleUpdateFeatures = () => {
                  updateSchoolFeatures(school.id, schoolFeatures);
                  alert('Services updated successfully!');
                };

                const handleDirectLogin = () => {
                  const targetAdmin: any = adminUsr || {
                    id: `admin_${school.id}`,
                    name: `${school.name} Admin`,
                    role: 'ADMIN',
                    email: effectiveEmail,
                    password: effectivePass,
                    schoolId: school.id
                  };
                  setCurrentUser(targetAdmin);
                  localStorage.setItem('sch_currentUser', JSON.stringify(targetAdmin));
                };

                return (
                  <tr key={school.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div className="flex items-start gap-3">
                        {school.logo ? (
                          <img src={school.logo} alt="Logo" className="w-10 h-10 object-contain border rounded bg-white p-0.5 mt-1 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 border rounded bg-slate-100 flex items-center justify-center text-slate-400 text-xs mt-1 shrink-0">No Logo</div>
                        )}
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            {school.name}
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded border border-slate-200">{school.id}</span>
                          </div>
                          
                          {/* Credentials Badges */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <div className="inline-flex items-center gap-1 text-[10.5px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md font-medium">
                              <span className="text-blue-500 font-bold">ID:</span>
                              <span className="font-mono font-semibold">{effectiveEmail}</span>
                            </div>

                            <div className="inline-flex items-center gap-1 text-[10.5px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                              <Key className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="font-mono font-semibold">
                                {isPassVisible ? effectivePass : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowPasswordMap(prev => ({ ...prev, [school.id]: !isPassVisible }))}
                                className="ml-1 text-amber-700 hover:text-amber-900 p-0.5"
                                title={isPassVisible ? "Hide Password" : "Show Password"}
                              >
                                {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          {school.mobile && (
                            <div className="text-[10px] text-slate-500">
                              Tel: <span className="font-mono">{school.mobile}</span> {school.altMobile ? `/ ${school.altMobile}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <div className="font-bold text-indigo-600 text-lg">{schoolStudents.length}</div>
                      <div className="text-[10px] text-emerald-600 font-bold">₹{schoolFees.reduce((acc, f) => acc + f.amount, 0).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3 min-w-[300px]">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {ALL_FEATURES.map(feat => {
                          const isEnabled = schoolFeatures.includes(feat.id);
                          return (
                            <label key={feat.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer border ${isEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400 grayscale hover:grayscale-0'}`}>
                              <input 
                                type="checkbox" 
                                checked={isEnabled} 
                                onChange={() => toggleFeature(feat.id)}
                                className="w-2.5 h-2.5 rounded-sm accent-indigo-600"
                              />
                              {feat.label}
                            </label>
                          );
                        })}
                      </div>
                      <button onClick={handleUpdateFeatures} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors">
                        Update Services
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="flex flex-col gap-1.5 w-max ml-auto">
                        <Button 
                          onClick={handleDirectLogin} 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 h-auto text-xs flex items-center justify-center gap-1 w-full shadow-sm font-bold"
                          title="Switch into this school's admin dashboard directly"
                        >
                          <LogIn className="w-3 h-3" /> Login Portal
                        </Button>
                        <Button onClick={() => {
                          setEditingSchool(school);
                          setShowEditPassword(true);
                          setSchoolEditForm({
                            name: school.name,
                            address: school.address || '',
                            mobile: school.mobile || '',
                            altMobile: school.altMobile || '',
                            udiseCode: school.udiseCode || '',
                            email: effectiveEmail,
                            logo: school.logo || '',
                            adminPass: effectivePass
                          });
                        }} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-1.5 h-auto text-xs flex items-center justify-center gap-1 w-full font-medium">
                          <Edit className="w-3 h-3" /> Edit Info
                        </Button>
                        <Button onClick={() => {
                          if (window.confirm(`Are you sure you want to completely delete ${school.name}? This will remove all their data permanently.`)) {
                            deleteSchool(school.id);
                          }
                        }} className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-1.5 h-auto text-xs flex items-center justify-center gap-1 w-full font-medium">
                          <Trash2 className="w-3 h-3" /> Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Global Data Exchange & Backups Center (डेटा बैकअप एवं रिकवरी केंद्र) */}
      <Card className="p-6 mt-6 border-2 border-indigo-100 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-5 bg-indigo-600 rounded-full"></span>
              Super Admin Data Backup & Restore Hub (डेटा बैकअप एवं रिकवरी)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Full student records with photos, exam marks, attendance, and fee history with 1-click Google Drive & Cloud Snapshots.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleImmediateDriveBackup}
              disabled={isSyncing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 shadow-sm flex items-center gap-2 transition-all cursor-pointer animate-pulse hover:animate-none"
            >
              <Sparkles className="w-4 h-4" />
              <span>तुरंत बैकअप (Instant Drive Backup)</span>
            </Button>
            <div className="text-[10px] bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg text-indigo-700 font-mono font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>PHOTOS & DOCS INCLUDED</span>
            </div>
          </div>
        </div>

        {/* Top Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Students</span>
            <div className="text-xl font-black text-slate-800">{allStudents.length}</div>
            <div className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 mt-0.5">
              <ImageIcon className="w-3 h-3" />
              <span>{allStudents.filter(s => s.docStudentPhoto || s.avatar).length} with photos</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Active Schools</span>
            <div className="text-xl font-black text-slate-800">{schools.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Global Multi-School Database</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Exam Marks & Fees</span>
            <div className="text-xl font-black text-slate-800">{allMarks.length + allFeeRecords.length}</div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Records in sync</div>
          </div>
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3">
            <span className="text-[10px] font-bold text-indigo-600 uppercase">Cloud Snapshots</span>
            <div className="text-xl font-black text-indigo-700">{firestoreCloudBackups.length}</div>
            <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">Instant Restore Points</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Controls Sidebar */}
          <div className="md:col-span-1 space-y-4">
            <div>
              <Label className="text-xs font-bold text-slate-700">Scope / Target Selection</Label>
              <Input
                as="select"
                value={syncSchoolId}
                onChange={(e) => {
                  setSyncSchoolId(e.target.value);
                  setImportStatus('');
                  setImportedCount(0);
                }}
                className="text-xs font-medium"
              >
                <option value="all">🌟 All Schools (Global Full Database Backup)</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    🏫 {school.name} ({school.udiseCode || 'No UDISE'})
                  </option>
                ))}
              </Input>
              <p className="text-[10px] text-slate-500 mt-1">
                {syncSchoolId === 'all' 
                  ? 'Selected: Complete system-wide backup across all schools.' 
                  : `Selected: Backup specific to ${schools.find(s => s.id === syncSchoolId)?.name}.`}
              </p>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Backup Modules</Label>
              <div className="flex flex-col gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSyncCategory('students');
                    setImportStatus('');
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-bold text-left transition-all cursor-pointer ${
                    syncCategory === 'students'
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Student & School Data (with Photos)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSyncCategory('imadate_drive');
                    setImportStatus('');
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-bold text-left transition-all cursor-pointer ${
                    syncCategory === 'imadate_drive'
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                  <span>Immediate Google Drive Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSyncCategory('cloud_snapshots');
                    setImportStatus('');
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-bold text-left transition-all cursor-pointer ${
                    syncCategory === 'cloud_snapshots'
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Cloud className="w-4 h-4" />
                  <span>Cloud Restore Snapshots ({firestoreCloudBackups.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSyncCategory('profile');
                    setImportStatus('');
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-bold text-left transition-all cursor-pointer ${
                    syncCategory === 'profile'
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>School Settings & Fee Tiers</span>
                </button>
              </div>
            </div>
          </div>

          {/* Working Workspace Area */}
          <div className="md:col-span-3 border border-slate-200 bg-white rounded-xl p-5 relative shadow-sm">
            <div className="space-y-6">
              {/* Active Selection Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Target: {syncSchoolId === 'all' ? 'All Schools (Global Complete Multi-School Database)' : schools.find((s) => s.id === syncSchoolId)?.name}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {syncSchoolId === 'all' 
                      ? `Total Scope: ${allStudents.length} Students (${allStudents.filter(s => s.docStudentPhoto || s.avatar).length} with photos), ${allMarks.length} Marks, ${allFeeRecords.length} Fee Records.` 
                      : `Selected School Scope: ${allStudents.filter(s => s.schoolId === syncSchoolId).length} Students (${allStudents.filter(s => s.schoolId === syncSchoolId && (s.docStudentPhoto || s.avatar)).length} with photos).`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleImmediateDriveBackup}
                    disabled={isSyncing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] py-1.5 px-3 h-auto uppercase tracking-wide flex items-center gap-1 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Instant Backup File</span>
                  </Button>
                </div>
              </div>

              {/* TAB 1: FULL DATA BACKUP & RESTORE */}
              {syncCategory === 'students' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* JSON Full Backup */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg">
                            <FileJson className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Export Full JSON Backup</h4>
                            <span className="text-[9px] text-emerald-600 font-bold">Includes Student & Parent Photos</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Complete backup package containing student profiles (names, Hindi names, SR no, roll no, photo base64/URL, father & mother photos, address, previous dues, academic session), examination marks, attendance, and fee history.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleExportStudents}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] py-2 px-3 h-auto uppercase tracking-wide flex items-center gap-1.5 w-full justify-center transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Full JSON Backup
                      </Button>
                    </div>

                    {/* CSV Excel Export */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-emerald-100 text-emerald-700 p-1.5 rounded-lg">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Export Student Spreadsheet (CSV)</h4>
                            <span className="text-[9px] text-slate-500 font-medium">Excel / Google Sheets Compatible</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Exports all student roster data in CSV spreadsheet format, including SR No, Roll No, Class, Section, Mobile, Aadhaar, Parent Details, Session, Dues, and Photo links for easy opening in Excel.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleExportCSV}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] py-2 px-3 h-auto uppercase tracking-wide flex items-center gap-1.5 w-full justify-center transition-colors shadow-sm"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Download CSV Spreadsheet
                      </Button>
                    </div>

                    {/* Restore Backup */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg">
                            <Upload className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Restore / Import Backup</h4>
                            <span className="text-[9px] text-indigo-600 font-medium">Auto-Restores Photos & Marks</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Restore complete database from a previously downloaded JSON backup file or import student records from a CSV spreadsheet.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept=".json"
                          ref={studentInputRef}
                          onChange={handleImportStudents}
                          className="hidden"
                        />
                        <input
                          type="file"
                          accept=".csv"
                          ref={csvInputRef}
                          onChange={handleImportCSV}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          onClick={() => studentInputRef.current?.click()}
                          disabled={isSyncing}
                          className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-[10.5px] py-1.5 px-3 h-auto uppercase tracking-wide flex items-center gap-1.5 w-full justify-center transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {isSyncing ? "Restoring..." : "Import JSON Backup"}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => csvInputRef.current?.click()}
                          disabled={isSyncing}
                          className="bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold text-[10.5px] py-1.5 px-3 h-auto uppercase tracking-wide flex items-center gap-1.5 w-full justify-center transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          {isSyncing ? "Parsing..." : "Import CSV File"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone: School Wipe */}
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-rose-100 text-rose-600 p-2 rounded-lg shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-rose-800">Master Data Reset & Wipe</h4>
                        <p className="text-[10px] text-rose-600">
                          {syncSchoolId === 'all' 
                            ? 'Select a specific school to wipe student records.' 
                            : `Permanently delete all students currently enrolled under ${schools.find(s => s.id === syncSchoolId)?.name}.`}
                        </p>
                      </div>
                    </div>
                    {syncSchoolId !== 'all' && (
                      <Button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`DANGER: Are you sure you want to permanently delete all students in "${schools.find(s => s.id === syncSchoolId)?.name}"? Make sure you have exported a backup first!`)) {
                            setIsSyncing(true);
                            setImportStatus('Wiping student documents...');
                            try {
                              await deleteAllStudentsInSchool(syncSchoolId);
                              setImportStatus('Success! Mass wipe completed. School roster is empty.');
                            } catch (e: any) {
                              setImportStatus('Error wiping students: ' + e.message);
                            } finally {
                              setIsSyncing(false);
                            }
                          }
                        }}
                        disabled={isSyncing}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10.5px] py-1.5 px-3 h-auto uppercase tracking-wide shrink-0"
                      >
                        Purge Selected School Students
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: IMMEDIATE GOOGLE DRIVE & CLOUD BACKUP */}
              {syncCategory === 'imadate_drive' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl p-6 shadow-md space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                          <HardDrive className="w-3.5 h-3.5" />
                          <span>Google Drive Instant Sync (तुरंत बैकअप)</span>
                        </div>
                        <h3 className="text-lg font-black tracking-tight">1-Click Immediate Google Drive & Cloud Backup</h3>
                        <p className="text-xs text-emerald-100 max-w-xl mt-1 leading-relaxed">
                          Generates complete JSON backup with student photos, examination marks, fee receipts, and school profiles. Instantly downloads to your PC and preserves a persistent restore point in Google Cloud Firestore.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleImmediateDriveBackup}
                        disabled={isSyncing}
                        className="bg-white text-emerald-800 hover:bg-emerald-50 font-black text-sm py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 uppercase tracking-wide transition-all shrink-0 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        {isSyncing ? "Processing Backup..." : "तुरंत बैकअप करें (Backup Now)"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Google Drive Assistant Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b pb-3">
                        <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg">
                          <FolderSync className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Google Drive Folder Integration</h4>
                          <p className="text-[10px] text-slate-500">Organize and store backups directly in Google Drive</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-[11px] font-bold text-slate-700">Target Google Drive Folder Name</Label>
                          <Input
                            type="text"
                            value={gdriveFolder}
                            onChange={(e) => setGdriveFolder(e.target.value)}
                            placeholder="School Management Backups"
                            className="text-xs"
                          />
                          <p className="text-[9.5px] text-slate-400 mt-1">Backups can be uploaded into this folder inside your Google Drive.</p>
                        </div>

                        <div>
                          <Label className="text-[11px] font-bold text-slate-700">Google Account</Label>
                          <Input
                            type="email"
                            value={gdriveUser}
                            onChange={(e) => setGdriveUser(e.target.value)}
                            placeholder="shankaldeep4@gmail.com"
                            className="text-xs"
                          />
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                          <Button
                            type="button"
                            onClick={handleDirectUploadToDrive}
                            disabled={isDriveUploading || isSyncing}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 w-full shadow-sm cursor-pointer"
                          >
                            <HardDrive className={`w-4 h-4 ${isDriveUploading ? 'animate-spin' : ''}`} />
                            <span>{isDriveUploading ? 'Uploading to Drive...' : 'Google Drive पर सीधे अपलोड करें (Direct Upload)'}</span>
                          </Button>
                          <div className="flex items-center gap-2">
                            <a
                              href="https://drive.google.com/drive/my-drive"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 w-full transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Open Google Drive
                            </a>
                            <Button
                              type="button"
                              onClick={handleImmediateDriveBackup}
                              disabled={isSyncing}
                              className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 w-full shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download PC File
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Auto Midnight Backup Info */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b pb-3">
                        <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Midnight Google Apps Script Automation</h4>
                          <p className="text-[10px] text-slate-500">100% automated 12:00 AM cloud sync to Google Drive</p>
                        </div>
                      </div>

                      <p className="text-[10.5px] text-slate-600 leading-relaxed">
                        To have backups saved directly to your Google Drive every night at 12:00 AM without needing to keep the browser open, use our pre-configured Google Apps Script.
                      </p>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSyncCategory('cloud_snapshots');
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                        >
                          <span>View Apps Script Code & Midnight Instructions &rarr;</span>
                        </button>
                      </div>

                      <Button
                        type="button"
                        onClick={handleImmediateCloudBackup}
                        disabled={isSyncing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 w-full flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Database className="w-3.5 h-3.5" />
                        Create Firestore Cloud Restore Point
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CLOUD RESTORE SNAPSHOTS & APPS SCRIPT */}
              {syncCategory === 'cloud_snapshots' && (
                <div className="space-y-6">
                  {/* Historical Backups Table */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Firestore Cloud Restore Snapshots</h3>
                          <p className="text-[10px] text-slate-500">Live restore points stored in Firestore database ({firestoreCloudBackups.length} snapshots available)</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={handleImmediateCloudBackup}
                        disabled={isSyncing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3 uppercase tracking-wide flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New Cloud Snapshot
                      </Button>
                    </div>

                    {firestoreCloudBackups.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <Database className="w-10 h-10 mx-auto stroke-1 mb-2 animate-pulse" />
                        <p className="text-xs font-bold text-slate-600">No Cloud Snapshots Yet</p>
                        <p className="text-[10px] text-slate-400 mt-1">Click "New Cloud Snapshot" or "Instant Drive Backup" to create your first cloud restore point.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                              <th className="p-2.5">Snapshot ID</th>
                              <th className="p-2.5">School Scope</th>
                              <th className="p-2.5">Date & Time</th>
                              <th className="p-2.5 text-center">Students (Photos)</th>
                              <th className="p-2.5 text-center">Marks</th>
                              <th className="p-2.5 text-center">Fees</th>
                              <th className="p-2.5 text-right">Size</th>
                              <th className="p-2.5 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {firestoreCloudBackups.map((b) => (
                              <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-2.5 font-mono text-[10px] text-indigo-600 font-semibold">{b.id}</td>
                                <td className="p-2.5 font-medium text-slate-800">{b.schoolName}</td>
                                <td className="p-2.5 text-slate-500">{new Date(b.exportedAt).toLocaleString()}</td>
                                <td className="p-2.5 text-center font-bold text-slate-700">
                                  {b.studentsCount}
                                  {b.studentsWithPhotosCount !== undefined && b.studentsWithPhotosCount > 0 && (
                                    <span className="ml-1 text-[9.5px] text-indigo-600 font-normal">({b.studentsWithPhotosCount} 📷)</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-center font-bold text-slate-700">{b.marksCount}</td>
                                <td className="p-2.5 text-center font-bold text-emerald-600">{b.feeRecordsCount || 0}</td>
                                <td className="p-2.5 text-right font-mono text-slate-600 font-bold">{b.size}</td>
                                <td className="p-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        let rawJson = b.snapshot;
                                        if (!rawJson) {
                                          const backupPkg = createFullBackupPackage(b.schoolId || syncSchoolId);
                                          rawJson = JSON.stringify(backupPkg, null, 2);
                                        }
                                        const blob = new Blob([rawJson], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `RESTORE_${b.id}.json`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                      }}
                                      className="py-1 px-2 text-[9px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded uppercase cursor-pointer"
                                      title="Download this JSON snapshot"
                                    >
                                      Download
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreFromCloudSnapshot(b.id, b.snapshot)}
                                      className="py-1 px-2 text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded uppercase cursor-pointer"
                                      title="1-Click Restore this snapshot into live database"
                                    >
                                      Restore
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCloudSnapshot(b.id)}
                                      className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                      title="Delete snapshot"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Google Apps Script Midnight Runner */}
                  <div className="bg-white border rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-amber-50 text-amber-600 p-2 rounded-lg">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Google Apps Script Midnight Auto-Backup Code</h3>
                          <p className="text-[10px] text-slate-500">Copy this code into script.google.com for automated nightly backups to Google Drive</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 uppercase tracking-wider">
                        Automated 12:00 AM
                      </span>
                    </div>

                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-[10px] text-slate-300 relative overflow-x-auto max-h-[220px]">
                      <button
                        type="button"
                        onClick={() => {
                          const codeText = document.getElementById('apps-script-code')?.innerText;
                          if (codeText) {
                            navigator.clipboard.writeText(codeText);
                            setScriptCopied(true);
                            setTimeout(() => setScriptCopied(false), 2000);
                          }
                        }}
                        className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold px-2 py-1 rounded border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {scriptCopied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {scriptCopied ? 'Copied!' : 'Copy Code'}
                      </button>
                      <pre id="apps-script-code" className="leading-relaxed">
{`/**
 * Automated Google Drive Backup Scheduler for School Management System
 * Database ID: ai-studio-37117925-0d7c-4ac1-aea6-5327bca4fa90
 * Runs automatically every day at 12:00 AM (Midnight)
 */
const PROJECT_ID = "asymmetric-connection-m8gvj";
const DATABASE_ID = "ai-studio-37117925-0d7c-4ac1-aea6-5327bca4fa90";
const API_KEY = "AIzaSyDVruIO1uQ9Im4lPPdoENZ1gYSHidI7mKg";

function runDailyBackup() {
  Logger.log("Starting automated daily backup process...");
  var schools = fetchCollection("schools");
  for (var i = 0; i < schools.length; i++) {
    var school = schools[i];
    var schoolId = school.id;
    var schoolName = school.name || "School_" + schoolId;
    var students = fetchCollectionWithQuery("students", "schoolId", schoolId);
    var marks = fetchCollectionWithQuery("marks", "schoolId", schoolId);
    var attendances = fetchCollectionWithQuery("attendances", "schoolId", schoolId);
    var feeRecords = fetchCollectionWithQuery("feeRecords", "schoolId", schoolId);
    var backupPackage = {
      type: "school_full_backup",
      schoolId: schoolId,
      schoolName: schoolName,
      exportedAt: new Date().toISOString(),
      students: students,
      marks: marks,
      attendances: attendances,
      feeRecords: feeRecords
    };
    saveToGoogleDrive(schoolName, backupPackage);
  }
}

function fetchCollection(collectionId) {
  var url = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/" + DATABASE_ID + "/documents/" + collectionId + "?key=" + API_KEY;
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var json = JSON.parse(response.getContentText());
  return json.documents ? json.documents.map(parseDocument) : [];
}

function fetchCollectionWithQuery(collectionId, fieldName, fieldValue) {
  var url = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/" + DATABASE_ID + "/documents:runQuery?key=" + API_KEY;
  var payload = {
    structuredQuery: {
      from: [{ collectionId: collectionId }],
      where: { fieldFilter: { field: { fieldPath: fieldName }, op: "EQUAL", value: { stringValue: fieldValue } } }
    }
  };
  var response = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
  var results = JSON.parse(response.getContentText());
  return Array.isArray(results) ? results.filter(r => r.document).map(r => parseDocument(r.document)) : [];
}

function parseDocument(doc) {
  var data = {};
  var fields = doc.fields || {};
  var nameParts = doc.name.split("/");
  data.id = nameParts[nameParts.length - 1];
  Object.keys(fields).forEach(function(key) {
    var val = fields[key];
    data[key] = val.stringValue !== undefined ? val.stringValue : (val.integerValue !== undefined ? parseInt(val.integerValue, 10) : (val.booleanValue !== undefined ? val.booleanValue : val));
  });
  return data;
}

function saveToGoogleDrive(schoolName, data) {
  var folderName = "School Backups";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var fileName = "Backup_" + schoolName + "_" + dateStr + ".json";
  folder.createFile(fileName, JSON.stringify(data, null, 2), "application/json");
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PROFILE & SETTINGS */}
              {syncCategory === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Profile */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg">
                          <Download className="w-5 h-5" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">Export School Settings & Fee Tiers</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Downloads the complete school environment blueprint, encompassing features authorization, registered academic sessions, and grade-wise fee collection matrices.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleExportSchoolProfile}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] py-2 px-3 h-auto uppercase tracking-wide flex items-center gap-1.5 w-full justify-center transition-colors mt-2"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      Download Profile JSON
                    </Button>
                  </div>

                  {/* Import Profile */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-purple-100 text-purple-700 p-2 rounded-lg">
                          <Upload className="w-5 h-5" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">Restore School Settings</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Upload a previously exported school settings package to completely overwrite and restore global feature setups, class fees configurations, and session parameters.
                      </p>
                    </div>
                    
                    <div className="space-y-2 pt-1">
                      <input
                        type="file"
                        accept=".json"
                        ref={profileInputRef}
                        onChange={handleImportSchoolProfile}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        onClick={() => profileInputRef.current?.click()}
                        disabled={isSyncing}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10.5px] py-2 px-3 h-auto uppercase tracking-wide flex items-center gap-1.5 w-full justify-center transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {isSyncing ? "Syncing..." : "Upload Profile File (.json)"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Output Console */}
              {importStatus && (
                <div className={`p-4 rounded-xl flex items-start gap-3 text-xs border ${
                  importStatus.includes('Error') || importStatus.includes('Failed') || importStatus.includes('abort')
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {importStatus.includes('Error') || importStatus.includes('Failed') || importStatus.includes('abort') ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold uppercase tracking-wider text-[10px]">Backup Activity Log</p>
                    <p className="leading-relaxed font-medium">{importStatus}</p>
                    {importedCount > 0 && (
                      <p className="font-mono text-[10px] text-slate-700 font-bold">Total Records Synchronized: {importedCount}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Google Drive Assistant Modal */}
      {showDriveAssistantModal && lastBackupDetails && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">तुरंत बैकअप तैयार है (Backup Ready)</h3>
                  <p className="text-xs text-slate-500">File downloaded & cloud snapshot secured</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDriveAssistantModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 border text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Backup File:</span>
                <span className="font-mono font-bold text-slate-800">{lastBackupDetails.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">File Size:</span>
                <span className="font-bold text-slate-800">{lastBackupDetails.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Student Profiles:</span>
                <span className="font-bold text-indigo-600">{lastBackupDetails.studentsCount} Students</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Student & Parent Photos:</span>
                <span className="font-bold text-emerald-600">{lastBackupDetails.photosCount} Photos included</span>
              </div>
            </div>

            {/* Direct Google Drive Upload Status */}
            {lastBackupDetails.gdriveUploaded ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>गूगल ड्राइव पर सफलतापूर्वक अपलोड हो गया!</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  बैकअप फ़ाइल आपके Google Drive के <strong>"{gdriveFolder}"</strong> फ़ोल्डर में सुरक्षित रूप से पहुँच चुकी है।
                </p>
                {lastBackupDetails.gdriveFileLink && (
                  <a
                    href={lastBackupDetails.gdriveFileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View File in Google Drive</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Google Drive Direct Upload</span>
                  <span className="text-[10px] text-indigo-600 font-semibold">{gdriveFolder}</span>
                </div>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  फ़ाइल आपके कंप्यूटर पर डाउनलोड हो चुकी है और Cloud Restore Point भी बन चुका है। Google Drive पर सीधे अपलोड करने के लिए नीचे दिए गए बटन पर क्लिक करें।
                </p>
                {lastBackupDetails.gdriveError && (
                  <p className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 p-1.5 rounded font-mono">
                    {lastBackupDetails.gdriveError}
                  </p>
                )}
                <Button
                  type="button"
                  onClick={handleDirectUploadToDrive}
                  disabled={isDriveUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 w-full transition-colors shadow-xs cursor-pointer"
                >
                  <HardDrive className={`w-3.5 h-3.5 ${isDriveUploading ? 'animate-spin' : ''}`} />
                  <span>{isDriveUploading ? 'Uploading to Drive...' : 'Upload Directly to Google Drive'}</span>
                </Button>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://drive.google.com/drive/my-drive"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowDriveAssistantModal(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 w-full transition-colors shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open Google Drive
              </a>
              <Button
                type="button"
                onClick={() => setShowDriveAssistantModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {editingSchool && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto w-full">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-800 text-lg">Edit School Info</h3>
              <button 
                onClick={() => setEditingSchool(null)}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <Label>School Name</Label>
                <Input 
                  value={schoolEditForm.name || ''} 
                  onChange={e => setSchoolEditForm({...schoolEditForm, name: e.target.value})} 
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input 
                  value={schoolEditForm.address || ''} 
                  onChange={e => setSchoolEditForm({...schoolEditForm, address: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary Mobile</Label>
                  <Input 
                    value={schoolEditForm.mobile || ''} 
                    onChange={e => setSchoolEditForm({...schoolEditForm, mobile: e.target.value})} 
                  />
                </div>
                <div>
                  <Label>Alt Mobile</Label>
                  <Input 
                    value={schoolEditForm.altMobile || ''} 
                    onChange={e => setSchoolEditForm({...schoolEditForm, altMobile: e.target.value})} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Admin Login ID / E-mail</Label>
                  <Input 
                    type="text"
                    value={schoolEditForm.email || ''} 
                    onChange={e => setSchoolEditForm({...schoolEditForm, email: e.target.value})} 
                    placeholder="e.g. admin@school.edu"
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-500">School Admin username/email</span>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">Admin Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="text-[10.5px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      {showEditPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showEditPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <Input 
                    type={showEditPassword ? "text" : "password"}
                    value={schoolEditForm.adminPass || ''} 
                    onChange={e => setSchoolEditForm({...schoolEditForm, adminPass: e.target.value})} 
                    placeholder="Enter password"
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-500">Visible for Super Admin</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>UDISE Code</Label>
                  <Input 
                    value={schoolEditForm.udiseCode || ''} 
                    onChange={e => setSchoolEditForm({...schoolEditForm, udiseCode: e.target.value})} 
                  />
                </div>
                <div>
                  <Label>School Logo <span className="text-[10px] text-slate-400 font-normal ml-1">(Square shape, Max 1MB)</span></Label>
                  <Input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e, true)} className="text-xs" />
                  {schoolEditForm.logo && <img src={schoolEditForm.logo} alt="Logo" className="h-10 mt-1 object-contain border rounded" />}
                </div>
              </div>
              <Button 
                onClick={async () => {
                  try {
                    await updateSchool(editingSchool.id, schoolEditForm);
                    setEditingSchool(null);
                    alert("School profile and Admin password updated and saved successfully!");
                  } catch (e: any) {
                    alert("Error updating school: " + e.message);
                  }
                }} 
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 font-bold"
              >
                Save Changes (सेव करें)
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
