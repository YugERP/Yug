import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Student, Teacher, ParentAccount, Homework, ExamMark, FeeRecord, Issue, Role, School, AttendanceRecord, NotificationLog, SessionRequest, AttendanceRequest } from './types';
import { doc, setDoc, deleteDoc, updateDoc, onSnapshot, getDoc, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { isSameSubject, normalizeSubject } from './utils/gradeHelper';

// Helper to safely read from localStorage
const getLocalStorageItem = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
};

// Initial Mock Data to seed Firestore on very first blank load
const mockSchools: School[] = [
  { id: 'sch1', name: 'Hogwarts School of Witchcraft and Wizardry', createdAt: new Date().toISOString() }
];

const mockUsers: User[] = [
  { id: 'ma1', name: 'Master Admin', role: 'MASTER_ADMIN', email: 'SHANKALDEEP', password: 'Shan@1234' },
  { id: 'a1', name: 'Albus Dumbledore', role: 'ADMIN', email: 'admin@school.edu', password: 'Admin@1234', schoolId: 'sch1' },
  { id: 'c1', name: 'Arthur Weasley', role: 'CLERK', email: 'clerk@school.edu', password: 'password123', schoolId: 'sch1' },
];

const mockTeachers: Teacher[] = [
  { id: 't1', name: 'Minerva McGonagall', role: 'TEACHER', email: 'minerva@school.edu', password: 'password123', subjects: ['Math', 'Science'], schoolId: 'sch1' },
  { id: 't2', name: 'Severus Snape', role: 'TEACHER', email: 'severus@school.edu', password: 'password123', subjects: ['Chemistry', 'History'], schoolId: 'sch1' },
];

const mockStudents: Student[] = [
  { id: 's1', name: 'Harry Potter', role: 'STUDENT', email: 'harry@school.edu', password: 'password123', grade: 'Class 10', rollNo: '101', feeBalance: 5000, schoolId: 'sch1' },
  { id: 's2', name: 'Hermione Granger', role: 'STUDENT', email: 'hermione@school.edu', password: 'password123', grade: 'Class 10', rollNo: '102', feeBalance: 0, schoolId: 'sch1' },
  { id: 's3', name: 'Ron Weasley', role: 'STUDENT', email: 'ron@school.edu', password: 'password123', grade: 'Class 9', rollNo: '901', feeBalance: 12000, schoolId: 'sch1' },
];

const mockHomeworks: Homework[] = [
  { id: 'hw1', schoolId: 'sch1', teacherId: 't1', grade: 'Class 10', subject: 'Math', title: 'Algebra Equations', description: 'Solve exercise 4.1 completely.', date: new Date().toISOString() }
];

const mockClassFees: Record<string, Record<string, number>> = {
  'sch1': {
    'Class 10': 30000,
    'Class 9': 25000
  }
};

const getLifetimeSessions = (): string[] => {
  const sessions: string[] = [];
  for (let year = 2023; year <= 2050; year++) {
    const nextYearShort = (year + 1) % 100;
    const nextYearStr = nextYearShort < 10 ? `0${nextYearShort}` : `${nextYearShort}`;
    sessions.push(`${year}-${nextYearStr}`);
  }
  return sessions;
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

// Helper to sanitize any object and recursively strip undefined properties before Firestore operations
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

const safeSetDoc = async (docRef: any, data: any, options?: any) => {
  const cleaned = cleanFirestoreData(data);
  return options ? setDoc(docRef, cleaned, options) : setDoc(docRef, cleaned);
};

const safeUpdateDoc = async (docRef: any, data: any) => {
  const cleaned = cleanFirestoreData(data);
  return updateDoc(docRef, cleaned);
};

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Function to seed Firestore with default school data if they do not exist
const seedMockDataToFirestore = async () => {
  try {
    const rootSchoolRef = doc(db, 'schools', 'sch1');
    const schSnap = await getDoc(rootSchoolRef);
    if (!schSnap.exists()) {
      console.log("Seeding Firestore with initial mock data...");
      // Seed school
      await setDoc(rootSchoolRef, mockSchools[0]);
      // Seed users
      for (const u of mockUsers) {
        await setDoc(doc(db, 'users', u.id), u);
      }
      // Seed teachers
      for (const t of mockTeachers) {
        await setDoc(doc(db, 'teachers', t.id), t);
      }
      // Seed students
      for (const s of mockStudents) {
        await setDoc(doc(db, 'students', s.id), s);
      }
      // Seed homeworks
      for (const h of mockHomeworks) {
        await setDoc(doc(db, 'homeworks', h.id), h);
      }
      // Seed class fees
      await setDoc(doc(db, 'classFees', 'sch1'), {
        schoolId: 'sch1',
        fees: mockClassFees['sch1']
      });
      // Seed school config
      await setDoc(doc(db, 'schoolConfig', 'sch1'), {
        schoolId: 'sch1',
        activeAcademicSession: '2026-27',
        academicSessions: getLifetimeSessions(),
        allowedSessions: getLifetimeSessions()
      });
      console.log("Success seeding Firestore with initial mock data!");
    }
  } catch (err) {
    console.error("Error seeding mock data: ", err);
  }
};

interface StoreState {
  schools: School[];
  users: User[];
  students: Student[];
  allStudents: Student[];
  deletedStudents: Student[];
  teachers: Teacher[];
  homeworks: Homework[];
  marks: ExamMark[];
  allMarks: ExamMark[];
  feeRecords: FeeRecord[];
  allFeeRecords: FeeRecord[];
  issues: Issue[];
  attendances: AttendanceRecord[];
  notificationLogs: NotificationLog[];
  currentUser: User | null;
  classFees: Record<string, number>;
  activeAcademicSession: string;
  academicSessions: string[];
  allowedSessions: string[];
  sessionRequests: SessionRequest[];
  attendanceRequests: AttendanceRequest[];
  parentAccounts: ParentAccount[];
}

interface StoreContextType extends StoreState {
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  setActiveAcademicSession: (session: string) => void;
  addAcademicSession: (session: string) => void;
  editAcademicSession: (oldSession: string, newSession: string) => void;
  deleteAcademicSession: (session: string) => void;
  setAllowedSessions: (sessions: string[]) => void;
  addSchool: (payload: any) => void;
  updateSchool: (id: string, updates: Partial<School> & { adminPass?: string }) => void;
  updateSchoolFeatures: (id: string, features: string[]) => void;
  deleteSchool: (id: string) => void;
  addStudent: (student: Student) => void;
  importStudents: (students: Student[]) => void;
  deleteStudent: (id: string) => void;
  restoreStudent: (id: string) => void;
  hardDeleteStudent: (id: string) => void;
  deleteAllStudentsInSchool: (schoolId: string) => Promise<void>;
  addTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;
  addClerk: (clerk: User) => void;
  deleteClerk: (id: string) => void;
  addParentAccount: (parent: ParentAccount) => void;
  updateParentAccount: (id: string, updates: Partial<ParentAccount>) => void;
  deleteParentAccount: (id: string) => void;
  addHomework: (hw: Omit<Homework, 'id' | 'date'>) => void;
  addMark: (mark: Omit<ExamMark, 'id' | 'date'>) => void;
  importMarks: (marks: Omit<ExamMark, 'id' | 'date' | 'schoolId'>[]) => void;
  deleteMark: (id: string) => Promise<void>;
  deleteSubjectMarks: (studentIds: string[], subject: string, examType?: string) => Promise<void>;
  deleteStudentAllMarks: (studentId: string) => Promise<void>;
  addFeePayment: (studentId: string, amount: number, month: string, remarks: string) => FeeRecord;
  importFeeRecords: (records: FeeRecord[]) => void;
  deleteFeePayment: (id: string) => void;
  addIssue: (description: string) => void;
  resolveIssue: (issueId: string) => void;
  setClassFee: (grade: string, amount: number) => void;
  setClassFeesBatch: (grade: string, amount: number, halfYearly: number, yearly: number) => void;
  getStudentBalance: (studentId: string) => { total: number, previous: number, current: number, paid: number, balance: number, concession?: number };
  updateStudent: (studentId: string, updates: Partial<Student>) => void;
  saveAttendance: (records: AttendanceRecord[]) => Promise<void>;
  addNotificationLog: (log: Omit<NotificationLog, 'id' | 'schoolId' | 'timestamp'>) => Promise<void>;
  requestSessionApproval: (session: string) => Promise<void>;
  approveSessionRequest: (requestId: string) => Promise<void>;
  deleteSessionRequest: (requestId: string) => Promise<void>;
  submitAttendanceRequest: (req: Omit<AttendanceRequest, 'id' | 'schoolId' | 'status' | 'requestedAt'>) => Promise<void>;
  approveAttendanceRequest: (requestId: string) => Promise<void>;
  rejectAttendanceRequest: (requestId: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceRequest[]>([]);
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => getLocalStorageItem('sch_currentUser', null));

  const [classFeesData, setClassFeesData] = useState<Record<string, Record<string, number>>>({});
  const [schoolConfigs, setSchoolConfigs] = useState<Record<string, { activeAcademicSession: string, academicSessions: string[], allowedSessions: string[] }>>({});

  // Trigger seeding and setup real-time snapshot listeners with Firestore
  useEffect(() => {
    seedMockDataToFirestore();

    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      const list: School[] = [];
      snap.forEach(doc => list.push(doc.data() as School));
      setSchools(list);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'schools'));

    const unsubSchoolConfigs = onSnapshot(collection(db, 'schoolConfig'), (snap) => {
      const configMap: Record<string, { activeAcademicSession: string, academicSessions: string[], allowedSessions: string[] }> = {};
      snap.forEach(doc => {
        const data = doc.data();
        const customAcc = data.academicSessions || [];
        const customAll = data.allowedSessions || [];
        configMap[doc.id] = {
          activeAcademicSession: data.activeAcademicSession || '2026-27',
          academicSessions: Array.from(new Set([...customAcc, ...getLifetimeSessions()])),
          allowedSessions: Array.from(new Set([...customAll, ...getLifetimeSessions()]))
        };
      });
      setSchoolConfigs(configMap);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'schoolConfig'));

    const unsubSessionRequests = onSnapshot(collection(db, 'sessionRequests'), (snap) => {
      const list: SessionRequest[] = [];
      snap.forEach(doc => list.push(doc.data() as SessionRequest));
      setSessionRequests(list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'sessionRequests'));

    return () => {
      unsubSchools();
      unsubSchoolConfigs();
      unsubSessionRequests();
    };
  }, []);

  // School-specific listeners that depend on currentUser
  useEffect(() => {
    const schoolId = currentUser?.schoolId || '';
    const isMaster = currentUser?.role === 'MASTER_ADMIN' || currentUser?.role === 'master_admin';

    // Helper to get collection or query
    const getQuery = (colName: string) => {
      if (!currentUser || isMaster) return collection(db, colName);
      return query(collection(db, colName), where('schoolId', '==', schoolId));
    };

    const unsubUsers = onSnapshot(getQuery('users'), (snap) => {
      const list: User[] = [];
      snap.forEach(doc => list.push(doc.data() as User));
      setUsers(list);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    const unsubParentAccounts = onSnapshot(getQuery('parentAccounts'), (snap) => {
      const list: ParentAccount[] = [];
      snap.forEach(doc => list.push(doc.data() as ParentAccount));
      setParentAccounts(list);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'parentAccounts'));

    const unsubStudents = onSnapshot(getQuery('students'), (snap) => {
      const list: Student[] = [];
      snap.forEach(doc => list.push(doc.data() as Student));
      setStudents(list);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'students'));

    const unsubTeachers = onSnapshot(getQuery('teachers'), (snap) => {
      const list: Teacher[] = [];
      snap.forEach(doc => list.push(doc.data() as Teacher));
      setTeachers(list);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'teachers'));

    const unsubHomeworks = onSnapshot(getQuery('homeworks'), (snap) => {
      const list: Homework[] = [];
      snap.forEach(doc => list.push(doc.data() as Homework));
      setHomeworks(list);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'homeworks'));

    const unsubMarks = onSnapshot(getQuery('marks'), (snap) => {
      const list: ExamMark[] = [];
      snap.forEach(doc => list.push(doc.data() as ExamMark));
      setMarks(list);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'marks'));

    const unsubFeeRecords = onSnapshot(getQuery('feeRecords'), (snap) => {
      const list: FeeRecord[] = [];
      snap.forEach(doc => list.push(doc.data() as FeeRecord));
      setFeeRecords(list);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'feeRecords'));

    const unsubIssues = onSnapshot(getQuery('issues'), (snap) => {
      const list: Issue[] = [];
      snap.forEach(doc => list.push(doc.data() as Issue));
      setIssues(list);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'issues'));

    const unsubAttendances = onSnapshot(getQuery('attendances'), (snap) => {
      const list: AttendanceRecord[] = [];
      snap.forEach(doc => list.push(doc.data() as AttendanceRecord));
      setAttendances(list);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'attendances'));

    const unsubNotificationLogs = onSnapshot(getQuery('notificationLogs'), (snap) => {
      const list: NotificationLog[] = [];
      snap.forEach(doc => list.push(doc.data() as NotificationLog));
      setNotificationLogs(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'notificationLogs'));

    const unsubClassFees = onSnapshot(collection(db, 'classFees'), (snap) => {
      const feesMap: Record<string, Record<string, number>> = {};
      snap.forEach(doc => {
        const data = doc.data();
        feesMap[doc.id] = data.fees || {};
      });
      setClassFeesData(feesMap);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'classFees'));

    const unsubAttendanceRequests = onSnapshot(getQuery('attendanceRequests'), (snap) => {
      const list: AttendanceRequest[] = [];
      snap.forEach(doc => list.push(doc.data() as AttendanceRequest));
      setAttendanceRequests(list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'attendanceRequests'));

    return () => {
      unsubUsers();
      unsubParentAccounts();
      unsubStudents();
      unsubTeachers();
      unsubHomeworks();
      unsubMarks();
      unsubFeeRecords();
      unsubIssues();
      unsubAttendances();
      unsubNotificationLogs();
      unsubClassFees();
      unsubAttendanceRequests();
    };
  }, [currentUser?.id, currentUser?.schoolId, currentUser?.role]);

  // Keep this just so we can replace cleanly
  

  // Update currentUser in localStorage when it changes in active tab
  useEffect(() => {
    localStorage.setItem('sch_currentUser', JSON.stringify(currentUser));
  }, [currentUser]);

  const isAdminPanel = currentUser?.role === 'MASTER_ADMIN';
  const effectiveSchoolId = currentUser?.schoolId || '';

  const defaultSchoolConfig = {
    activeAcademicSession: '2026-27',
    academicSessions: getLifetimeSessions(),
    allowedSessions: getLifetimeSessions()
  };

  const currentSchoolConfig = schoolConfigs[effectiveSchoolId] || defaultSchoolConfig;
  const activeAcademicSession = currentSchoolConfig.activeAcademicSession;
  const academicSessions = currentSchoolConfig.academicSessions;
  const allowedSessions = currentSchoolConfig.allowedSessions;

  const filteredUsers = isAdminPanel ? users : users.filter(u => u.schoolId === effectiveSchoolId);
  const rawSchoolStudents = isAdminPanel ? students : students.filter(s => !effectiveSchoolId || !s.schoolId || s.schoolId === effectiveSchoolId);
  const activeSchoolStudents = rawSchoolStudents.filter(s => !s.isDeleted);
  const deletedSchoolStudents = rawSchoolStudents.filter(s => s.isDeleted);
  const filteredStudents = activeSchoolStudents.map(s => {
    // If student's current active session matches the active view session, return them as is
    if (!s.academicSession || s.academicSession === activeAcademicSession) {
      return s;
    }
    // If student was in the active view session historically, reconstruct their snapshot details
    const historyEntry = s.academicHistory?.find(h => h.academicSession === activeAcademicSession);
    if (historyEntry) {
      return {
        ...s,
        academicSession: activeAcademicSession,
        grade: historyEntry.grade,
        rollNo: historyEntry.rollNo,
        section: historyEntry.section || s.section
      };
    }
    // Otherwise, they were not admitted or promoted to this session, so do not show them
    return null;
  }).filter(Boolean) as Student[];
  const filteredTeachers = isAdminPanel ? teachers : teachers.filter(t => t.schoolId === effectiveSchoolId);
  const filteredHomeworks = isAdminPanel ? homeworks : homeworks.filter(h => h.schoolId === effectiveSchoolId);
  const studentIdsInSession = new Set(filteredStudents.map(s => s.id));
  
  const rawSchoolMarks = isAdminPanel ? marks : marks.filter(m => m.schoolId === effectiveSchoolId);
  const rawSchoolFeeRecords = isAdminPanel ? feeRecords : feeRecords.filter(f => f.schoolId === effectiveSchoolId);
  const filteredMarks = rawSchoolMarks.filter(m => studentIdsInSession.has(m.studentId));
  const filteredFeeRecords = rawSchoolFeeRecords.filter(f => studentIdsInSession.has(f.studentId));
  const filteredIssues = isAdminPanel ? issues : issues.filter(i => i.schoolId === effectiveSchoolId);
  const filteredParentAccounts = isAdminPanel ? parentAccounts : parentAccounts.filter(p => p.schoolId === effectiveSchoolId);

  const currentClassFees = classFeesData[effectiveSchoolId] || {};

  const allUsers = [...users, ...students, ...teachers, ...parentAccounts];

  const getStudentBalance = (studentId: string) => {
    const student = filteredStudents.find(s => s.id === studentId);
    const current = student ? (currentClassFees[student.grade] || 0) : 0;
    const previous = student?.previousDues || 0;
    const concession = student?.discountScholarship || 0;
    const total = Math.max(0, current + previous - concession);
    const paid = filteredFeeRecords.filter(f => f.studentId === studentId).reduce((acc, curr) => acc + curr.amount, 0);
    return { total, current, previous, concession, paid, balance: Math.max(0, total - paid) };
  };

  const updateStudent = async (studentId: string, updates: Partial<Student>) => {
    try {
      // Optimistic local state update for instant UI responsiveness
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...updates } : s));

      // Clean undefined values before updating Firestore
      const cleanUpdates: Record<string, any> = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanUpdates[key] = value;
        }
      });

      if (Object.keys(cleanUpdates).length > 0) {
        await updateDoc(doc(db, 'students', studentId), cleanUpdates);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${studentId}`);
    }
  };

  const setClassFee = async (grade: string, amount: number) => {
    try {
      const feesMap = classFeesData[effectiveSchoolId] || {};
      await setDoc(doc(db, 'classFees', effectiveSchoolId), {
        schoolId: effectiveSchoolId,
        fees: {
          ...feesMap,
          [grade]: amount
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `classFees/${effectiveSchoolId}`);
    }
  };

  const setClassFeesBatch = async (grade: string, amount: number, halfYearly: number, yearly: number) => {
    try {
      const feesMap = classFeesData[effectiveSchoolId] || {};
      await setDoc(doc(db, 'classFees', effectiveSchoolId), {
        schoolId: effectiveSchoolId,
        fees: {
          ...feesMap,
          [grade]: amount,
          [`${grade}_HalfYearly`]: halfYearly,
          [`${grade}_Yearly`]: yearly
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `classFees/${effectiveSchoolId}`);
    }
  };

  const login = (emailOrUsername: string, pass: string) => {
    const searchId = emailOrUsername.toLowerCase();
    const user = allUsers.find(u => {
      const emailMatch = u.email && u.email.toLowerCase() === searchId;
      const usernameMatch = (u as any).username && (u as any).username.toLowerCase() === searchId;
      const mobileMatch = (u as any).mobile && (u as any).mobile === searchId;
      const srFallbackMatch = (u as any).srNo && `stud_${(u as any).srNo}`.toLowerCase() === searchId;
      return (emailMatch || usernameMatch || mobileMatch || srFallbackMatch) && u.password === pass;
    });
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const addSchool = async (payload: any) => {
    try {
      const newSchoolId = `sch${Date.now()}`;
      await setDoc(doc(db, 'schools', newSchoolId), { 
        id: newSchoolId, 
        name: payload.name,
        address: payload.address,
        mobile: payload.mobile,
        altMobile: payload.altMobile,
        udiseCode: payload.udiseCode,
        email: payload.adminEmail,
        logo: payload.logo || '',
        createdAt: new Date().toISOString(),
        features: ['registration', 'fees', 'homework', 'attendance', 'marks', 'tc', 'idcard'] 
      });
      await setDoc(doc(db, 'users', `a${Date.now()}`), { id: `a${Date.now()}`, name: 'School Admin', role: 'ADMIN', email: payload.adminEmail, password: payload.adminPass, schoolId: newSchoolId });
      await setDoc(doc(db, 'classFees', newSchoolId), { schoolId: newSchoolId, fees: {} });
      await setDoc(doc(db, 'schoolConfig', newSchoolId), {
        schoolId: newSchoolId,
        activeAcademicSession: '2026-27',
        academicSessions: getLifetimeSessions(),
        allowedSessions: getLifetimeSessions()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'schools');
    }
  };

  const updateSchool = async (id: string, updates: Partial<School> & { adminPass?: string }) => {
    try {
      const { adminPass, ...rawUpdates } = updates;
      
      // Clean undefined values before Firebase update
      const schoolUpdates = Object.fromEntries(Object.entries(rawUpdates).filter(([_, v]) => v !== undefined));
      
      // Update school itself
      if (Object.keys(schoolUpdates).length > 0) {
        await updateDoc(doc(db, 'schools', id), schoolUpdates);
      }

      // Handle admin credentials if email or pass changed
      if (schoolUpdates.email || adminPass) {
        // Find the admin user for this school
        const adminUser = users.find(u => u.schoolId === id && u.role === 'ADMIN');
        if (adminUser) {
          const userUpdates: any = {};
          if (schoolUpdates.email) userUpdates.email = schoolUpdates.email;
          if (adminPass) userUpdates.password = adminPass;
          
          await updateDoc(doc(db, 'users', adminUser.id), userUpdates);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `schools/${id}`);
      throw err;
    }
  };

  const updateSchoolFeatures = async (id: string, features: string[]) => {
    try {
      await updateDoc(doc(db, 'schools', id), { features });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `schools/${id}`);
    }
  };

  const deleteSchool = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'schools', id));
      await deleteDoc(doc(db, 'classFees', id));
      await deleteDoc(doc(db, 'schoolConfig', id));
      // Delete associated users, students, and teachers from Firestore
      const usersToDelete = users.filter(u => u.schoolId === id);
      for (const u of usersToDelete) {
        await deleteDoc(doc(db, 'users', u.id));
      }
      const studentsToDelete = students.filter(s => s.schoolId === id);
      for (const s of studentsToDelete) {
        await deleteDoc(doc(db, 'students', s.id));
      }
      const teachersToDelete = teachers.filter(t => t.schoolId === id);
      for (const t of teachersToDelete) {
        await deleteDoc(doc(db, 'teachers', t.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `schools/${id}`);
    }
  };

  const addStudent = async (student: Student) => {
    try {
      await safeSetDoc(doc(db, 'students', student.id), { ...student, schoolId: effectiveSchoolId });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `students/${student.id}`);
    }
  };

  const importStudents = async (newStudents: Student[]) => {
    try {
      const targetSchoolId = effectiveSchoolId || currentUser?.schoolId || '';
      const studentsWithMeta = newStudents.map(s => {
        const studentObj = {
          ...s,
          schoolId: s.schoolId || targetSchoolId,
          academicSession: s.academicSession || activeAcademicSession || '2025-26',
          isDeleted: false
        };
        return cleanFirestoreData(studentObj);
      });

      // Optimistically update local React state immediately so UI refreshes without delay
      setStudents(prev => {
        const studentMap = new Map<string, Student>();
        prev.forEach(s => studentMap.set(s.id, s));
        studentsWithMeta.forEach(ns => {
          const existing = studentMap.get(ns.id);
          studentMap.set(ns.id, existing ? { ...existing, ...ns } : ns);
        });
        return Array.from(studentMap.values());
      });

      for (const s of studentsWithMeta) {
        await safeSetDoc(doc(db, 'students', s.id), s);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'students/import');
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      // Optimistic local state updates for instantaneous responsiveness
      setStudents(prev => prev.filter(s => s.id !== id));
      setMarks(prev => prev.filter(m => m.studentId !== id));
      setFeeRecords(prev => prev.filter(f => f.studentId !== id));
      setAttendances(prev => prev.filter(a => a.studentId !== id && a.userId !== id));
      setParentAccounts(prev => prev.filter(p => p.studentId !== id));

      // Direct, permanent deletion from Firestore database
      await deleteDoc(doc(db, 'students', id));

      // Also clean up any associated student marks, fee payments, and attendance records from Firestore
      const relatedMarks = marks.filter(m => m.studentId === id);
      for (const m of relatedMarks) {
        await deleteDoc(doc(db, 'marks', m.id)).catch(() => {});
      }
      const relatedFees = feeRecords.filter(f => f.studentId === id);
      for (const f of relatedFees) {
        await deleteDoc(doc(db, 'feeRecords', f.id)).catch(() => {});
      }
      const relatedAttendances = attendances.filter(a => a.studentId === id || a.userId === id);
      for (const a of relatedAttendances) {
        await deleteDoc(doc(db, 'attendances', a.id)).catch(() => {});
      }
      const relatedParents = parentAccounts.filter(p => p.studentId === id);
      for (const p of relatedParents) {
        await deleteDoc(doc(db, 'parentAccounts', p.id)).catch(() => {});
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
    }
  };

  const restoreStudent = async (id: string) => {
    try {
      await updateDoc(doc(db, 'students', id), { isDeleted: false });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/restore/${id}`);
    }
  };

  const hardDeleteStudent = async (id: string) => {
    await deleteStudent(id);
  };

  const deleteAllStudentsInSchool = async (schoolId: string) => {
    try {
      const studentsToDelete = students.filter(s => s.schoolId === schoolId);
      const studentIds = new Set(studentsToDelete.map(s => s.id));

      setStudents(prev => prev.filter(s => s.schoolId !== schoolId));
      setMarks(prev => prev.filter(m => !studentIds.has(m.studentId)));
      setFeeRecords(prev => prev.filter(f => !studentIds.has(f.studentId)));
      setAttendances(prev => prev.filter(a => !(a.studentId && studentIds.has(a.studentId))));

      for (const s of studentsToDelete) {
        await deleteDoc(doc(db, 'students', s.id)).catch(() => {});
      }
      const marksToDelete = marks.filter(m => studentIds.has(m.studentId));
      for (const m of marksToDelete) {
        await deleteDoc(doc(db, 'marks', m.id)).catch(() => {});
      }
      const feesToDelete = feeRecords.filter(f => studentIds.has(f.studentId));
      for (const f of feesToDelete) {
        await deleteDoc(doc(db, 'feeRecords', f.id)).catch(() => {});
      }
      const attsToDelete = attendances.filter(a => (a.studentId && studentIds.has(a.studentId)));
      for (const a of attsToDelete) {
        await deleteDoc(doc(db, 'attendances', a.id)).catch(() => {});
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `students/bulk_delete/${schoolId}`);
    }
  };

  const addTeacher = async (teacher: Teacher) => {
    try {
      await safeSetDoc(doc(db, 'teachers', teacher.id), { ...teacher, schoolId: effectiveSchoolId });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `teachers/${teacher.id}`);
    }
  };

  const deleteTeacher = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'teachers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teachers/${id}`);
    }
  };

  const addClerk = async (clerk: User) => {
    try {
      await safeSetDoc(doc(db, 'users', clerk.id), { ...clerk, schoolId: effectiveSchoolId });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${clerk.id}`);
    }
  };

  const deleteClerk = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
    }
  };

  const addParentAccount = async (parent: ParentAccount) => {
    try {
      await safeSetDoc(doc(db, 'parentAccounts', parent.id), { ...parent, schoolId: effectiveSchoolId });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `parentAccounts/${parent.id}`);
    }
  };

  const updateParentAccount = async (id: string, updates: Partial<ParentAccount>) => {
    try {
      await safeUpdateDoc(doc(db, 'parentAccounts', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `parentAccounts/${id}`);
    }
  };

  const deleteParentAccount = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'parentAccounts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `parentAccounts/${id}`);
    }
  };

  const addHomework = async (hw: Omit<Homework, 'id' | 'date' | 'schoolId'>) => {
    try {
      const id = `hw${Date.now()}`;
      await safeSetDoc(doc(db, 'homeworks', id), {
        ...hw,
        id,
        schoolId: effectiveSchoolId,
        date: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'homeworks');
    }
  };

  const addMark = async (mark: Omit<ExamMark, 'id' | 'date' | 'schoolId'>) => {
    try {
      const normSubject = normalizeSubject(mark.subject);
      const existing = marks.find(m => 
        m.studentId === mark.studentId && 
        m.examType === mark.examType && 
        isSameSubject(m.subject, mark.subject)
      );
      const id = existing ? existing.id : `m_${Date.now()}_${Math.random().toString().slice(2, 6)}`;
      const savedMark: ExamMark = {
        ...mark,
        subject: normSubject,
        id,
        schoolId: effectiveSchoolId,
        date: new Date().toISOString()
      };

      setMarks(prev => {
        const filtered = prev.filter(m => m.id !== id && !(m.studentId === mark.studentId && m.examType === mark.examType && isSameSubject(m.subject, mark.subject)));
        return [...filtered, savedMark];
      });

      await safeSetDoc(doc(db, 'marks', id), savedMark);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'marks');
    }
  };

  const importMarks = async (newMarks: Omit<ExamMark, 'id' | 'date' | 'schoolId'>[]) => {
    try {
      const targetSchoolId = effectiveSchoolId || currentUser?.schoolId || '';
      
      const currentMarksMap = new Map<string, ExamMark>();
      marks.forEach(m => {
        const key = `${m.studentId}:::${m.examType}:::${normalizeSubject(m.subject).toLowerCase()}`;
        currentMarksMap.set(key, m);
      });

      const marksToPersist: ExamMark[] = [];

      newMarks.forEach((m, idx) => {
        const normSub = normalizeSubject(m.subject);
        const key = `${m.studentId}:::${m.examType}:::${normSub.toLowerCase()}`;
        const existing = currentMarksMap.get(key);
        const id = existing ? existing.id : `m_${Date.now()}_${idx}_${Math.random().toString().slice(2, 6)}`;
        const markObj: ExamMark = {
          ...m,
          subject: normSub,
          id,
          schoolId: targetSchoolId,
          date: new Date().toISOString()
        };
        currentMarksMap.set(key, markObj);
        marksToPersist.push(markObj);
      });

      setMarks(Array.from(currentMarksMap.values()));

      const batchList = marksToPersist.map(mark => safeSetDoc(doc(db, 'marks', mark.id), mark));
      await Promise.all(batchList);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'marks batch');
    }
  };

  const deleteMark = async (id: string) => {
    try {
      setMarks(prev => prev.filter(m => m.id !== id));
      await deleteDoc(doc(db, 'marks', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `marks/${id}`);
    }
  };

  const deleteSubjectMarks = async (studentIds: string[], subject: string, examType?: string) => {
    try {
      const studentIdSet = new Set(studentIds);
      const toDelete = marks.filter(m => 
        studentIdSet.has(m.studentId) && 
        isSameSubject(m.subject, subject) && 
        (!examType || m.examType === examType)
      );

      if (toDelete.length === 0) return;

      const deleteIds = new Set(toDelete.map(m => m.id));
      setMarks(prev => prev.filter(m => !deleteIds.has(m.id)));

      const deletePromises = toDelete.map(m => deleteDoc(doc(db, 'marks', m.id)));
      await Promise.all(deletePromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'marks subject batch');
    }
  };

  const deleteStudentAllMarks = async (studentId: string) => {
    try {
      const toDelete = marks.filter(m => m.studentId === studentId);
      if (toDelete.length === 0) return;

      const deleteIds = new Set(toDelete.map(m => m.id));
      setMarks(prev => prev.filter(m => !deleteIds.has(m.id)));

      const deletePromises = toDelete.map(m => deleteDoc(doc(db, 'marks', m.id)));
      await Promise.all(deletePromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `marks/student/${studentId}`);
    }
  };

  const addFeePayment = (studentId: string, amount: number, month: string, remarks: string, receiptNo?: string) => {
    const school = schools.find(s => s.id === effectiveSchoolId);
    
    const startingNo = school?.nextReceiptNo !== undefined ? school.nextReceiptNo : 1001;
    const finalReceiptNo = receiptNo || String(startingNo);
    
    const id = `fee${Date.now()}`;
    const record: FeeRecord = {
      id,
      receiptNo: finalReceiptNo,
      schoolId: effectiveSchoolId,
      studentId,
      amount,
      date: new Date().toISOString(),
      type: 'Payment',
      remarks: month ? `${month} Fee - ${remarks}` : remarks
    };
    try {
      setDoc(doc(db, 'feeRecords', id), record);
      if (school) {
        if (receiptNo) {
          const num = parseInt(receiptNo, 10);
          if (!isNaN(num)) {
            updateSchool(school.id, { nextReceiptNo: num + 1 });
          }
        } else {
          updateSchool(school.id, { nextReceiptNo: startingNo + 1 });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `feeRecords/${id}`);
    }
    return record;
  };

  const importFeeRecords = async (records: FeeRecord[]) => {
    try {
      for (const r of records) {
        await setDoc(doc(db, 'feeRecords', r.id), { ...r, schoolId: effectiveSchoolId });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'feeRecords/import');
    }
  };

  const deleteFeePayment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'feeRecords', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `feeRecords/${id}`);
    }
  };

  const addIssue = async (description: string) => {
    if (!currentUser) return;
    try {
      const id = `iss${Date.now()}`;
      const issue: Issue = {
        id,
        schoolId: effectiveSchoolId,
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        fromUserRole: currentUser.role,
        description,
        status: 'Open',
        date: new Date().toISOString()
      };
      await setDoc(doc(db, 'issues', id), issue);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'issues');
    }
  };

  const resolveIssue = async (issueId: string) => {
    try {
      await updateDoc(doc(db, 'issues', issueId), { status: 'Resolved' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `issues/${issueId}`);
    }
  };

  const setActiveAcademicSession = async (session: string) => {
    try {
      const config = schoolConfigs[effectiveSchoolId] || defaultSchoolConfig;
      await setDoc(doc(db, 'schoolConfig', effectiveSchoolId), {
        ...config,
        schoolId: effectiveSchoolId,
        activeAcademicSession: session
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `schoolConfig/${effectiveSchoolId}`);
    }
  };

  const addAcademicSession = async (session: string) => {
    try {
      const config = schoolConfigs[effectiveSchoolId] || defaultSchoolConfig;
      const updated = Array.from(new Set([...config.academicSessions, session]));
      await setDoc(doc(db, 'schoolConfig', effectiveSchoolId), {
        ...config,
        schoolId: effectiveSchoolId,
        academicSessions: updated
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `schoolConfig/${effectiveSchoolId}/addSession`);
    }
  };

  const editAcademicSession = async (oldSession: string, newSession: string) => {
    try {
      const config = schoolConfigs[effectiveSchoolId] || defaultSchoolConfig;
      const updated = config.academicSessions.map(s => s === oldSession ? newSession : s);
      const updatedAllowed = config.allowedSessions.map(s => s === oldSession ? newSession : s);
      let active = config.activeAcademicSession;
      if (active === oldSession) active = newSession;
      await setDoc(doc(db, 'schoolConfig', effectiveSchoolId), {
        ...config,
        schoolId: effectiveSchoolId,
        activeAcademicSession: active,
        academicSessions: updated,
        allowedSessions: updatedAllowed
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `schoolConfig/${effectiveSchoolId}/editSession`);
    }
  };

  const deleteAcademicSession = async (session: string) => {
    try {
      const config = schoolConfigs[effectiveSchoolId] || defaultSchoolConfig;
      const updated = config.academicSessions.filter(s => s !== session);
      const updatedAllowed = config.allowedSessions.filter(s => s !== session);
      let active = config.activeAcademicSession;
      if (active === session) active = updated[0] || '';
      await setDoc(doc(db, 'schoolConfig', effectiveSchoolId), {
        ...config,
        schoolId: effectiveSchoolId,
        activeAcademicSession: active,
        academicSessions: updated,
        allowedSessions: updatedAllowed
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `schoolConfig/${effectiveSchoolId}/deleteSession`);
    }
  };

  const setAllowedSessions = async (sessions: string[]) => {
    try {
      const config = schoolConfigs[effectiveSchoolId] || defaultSchoolConfig;
      await setDoc(doc(db, 'schoolConfig', effectiveSchoolId), {
        ...config,
        schoolId: effectiveSchoolId,
        allowedSessions: sessions
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `schoolConfig/${effectiveSchoolId}/allowedSessions`);
    }
  };

  const saveAttendance = async (records: AttendanceRecord[]) => {
    try {
      for (const rec of records) {
        // e.g. record id is userId_date
        const targetId = rec.userId || rec.studentId || `unknown_${Date.now()}`;
        const id = `${targetId}_${rec.date}`;
        await setDoc(doc(db, 'attendances', id), {
          ...rec,
          id,
          schoolId: effectiveSchoolId
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'attendances');
    }
  };

  const addNotificationLog = async (log: Omit<NotificationLog, 'id' | 'schoolId' | 'timestamp'>) => {
    try {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      await setDoc(doc(db, 'notificationLogs', id), {
        ...log,
        id,
        schoolId: effectiveSchoolId,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'notificationLogs');
    }
  };

  const requestSessionApproval = async (session: string) => {
    if (!currentUser || !effectiveSchoolId) return;
    try {
      const school = schools.find(s => s.id === effectiveSchoolId);
      const id = `${effectiveSchoolId}_${session.replace(/[\s/]+/g, '_')}`;
      const req: SessionRequest = {
        id,
        schoolId: effectiveSchoolId,
        schoolName: school ? school.name : 'Unknown School',
        session,
        status: 'Pending',
        requestedAt: new Date().toISOString(),
        requestedByEmail: currentUser.email
      };
      await setDoc(doc(db, 'sessionRequests', id), req);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `sessionRequests/request`);
    }
  };

  const approveSessionRequest = async (requestId: string) => {
    try {
      const reqRef = doc(db, 'sessionRequests', requestId);
      const reqSnap = await getDoc(reqRef);
      if (!reqSnap.exists()) return;
      const reqData = reqSnap.data() as SessionRequest;
      
      // 1. Mark request as Approved
      await updateDoc(reqRef, { status: 'Approved' });
      
      // 2. Add to schoolConfig allowedSessions
      const schoolConfigRef = doc(db, 'schoolConfig', reqData.schoolId);
      const configSnap = await getDoc(schoolConfigRef);
      if (configSnap.exists()) {
        const config = configSnap.data();
        const allowedSessions = config.allowedSessions || [];
        const academicSessions = config.academicSessions || [];
        
        const updatedAllowed = Array.from(new Set([...allowedSessions, reqData.session]));
        const updatedAcademic = Array.from(new Set([...academicSessions, reqData.session]));
        
        await setDoc(schoolConfigRef, {
          ...config,
          academicSessions: updatedAcademic,
          allowedSessions: updatedAllowed
        }, { merge: true });
      } else {
        await setDoc(schoolConfigRef, {
          schoolId: reqData.schoolId,
          activeAcademicSession: reqData.session,
          academicSessions: [reqData.session],
          allowedSessions: [reqData.session]
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sessionRequests/${requestId}`);
    }
  };

  const deleteSessionRequest = async (requestId: string) => {
    try {
      const reqRef = doc(db, 'sessionRequests', requestId);
      const reqSnap = await getDoc(reqRef);
      if (!reqSnap.exists()) return;
      const reqData = reqSnap.data() as SessionRequest;

      // 1. Delete request document
      await deleteDoc(reqRef);

      // 2. Remove from schoolConfig list if needed
      const schoolConfigRef = doc(db, 'schoolConfig', reqData.schoolId);
      const configSnap = await getDoc(schoolConfigRef);
      if (configSnap.exists()) {
        const config = configSnap.data();
        const allowedSessions = (config.allowedSessions || []).filter((s: string) => s !== reqData.session);
        const academicSessions = (config.academicSessions || []).filter((s: string) => s !== reqData.session);
        let active = config.activeAcademicSession;
        if (active === reqData.session) {
          active = academicSessions[0] || '2026-27';
        }
        await setDoc(schoolConfigRef, {
          ...config,
          activeAcademicSession: active,
          academicSessions,
          allowedSessions
        }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sessionRequests/${requestId}`);
    }
  };

  const submitAttendanceRequest = async (reqPayload: Omit<AttendanceRequest, 'id' | 'schoolId' | 'status' | 'requestedAt'>) => {
    try {
      const id = `att_req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const req: AttendanceRequest = {
        ...reqPayload,
        id,
        schoolId: effectiveSchoolId,
        status: 'Pending',
        requestedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'attendanceRequests', id), req);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `attendanceRequests/request`);
    }
  };

  const approveAttendanceRequest = async (requestId: string) => {
    try {
      const reqRef = doc(db, 'attendanceRequests', requestId);
      const reqSnap = await getDoc(reqRef);
      if (!reqSnap.exists()) return;
      const reqData = reqSnap.data() as AttendanceRequest;

      // 1. Mark request as Approved
      await updateDoc(reqRef, { status: 'Approved' });

      // 2. Create or update corresponding AttendanceRecord
      const targetId = reqData.userId || `unknown_${Date.now()}`;
      const attId = `${targetId}_${reqData.date}`;
      const attRecord: AttendanceRecord = {
        id: attId,
        schoolId: reqData.schoolId,
        userId: reqData.userId,
        userType: reqData.userRole,
        date: reqData.date,
        status: reqData.requestedStatus
      };
      await setDoc(doc(db, 'attendances', attId), attRecord);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `attendanceRequests/${requestId}`);
    }
  };

  const rejectAttendanceRequest = async (requestId: string) => {
    try {
      const reqRef = doc(db, 'attendanceRequests', requestId);
      await updateDoc(reqRef, { status: 'Rejected' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `attendanceRequests/${requestId}`);
    }
  };

  return (
    <StoreContext.Provider value={{
      schools, users: filteredUsers, students: filteredStudents, allStudents: rawSchoolStudents, deletedStudents: deletedSchoolStudents, teachers: filteredTeachers, 
      homeworks: filteredHomeworks, marks: filteredMarks, allMarks: rawSchoolMarks, feeRecords: filteredFeeRecords, allFeeRecords: rawSchoolFeeRecords, 
      issues: filteredIssues, attendances, notificationLogs, currentUser, classFees: currentClassFees, activeAcademicSession, academicSessions, allowedSessions,
      sessionRequests, attendanceRequests, parentAccounts: filteredParentAccounts,
      login, logout, setActiveAcademicSession, addAcademicSession, editAcademicSession, deleteAcademicSession, setAllowedSessions, addSchool, updateSchool, updateSchoolFeatures, deleteSchool, addStudent, importStudents, deleteStudent, restoreStudent, hardDeleteStudent, deleteAllStudentsInSchool, updateStudent, addTeacher, 
      deleteTeacher, addClerk, deleteClerk, addParentAccount, updateParentAccount, deleteParentAccount, addHomework, addMark, importMarks, deleteMark, deleteSubjectMarks, deleteStudentAllMarks, addFeePayment, importFeeRecords, deleteFeePayment, 
      addIssue, resolveIssue, setClassFee, setClassFeesBatch, getStudentBalance, saveAttendance, addNotificationLog,
      requestSessionApproval, approveSessionRequest, deleteSessionRequest,
      submitAttendanceRequest, approveAttendanceRequest, rejectAttendanceRequest
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
