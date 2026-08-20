import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student } from '../../types';
import { Sparkles, Save, User as UserIcon, Shield, MapPin, BookOpen, FileText, Check } from 'lucide-react';

const CLASSES = ['Nursery', 'L.K.G', 'U.K.G', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const HOUSES = ['Ganga', 'Yamuna', 'Saraswati', 'Narmada'];
const SUBJECT_OPTIONS = [
  'Hindi', 'English', 'Mathematics', 'Science', 'Social Science', 'Sanskrit', 'Urdu',
  'Physics', 'Chemistry', 'Biology', 'Accountancy', 'Business Studies', 'Economics',
  'History', 'Geography', 'Political Science (Civics)', 'Sociology', 'Psychology',
  'Education', 'Home Science', 'Computer Science', 'Agriculture', 'Drawing & Painting',
  'Music (Vocal)', 'Music (Instrumental)', 'Physical Education', 'Philosophy',
  'Arabic', 'Persian', 'Punjabi', 'Bengali', 'Marathi', 'Gujarati', 'Tamil',
  'Telugu', 'Malayalam', 'Nepali', 'Pali'
];

const UP_DISTRICTS = [
  "Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", 
  "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", 
  "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", 
  "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", 
  "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", 
  "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", 
  "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", 
  "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"
].sort();

const FATHER_OCCUPATIONS = [
  "Farmer / Krishi", "Labour / Majdoori", "Govt Officer", "Private Employee", "Business / Vyapar", "Self Employed", "Other"
];

const MOTHER_OCCUPATIONS = [
  "House wife / Grihni", "Farmer / Krishi", "Labour / Majdoori", "Govt Officer", "Private Employee", "Business / Vyapar", "Self Employed", "Other"
];

const QUALIFICATIONS = [
  "Illiterate / Uneducated (अनपढ़)",
  "Below Primary (5वीं से कम)",
  "Primary / 5th Pass (5वीं पास)",
  "Middle / 8th Pass (8वीं पास)",
  "Secondary / 10th Pass (10वीं पास)",
  "Senior Secondary / 12th Pass (12वीं पास)",
  "Diploma / ITI",
  "Graduate / B.A, B.Sc, B.Com (स्नातक)",
  "Post Graduate / M.A, M.Sc (परास्नातक)",
  "Doctorate / Ph.D",
  "Other (अन्य)"
];

const INDIAN_RELIGIONS = [
  "Hinduism", "Islam", "Sikhism", "Christianity", "Buddhism", "Jainism", "Zoroastrianism (Parsi)"
];

const COMMON_CASTES = [
  "Agarwal", "Bania / Vaishya", "Brahmin", "Bhumihar", "Rajput / Thakur", "Kayastha", "Tyagi",
  "Yadav / Ahir", "Kurmi", "Maurya / Kushwaha / Shakya", "Lodhi", "Jat", "Gujjar", "Saini",
  "Jatav", "Chamar", "Pasi", "Valmiki", "Dhobi", "Khatik", "Kori",
  "Ansari", "Qureshi", "Sheikh", "Pathan", "Syed", "Saifi", "Mansoori",
  "Nishad / Mallah / Kewat", "Rajbhar", "Gond", "Kharwar", "Prajapati", "Kumhar", "Lohar", "Sonar", "Barhai"
].sort();

interface StudentRegistrationProps {
  onSuccess: (student: Student) => void;
  onCancel?: () => void;
  studentToEdit?: Student;
}

const TAB_ORDER = ['basic', 'personal', 'parents', 'address', 'previous', 'academic', 'documents', 'fees'] as const;

export function StudentRegistration({ onSuccess, onCancel, studentToEdit }: StudentRegistrationProps) {
  const { addStudent, updateStudent, updateSchool, allowedSessions, students, schools, currentUser } = useStore();
  const [subTab, setSubTab] = useState<'basic' | 'personal' | 'parents' | 'address' | 'previous' | 'academic' | 'documents' | 'fees'>('basic');
  
  const currentSchool = schools.find(s => s.id === currentUser?.schoolId);
  
  const uniqueAddresses = useMemo(() => {
    const addresses = new Set<string>();
    students.forEach(s => {
      const addr = `${s.presentVillageMohalla || ''}|${s.presentPostOffice || ''}|${s.presentTehsil || ''}|${s.presentDistrict || ''}|${s.presentState || ''}|${s.presentPinCode || ''}`;
      if (addr.replace(/\|/g, '').trim() !== '') {
        addresses.add(addr);
      }
    });
    return Array.from(addresses);
  }, [students]);

  // Checking draft availability if registering a new student
  const [hasDraft, setHasDraft] = useState(() => {
    if (studentToEdit) return false;
    return !!localStorage.getItem('sch_student_reg_draft');
  });

  // Calculate next Roll Number & Admission/SR Number
  const getNextNumbers = (grade: string) => {
    const classStudents = students.filter(s => s.grade === grade);
    const nextRoll = classStudents.length + 1;
    
    // Use school config if available, else default to old logic
    const nextSR = currentSchool?.nextSrNo || (1000 + students.length + 1);
    const nextAdm = currentSchool?.nextAdmissionNo || (5000 + students.length + 1);
    
    return { roll: String(nextRoll), sr: String(nextSR), adm: String(nextAdm) };
  };

  const [form, setForm] = useState<Partial<Student>>(() => {
    if (studentToEdit) {
      return { ...studentToEdit };
    }
    return {
      role: 'STUDENT',
      name: '',
      studentNameHindi: '',
      gender: 'Male',
      dob: '',
      age: 0,
      bloodGroup: 'B+',
      aadhar: '',
      penUdiseId: '',
      religion: 'Hinduism',
      category: 'GEN',
      caste: '',
      nationality: 'Indian',
      motherTongue: 'Hindi',
      identificationMark: '',
      mobile: '',
      email: '',
      
      fatherName: '',
      fatherOccupation: '',
      fatherQualification: '',
      fatherMobile: '',
      fatherAadhar: '',
      fatherAnnualIncome: '',
      fatherPhoto: '',
      
      motherName: '',
      motherOccupation: '',
      motherQualification: '',
      motherMobile: '',
      motherAadhar: '',
      motherPhoto: '',
      
      presentVillageMohalla: '',
      presentPostOffice: '',
      presentPoliceStation: '',
      presentTehsil: '',
      presentDistrict: 'Prayagraj',
      presentState: 'Uttar Pradesh',
      presentPinCode: '',
      
      isSameAsPresent: false,
      permanentVillageMohalla: '',
      permanentPostOffice: '',
      permanentPoliceStation: '',
      permanentTehsil: '',
      permanentDistrict: 'Prayagraj',
      permanentState: 'Uttar Pradesh',
      permanentPinCode: '',
      
      previousSchoolName: '',
      previousBoard: 'UP Board',
      lastPassedClass: '',
      passingYear: '',
      previousRollNo: '',
      tcNo: '',
      tcDate: '',
      previousSchoolUdise: '',
      abcId: '',
      penNo: '',
      
      grade: 'Class 9',
      rollNo: '',
      academicSession: '2026-27',
      section: 'A',
      houseGroup: 'Ganga',
      medium: 'Hindi',
      
      stream: 'None',
      subjects: ['Hindi', 'English', 'Mathematics', 'Science', 'Social Science'],
      optionalSubject: 'Computer Science',
      examType: 'Regular',
      disabilityStatus: 'None',
      minorityStatus: 'No',
      scholarshipCategory: 'None',
      bankAccountNo: '',
      ifscCode: '',
      scholarshipId: '',
      
      docStudentPhoto: '',
      docStudentSig: '',
      docBirthCert: '',
      docAadharCard: '',
      docCasteCert: '',
      docIncomeCert: '',
      docTransferCert: '',
      docPreviousMarksheet: '',
      docResidenceCert: '',
      docBankPassbook: '',
      
      admissionFee: 500,
      tuitionFee: 1200,
      discountScholarship: 0,
      busFacility: false,
      busRoute: '',
      pickupPoint: '',
      
      username: '',
      rfidCardId: '',
      attendanceId: '',
      libraryId: '',
      hostelId: '',
      
      password: 'password123',
      feeBalance: 0
    };
  });

  // Auto-save form as draft in localStorage (only if NOT in edit mode)
  useEffect(() => {
    if (!studentToEdit) {
      localStorage.setItem('sch_student_reg_draft', JSON.stringify(form));
    }
  }, [form, studentToEdit]);

  // Photo / Doc reader helper
  const handleFileChange = (field: keyof Student, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (field === 'docStudentPhoto') {
        if (file.size < 5 * 1024 || file.size > 25 * 1024) {
          alert("Photo size must be between 5KB and 25KB.");
          e.target.value = '';
          return;
        }
      } else if (file.size < 2 * 1024) {
        alert("File size must be at least 2KB.");
        e.target.value = '';
        return;
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            const MAX_DIMENSION = 400; // Resize to max 400px
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
              let quality = 0.9;
              let dataUrl = canvas.toDataURL('image/jpeg', quality);
              
              while (dataUrl.length > 20 * 1024 && quality > 0.1) {
                quality -= 0.1;
                dataUrl = canvas.toDataURL('image/jpeg', quality);
              }

              if (dataUrl.length > 21 * 1024) {  // Allowing slightly more due to base64 overhead, but max 20kb text size basically
                 alert('Could not compress image below 20KB. Please upload a smaller image.');
                 e.target.value = '';
                 return;
              }
              setForm(prev => ({ ...prev, [field]: dataUrl }));
            }
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        if (file.size > 20 * 1024) {
           alert("File size must not exceed 20KB.");
           e.target.value = '';
           return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setForm(prev => ({ ...prev, [field]: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const autofillNumbers = (grade: string) => {
    if (!grade) return;
    const num = getNextNumbers(grade);
    const code = Math.floor(1000 + Math.random() * 9000);
    setForm(prev => ({
      ...prev,
      grade,
      rollNo: num.roll,
      srNo: num.sr,
      admissionNo: num.adm,
      registrationNo: `REG${num.sr}${code}`,
      username: `student${num.sr}`,
      attendanceId: `ATT${num.sr}`,
      libraryId: `LIB${num.sr}`,
      rfidCardId: `RFID${num.sr}`
    }));
  };

  const copyAddress = (checked: boolean) => {
    setForm(prev => ({
      ...prev,
      isSameAsPresent: checked,
      permanentVillageMohalla: checked ? prev.presentVillageMohalla : '',
      permanentPostOffice: checked ? prev.presentPostOffice : '',
      permanentPoliceStation: checked ? prev.presentPoliceStation : '',
      permanentTehsil: checked ? prev.presentTehsil : '',
      permanentDistrict: checked ? prev.presentDistrict : '',
      permanentState: checked ? prev.permanentState : '',
      permanentPinCode: checked ? prev.presentPinCode : ''
    }));
  };

  const handleSubjectToggle = (sub: string, checked: boolean) => {
    const list = form.subjects || [];
    if (checked) {
      setForm(prev => ({ ...prev, subjects: [...list, sub] }));
    } else {
      setForm(prev => ({ ...prev, subjects: list.filter(item => item !== sub) }));
    }
  };

  const handleSaveDraft = (showAlert = true) => {
    if (!studentToEdit) {
      localStorage.setItem('sch_student_reg_draft', JSON.stringify(form));
      if (showAlert) {
        alert('Draft Saved! (पंजीकरण का ड्राफ्ट सुरक्षित कर लिया गया है।)');
      }
    }
  };

  const loadDraft = () => {
    const draftStr = localStorage.getItem('sch_student_reg_draft');
    if (draftStr) {
      try {
        setForm(JSON.parse(draftStr));
        setHasDraft(false);
        alert('Draft recovered! (सहेजा गया ड्राफ्ट सफलतापूर्वक लोड किया गया।)');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const discardDraft = () => {
    if (window.confirm('Delete student registration draft? (क्या आप सुरक्षित ड्राफ्ट को हटाना चाहते हैं?)')) {
      localStorage.removeItem('sch_student_reg_draft');
      setHasDraft(false);
    }
  };

  const handlePrevTab = () => {
    const idx = TAB_ORDER.indexOf(subTab);
    if (idx > 0) {
      setSubTab(TAB_ORDER[idx - 1]);
    }
  };

  const handleNextTab = () => {
    if (subTab === 'basic') {
      if (!form.grade || !form.rollNo) {
        alert('Class and Roll Number are required! (कक्षा और रोल नंबर आवश्यक हैं!)');
        return;
      }
    }
    if (subTab === 'personal') {
      if (!form.name) {
        alert('Student Name is required! (छात्र का नाम आवश्यक है!)');
        return;
      }
    }
    const idx = TAB_ORDER.indexOf(subTab);
    if (idx < TAB_ORDER.length - 1) {
      setSubTab(TAB_ORDER[idx + 1]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.grade || !form.rollNo) {
      alert('Student Name, Class, and Roll Number are required!');
      return;
    }

    // Check for duplicate student registration
    const isDuplicate = students.some(s => 
      s.id !== studentToEdit?.id &&
      s.name?.trim().toLowerCase() === form.name?.trim().toLowerCase() &&
      (s.fatherName || '').trim().toLowerCase() === (form.fatherName || '').trim().toLowerCase() &&
      (s.motherName || '').trim().toLowerCase() === (form.motherName || '').trim().toLowerCase() &&
      (s.mobile || '').trim() === (form.mobile || '').trim()
    );

    if (isDuplicate) {
      alert('Registration Failed: A student with the exact same Name, Father Name, Mother Name, and Mobile Number is already registered. (यह छात्र पहले से पंजीकृत है)');
      return;
    }

    if (studentToEdit) {
      const finalStudent: Student = {
        ...(form as Student),
        photoUrl: form.docStudentPhoto || form.photoUrl || ''
      };
      updateStudent(studentToEdit.id, finalStudent);
      localStorage.removeItem('sch_student_reg_draft');
      onSuccess(finalStudent);
    } else {
      const finalStudent: Student = {
        ...(form as Student),
        id: `s_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
        photoUrl: form.docStudentPhoto || '',
        previousDues: 0
      };
      addStudent(finalStudent);
      if (currentSchool) {
        updateSchool(currentSchool.id, {
          nextAdmissionNo: (currentSchool.nextAdmissionNo || 5000) + 1,
          nextSrNo: (currentSchool.nextSrNo || 1000) + 1
        });
      }
      localStorage.removeItem('sch_student_reg_draft');
      onSuccess(finalStudent);
    }
  };

  const tabs = [
    { id: 'basic', name: '1. Admission info', icon: Sparkles },
    { id: 'personal', name: '2. Personal details', icon: UserIcon },
    { id: 'parents', name: '3. Parents details', icon: Shield },
    { id: 'address', name: '4. Addresses', icon: MapPin },
    { id: 'previous', name: '5. Pre-schooling', icon: BookOpen },
    { id: 'academic', name: '6. Academic & Subjects', icon: FileText },
    { id: 'documents', name: '7. Photograph', icon: UserIcon },
    { id: 'fees', name: '8. Fees & transport', icon: Sparkles }
  ] as const;

  return (
    <div className="space-y-4">
      {/* Form Header with Logo */}
      <div className="flex items-center gap-4 border-b-2 border-slate-800 pb-3 mb-4">
        {currentSchool?.logo && (
          <img src={currentSchool.logo} alt="School Logo" className="w-16 h-16 object-contain" />
        )}
        <div>
          <h2 className="text-xl font-bold uppercase text-slate-800 font-serif leading-tight">{currentSchool?.name || 'STUDENT ADMISSION FORM'}</h2>
          <p className="text-xs font-bold text-slate-500 tracking-wide">NEW ADMISSION / REGISTRATION</p>
        </div>
      </div>
      
      {/* Draft Notification Alert */}
      {hasDraft && !studentToEdit && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs flex justify-between items-center text-amber-900 shadow-sm animate-pulse">
          <div>
            <span className="font-extrabold uppercase block text-[10px] tracking-wider text-amber-700">Pending Draft Found (अधूरा पंजीकरण प्रारूप मिला)</span>
            <span className="text-[11px]">You have an unsaved registration from last session. Would you like to resume it?</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadDraft}
              className="bg-indigo-650 hover:bg-indigo-750 text-white font-bold px-3 py-1 rounded text-[10px]"
            >
              Resume (ड्राफ्ट लोड करें)
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="bg-amber-100 hover:bg-amber-200 text-amber-850 font-bold px-3 py-1 rounded text-[10px]"
            >
              Discard (नष्ट करें)
            </button>
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex gap-1.5 border-b border-slate-100 pb-1.5 overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 text-[11px] font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${subTab === t.id ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/40 rounded-t' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* TAB 1: BASIC */}
        {subTab === 'basic' && (
          <Card className="p-4 bg-slate-50/30">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b pb-1.5 mb-3">1. Basic Admission Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Class / Grade <span className="text-rose-500">*</span></Label>
                <Input as="select" required value={form.grade || ''} onChange={e => {
                  setForm(prev => ({ ...prev, grade: e.target.value }));
                  autofillNumbers(e.target.value);
                }}>
                  <option value="">Select...</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </Input>
                <p className="text-[10px] text-slate-400 mt-1">Selecting autofills Roll No, SR No & credentials.</p>
              </div>
              <div><Label>Admission No</Label><Input value={form.admissionNo || ''} onChange={e => setForm({...form, admissionNo: e.target.value})} /></div>
              <div><Label>Scholar Register (SR) No <span className="text-slate-400 font-normal">(UP Board Core Key)</span></Label><Input value={form.srNo || ''} onChange={e => setForm({...form, srNo: e.target.value})} /></div>
              <div className="md:col-span-2 p-2 bg-indigo-50 rounded border border-indigo-100 grid grid-cols-2 gap-2">
                <div><Label className="text-indigo-800">Next Admission No (Auto-Increment)</Label><Input type="number" value={currentSchool?.nextAdmissionNo || ''} onChange={e => updateSchool(currentSchool!.id, { nextAdmissionNo: Number(e.target.value) })} /></div>
                <div><Label className="text-indigo-800">Next SR No (Auto-Increment)</Label><Input type="number" value={currentSchool?.nextSrNo || ''} onChange={e => updateSchool(currentSchool!.id, { nextSrNo: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Board Registration No</Label><Input value={form.registrationNo || ''} onChange={e => setForm({...form, registrationNo: e.target.value})} /></div>
              <div><Label>Admission Date</Label><Input type="date" value={form.admissionDate || ''} onChange={e => setForm({...form, admissionDate: e.target.value})} /></div>
              <div>
                <Label>Academic Session</Label>
                <Input as="select" value={form.academicSession || '2026-27'} onChange={e => setForm({...form, academicSession: e.target.value})}>
                  {allowedSessions.map(sess => <option key={sess} value={sess}>{sess}</option>)}
                </Input>
              </div>
              <div>
                <Label>Section</Label>
                <Input as="select" value={form.section || 'A'} onChange={e => setForm({...form, section: e.target.value})}>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </Input>
              </div>
              <div><Label>Class Roll Number</Label><Input required value={form.rollNo || ''} onChange={e => setForm({...form, rollNo: e.target.value})} /></div>
              {form.previousBoard !== 'UP Board' && (
                <div>
                  <Label>House / Group</Label>
                  <Input as="select" value={form.houseGroup || 'Ganga'} onChange={e => setForm({...form, houseGroup: e.target.value})}>
                    {HOUSES.map(h => <option key={h} value={h}>{h}</option>)}
                  </Input>
                </div>
              )}
              <div>
                <Label>Medium (Hindi / English)</Label>
                <Input as="select" value={form.medium || 'Hindi'} onChange={e => setForm({...form, medium: e.target.value as any})}>
                  <option value="Hindi">Hindi Medium</option>
                  <option value="English">English Medium</option>
                </Input>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 2: PERSONAL */}
        {subTab === 'personal' && (
          <Card className="p-4 bg-slate-50/30">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b pb-1.5 mb-3">2. Student Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label>Student Full Name <span className="text-rose-500">*</span></Label>
                <Input required value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="In English (Official Marksheet Name)" />
              </div>
              <div className="md:col-span-2">
                <Label>Student Name in HINDI <span className="text-slate-400">(Required for board registration)</span></Label>
                <Input value={form.studentNameHindi || ''} onChange={e => setForm({...form, studentNameHindi: e.target.value})} placeholder="हिंदी में छात्र का नाम" />
              </div>
              <div>
                <Label>Gender</Label>
                <Input as="select" value={form.gender || ''} onChange={e => setForm({...form, gender: e.target.value as any})}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Input>
              </div>
              <div><Label>Date of Birth</Label><Input type="date" value={form.dob || ''} onChange={e => setForm({...form, dob: e.target.value})} /></div>
              <div><Label>Age</Label><Input type="number" value={form.age || 0} onChange={e => setForm({...form, age: Number(e.target.value)})} /></div>
              <div><Label>Blood Group</Label><Input value={form.bloodGroup || ''} onChange={e => setForm({...form, bloodGroup: e.target.value})} placeholder="e.g. O+, B+" /></div>
              <div><Label>Student Aadhaar Number</Label><Input value={form.aadhar || ''} onChange={e => setForm({...form, aadhar: e.target.value})} placeholder="12 Digit Aadhaar No" /></div>
              <div><Label>PEN / UDISE Student ID</Label><Input value={form.penUdiseId || ''} onChange={e => setForm({...form, penUdiseId: e.target.value})} placeholder="Permanent Education Number" /></div>
              <div>
                <Label>Religion</Label>
                <div className="flex gap-2">
                  <Input as="select" className={(form.religion && !INDIAN_RELIGIONS.includes(form.religion as string) || form.religion === 'Other') ? "w-1/2" : ""} value={(form.religion && !INDIAN_RELIGIONS.includes(form.religion as string) || form.religion === 'Other') ? "Other" : (form.religion || "")} onChange={e => {
                    if (e.target.value === "Other") {
                      setForm({...form, religion: "Other"});
                    } else {
                      setForm({...form, religion: e.target.value});
                    }
                  }}>
                    <option value="">Select Religion</option>
                    {INDIAN_RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    <option value="Other">Other</option>
                  </Input>
                  {(form.religion && !INDIAN_RELIGIONS.includes(form.religion as string) || form.religion === 'Other') && (
                    <Input className="w-1/2" value={form.religion === 'Other' ? '' : form.religion} onChange={e => setForm({...form, religion: e.target.value})} placeholder="Specify religion" autoFocus />
                  )}
                </div>
              </div>
              <div>
                <Label>Social Class Category</Label>
                <Input as="select" value={form.category || ''} onChange={e => setForm({...form, category: e.target.value as any})}>
                  <option value="GEN">General (GEN)</option>
                  <option value="OBC">Backward Caste (OBC)</option>
                  <option value="SC">Scheduled Caste (SC)</option>
                  <option value="ST">Scheduled Tribe (ST)</option>
                </Input>
              </div>
              <div>
                <Label>Caste / Sub-Caste</Label>
                <div className="flex gap-2">
                  <Input as="select" className={(form.caste && !COMMON_CASTES.includes(form.caste as string) || form.caste === 'Other') ? "w-1/2" : ""} value={(form.caste && !COMMON_CASTES.includes(form.caste as string) || form.caste === 'Other') ? "Other" : (form.caste || "")} onChange={e => {
                    if (e.target.value === "Other") {
                      setForm({...form, caste: "Other"});
                    } else {
                      setForm({...form, caste: e.target.value});
                    }
                  }}>
                    <option value="">Select Caste...</option>
                    {COMMON_CASTES.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="Other">Other...</option>
                  </Input>
                  {(form.caste && !COMMON_CASTES.includes(form.caste as string) || form.caste === 'Other') && (
                    <Input className="w-1/2" value={form.caste === 'Other' ? '' : form.caste} onChange={e => setForm({...form, caste: e.target.value})} placeholder="Specify caste manually" autoFocus />
                  )}
                </div>
              </div>
              <div><Label>Nationality</Label><Input value={form.nationality || 'Indian'} onChange={e => setForm({...form, nationality: e.target.value})} /></div>
              <div><Label>Mother Tongue</Label><Input value={form.motherTongue || 'Hindi'} onChange={e => setForm({...form, motherTongue: e.target.value})} /></div>
              <div><Label>Visible Identification Mark</Label><Input value={form.identificationMark || ''} onChange={e => setForm({...form, identificationMark: e.target.value})} placeholder="e.g. Mole on left cheek" /></div>
              <div><Label>Student Mobile Number</Label><Input value={form.mobile || ''} onChange={e => setForm({...form, mobile: e.target.value})} placeholder="91XXXXXXXX" /></div>
              <div><Label>Email ID</Label><Input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="student@college.org" /></div>
            </div>
          </Card>
        )}

        {/* TAB 3: PARENTS */}
        {subTab === 'parents' && (
          <Card className="p-4 bg-slate-50/30">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b pb-1.5 mb-3">3. Parents & Guardian Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Father card */}
              <div className="p-3 border rounded bg-white space-y-3">
                <span className="text-[10px] uppercase font-bold text-indigo-600 block">Father Details</span>
                <div className="grid grid-cols-2 gap-3 pb-2">
                  <div><Label>Father Full Name</Label><Input value={form.fatherName || ''} onChange={e => setForm({...form, fatherName: e.target.value})} /></div>
                  <div><Label>Father Name (Hindi)</Label><Input value={form.fatherNameHindi || ''} onChange={e => setForm({...form, fatherNameHindi: e.target.value})} /></div>
                  <div><Label>Occupation</Label>
                    <Input as="select" value={form.fatherOccupation || ''} onChange={e => setForm({...form, fatherOccupation: e.target.value})}>
                      <option value="">Select Occupation...</option>
                      {FATHER_OCCUPATIONS.map(occ => <option key={occ} value={occ}>{occ}</option>)}
                    </Input>
                  </div>
                  <div><Label>Qualification</Label>
                    <Input as="select" value={form.fatherQualification || ''} onChange={e => setForm({...form, fatherQualification: e.target.value})}>
                      <option value="">Select Qualification...</option>
                      {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                    </Input>
                  </div>
                  <div><Label>Mobile Number</Label><Input value={form.fatherMobile || ''} onChange={e => setForm({...form, fatherMobile: e.target.value})} /></div>
                  <div><Label>Father Aadhaar No</Label><Input value={form.fatherAadhar || ''} onChange={e => setForm({...form, fatherAadhar: e.target.value})} /></div>
                  <div className="col-span-2"><Label>Annual Income (₹)</Label><Input value={form.fatherAnnualIncome || ''} onChange={e => setForm({...form, fatherAnnualIncome: e.target.value})} placeholder="e.g. 1,20,000" /></div>
                </div>
              </div>

              {/* Mother card */}
              <div className="p-3 border rounded bg-white space-y-3">
                <span className="text-[10px] uppercase font-bold text-indigo-600 block">Mother Details</span>
                <div className="grid grid-cols-2 gap-3 pb-2">
                  <div><Label>Mother Full Name</Label><Input value={form.motherName || ''} onChange={e => setForm({...form, motherName: e.target.value})} /></div>
                  <div><Label>Mother Name (Hindi)</Label><Input value={form.motherNameHindi || ''} onChange={e => setForm({...form, motherNameHindi: e.target.value})} /></div>
                  <div><Label>Occupation</Label>
                    <Input as="select" value={form.motherOccupation || ''} onChange={e => setForm({...form, motherOccupation: e.target.value})}>
                      <option value="">Select Occupation...</option>
                      {MOTHER_OCCUPATIONS.map(occ => <option key={occ} value={occ}>{occ}</option>)}
                    </Input>
                  </div>
                  <div><Label>Qualification</Label>
                    <Input as="select" value={form.motherQualification || ''} onChange={e => setForm({...form, motherQualification: e.target.value})}>
                      <option value="">Select Qualification...</option>
                      {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                    </Input>
                  </div>
                  <div><Label>Mobile Number</Label><Input value={form.motherMobile || ''} onChange={e => setForm({...form, motherMobile: e.target.value})} /></div>
                  <div><Label>Mother Aadhaar No</Label><Input value={form.motherAadhar || ''} onChange={e => setForm({...form, motherAadhar: e.target.value})} /></div>
                </div>
              </div>
            </div>

            {/* Optional Guardian Card */}
            <div className="mt-4 p-3 border rounded bg-slate-50 space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Relative Guardian (Optional)</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div><Label>Guardian Name</Label><Input value={form.guardianName || ''} onChange={e => setForm({...form, guardianName: e.target.value})} /></div>
                <div><Label>Relation</Label><Input value={form.guardianRelation || ''} onChange={e => setForm({...form, guardianRelation: e.target.value})} /></div>
                <div><Label>Mobile Number</Label><Input value={form.guardianMobile || ''} onChange={e => setForm({...form, guardianMobile: e.target.value})} /></div>
                <div><Label>Temporary Address</Label><Input value={form.guardianAddress || ''} onChange={e => setForm({...form, guardianAddress: e.target.value})} /></div>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 4: ADDRESSES */}
        {subTab === 'address' && (
          <Card className="p-4 bg-slate-50/30 space-y-4">
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded">
              <Label>Select From Address History</Label>
              <Input as="select" onChange={(e) => {
                if (!e.target.value) return;
                const [village, post, tehsil, dist, state, pin] = e.target.value.split('|');
                setForm(prev => ({
                  ...prev,
                  presentVillageMohalla: village,
                  presentPostOffice: post,
                  presentTehsil: tehsil,
                  presentDistrict: dist,
                  presentState: state,
                  presentPinCode: pin
                }));
              }}>
                <option value="">Select an address to autofill...</option>
                {uniqueAddresses.map(addr => {
                  const [village, post, tehsil, dist, state, pin] = addr.split('|');
                  return (
                    <option key={addr} value={addr}>
                      {village}, {post}, {tehsil}, {dist}, {state} - {pin}
                    </option>
                  );
                })}
              </Input>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Present Address */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-indigo-700 border-b pb-1">Present Comm. Address</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Village / Mohalla / Street</Label>
                    <Input value={form.presentVillageMohalla || ''} onChange={e => setForm({...form, presentVillageMohalla: e.target.value})} />
                  </div>
                  <div><Label>Post Office (P.O)</Label><Input value={form.presentPostOffice || ''} onChange={e => setForm({...form, presentPostOffice: e.target.value})} /></div>
                  <div><Label>Police Station (P.S)</Label><Input value={form.presentPoliceStation || ''} onChange={e => setForm({...form, presentPoliceStation: e.target.value})} /></div>
                  <div><Label>Tehsil</Label><Input value={form.presentTehsil || ''} onChange={e => setForm({...form, presentTehsil: e.target.value})} /></div>
                  <div><Label>District</Label>
                    <Input as="select" value={form.presentDistrict || ''} onChange={e => setForm({...form, presentDistrict: e.target.value})}>
                      <option value="">Select District</option>
                      {UP_DISTRICTS.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                    </Input>
                  </div>
                  <div><Label>State</Label><Input value={form.presentState || ''} onChange={e => setForm({...form, presentState: e.target.value})} /></div>
                  <div><Label>PIN Code</Label><Input value={form.presentPinCode || ''} onChange={e => setForm({...form, presentPinCode: e.target.value})} /></div>
                </div>
              </div>

              {/* Permanent Address */}
              <div className="space-y-3 border-l pl-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] uppercase font-bold text-slate-600 border-b pb-1">Permanent Residential Address</h4>
                  <label className="flex items-center space-x-1 cursor-pointer text-slate-500 hover:text-indigo-600 text-[10px] font-bold">
                    <input type="checkbox" checked={!!form.isSameAsPresent} onChange={e => copyAddress(e.target.checked)} className="rounded" />
                    <span>SAME AS PRESENT?</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Village / Mohalla / Street</Label>
                    <Input disabled={form.isSameAsPresent} value={form.permanentVillageMohalla || ''} onChange={e => setForm({...form, permanentVillageMohalla: e.target.value})} />
                  </div>
                  <div><Label>Post Office (P.O)</Label><Input disabled={form.isSameAsPresent} value={form.permanentPostOffice || ''} onChange={e => setForm({...form, permanentPostOffice: e.target.value})} /></div>
                  <div><Label>Police Station (P.S)</Label><Input disabled={form.isSameAsPresent} value={form.permanentPoliceStation || ''} onChange={e => setForm({...form, permanentPoliceStation: e.target.value})} /></div>
                  <div><Label>Tehsil</Label><Input disabled={form.isSameAsPresent} value={form.permanentTehsil || ''} onChange={e => setForm({...form, permanentTehsil: e.target.value})} /></div>
                  <div><Label>District</Label>
                    <Input as="select" disabled={form.isSameAsPresent} value={form.permanentDistrict || ''} onChange={e => setForm({...form, permanentDistrict: e.target.value})}>
                      <option value="">Select District</option>
                      {UP_DISTRICTS.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                    </Input>
                  </div>
                  <div><Label>State</Label><Input disabled={form.isSameAsPresent} value={form.permanentState || ''} onChange={e => setForm({...form, permanentState: e.target.value})} /></div>
                  <div><Label>PIN Code</Label><Input disabled={form.isSameAsPresent} value={form.permanentPinCode || ''} onChange={e => setForm({...form, permanentPinCode: e.target.value})} /></div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 5: PREVIOUS SCHOOL */}
        {subTab === 'previous' && (
          <Card className="p-4 bg-slate-50/30">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b pb-1.5 mb-3">5. Previous Education & School History</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2"><Label>Previous School Name</Label><Input value={form.previousSchoolName || ''} onChange={e => setForm({...form, previousSchoolName: e.target.value})} /></div>
              <div>
                <Label>School Affiliation Board</Label>
                <Input as="select" value={form.previousBoard || ''} onChange={e => setForm({...form, previousBoard: e.target.value})}>
                  <option value="UP Board">UP Board (Prayagraj)</option>
                  <option value="CBSE">Central Board (CBSE)</option>
                  <option value="ICSE">CISCE (ICSE/ISC)</option>
                  <option value="Other">Other Board</option>
                </Input>
              </div>
              <div><Label>Last Class Passed</Label><Input value={form.lastPassedClass || ''} onChange={e => setForm({...form, lastPassedClass: e.target.value})} placeholder="e.g. Class 8" /></div>
              <div><Label>Passing Year / Session</Label><Input value={form.passingYear || ''} onChange={e => setForm({...form, passingYear: e.target.value})} placeholder="e.g. 2026" /></div>
              <div><Label>Marksheet Board Roll Number</Label><Input value={form.previousRollNo || ''} onChange={e => setForm({...form, previousRollNo: e.target.value})} /></div>
              <div><Label>Transfer Certificate (T.C.) No</Label><Input value={form.tcNo || ''} onChange={e => setForm({...form, tcNo: e.target.value})} /></div>
              <div><Label>TC Issue Date</Label><Input type="date" value={form.tcDate || ''} onChange={e => setForm({...form, tcDate: e.target.value})} /></div>
              <div><Label>Previous School UDISE Code</Label><Input value={form.previousSchoolUdise || ''} onChange={e => setForm({...form, previousSchoolUdise: e.target.value})} /></div>
              <div><Label>ABC ID (Academic Bank of Credits)</Label><Input value={form.abcId || ''} onChange={e => setForm({...form, abcId: e.target.value})} placeholder="e.g. 12-digit ID" /></div>
              <div><Label>PEN Number (Permanent Ed. No.)</Label><Input value={form.penNo || ''} onChange={e => setForm({...form, penNo: e.target.value})} placeholder="e.g. 11-digit PEN" /></div>
            </div>
          </Card>
        )}

        {/* TAB 6: ACADEMIC */}
        {subTab === 'academic' && (
          <Card className="p-4 bg-slate-50/30 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b pb-1.5 mb-3">6. Chosen Academic Subjects & Scholarships Info</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Exam Category Type</Label>
                <Input as="select" value={form.examType || 'Regular'} onChange={e => setForm({...form, examType: e.target.value as any})}>
                  <option value="Regular">Regular Student</option>
                  <option value="Private">Private Student</option>
                </Input>
              </div>
              <div>
                <Label>Disability Status</Label>
                <Input value={form.disabilityStatus || 'None'} onChange={e => setForm({...form, disabilityStatus: e.target.value})} placeholder="None or details" />
              </div>
              <div>
                <Label>Minority Status Member?</Label>
                <Input as="select" value={form.minorityStatus || 'No'} onChange={e => setForm({...form, minorityStatus: e.target.value as any})}>
                  <option value="No">No</option>
                  <option value="Yes">Yes (Minority Group)</option>
                </Input>
              </div>
              <div>
                <Label>Required Stream (Class 9-12)</Label>
                <Input as="select" value={form.stream || 'None'} onChange={e => setForm({...form, stream: e.target.value as any})}>
                  <option value="None">None (Nursery-8)</option>
                  <option value="Science">Science (PCM/PCB)</option>
                  <option value="Arts">Humanities (Arts)</option>
                  <option value="Commerce">Commerce</option>
                </Input>
              </div>
            </div>

            {/* Subject Choices */}
            <div className="p-3 border rounded bg-white">
              <span className="text-[10px] font-bold text-indigo-700 uppercase block mb-2">Subject Roll Combination</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {SUBJECT_OPTIONS.map(sub => (
                  <label key={sub} className="flex items-center space-x-2 text-xs bg-slate-50 px-2 py-1.5 rounded hover:bg-indigo-50/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form.subjects || []).includes(sub)}
                      onChange={e => handleSubjectToggle(sub, e.target.checked)}
                      className="rounded"
                    />
                    <span>{sub}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <Label>Primary Optional / 6th Subject</Label>
                <Input value={form.optionalSubject || ''} onChange={e => setForm({...form, optionalSubject: e.target.value})} placeholder="e.g. Sanskrit or Computer Science" />
              </div>
            </div>

            {/* Scholarship Mapping */}
            <div className="p-3 border rounded bg-slate-50/50 space-y-3">
              <span className="text-[10px] font-bold text-slate-600 uppercase block">UP State Scheme Scholarship & Bank Coordinates</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div><Label>Applied Scholarship Portal ID</Label><Input value={form.scholarshipId || ''} onChange={e => setForm({...form, scholarshipId: e.target.value})} placeholder="NSP/UP State ID" /></div>
                <div><Label>Scholarship Category</Label><Input value={form.scholarshipCategory || ''} onChange={e => setForm({...form, scholarshipCategory: e.target.value})} placeholder="Post Metric / Pre Metric" /></div>
                <div><Label>Active Bank Account No</Label><Input value={form.bankAccountNo || ''} onChange={e => setForm({...form, bankAccountNo: e.target.value})} /></div>
                <div><Label>Bank IFSC Code</Label><Input value={form.ifscCode || ''} onChange={e => setForm({...form, ifscCode: e.target.value})} /></div>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 7: DOCUMENTS */}
        {subTab === 'documents' && (
          <Card className="p-4 bg-slate-50/30">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b pb-1.5 mb-3">7. Photograph Upload</h3>
            <p className="text-[10px] text-slate-500 mb-4">* Upload authentic original student photograph. Large images are auto-compressed securely.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border p-3 rounded bg-white space-y-2">
                <span className="text-[10px] uppercase font-semibold text-indigo-700 block">Student Photograph</span>
                <div>
                  <Label>Student Passport size Photograph <span className="text-rose-500">*</span> <span className="text-[10px] text-slate-400 font-normal ml-1">(Size: 5KB to 25KB)</span></Label>
                  <input type="file" accept="image/*" onChange={e => handleFileChange('docStudentPhoto', e)} className="text-xs file:bg-slate-100 file:border-0 hover:file:bg-slate-200" />
                  {form.docStudentPhoto && <img src={form.docStudentPhoto} alt="Preview" className="w-16 h-20 mt-1 object-cover border rounded" />}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 8: FEES */}
        {subTab === 'fees' && (
          <Card className="p-4 bg-slate-50/30 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b pb-1.5 mb-3">8. Fee Setup & School transport Config</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Admission Entry Fee (One Time)</Label><Input type="number" value={form.admissionFee || 0} onChange={e => setForm({...form, admissionFee: Number(e.target.value)})} /></div>
              <div><Label>Standard Classroom Tuition Fee (Yearly/Term)</Label><Input type="number" value={form.tuitionFee || 0} onChange={e => setForm({...form, tuitionFee: Number(e.target.value)})} /></div>
              <div><Label>Discount / Scholarship Concession (Amount)</Label><Input type="number" value={form.discountScholarship || 0} onChange={e => setForm({...form, discountScholarship: Number(e.target.value)})} /></div>
              
              <div className="col-span-3 p-3 border rounded bg-white space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-600 text-xs">
                  <input type="checkbox" checked={!!form.busFacility} onChange={e => setForm({...form, busFacility: e.target.checked})} className="rounded text-indigo-600" />
                  <span>REQUIRES SCHOOL VAN / BUS TRANSPORT FACILITY?</span>
                </label>
                {form.busFacility && (
                  <div className="grid grid-cols-2 gap-3 pl-6 border-l border-indigo-200">
                    <div><Label>Assigned Bus Route No</Label><Input value={form.busRoute || ''} onChange={e => setForm({...form, busRoute: e.target.value})} placeholder="e.g. Route A-3" /></div>
                    <div><Label>Pickup Point Village name</Label><Input value={form.pickupPoint || ''} onChange={e => setForm({...form, pickupPoint: e.target.value})} placeholder="e.g. Phoolpur Village Chauraha" /></div>
                  </div>
                )}
              </div>
            </div>

            {/* Portal credentials preview */}
            <div className="p-3 border rounded bg-indigo-50/40 space-y-2">
              <span className="text-[10px] font-bold text-indigo-700 uppercase block">Auto-Generated Portal Credentials</span>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <p>Username: <span className="font-mono font-semibold bg-white border px-1.5 py-0.5 rounded text-slate-700">{form.username || 'studentXXXX'}</span></p>
                <p>Portal Password: <span className="font-mono font-semibold bg-white border px-1.5 py-0.5 rounded text-slate-700">{form.password || 'password123'}</span></p>
                <p>RFID Attend ID: <span className="font-mono font-semibold bg-white border px-1.5 py-0.5 rounded text-slate-700">{form.attendanceId || 'ATTXXXX'}</span></p>
              </div>
            </div>
          </Card>
        )}

        {/* Step-by-Step Navigation Bar */}
        <div className="mt-6 pt-4 flex flex-col sm:flex-row justify-between items-center bg-white p-4 border border-slate-200 rounded-xl shadow-sm gap-3">
          <div className="w-full sm:w-auto flex gap-2">
            {subTab !== 'basic' && (
              <Button
                type="button"
                onClick={handlePrevTab}
                className="w-full sm:w-auto bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 text-xs font-bold px-4 py-2"
              >
                ← Prev Step (पिछला चरण)
              </Button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
            {onCancel && (
              <Button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto bg-slate-50 text-slate-600 border hover:bg-slate-100 text-xs font-bold px-4 py-2"
              >
                Cancel (रद्द करें)
              </Button>
            )}
            
            {!studentToEdit && (
              <Button
                type="button"
                onClick={() => handleSaveDraft(true)}
                className="w-full sm:w-auto bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 text-xs font-bold px-4 py-2 flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft (ड्राफ्ट सहेजें)</span>
              </Button>
            )}
            
            {subTab !== 'fees' ? (
              <Button
                type="button"
                onClick={handleNextTab}
                className="w-full sm:w-auto bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-bold px-5 py-2"
              >
                Save & Next Step (सहेजें और आगे बढ़ें) →
              </Button>
            ) : (
              <Button
                type="submit"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5 font-bold px-6 py-2 flex items-center justify-center shadow-lg transform transition duration-150 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{studentToEdit ? 'Save Changes (संशोधन सहेजें)' : 'Final Submit Registration (अंतिम सबमिट करें)'}</span>
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
