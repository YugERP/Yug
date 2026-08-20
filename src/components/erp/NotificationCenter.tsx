import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button, Label, Input } from '../UI';
import { type Student } from '../../types';
import { Smartphone, Check, HelpCircle, Search, Clock, ShieldAlert } from 'lucide-react';

export function NotificationCenter() {
  const { students, notificationLogs, addNotificationLog, getStudentBalance } = useStore();

  const [targetType, setTargetType] = useState<'All' | 'Class' | 'Individual'>('All');
  const [targetClass, setTargetClass] = useState('Class 9');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [category, setCategory] = useState<'General' | 'Attendance' | 'Fees' | 'Result'>('General');
  
  // Custom message compose states
  const [messageBody, setMessageBody] = useState('Dear Parents, please note that the School will observe a holiday tomorrow on account of board administrative meetings. School vans will resume standard routes on Wednesday.');
  const [searchText, setSearchText] = useState('');
  const [notifType, setNotifType] = useState<'SMS' | 'WhatsApp'>('WhatsApp');
  const [isSending, setIsSending] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const classes = ['Nursery', 'L.K.G', 'U.K.G', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchText.toLowerCase()) || 
    (s.srNo?.includes(searchText))
  );

  const templates: Record<string, string> = {
    'Holiday Alert / general information': 'Dear Parents, please note that the School will observe a holiday tomorrow on account of board administrative meetings. School vans will resume standard routes on Wednesday.',
    'Absent Warning Alert': 'Dear Parent, your child {student_name} (Roll No: {roll_no}, Class: {class}) was ABSENT today without prior permission. Kindly contact class registrar for verification.',
    'Fee Outstanding Remainder Alert': 'Dear Parent, our student records ledger indicates a pending tuition due of ₹{due_balance} for your child {student_name} (SR No: {sr_no}). Kindly pay the outstanding dues to avoid penalization.',
    'Exam Result Performance Transcript': 'Dear Parent, report cards have been declared. Your child {student_name} has successfully cleared their standard papers for {class} examination session.'
  };

  const handleTemplateSelect = (tmplText: string) => {
    setMessageBody(tmplText);
  };

  // Tag resolver helper for custom tags string parsing
  const resolveCustomTags = (rawMsg: string, student: Student) => {
    const bal = getStudentBalance(student.id);
    return rawMsg
      .replace(/{student_name}/g, student.name)
      .replace(/{class}/g, student.grade)
      .replace(/{roll_no}/g, student.rollNo || 'N/A')
      .replace(/{sr_no}/g, student.srNo || 'N/A')
      .replace(/{due_balance}/g, String(bal.balance));
  };

  const handleSendDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim()) return;

    // Collate target students
    let targetStudentsList: Student[] = [];
    if (targetType === 'All') {
      targetStudentsList = students;
    } else if (targetType === 'Class') {
      targetStudentsList = students.filter(s => s.grade === targetClass);
    } else if (targetType === 'Individual') {
      const single = students.find(s => s.id === targetStudentId);
      if (single) targetStudentsList = [single];
    }

    if (targetStudentsList.length === 0) {
      alert('Selected target group does not contain any registered student records.');
      return;
    }

    setIsSending(true);

    if (targetStudentsList.length === 1 && notifType === 'WhatsApp') {
       // Direct single send
       const pup = targetStudentsList[0];
       const customizedText = resolveCustomTags(messageBody, pup);
       const recipientNumber = pup.fatherMobile || pup.mobile || '';
       const cleanedNumber = recipientNumber.replace(/\D/g, '');
       
       await addNotificationLog({
         type: 'WhatsApp',
         recipientName: pup.fatherName || pup.name,
         mobile: recipientNumber,
         category,
         message: customizedText,
         status: 'Pushed to WhatsApp'
       });

       if (cleanedNumber) {
           // Default to India country code if length is 10
           const waNumber = cleanedNumber.length === 10 ? `91${cleanedNumber}` : cleanedNumber;
           window.open(`https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent(customizedText)}`, '_blank');
       } else {
           alert("Student has no valid mobile number recorded.");
       }
       setIsSending(false);
       return;
    }

    // Push simulated delivery logs to Firestore and show instructions for bulk
    let queued = 0;
    for (const pup of targetStudentsList) {
      const customizedText = resolveCustomTags(messageBody, pup);
      const recipientNumber = pup.fatherMobile || pup.mobile || '';
      const cleanedNumber = recipientNumber.replace(/\D/g, '');
      const waNumber = cleanedNumber.length === 10 ? `91${cleanedNumber}` : cleanedNumber;

      const pushStatus = notifType === 'WhatsApp' ? 'Pending WhatsApp' : 'Delivered';

      await addNotificationLog({
        type: notifType,
        recipientName: pup.fatherName || pup.name,
        mobile: notifType === 'WhatsApp' ? (waNumber || 'N/A') : recipientNumber,
        category,
        message: customizedText,
        status: pushStatus
      });
      queued++;
    }

    setIsSending(false);
    if (notifType === 'WhatsApp') {
      alert(`Queued ${queued} messages! Check the Dispatch Logging Timeline to send them via WhatsApp individually.`);
    } else {
      alert(`Broadcast triggered successfully! Simulated ${queued} SMS messages sent.`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Broadcast Composing Card */}
      <Card className="p-4 bg-slate-50/50 lg:col-span-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 block border-b pb-1 flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-indigo-600"/> Broadcast dispatch composer</h3>
        
        <form onSubmit={handleSendDispatch} className="space-y-4">
          
          {/* Target type selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Broadcast Target</Label>
              <Input as="select" value={targetType} onChange={e => setTargetType(e.target.value as any)}>
                <option value="All">All Parents (Whole School)</option>
                <option value="Class">Specific School Class</option>
                <option value="Individual">Individual Student Parent</option>
              </Input>
            </div>

            {targetType === 'Class' && (
              <div>
                <Label>Required Target Class</Label>
                <Input as="select" value={targetClass} onChange={e => setTargetClass(e.target.value)}>
                  {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
                </Input>
              </div>
            )}

            {targetType === 'Individual' && (
              <div>
                <Label>Search Student Parent</Label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search name/SR No..." 
                    value={searchText} 
                    onChange={e => setSearchText(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none" 
                  />
                </div>
                <div className="mt-1 max-h-[80px] overflow-y-auto border bg-white rounded p-1 space-y-0.5">
                  {filteredStudents.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic py-1 text-center">No student matched.</p>
                  ) : filteredStudents.slice(0, 10).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setTargetStudentId(s.id);
                        setSearchText(s.name);
                      }}
                      className={`w-full text-left px-2 py-0.5 rounded text-[10px] ${targetStudentId === s.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                      {s.name} ({s.grade})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Carrier Channel Model</Label>
              <Input as="select" value={notifType} onChange={e => setNotifType(e.target.value as any)}>
                <option value="SMS">Simulated GSM SMS Network</option>
                <option value="WhatsApp">Simulated WhatsApp Business API</option>
              </Input>
            </div>
          </div>

          {/* Quick preset presets dropdown */}
          <div>
            <Label className="text-[10px] text-slate-400 font-bold uppercase mb-2 block">Quick templates presets:</Label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(templates).map(title => (
                <button
                  key={title}
                  type="button"
                  onClick={() => handleTemplateSelect(templates[title])}
                  className="bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded transition duration-150"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>

          {/* Message Core Body Input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label>Custom Notification Text Message Body</Label>
              <button
                type="button"
                onClick={() => setShowTagModal(!showTagModal)}
                className="text-[10px] text-indigo-650 hover:text-indigo-850 font-bold underline flex items-center gap-0.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Show Insertable Tags Checklist</span>
              </button>
            </div>

            {showTagModal && (
              <div className="p-2 bg-blue-50 border border-blue-100 text-blue-700 rounded text-[10px] space-y-1 mb-2 font-mono leading-relaxed">
                <p>• <span className="font-bold">{`{student_name}`}</span> - Student full name</p>
                <p>• <span className="font-bold">{`{class}`}</span> - Target enrolled class grade</p>
                <p>• <span className="font-bold">{`{roll_no}`}</span> - Roll registration number</p>
                <p>• <span className="font-bold">{`{sr_no}`}</span> - Core Scholar Register ID</p>
                <p>• <span className="font-bold">{`{due_balance}`}</span> - Current unpaid arrears amount</p>
              </div>
            )}

            <textarea
              required
              rows={4}
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded p-3 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed text-slate-800"
              placeholder="Enter message text with custom tags..."
            />
          </div>

          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={isSending} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-xs font-bold px-8 py-2.5 flex justify-center items-center gap-1.5 shadow-lg transform transition active:scale-95">
              <span>{isSending ? 'Dispatching Broadcast packets...' : `Send/Queue via ${notifType}`}</span>
            </Button>
          </div>

        </form>
      </Card>

      {/* Dispatch logs timeline tracking */}
      <Card className="p-4 bg-white border border-slate-200 lg:col-span-1">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 block border-b pb-1 flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-600"/> Dispatch Logging Timeline</h3>
        
        <div className="max-h-[340px] md:max-h-[500px] overflow-y-auto space-y-3 pr-1">
          {notificationLogs.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic text-center py-10">No dispatches triggered yet.</p>
          ) : [...notificationLogs].reverse().map(log => (
            <div key={log.id} className="p-2.5 border rounded-lg bg-slate-50/50 hover:bg-slate-50 border-slate-100 text-justify text-[10.5px] leading-relaxed relative">
              <div className="flex justify-between items-center mb-1.5 uppercase font-extrabold text-[8px] tracking-wide">
                <span className={`px-1.5 py-0.5 rounded ${log.type === 'WhatsApp' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-105 bg-blue-100 text-blue-800'}`}>{log.type} carrier</span>
                <span className="text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <p className="text-slate-850 font-medium font-sans">
                To: <span className="font-extrabold text-slate-800">{log.recipientName}</span> ({log.mobile})
              </p>
              <p className="text-slate-600 text-[10px] mt-1 bg-white border border-slate-200/60 p-1.5 rounded">{log.message}</p>
              <div className="mt-2 text-right">
                <span className="inline-flex items-center gap-0.5 text-emerald-600 font-extrabold text-[8px] uppercase tracking-wider bg-emerald-50 px-1 py-0.5 rounded leading-none">✔ {log.status}</span>
              </div>
              {log.type === 'WhatsApp' && log.status === 'Pending WhatsApp' && (
                 <div className="mt-2 border-t border-slate-100 pt-2 flex justify-center">
                   <button 
                     onClick={() => window.open(`https://api.whatsapp.com/send?phone=${log.mobile}&text=${encodeURIComponent(log.message)}`, '_blank')}
                     className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[9px] font-bold px-2 py-1.5 rounded transition-colors flex items-center justify-center gap-1 uppercase"
                   >
                     🚀 OPEN WHATSAPP CHAT
                   </button>
                 </div>
              )}
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
