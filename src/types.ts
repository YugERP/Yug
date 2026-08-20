export type Role = 'MASTER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'CLERK' | 'PARENT';

export interface School {
  id: string;
  name: string;
  address?: string;
  mobile?: string;
  altMobile?: string;
  udiseCode?: string;
  email?: string;
  createdAt: string;
  features?: string[]; // Allowed module features
  logo?: string;
  reportCardColor?: string; // Hex color or named color for report cards, e.g., '#002060'
  nextAdmissionNo?: number;
  nextSrNo?: number;
  nextReceiptNo?: number;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  password?: string;
  schoolId?: string;
  isDeleted?: boolean;
}

export interface AcademicHistoryEntry {
  academicSession: string;
  grade: string;
  rollNo: string;
  section?: string;
  resultStatus: 'Pass' | 'Fail' | 'Compartment' | 'Absent' | '';
  promotionType: 'Promote' | 'Detain' | 'TC Issue' | 'Dropout' | 'Class Jump' | '';
  archivedAt: string;
  feeBalanceAtPromotion: number;
}

export interface Student extends User {
  role: 'STUDENT';
  grade: string;
  rollNo: string;
  schoolId?: string;
  feeBalance: number;
  academicHistory?: AcademicHistoryEntry[];

  // 1. Basic Admission Details
  admissionNo?: string;
  srNo?: string;
  registrationNo?: string;
  admissionDate?: string;
  academicSession?: string;
  section?: string;
  houseGroup?: string;
  medium?: 'Hindi' | 'English' | '';

  // 2. Student Personal Information
  studentNameHindi?: string;
  gender?: 'Male' | 'Female' | 'Other' | '';
  dob?: string;
  age?: number;
  bloodGroup?: string;
  aadhar?: string;
  penUdiseId?: string;
  religion?: string;
  category?: 'GEN' | 'OBC' | 'SC' | 'ST' | '';
  caste?: string;
  nationality?: string;
  motherTongue?: string;
  identificationMark?: string;
  mobile?: string;

  // 3. Parent / Guardian Information
  fatherName?: string;
  fatherNameHindi?: string;
  fatherOccupation?: string;
  fatherQualification?: string;
  fatherMobile?: string;
  fatherAadhar?: string;
  fatherAnnualIncome?: string;
  fatherPhoto?: string;

  motherName?: string;
  motherNameHindi?: string;
  motherOccupation?: string;
  motherQualification?: string;
  motherMobile?: string;
  motherAadhar?: string;
  motherPhoto?: string;

  guardianName?: string;
  guardianRelation?: string;
  guardianAddress?: string;
  guardianMobile?: string;

  // 4. Address Details
  address?: string;
  presentVillageMohalla?: string;
  presentPostOffice?: string;
  presentPoliceStation?: string;
  presentTehsil?: string;
  presentDistrict?: string;
  presentState?: string;
  presentPinCode?: string;

  isSameAsPresent?: boolean;
  permanentVillageMohalla?: string;
  permanentPostOffice?: string;
  permanentPoliceStation?: string;

  // 5. Report Card Details
  reportCardTotalDays?: number;
  reportCardPresentDays?: number;

  permanentTehsil?: string;
  permanentDistrict?: string;
  permanentState?: string;
  permanentPinCode?: string;

  // 5. Previous School Details
  previousSchoolName?: string;
  previousBoard?: string;
  lastPassedClass?: string;
  passingYear?: string;
  previousRollNo?: string;
  tcNo?: string;
  tcDate?: string;
  previousSchoolUdise?: string;
  abcId?: string;
  penNo?: string;

  // 6. Academic & UP Board Related Fields
  stream?: 'Arts' | 'Science' | 'Commerce' | 'None' | '';
  subjects?: string[];
  optionalSubject?: string;
  examType?: 'Regular' | 'Private' | '';
  disabilityStatus?: string;
  minorityStatus?: 'Yes' | 'No' | '';
  scholarshipCategory?: string;
  bankAccountNo?: string;
  ifscCode?: string;
  scholarshipId?: string;

  // 7. Document Upload Fields (holds Base64 strings or placeholders)
  docStudentPhoto?: string;
  docStudentSig?: string;
  docBirthCert?: string;
  docAadharCard?: string;
  docCasteCert?: string;
  docIncomeCert?: string;
  docTransferCert?: string;
  docPreviousMarksheet?: string;
  docResidenceCert?: string;
  docBankPassbook?: string;

  // 8. Fee & Transport Details
  admissionFee?: number;
  tuitionFee?: number;
  discountScholarship?: number;
  busFacility?: boolean;
  busRoute?: string;
  pickupPoint?: string;

  // 9. ERP System Generated Fields
  username?: string;
  rfidCardId?: string;
  attendanceId?: string;
  libraryId?: string;
  hostelId?: string;

  // Compatibility fields
  previousDues?: number;
  hasPreviousClass?: boolean;
  previousClass?: string;
  photoUrl?: string; // used interchangeably with docStudentPhoto/photoUrl
  reportCardTemplate?: 'classic_portrait' | 'landscape_new';
}

export interface Teacher extends User {
  role: 'TEACHER';
  subjects: string[];
}

export interface ParentAccount extends User {
  role: 'PARENT';
  studentIds: string[];
  mobile: string;
}

export interface Homework {
  id: string;
  schoolId: string;
  teacherId: string;
  grade: string;
  subject: string;
  title: string;
  description: string;
  date: string;
}

export type ExamType = 'Half-Yearly Test' | 'Half-Yearly Exam' | 'Yearly Test' | 'Yearly Exam';

export interface ExamMark {
  id: string;
  schoolId: string;
  studentId: string;
  teacherId: string;
  examType: ExamType;
  subject: string;
  marksObtained: number;
  maxMarks: number;
  date: string;
}

export interface FeeRecord {
  id: string;
  receiptNo?: string;
  schoolId: string;
  studentId: string;
  amount: number;
  date: string;
  type: 'Payment' | 'Charge';
  remarks?: string;
}

export interface Issue {
  id: string;
  schoolId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserRole: Role;
  description: string;
  status: 'Open' | 'Resolved';
  date: string;
}

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  studentId?: string;
  userId?: string;
  userType?: 'STUDENT' | 'TEACHER' | 'CLERK';
  grade?: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Excused' | 'Leave';
  leaveReason?: string;
}

export interface NotificationLog {
  id: string;
  schoolId: string;
  type: 'SMS' | 'WhatsApp';
  recipientName: string;
  mobile: string;
  category: 'Fee Alert' | 'Attendance' | 'Exam Result' | 'General Info';
  message: string;
  status: 'Sent' | 'Delivered' | 'Failed';
  timestamp: string;
}

export interface SessionRequest {
  id: string;
  schoolId: string;
  schoolName: string;
  session: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  requestedByEmail: string;
}

export interface AttendanceRequest {
  id: string;
  schoolId: string;
  userId: string;
  userName: string;
  userRole: 'TEACHER' | 'CLERK';
  date: string; // YYYY-MM-DD
  currentStatus?: 'Present' | 'Absent' | 'Excused' | 'Leave';
  requestedStatus: 'Present' | 'Absent' | 'Excused' | 'Leave';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
}

