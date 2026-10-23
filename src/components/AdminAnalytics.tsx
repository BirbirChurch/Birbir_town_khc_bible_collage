import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { Course, GradeBreakdown, Student } from '../types.ts';
import { getCourseAssessmentItems, getEffectiveGradeValues, resolveGradeBreakdown } from '../utils/gradeCalculations.ts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Users, Award, BookOpen } from 'lucide-react';

interface AdminAnalyticsProps {
  students: Student[];
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  currentYear: string;
  currentSemester: string;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  students,
  courses,
  grades,
  currentYear,
  currentSemester
}) => {
  // 1. Bar Chart Data: Number of students per program and study year
  const programData = useMemo(() => {
    const diplomaStudents = students.filter((s) => s.program === 'Diploma');
    const degreeStudents = students.filter((s) => s.program === 'Degree');

    const diplomaYear1 = diplomaStudents.filter((s) => !s.currentStudyYear || s.currentStudyYear === 1).length;
    const diplomaYear2 = diplomaStudents.filter((s) => s.currentStudyYear === 2).length;

    const degreeYear1 = degreeStudents.filter((s) => !s.currentStudyYear || s.currentStudyYear === 1).length;
    const degreeYear2 = degreeStudents.filter((s) => s.currentStudyYear === 2).length;
    const degreeYear3 = degreeStudents.filter((s) => s.currentStudyYear === 3).length;

    return [
      {
        name: 'የዲፕሎማ ፕሮግራም (Diploma)',
        ጠቅላላ_ተማሪዎች: diplomaStudents.length,
        '1ኛ_ዓመት': diplomaYear1,
        '2ኛ_ዓመት_ተመራቂ': diplomaYear2
      },
      {
        name: 'የድግሪ ፕሮግራም (Degree)',
        ጠቅላላ_ተማሪዎች: degreeStudents.length,
        '1ኛ_ዓመት': degreeYear1,
        '2ኛ_ዓመት': degreeYear2,
        '3ኛ_ዓመት_ተመራቂ': degreeYear3
      }
    ];
  }, [students]);

  // 2. Pie Chart Data: Grade distributions across all courses
  const { gradeDistributionData, totalGradesEvaluated, averageTotalScore, passCount } = useMemo(() => {
    const dist: Record<string, number> = {
      'A+ (90-100)': 0,
      'A (85-89)': 0,
      'B+ (80-84)': 0,
      'B (75-79)': 0,
      'C+ (70-74)': 0,
      'C (65-69)': 0,
      'D (60-64)': 0,
      'F (<60)': 0
    };

    let totalScoreSum = 0;
    let count = 0;
    let passed = 0;

    courses.forEach((course) => {
      const enrolled = students.filter((s) => s.program === course.program);
      const criteria = getCourseAssessmentItems(course);

      enrolled.forEach((student) => {
        const breakdown = resolveGradeBreakdown(
          grades,
          student.uid,
          course.id,
          currentYear,
          currentSemester,
          student.id
        );
        const eff = getEffectiveGradeValues(breakdown, criteria);

        if (eff.hasAny) {
          totalScoreSum += eff.total;
          count++;

          const letter = eff.letter;
          if (letter === 'A+') dist['A+ (90-100)']++;
          else if (letter === 'A') dist['A (85-89)']++;
          else if (letter === 'B+') dist['B+ (80-84)']++;
          else if (letter === 'B') dist['B (75-79)']++;
          else if (letter === 'C+') dist['C+ (70-74)']++;
          else if (letter === 'C') dist['C (65-69)']++;
          else if (letter === 'D') dist['D (60-64)']++;
          else dist['F (<60)']++;

          if (eff.total >= 60) {
            passed++;
          }
        }
      });
    });

    const data = Object.entries(dist)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);

    return {
      gradeDistributionData: data.length > 0 ? data : [{ name: 'ምንም ውጤት ገና አልተመዘገበም', value: 1 }],
      totalGradesEvaluated: count,
      averageTotalScore: count > 0 ? (totalScoreSum / count).toFixed(1) : '0.0',
      passCount: passed
    };
  }, [students, courses, grades, currentYear, currentSemester]);

  // Vibrant color palette for charts
  const PIE_COLORS = [
    '#059669', // Emerald A+
    '#10b981', // Mint A
    '#2563eb', // Royal Blue B+
    '#6366f1', // Indigo B
    '#f59e0b', // Amber C+
    '#d97706', // Orange C
    '#ea580c', // Dark Orange D
    '#dc2626'  // Red F
  ];

  const passRate = totalGradesEvaluated > 0 ? ((passCount / totalGradesEvaluated) * 100).toFixed(0) : '0';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-purple-900/60">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
              <TrendingUp className="w-4 h-4" />
              <span>የተማሪዎችና የውጤት ዳታ ትንተና</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-amber-400" />
              <span>የአካዳሚክ ስታቲስቲክስና ዳታ ቪዥዋላይዜሽን (Analytics Dashboard)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              የትምህርት ዘመን <strong>{currentYear} ዓ.ም</strong> ({currentSemester}ኛ ሴሚስተር)።
              በፕሮግራም የተመዘገቡ ተማሪዎች ብዛትና በሁሉም ኮርሶች ላይ የተገኘው የውጤት ስርጭት ግራፍ።
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-purple-200 font-bold block uppercase">ጠቅላላ ተማሪዎች</span>
              <strong className="text-xl font-black text-white">{students.length}</strong>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-purple-200 font-bold block uppercase">የተፈተኑ ውጤቶች</span>
              <strong className="text-xl font-black text-amber-300">{totalGradesEvaluated}</strong>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] text-purple-200 font-bold block uppercase">አማካይ ውጤት</span>
              <strong className="text-xl font-black text-emerald-300">{averageTotalScore}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Bar Chart - Students per Program */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="border-b pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-700" />
                <span>በፕሮግራም የተማሪዎች ብዛት (Students per Program)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                የዲፕሎማ እና የድግሪ ተማሪዎች በየዓመታቸው ያለው ዝርዝር ስርጭት
              </p>
            </div>
            <span className="bg-indigo-50 text-indigo-800 font-mono text-xs font-bold px-2.5 py-1 rounded-xl border border-indigo-200">
              {students.length} ተማሪዎች
            </span>
          </div>

          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={programData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="ጠቅላላ_ተማሪዎች" fill="#4f46e5" radius={[6, 6, 0, 0]} name="ጠቅላላ ተማሪዎች" />
                <Bar dataKey="1ኛ_ዓመት" fill="#10b981" radius={[6, 6, 0, 0]} name="1ኛ ዓመት" />
                <Bar dataKey="2ኛ_ዓመት_ተመራቂ" fill="#f59e0b" radius={[6, 6, 0, 0]} name="2ኛ ዓመት (ተመራቂ)" />
                <Bar dataKey="3ኛ_ዓመት_ተመራቂ" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="3ኛ ዓመት (ተመራቂ)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-800 block font-bold">የዲፕሎማ ተማሪዎች</span>
                <strong className="text-base font-black text-emerald-950 font-mono">
                  {students.filter((s) => s.program === 'Diploma').length}
                </strong>
              </div>
              <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-lg font-bold">
                {((students.filter((s) => s.program === 'Diploma').length / (students.length || 1)) * 100).toFixed(0)}%
              </span>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-indigo-800 block font-bold">የድግሪ ተማሪዎች</span>
                <strong className="text-base font-black text-indigo-950 font-mono">
                  {students.filter((s) => s.program === 'Degree').length}
                </strong>
              </div>
              <span className="text-[10px] bg-indigo-200/60 text-indigo-900 px-2 py-0.5 rounded-lg font-bold">
                {((students.filter((s) => s.program === 'Degree').length / (students.length || 1)) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: Pie Chart - Grade Distribution */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="border-b pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-700" />
                <span>የውጤት ደረጃዎች ስርጭት (Grade Distribution)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                በሁሉም ኮርሶች ላይ የተማሪዎች ውጤት ፊደል (A+, A, B+, B, C, D, F) ስርጭት
              </p>
            </div>
            <span className="bg-emerald-50 text-emerald-800 font-mono text-xs font-bold px-2.5 py-1 rounded-xl border border-emerald-200">
              ማለፍ: {passRate}%
            </span>
          </div>

          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeDistributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={45}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${(name || '').split(' ')[0]} (${(((percent as number) || 0) * 100).toFixed(0)}%)`}
                >
                  {gradeDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: any) => [`${value} ውጤቶች`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 font-bold block">የተፈተኑ ኮርሶች</span>
              <strong className="text-sm font-black text-slate-900 font-mono">{courses.length}</strong>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 font-bold block">ያለፉ ተማሪዎች</span>
              <strong className="text-sm font-black text-emerald-800 font-mono">{passCount}</strong>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 font-bold block">የትምህርት ዘመን</span>
              <strong className="text-sm font-black text-indigo-950">{currentYear} ዓ.ም</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
