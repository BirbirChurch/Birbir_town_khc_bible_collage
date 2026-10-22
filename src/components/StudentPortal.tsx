import React, { useState } from 'react';
import { User, Award, Calendar, BookOpen, Clock, Printer, AlertTriangle, CheckCircle2, Bookmark, GraduationCap } from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, Student } from '../types.ts';
import { calculateGradeDetails, calculateStudentGPA, getCourseAssessmentItems, getEffectiveGradeValues, getGradeKey } from '../utils/gradeCalculations.ts';
import { GraduationTranscriptModal } from './GraduationTranscriptModal.tsx';

interface StudentPortalProps {
  student: Student;
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  photoUrl?: string;
  currentYear: string;
  currentSemester: string;
  gradePublished: boolean;
  officialConfig?: OfficialSignaturesConfig;
  churchLogo?: string;
  onOpenTranscript: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  student,
  courses,
  grades,
  photoUrl,
  currentYear,
  currentSemester,
  gradePublished,
  officialConfig,
  churchLogo,
  onOpenTranscript
}) => {
  const [showGraduationTranscript, setShowGraduationTranscript] = useState(false);
  const studentCourses = courses.filter((c) => c.program === student.program);
  const gpa = calculateStudentGPA(student, courses, grades, currentYear, currentSemester);

  return (
    <div className="space-y-6 no-print">
      {/* Student Profile & GPA Hero Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md bg-emerald-800 flex-shrink-0 flex items-center justify-center text-white text-2xl font-bold">
            {photoUrl ? (
              <img src={photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <span>{student.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{student.name}</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  student.program === 'Degree'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {student.program === 'Degree' ? 'የድግሪ ፕሮግራም' : 'የዲፕሎማ ፕሮግራም'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                student.currentStudyYear === 2 ? 'bg-amber-100 text-amber-950 border border-amber-300' : student.currentStudyYear === 3 ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-700'
              }`}>
                {student.currentStudyYear ? `${student.currentStudyYear}ኛ ዓመት` : '1ኛ ዓመት'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                student.graduationStatus === 'GRADUATED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : student.graduationStatus === 'CANDIDATE'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {student.graduationStatus === 'GRADUATED' ? '🎓 የተመረቀ' : student.graduationStatus === 'CANDIDATE' ? '⭐ ተማራቂ' : '📚 በመማር ላይ'}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 flex flex-wrap items-center gap-2">
              <span>መለያ ኮድ: <strong className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{student.id}</strong></span>
              <span>| ጾታ: <strong>{student.gender}</strong></span>
              <span>| መንገድ: <strong>{student.program === 'Diploma' ? '2 ዓመት (4 ሴሚስተር)' : student.degreeTrack === '2_YEAR' || student.priorDiploma ? 'የ2 ዓመት ድግሪ (ቀድሞ ዲፕሎማ)' : 'መደበኛ 3 ዓመት ድግሪ'}</strong></span>
            </p>
            <p className="text-[11px] text-emerald-800 font-bold mt-1">
              🇪🇹 እንደ ኢትዮጵያ ዘመን አቆጣጠር፦ {currentYear} ዓ.ም ({currentSemester}ኛ ሴሚስተር)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={onOpenTranscript}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>የሴሚስተር ትራንስክሪፕት</span>
          </button>

          <button
            onClick={() => setShowGraduationTranscript(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
            title="የተማሩበትን ሙሉ ትምህርት የምረቃ ትራንስክሪፕት በአንድ ላይ ይመልከቱ"
          >
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>ሙሉ የምረቃ ትራንስክሪፕት</span>
          </button>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100/70 border border-amber-300 rounded-2xl p-3 text-center min-w-[120px] shadow-xs">
            <span className="block text-[10px] uppercase font-bold text-amber-800 tracking-wider">
              የሴሚስተሩ GPA
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono">
              {gradePublished ? gpa : '***'}
            </span>
          </div>
        </div>
      </div>

      {/* Grade status alert when pending */}
      {!gradePublished && (
        <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-4 rounded-xl text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">ውጤቶች በዲን አልተረጋገጡም (Pending Dean Approval)</p>
            <p className="mt-0.5 text-amber-800">
              የዚህ ሴሚስተር ውጤቶች በዋና ዲን ተረጋግጠው ይፋ እስኪሆኑ ድረስ ለጊዜው ተሰውረዋል።
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Grade Results & Weekly Timetable */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semester Grades */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-700" />
              <span>የሴሚስተሩ የትምህርት ውጤት (Grade Report)</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">{studentCourses.length} ኮርሶች</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] rounded-lg">
                <tr>
                  <th className="p-3">ተ.ቁ</th>
                  <th className="p-3">የኮርስ ስም</th>
                  <th className="p-3">ቀን / ሰሌዳ</th>
                  <th className="p-3">የተመደበ መምህር</th>
                  <th className="p-3 text-center">ውጤት</th>
                  <th className="p-3 text-center">ፊደል ደረጃ</th>
                  <th className="p-3 text-center">ትርጉም</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentCourses.map((c, idx) => {
                  const key = getGradeKey(student.uid, c.id, currentYear, currentSemester);
                  const g = grades[key];
                  const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{c.name}</td>
                      <td className="p-3 text-amber-900 font-medium bg-amber-50/50 rounded">{c.schedule}</td>
                      <td className="p-3 text-slate-600 font-semibold">{c.teacher}</td>
                      <td className="p-3 text-center font-black font-mono">
                        {!gradePublished ? '***' : eff.hasAny ? eff.total : '—'}
                      </td>
                      <td className="p-3 text-center font-black text-emerald-800 text-sm">
                        {!gradePublished ? '***' : eff.letter}
                      </td>
                      <td className="p-3 text-center text-[10px] text-slate-500 font-medium">
                        {!gradePublished ? '***' : eff.desc}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timetable / Schedule */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
              <Calendar className="w-5 h-5 text-amber-600" />
              <span>የኮርሶች የቀን ሰሌዳ (Course Schedule)</span>
            </h3>

            <div className="space-y-3">
              {studentCourses.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-emerald-300 transition-colors"
                >
                  <p className="font-bold text-xs text-slate-800">{c.name}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-900 font-semibold mt-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span>{c.schedule || 'አልተወሰነም'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">መምህር: {c.teacher}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Student Spiritual Guidance & Academic Motto */}
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl p-6 shadow-sm border border-emerald-800 space-y-2 relative overflow-hidden">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <Award className="w-4 h-4 text-amber-400" />
              <span>የተማሪዎች መንፈሳዊ መመሪያ</span>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed font-sans">
              በትምህርት ወቅት በትጋት፣ በጸሎትና በአክብሮት በመገኘት የቤተ ክርስቲያንን አደራ በታማኝነት መወጣት ይገባል።
            </p>
            <p className="text-[11px] text-amber-300/90 font-medium pt-1">
              የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት
            </p>
          </div>
        </div>
      </div>

      {/* Complete Consolidated Graduation Transcript Modal */}
      {showGraduationTranscript && (
        <GraduationTranscriptModal
          student={student}
          allCourses={courses}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          officialConfig={officialConfig}
          churchLogo={churchLogo}
          onClose={() => setShowGraduationTranscript(false)}
        />
      )}
    </div>
  );
};
