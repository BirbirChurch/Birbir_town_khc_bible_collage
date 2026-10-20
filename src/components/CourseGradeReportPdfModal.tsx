import React from 'react';
import {
  X,
  Printer,
  FileText,
  CheckCircle2,
  Calendar,
  BookOpen,
  Award,
  ShieldCheck
} from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, Student } from '../types.ts';
import {
  getCourseAssessmentItems,
  getCriterionScore,
  getEffectiveGradeValues,
  getGradeKey
} from '../utils/gradeCalculations.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';

interface CourseGradeReportPdfModalProps {
  course: Course;
  students: Student[];
  grades: Record<string, GradeBreakdown>;
  currentYear: string;
  currentSemester: string;
  churchLogo?: string;
  officialConfig?: OfficialSignaturesConfig;
  onClose: () => void;
}

export const CourseGradeReportPdfModal: React.FC<CourseGradeReportPdfModalProps> = ({
  course,
  students,
  grades,
  currentYear,
  currentSemester,
  churchLogo,
  officialConfig,
  onClose
}) => {
  const enrolled = students.filter((s) => s.program === course.program);
  const criteria = getCourseAssessmentItems(course);
  const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  // Grade statistics
  let totalScoreSum = 0;
  let gradedCount = 0;
  const gradeDistribution: Record<string, number> = {
    'A+': 0,
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    F: 0
  };

  enrolled.forEach((s) => {
    const key = getGradeKey(s.uid, course.id, currentYear, currentSemester);
    const g = grades[key] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
    const eff = getEffectiveGradeValues(g, criteria);
    if (eff.hasAny) {
      totalScoreSum += eff.total;
      gradedCount++;
      if (gradeDistribution[eff.letter] !== undefined) {
        gradeDistribution[eff.letter]++;
      }
    }
  });

  const classAverage = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : '0.0';
  const passCount =
    (gradeDistribution['A+'] || 0) +
    (gradeDistribution['A'] || 0) +
    (gradeDistribution['B'] || 0) +
    (gradeDistribution['C'] || 0);
  const passRate = gradedCount > 0 ? ((passCount / gradedCount) * 100).toFixed(0) : '0';

  const logoSrc = churchLogo || CHURCH_LOGO;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden border border-slate-300 my-auto">
        {/* Modal Toolbar (hidden when printed) */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-6 py-4 flex justify-between items-center no-print border-b border-emerald-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/60 rounded-xl text-amber-300">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                የኮርስ ይፋዊ የውጤት ሪፖርት ማጠቃለያ ሰነድ (PDF / Print Preview)
              </h3>
              <p className="text-xs text-emerald-200">
                {course.name} ({course.program}) | መምህር: {course.teacher}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>አትም / ፒዲኤፍ አውርድ (Print / Save PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="ዝጋ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 text-slate-900 bg-white max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 space-y-6">
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-4 relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={logoSrc}
                  alt="የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl p-1 border border-slate-300 shadow-2xs"
                />
                <div>
                  <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                    የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold text-emerald-900">
                    መጽሐፍ ቅዱስ ትምህርት ቤት (Bible Theological School)
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    የአካዳሚክ ዲን እና ሬጅስትራር ጽሕፈት ቤት
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-600 border-l border-slate-200 pl-4 space-y-0.5">
                <p>
                  <span className="font-bold">የትምህርት ዘመን፦</span> {currentYear} ዓ.ም
                </p>
                <p>
                  <span className="font-bold">ሴሚስተር፦</span> {currentSemester}ኛ ሴሚስተር
                </p>
                <p>
                  <span className="font-bold">የታተመበት ቀን፦</span> {new Date().toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-center">
              <h3 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-900">
                ይፋዊ የኮርስ ውጤት ሪፖርት ማጠቃለያ ሰነድ (Official Course Grade Sheet)
              </h3>
            </div>
          </div>

          {/* Course & Instructor Metadata Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">የትምህርት ዓይነት (Course):</span>
              <strong className="text-slate-900">{course.name}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">ፕሮግራም (Program):</span>
              <strong className="text-emerald-800">{course.program}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">አስተማሪ / መምህር (Instructor):</span>
              <strong className="text-slate-900">{course.teacher}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">ክሬዲት ሰዓት (Credits):</span>
              <strong className="text-slate-900">{course.credits} Cr.Hr</strong>
            </div>
          </div>

          {/* Criteria Breakdown Legend */}
          <div className="bg-emerald-50/50 border border-emerald-200 p-2.5 rounded-xl text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-emerald-950">የውጤት መመዘኛዎች መስፈርት፦</span>
            <div className="flex flex-wrap items-center gap-2 font-mono">
              {criteria.map((it, idx) => (
                <span
                  key={it.id}
                  className="bg-white border border-emerald-300 px-2 py-0.5 rounded-lg text-emerald-900 font-bold"
                >
                  {it.label}: <strong className="text-slate-900">{it.max}%</strong>
                </span>
              ))}
              <span className="bg-emerald-700 text-white px-2 py-0.5 rounded-lg font-black">
                ድምር: {totalWeight}%
              </span>
            </div>
          </div>

          {/* Official Grades Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-800 border-b border-slate-300">
                <tr>
                  <th className="p-2 border-r border-slate-300 text-center w-8">ተ.ቁ</th>
                  <th className="p-2 border-r border-slate-300 w-28">መለያ ቁጥር (ID)</th>
                  <th className="p-2 border-r border-slate-300">የተማሪ ሙሉ ስም</th>
                  <th className="p-2 border-r border-slate-300 text-center w-12">ጾታ</th>
                  {criteria.map((c) => (
                    <th key={c.id} className="p-2 border-r border-slate-300 text-center min-w-[55px]">
                      <span className="block truncate">{c.label}</span>
                      <span className="text-[9px] font-mono font-black">({c.max}%)</span>
                    </th>
                  ))}
                  <th className="p-2 border-r border-slate-300 text-center bg-emerald-100/70 font-black text-emerald-950 w-20">
                    ድምር ({totalWeight}%)
                  </th>
                  <th className="p-2 border-r border-slate-300 text-center bg-amber-100/70 font-black text-amber-950 w-14">
                    ደረጃ
                  </th>
                  <th className="p-2 border-r border-slate-300 text-center font-mono w-14">ነጥብ</th>
                  <th className="p-2 text-center w-24">አስተያየት</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {enrolled.map((student, idx) => {
                  const key = getGradeKey(student.uid, course.id, currentYear, currentSemester);
                  const g = grades[key] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
                  const eff = getEffectiveGradeValues(g, criteria);

                  return (
                    <tr key={student.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-900">
                        {student.id}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                        {student.name}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center text-slate-600">
                        {student.gender || '—'}
                      </td>

                      {criteria.map((c, cIdx) => {
                        const score = getCriterionScore(g, c.id, cIdx);
                        return (
                          <td key={c.id} className="p-2 border-r border-slate-200 text-center font-mono font-bold">
                            {score > 0 ? score : eff.hasAny ? '0' : '—'}
                          </td>
                        );
                      })}

                      <td className="p-2 border-r border-slate-200 text-center font-mono font-black text-emerald-900 bg-emerald-50/30">
                        {eff.hasAny ? eff.total : '—'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-black text-amber-800 bg-amber-50/30">
                        {eff.hasAny ? eff.letter : '—'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                        {eff.hasAny ? eff.points.toFixed(2) : '—'}
                      </td>
                      <td className="p-2 text-center text-[11px] font-medium text-slate-600">
                        {eff.hasAny
                          ? eff.points >= 2.0
                            ? 'አልፏል (Pass)'
                            : 'ደካማ/ወድቋል'
                          : 'ውጤት አልገባም'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Academic Summary Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">ተመዝጋቢ ተማሪዎች:</span>
              <strong className="text-slate-900 text-sm font-mono">{enrolled.length}</strong> ተማሪዎች
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">ውጤት የሞሉ (Graded):</span>
              <strong className="text-emerald-800 text-sm font-mono">
                {gradedCount} ({enrolled.length > 0 ? ((gradedCount / enrolled.length) * 100).toFixed(0) : 0}%)
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">የክፍሉ አማካይ ውጤት (Average):</span>
              <strong className="text-slate-900 text-sm font-mono">{classAverage}%</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">የማለፍ ምጣኔ (Pass Rate):</span>
              <strong className="text-emerald-800 text-sm font-mono">{passRate}%</strong>
            </div>
          </div>

          {/* Grade Distribution Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100 rounded-xl text-xs">
            <span className="font-bold text-slate-700 text-[11px]">የውጤት ክፍፍል (Grade Distribution):</span>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="bg-white px-2 py-0.5 rounded border border-slate-300">
                A+: <strong>{gradeDistribution['A+']}</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-300">
                A: <strong>{gradeDistribution['A']}</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-300">
                B: <strong>{gradeDistribution['B']}</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-300">
                C: <strong>{gradeDistribution['C']}</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-300">
                D: <strong>{gradeDistribution['D']}</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-300">
                F: <strong>{gradeDistribution['F']}</strong>
              </span>
            </div>
          </div>

          {/* Official Signatures & Seal Section */}
          <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-800">
            {/* Instructor Signature */}
            <div className="border border-slate-200 p-3.5 rounded-xl space-y-3 bg-white">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                1. የመምህሩ ስምና ፊርማ (Instructor)
              </span>
              <div className="h-10 border-b border-dashed border-slate-300 flex items-end">
                <span className="font-bold text-slate-900">{course.teacher}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>ፊርማ: _______________</span>
                <span>ቀን: ___________</span>
              </div>
            </div>

            {/* Academic Dean Signature */}
            <div className="border border-slate-200 p-3.5 rounded-xl space-y-3 bg-white">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                2. የዋና ዲን ስምና ፊርማ (Academic Dean)
              </span>
              <div className="h-10 border-b border-dashed border-slate-300 flex items-end">
                <span className="font-bold text-slate-900">
                  {officialConfig?.deanName || 'መ/ር ገላቲያ ድስታ'}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>ፊርማ: _______________</span>
                <span>ቀን: ___________</span>
              </div>
            </div>

            {/* Registrar Office & Church Stamp */}
            <div className="border border-slate-200 p-3.5 rounded-xl space-y-2 bg-white relative">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                3. የሬጅስትራር ጽ/ቤት ማህተም (Registrar Seal)
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    {officialConfig?.registrarName || 'መ/ር አስራት አማኑኤል'}
                  </span>
                  <span className="text-[10px] text-slate-500">የሬጅስትራር ኃላፊ</span>
                </div>
                {/* Stamp */}
                <div className="w-14 h-14 rounded-full border-2 border-emerald-800/40 p-1 flex items-center justify-center opacity-85">
                  <img
                    src={logoSrc}
                    alt="ማህተም"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div className="text-[10px] text-slate-500 pt-1">
                <span>ቀን: _______________</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
