import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  GraduationCap,
  CheckCircle2,
  Clock,
  Shield,
  UserCheck,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  BookOpen,
  Calendar,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  Save,
  Check,
  Edit3,
  Plus,
  Edit,
  Trash2,
  X,
  History,
  Layers,
  Upload
} from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, ProgramType, Student, UserRole } from '../types.ts';
import {
  calculateGradeDetails,
  calculateStudentGPA,
  getCourseAssessmentItems,
  getCriterionScore,
  getEffectiveGradeValues,
  getGradeKey,
  resolveGradeBreakdown
} from '../utils/gradeCalculations.ts';
import { GraduationTranscriptModal } from './GraduationTranscriptModal.tsx';
import { exportCourseGradesToExcel, exportMasterSemesterGradeSheetToExcel } from '../utils/excelUtils.ts';
import { ExcelUploadModal } from './ExcelUploadModal.tsx';
import {
  DIPLOMA_CURRICULUM,
  loadHistorical2018Courses,
  saveHistorical2018Courses,
  getInitial2018HistoricalCourses
} from '../data/curriculumCourses.ts';
import { CourseGradeReportPdfModal } from './CourseGradeReportPdfModal.tsx';
import { PRELOADED_TEACHERS } from '../data/initialData.ts';

interface GraduationManagerProps {
  students: Student[];
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  currentYear: string;
  currentSemester: string;
  availableYears: string[];
  currentUserRole: UserRole;
  officialConfig?: OfficialSignaturesConfig;
  churchLogo?: string;
  onUpdateStudents: (updatedStudents: Student[]) => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onSaveGrades?: (updatedGrades: Record<string, GradeBreakdown>) => void;
  teachers?: string[];
}

export const GraduationManager: React.FC<GraduationManagerProps> = ({
  students,
  courses,
  grades,
  currentYear,
  currentSemester,
  availableYears,
  currentUserRole,
  officialConfig,
  churchLogo,
  onUpdateStudents,
  showNotify,
  onSaveGrades,
  teachers = PRELOADED_TEACHERS
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'verification' | 'graduates_grading' | 'archive'>('graduates_grading');
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState<'ALL' | ProgramType>('ALL');
  const [yearFilter, setYearFilter] = useState<'ALL' | number>('ALL');
  const [archiveYearFilter, setArchiveYearFilter] = useState<string>(currentYear);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANDIDATE' | 'GRADUATED'>('ALL');
  const [selectedTranscriptStudent, setSelectedTranscriptStudent] = useState<Student | null>(null);

  // Dedicated 2018.. Diploma Graduates Grading State
  const diploma2018Students = useMemo(() => {
    return students.filter(
      (s) => s.program === 'Diploma' && (s.admissionYear === '2018' || s.id.startsWith('2018'))
    );
  }, [students]);

  // Historical 2018 Courses State
  const [historical2018Courses, setHistorical2018Courses] = useState<Course[]>(() => loadHistorical2018Courses());

  // Grading Period Selection (Default to 2018 Sem 1 for historical grade entry)
  const [gradingYear, setGradingYear] = useState<string>('2018');
  const [gradingSemester, setGradingSemester] = useState<string>('1');

  // Courses available for the chosen grading period
  const activeCoursesForGrading = useMemo(() => {
    if (gradingYear === '2018') {
      const filtered = historical2018Courses.filter(
        (c) => (c.academicYear === '2018' || !c.academicYear) && (c.semester === gradingSemester || !c.semester)
      );
      return filtered.length > 0 ? filtered : historical2018Courses;
    } else {
      // 2019 active diploma courses
      return courses.filter((c) => c.program === 'Diploma');
    }
  }, [gradingYear, gradingSemester, historical2018Courses, courses]);

  // Selected Course for grading
  const [selectedGradCourseId, setSelectedGradCourseId] = useState<string>(
    activeCoursesForGrading[0]?.id || 'dip_sem1_1'
  );

  const selectedGradCourse = useMemo(() => {
    return activeCoursesForGrading.find((c) => c.id === selectedGradCourseId) || activeCoursesForGrading[0];
  }, [activeCoursesForGrading, selectedGradCourseId]);

  // Synchronize selected course when grading period or course list changes
  useEffect(() => {
    if (activeCoursesForGrading.length > 0) {
      const exists = activeCoursesForGrading.some((c) => c.id === selectedGradCourseId);
      if (!exists) {
        setSelectedGradCourseId(activeCoursesForGrading[0].id);
      }
    }
  }, [activeCoursesForGrading, selectedGradCourseId]);

  // Local scores matrix for the active course and period
  const [localGradingGrades, setLocalGradingGrades] = useState<Record<string, GradeBreakdown>>({});
  const [isPdfGradeReportOpen, setIsPdfGradeReportOpen] = useState(false);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);

  // Sync local grading matrix when course or period changes
  useEffect(() => {
    if (!selectedGradCourse) return;
    const initial: Record<string, GradeBreakdown> = {};
    diploma2018Students.forEach((s) => {
      const g = resolveGradeBreakdown(
        grades,
        s.uid,
        selectedGradCourse.id,
        gradingYear,
        gradingSemester,
        s.id
      );
      initial[s.uid] = { ...g };
    });
    setLocalGradingGrades(initial);
  }, [selectedGradCourse?.id, gradingYear, gradingSemester, diploma2018Students.length, grades]);

  // Add/Edit Course Modal State for 2018 Historical Courses
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseTarget, setEditingCourseTarget] = useState<Course | null>(null);

  // Form State for Course metadata
  const [formCourseCode, setFormCourseCode] = useState('');
  const [formCourseName, setFormCourseName] = useState('');
  const [formCourseTeacher, setFormCourseTeacher] = useState('');
  const [formCourseCredits, setFormCourseCredits] = useState<number>(3);
  const [formCourseYear, setFormCourseYear] = useState('2018');
  const [formCourseSemester, setFormCourseSemester] = useState('1');

  const openAddCourseModal = () => {
    setEditingCourseTarget(null);
    setFormCourseCode(`DIP-1${historical2018Courses.length + 1}`);
    setFormCourseName('');
    setFormCourseTeacher(teachers[0] || 'መ/ር አስራት አማኑኤል');
    setFormCourseCredits(3);
    setFormCourseYear('2018');
    setFormCourseSemester(gradingSemester);
    setIsCourseModalOpen(true);
  };

  const openEditCourseModal = (courseToEdit: Course) => {
    setEditingCourseTarget(courseToEdit);
    setFormCourseCode(courseToEdit.code || '');
    setFormCourseName(courseToEdit.name);
    setFormCourseTeacher(courseToEdit.teacher);
    setFormCourseCredits(courseToEdit.credits || 3);
    setFormCourseYear(courseToEdit.academicYear || '2018');
    setFormCourseSemester(courseToEdit.semester || gradingSemester);
    setIsCourseModalOpen(true);
  };

  const handleSaveCourseModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourseName.trim()) {
      showNotify('እባክዎ የትምህርቱን ዓይነት ስም ያስገቡ!', 'warning');
      return;
    }

    if (editingCourseTarget) {
      // Update existing course
      const updated = historical2018Courses.map((c) =>
        c.id === editingCourseTarget.id
          ? {
              ...c,
              code: formCourseCode.trim() || undefined,
              name: formCourseName.trim(),
              teacher: formCourseTeacher.trim(),
              credits: Number(formCourseCredits) || 3,
              academicYear: formCourseYear,
              semester: formCourseSemester,
              schedule: `${formCourseYear} ዓ.ም — ${formCourseSemester}ኛ ሴሚስተር`
            }
          : c
      );
      setHistorical2018Courses(updated);
      saveHistorical2018Courses(updated);
      showNotify(`የኮርስ «${formCourseName}» መረጃ በስኬት ተስተካክሏል!`, 'success');
    } else {
      // Create new course
      const newCourse: Course = {
        id: `hist_${Date.now()}`,
        program: 'Diploma',
        code: formCourseCode.trim() || undefined,
        name: formCourseName.trim(),
        teacher: formCourseTeacher.trim(),
        credits: Number(formCourseCredits) || 3,
        academicYear: formCourseYear,
        semester: formCourseSemester,
        schedule: `${formCourseYear} ዓ.ም — ${formCourseSemester}ኛ ሴሚስተር`
      };
      const updated = [...historical2018Courses, newCourse];
      setHistorical2018Courses(updated);
      saveHistorical2018Courses(updated);
      setSelectedGradCourseId(newCourse.id);
      showNotify(`አዲስ የ2018 ኮርስ «${formCourseName}» (${formCourseSemester}ኛ ሴሚስተር) በስኬት ተመዝግቧል!`, 'success');
    }

    setIsCourseModalOpen(false);
  };

  const handleDeleteHistoricalCourse = (courseId: string) => {
    if (window.confirm('ይህን የ2018 የትምህርት ዓይነት ከዝርዝሩ ማሰረዝ ይፈልጋሉ?')) {
      const updated = historical2018Courses.filter((c) => c.id !== courseId);
      setHistorical2018Courses(updated);
      saveHistorical2018Courses(updated);
      if (selectedGradCourseId === courseId) {
        setSelectedGradCourseId(updated[0]?.id || '');
      }
      showNotify('ኮርሱ ከ2018 ዝርዝር ተሰርዟል!', 'info');
    }
  };

  const canApprove = currentUserRole === 'ADMIN' || currentUserRole === 'DEAN' || currentUserRole === 'REGISTRAR';

  // Toggle approval by role
  const handleToggleApproval = (studentUid: string, roleToToggle: 'admin' | 'dean' | 'registrar') => {
    if (!canApprove) return;
    const updated = students.map((s) => {
      if (s.uid !== studentUid) return s;
      const currentApprovals = s.graduationApprovedBy || {};
      const newStatus = !currentApprovals[roleToToggle];
      const newApprovals = { ...currentApprovals, [roleToToggle]: newStatus };
      const allApproved = newApprovals.admin && newApprovals.dean && newApprovals.registrar;

      return {
        ...s,
        graduationApprovedBy: newApprovals,
        graduationStatus: allApproved ? ('CANDIDATE' as const) : s.graduationStatus
      };
    });

    onUpdateStudents(updated);
    const roleLabels = { admin: 'ዋና አድሚን', dean: 'ዋና ዲን', registrar: 'ሪጅስተራል' };
    showNotify(`የ${roleLabels[roleToToggle]} ማረጋገጫ በስኬት ተስተካክሏል!`, 'success');
  };

  // Toggle Candidate Selection
  const handleToggleCandidate = (studentUid: string) => {
    const updated = students.map((s) => {
      if (s.uid !== studentUid) return s;
      const willBeCandidate = s.graduationStatus !== 'CANDIDATE';
      return {
        ...s,
        graduationStatus: (willBeCandidate ? 'CANDIDATE' : 'ACTIVE') as any,
        graduationApprovedBy: willBeCandidate
          ? {
              ...s.graduationApprovedBy,
              ...(currentUserRole === 'ADMIN' ? { admin: true } : {}),
              ...(currentUserRole === 'DEAN' ? { dean: true } : {}),
              ...(currentUserRole === 'REGISTRAR' ? { registrar: true } : {})
            }
          : s.graduationApprovedBy
      };
    });
    onUpdateStudents(updated);
    showNotify('የተማሪው የተማራቂነት ምርጫ በስኬት ተስተካክሏል!', 'success');
  };

  // Batch Select all 2018.. Diploma students as Candidates
  const handleSelectAll2018Candidates = () => {
    const updated = students.map((s) => {
      if (s.program === 'Diploma' && (s.admissionYear === '2018' || s.id.startsWith('2018'))) {
        return {
          ...s,
          graduationStatus: 'CANDIDATE' as const,
          graduationApprovedBy: {
            admin: true,
            dean: true,
            registrar: true
          }
        };
      }
      return s;
    });
    onUpdateStudents(updated);
    showNotify('ሁሉም የ2018.. መለያ ቁጥር ያላቸው የዲፕሎማ ተማሪዎች የ2019 ዓ.ም ተማራቂ ተብለው ተመርጠዋል!', 'success');
  };

  // Finalize Graduation: move to official graduates archive
  const handleGraduateStudent = (studentUid: string) => {
    const updated = students.map((s) => {
      if (s.uid !== studentUid) return s;
      return {
        ...s,
        graduationStatus: 'GRADUATED' as const,
        graduationYear: currentYear,
        graduationSemester: currentSemester,
        graduationApprovedBy: {
          admin: true,
          dean: true,
          registrar: true
        }
      };
    });
    onUpdateStudents(updated);
    showNotify(`ተማሪው በ${currentYear} ዓ.ም (${currentSemester}ኛ ሴሚስተር) በይፋ ተመርቆ ወደ ተመራቂዎች ማህደር ተመዝግቧል!`, 'success');
  };

  // Filter students for Verification Tab
  const candidateStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProg = programFilter === 'ALL' || s.program === programFilter;
    const matchesYear = yearFilter === 'ALL' || s.currentStudyYear === yearFilter;
    const matchesStatus = statusFilter === 'ALL' || (s.graduationStatus || 'ACTIVE') === statusFilter;
    return matchesSearch && matchesProg && matchesYear && matchesStatus;
  });

  // Filter students for Archive Tab
  const archivedGraduates = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProg = programFilter === 'ALL' || s.program === programFilter;
    const isGrad = s.graduationStatus === 'GRADUATED';
    const matchesYear = archiveYearFilter === 'ALL' || (s.graduationYear || currentYear) === archiveYearFilter;
    return matchesSearch && matchesProg && isGrad && matchesYear;
  });

  // Handle Score Input in Dedicated Grading Tab
  const handleGradingScoreChange = (
    studentUid: string,
    itemId: string,
    val: string,
    maxVal: number
  ) => {
    const parsed = val.trim() === '' ? 0 : Math.min(maxVal, Math.max(0, parseFloat(val) || 0));
    setLocalGradingGrades((prev) => {
      const current = prev[studentUid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      const currentScores = current.scores ? { ...current.scores } : {};
      currentScores[itemId] = parsed;

      return {
        ...prev,
        [studentUid]: {
          ...current,
          scores: currentScores,
          ...(itemId === 'p1' ? { p1: parsed } : {}),
          ...(itemId === 'p2' ? { p2: parsed } : {}),
          ...(itemId === 'mid' ? { mid: parsed } : {}),
          ...(itemId === 'final' ? { final: parsed } : {}),
          ...(itemId === 'att' ? { att: parsed } : {})
        }
      };
    });
  };

  // Save Grades for Chosen Course and Period
  const handleSaveGradingScores = () => {
    if (!selectedGradCourse || !onSaveGrades) return;
    const updated = { ...grades };
    diploma2018Students.forEach((s) => {
      const keyByUid = getGradeKey(s.uid, selectedGradCourse.id, gradingYear, gradingSemester);
      const scoreVal = localGradingGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      updated[keyByUid] = scoreVal;
      if (s.id) {
        const keyById = getGradeKey(s.id, selectedGradCourse.id, gradingYear, gradingSemester);
        updated[keyById] = scoreVal;
      }
    });
    onSaveGrades(updated);
    showNotify(
      `የተመራቂ ተማሪዎች የ${gradingYear} ዓ.ም ${gradingSemester}ኛ ሴሚስተር የ«${selectedGradCourse.name}» ውጤት በስኬት ተመዝግቧል!`,
      'success'
    );
  };

  // Export Chosen Period Course Grades to Excel
  const handleExport2018GraduatesExcel = () => {
    if (!selectedGradCourse) return;
    exportCourseGradesToExcel(
      selectedGradCourse,
      diploma2018Students,
      localGradingGrades,
      gradingYear,
      gradingSemester
    );
    showNotify(`የ${selectedGradCourse.name} የተመራቂዎች ውጤት ኤክሴል (.xlsx) በስኬት ወርዷል!`, 'success');
  };

  // Handle Grades Imported via Excel for the Active Course
  const handleApplyExcelGrades = (updatedScoresByUid: Record<string, Record<string, number>>) => {
    if (!selectedGradCourse) return;

    setLocalGradingGrades((prev) => {
      const next = { ...prev };
      Object.entries(updatedScoresByUid).forEach(([uid, scoresMap]) => {
        const current = next[uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
        const currentScores = current.scores ? { ...current.scores } : {};
        Object.entries(scoresMap).forEach(([itemId, val]) => {
          currentScores[itemId] = val;
        });

        next[uid] = {
          ...current,
          scores: currentScores,
          ...(scoresMap['p1'] !== undefined ? { p1: scoresMap['p1'] } : {}),
          ...(scoresMap['p2'] !== undefined ? { p2: scoresMap['p2'] } : {}),
          ...(scoresMap['mid'] !== undefined ? { mid: scoresMap['mid'] } : {}),
          ...(scoresMap['final'] !== undefined ? { final: scoresMap['final'] } : {}),
          ...(scoresMap['att'] !== undefined ? { att: scoresMap['att'] } : {})
        };
      });
      return next;
    });

    if (onSaveGrades) {
      const updatedGlobal = { ...grades };
      diploma2018Students.forEach((s) => {
        const incomingScores = updatedScoresByUid[s.uid];
        if (incomingScores) {
          const current = localGradingGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
          const scoreVal: GradeBreakdown = {
            ...current,
            scores: { ...(current.scores || {}), ...incomingScores },
            ...(incomingScores['p1'] !== undefined ? { p1: incomingScores['p1'] } : {}),
            ...(incomingScores['p2'] !== undefined ? { p2: incomingScores['p2'] } : {}),
            ...(incomingScores['mid'] !== undefined ? { mid: incomingScores['mid'] } : {}),
            ...(incomingScores['final'] !== undefined ? { final: incomingScores['final'] } : {}),
            ...(incomingScores['att'] !== undefined ? { att: incomingScores['att'] } : {})
          };
          const keyByUid = getGradeKey(s.uid, selectedGradCourse.id, gradingYear, gradingSemester);
          updatedGlobal[keyByUid] = scoreVal;
          if (s.id) {
            const keyById = getGradeKey(s.id, selectedGradCourse.id, gradingYear, gradingSemester);
            updatedGlobal[keyById] = scoreVal;
          }
        }
      });
      onSaveGrades(updatedGlobal);
    }

    setIsExcelUploadOpen(false);
    showNotify(`ከኤክሴል የተጫኑ ውጤቶች ለ«${selectedGradCourse.name}» በስኬት ተመዝግበዋል!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-md border border-emerald-900/60">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              <Shield className="w-4 h-4" />
              <span>የተማሪዎች ምረቃ ማረጋገጫና ወደኋላ ያለ የ2018 ውጤት መቆጣጠሪያ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <GraduationCap className="w-7 h-7 text-amber-400" />
              <span>የተማሪዎች ይፋዊ የምረቃና ውጤት ማረጋገጫ (Graduation Hub)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              የትምህርት ዘመን <strong>{currentYear} ዓ.ም</strong> ({currentSemester}ኛ ሴሚስተር)።
              ዋና አድሚን፣ ዲን እና ሪጅስተራል ወደኋላ ያለውን የ2018 ዓ.ም (1ኛ እና 2ኛ ሴሚስተር) ውጤት ማስገባት፣ 
              የመምህር ስም፣ የትምህርት ዓይነት፣ የክሬዲት ሰዓትና ኮድ ማስተካከል፣ ተማሪዎችን እንደ ተማራቂ መምረጥና 
              ባለ 4-ሴሚስተር ሙሉ የምረቃ ትራንስክሪፕት ማዘጋጀት ይችላሉ።
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedTranscriptStudent(diploma2018Students[0] || students[0])}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>የተማራቂ ሙሉ ትራንስክሪፕት</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub Tabs: 3 Main Sections */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveSubTab('graduates_grading')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'graduates_grading'
              ? 'border-indigo-700 text-indigo-900 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-indigo-700" />
          <span>የ2018.. ተመራቂዎች የቀደመና የአሁን ውጤት ማስገቢያ (Graduates Grading)</span>
          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
            {diploma2018Students.length} ተማሪዎች
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('verification')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'verification'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-700" />
          <span>ተማራቂዎችን መምረጫና ማረጋገጫ (Approvals & Roster)</span>
          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
            {candidateStudents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('archive')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'archive'
              ? 'border-amber-700 text-amber-900 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-amber-700" />
          <span>የተመረቁ ተማሪዎች ቋሚ ማህደር (Alumni Archive)</span>
          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
            {archivedGraduates.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Candidates Selection & Approvals */}
      {activeSubTab === 'verification' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-6">
          {/* Quick Action: Batch Designate all 2018.. as Candidates */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-emerald-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>የ2019 ዓ.ም የዲፕሎማ ተማራቂዎች ፈጣን ምርጫ (2018.. Students)</span>
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                መለያ ቁጥራቸው በ«2018..» የሚጀምሩት 10 የዲፕሎማ ተማሪዎች የ2019 ዓ.ም ይፋዊ ተመራቂዎች ናቸው። በአንድ ክሊክ እጩ ተማራቂ አድርገው ይምረጡ።
              </p>
            </div>
            <button
              type="button"
              onClick={handleSelectAll2018Candidates}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ሁሉንም 2018.. ተማሪዎች እንደ ተመራቂ ምረጥ</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ተማሪ በስም ወይም በID ፈልግ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
              >
                <option value="ALL">ሁሉንም ፕሮግራም</option>
                <option value="Degree">የድግሪ (Degree)</option>
                <option value="Diploma">የዲፕሎማ (Diploma)</option>
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
              >
                <option value="ALL">ሁሉንም ዓመት</option>
                <option value="1">1ኛ ዓመት</option>
                <option value="2">2ኛ ዓመት (ተመራቂ)</option>
                <option value="3">3ኛ ዓመት</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
              >
                <option value="ALL">ሁሉንም የምረቃ ሁኔታ</option>
                <option value="CANDIDATE">ተማራቂዎች (Candidates)</option>
                <option value="ACTIVE">መደበኛ ተማሪዎች (Active)</option>
                <option value="GRADUATED">የተመረቁ (Graduated)</option>
              </select>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 font-bold uppercase text-[11px] text-slate-700 sticky top-0 z-10 border-b">
                <tr>
                  <th className="p-3">ተ.ቁ</th>
                  <th className="p-3">መለያ ቁጥር (ID)</th>
                  <th className="p-3">የተማሪ ሙሉ ስም</th>
                  <th className="p-3">ፕሮግራም</th>
                  <th className="p-3 text-center">የትምህርት ዓመት</th>
                  <th className="p-3 text-center">የምረቃ እጩነት</th>
                  <th className="p-3 text-center">ዋና አድሚን</th>
                  <th className="p-3 text-center">ዲን</th>
                  <th className="p-3 text-center">ሪጅስተራል</th>
                  <th className="p-3 text-right">እርምጃዎች</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidateStudents.map((s, idx) => {
                  const isGraduated = s.graduationStatus === 'GRADUATED';
                  const isCandidate = s.graduationStatus === 'CANDIDATE';
                  const approvals = s.graduationApprovedBy || {};

                  return (
                    <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{s.id}</td>
                      <td className="p-3 font-bold text-slate-900">{s.name}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.program === 'Degree'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {s.program}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {s.currentStudyYear ? `${s.currentStudyYear}ኛ ዓመት` : '1ኛ ዓመት'}
                        </span>
                      </td>

                      {/* Candidate Toggle */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCandidate(s.uid)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                            isCandidate
                              ? 'bg-amber-100 text-amber-950 border border-amber-300'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {isCandidate ? '★ የምረቃ እጩ' : 'መደበኛ ተማሪ'}
                        </button>
                      </td>

                      {/* Admin Signoff */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          disabled={!canApprove}
                          onClick={() => handleToggleApproval(s.uid, 'admin')}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 mx-auto ${
                            approvals.admin
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="አድሚን ይሁንታ"
                        >
                          {approvals.admin ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-slate-400" />}
                          <span>{approvals.admin ? 'አጽድቋል' : 'ይጠብቃል'}</span>
                        </button>
                      </td>

                      {/* Dean Signoff */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          disabled={!canApprove}
                          onClick={() => handleToggleApproval(s.uid, 'dean')}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 mx-auto ${
                            approvals.dean
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="ዲን ይሁንታ"
                        >
                          {approvals.dean ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-slate-400" />}
                          <span>{approvals.dean ? 'አጽድቋል' : 'ይጠብቃል'}</span>
                        </button>
                      </td>

                      {/* Registrar Signoff */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          disabled={!canApprove}
                          onClick={() => handleToggleApproval(s.uid, 'registrar')}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 mx-auto ${
                            approvals.registrar
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="ሪጅስተራል ይሁንታ"
                        >
                          {approvals.registrar ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-slate-400" />}
                          <span>{approvals.registrar ? 'አጽድቋል' : 'ይጠብቃል'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedTranscriptStudent(s)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10px] px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="የተማሩበትን ሙሉ ትምህርት የምረቃ ትራንስክሪፕት በአንድ ላይ ጄኔሬት አድርግ"
                          >
                            <Award className="w-3 h-3 text-indigo-700" />
                            <span>ሙሉ ትራንስክሪፕት</span>
                          </button>

                          {isGraduated ? (
                            <span className="bg-emerald-100 text-emerald-950 font-bold px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>ተመርቋል ({s.graduationYear || currentYear})</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleGraduateStudent(s.uid)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              title="በይፋ መርቅና ወደ ተመራቂዎች ማህደር መዝግብ"
                            >
                              <GraduationCap className="w-3 h-3 text-amber-300" />
                              <span>መርቅ</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Dedicated 2018.. Diploma Graduates Grade Entry (ወደኋላ ያለ የ2018 ውጤት መሙያ) */}
      {activeSubTab === 'graduates_grading' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-6">
          {/* Header & Description */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-bold mb-1">
                <BookOpen className="w-4 h-4 text-indigo-700" />
                <span>የ2019 ዓ.ም የዲፕሎማ ተመራቂዎች (2018.. መለያ ያላቸው ተማሪዎች)</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                የተመራቂ ተማሪዎች ወደኋላ ያለ የ2018 ውጤት እና የአሁን ውጤት ማስገቢያ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
                እነዚህ ተማሪዎች በዚህ ዓመት (2019 ዓ.ም) 2ኛ ዓመት 4ኛ ሴሚስተር በማጠናቀቅ ላይ ያሉ ይፋዊ ተመራቂዎች ናቸው። 
                ወደኋላ ያለውን የ2018 ዓ.ም (1ኛ እና 2ኛ ሴሚስተር) ውጤት ጨምሮ የመምህር ስም፣ የትምህርት ዓይነት፣ የክሬዲት ሰዓትና 
                ኮድ እያስተካከሉ እዚህ መሙላት ይችላሉ።
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={openAddCourseModal}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="አዲስ የ2018 ኮርስ ወደ ሲስተሙ ጨምር"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>+ አዲስ የ2018 ኮርስ ጨምር</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExcelUploadOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-300 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="የተመራቂዎችን ውጤት ከኤክሴል ሰነድ ጫን (Excel Upload)"
              >
                <Upload className="w-4 h-4 text-indigo-700" />
                <span>ኤክሴል ጫን (Upload)</span>
              </button>

              <button
                type="button"
                onClick={handleExport2018GraduatesExcel}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="የተመራቂዎችን ውጤት በኤክሴል አውርድ"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>ኤክሴል አውርድ (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfGradeReportOpen(true)}
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="የተመራቂዎችን ይፋዊ የውጤት ሰነድ በፒዲኤፍ (PDF) ለማየትና ለማተም"
              >
                <Printer className="w-4 h-4 text-cyan-700" />
                <span>ይፋዊ ሰነድ (PDF)</span>
              </button>

              {onSaveGrades && (
                <button
                  type="button"
                  onClick={handleSaveGradingScores}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>ውጤቶችን መዝግብ (Save)</span>
                </button>
              )}
            </div>
          </div>

          {/* Academic Period Selector Bar (ትምህርቱ የተሰጠበት ጊዜ መራጭ) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-700" />
                <span>ትምህርቱ የተሰጠበት ጊዜ (የትምህርት ዘመን እና ሴሚስተር ይምረጡ)፦</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                የተመረጠው ጊዜ፦ <strong className="text-indigo-900 font-bold">{gradingYear} ዓ.ም — {gradingSemester}ኛ ሴሚስተር</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setGradingYear('2018');
                  setGradingSemester('1');
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  gradingYear === '2018' && gradingSemester === '1'
                    ? 'bg-indigo-700 text-white border-indigo-800 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-80">የቀደመ 1ኛ ዓመት</span>
                <span className="text-sm font-black mt-0.5">2018 ዓ.ም — 1ኛ ሴሚስተር</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGradingYear('2018');
                  setGradingSemester('2');
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  gradingYear === '2018' && gradingSemester === '2'
                    ? 'bg-indigo-700 text-white border-indigo-800 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-80">የቀደመ 1ኛ ዓመት</span>
                <span className="text-sm font-black mt-0.5">2018 ዓ.ም — 2ኛ ሴሚስተር</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGradingYear('2019');
                  setGradingSemester('1');
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  gradingYear === '2019' && gradingSemester === '1'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-80">የአሁኑ 2ኛ ዓመት</span>
                <span className="text-sm font-black mt-0.5">2019 ዓ.ም — 1ኛ ሴሚስተር</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGradingYear('2019');
                  setGradingSemester('2');
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  gradingYear === '2019' && gradingSemester === '2'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-80">የምረቃ ሴሚስተር</span>
                <span className="text-sm font-black mt-0.5">2019 ዓ.ም — 2ኛ ሴሚስተር</span>
              </button>
            </div>
          </div>

          {/* Course Selector & Metadata Card (የመምህር ስም፥ የትምህርት ዓይነት፥ የትምህርቱ ጊዜ፥ ኮድ እና ጊዜ) */}
          <div className="bg-indigo-50/60 border border-indigo-200/80 p-4 sm:p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs font-bold text-indigo-950 whitespace-nowrap">የኮርስ ምርጫ፦</label>
                <select
                  value={selectedGradCourseId}
                  onChange={(e) => setSelectedGradCourseId(e.target.value)}
                  className="w-full sm:w-84 p-2 text-xs font-bold border rounded-xl bg-white border-indigo-300 focus:ring-2 focus:ring-indigo-700 cursor-pointer shadow-2xs"
                >
                  {activeCoursesForGrading.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `[${c.code}] ` : ''}{c.name} ({c.credits} ክሬዲት) | መምህር፦ {c.teacher}
                    </option>
                  ))}
                </select>
              </div>

              {selectedGradCourse && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditCourseModal(selectedGradCourse)}
                    className="bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="የዚህን ኮርስ ስም፣ መምህር፣ ክሬዲት ሰዓት ወይም ኮድ አሻሽል"
                  >
                    <Edit className="w-3.5 h-3.5 text-indigo-700" />
                    <span>የኮርሱን መረጃ አሻሽል (Edit)</span>
                  </button>

                  {gradingYear === '2018' && historical2018Courses.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteHistoricalCourse(selectedGradCourse.id)}
                      className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs p-1.5 rounded-xl transition-all cursor-pointer"
                      title="ኮርሱን ከ2018 ዝርዝር አስወግድ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Prominent Metadata Badges Grid */}
            {selectedGradCourse && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-indigo-200/60 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">የትምህርት ዓይነት (Course):</span>
                  <strong className="text-slate-900 text-xs font-bold truncate block">{selectedGradCourse.name}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">የትምህርቱ መለያ ኮድ (Code):</span>
                  <strong className="text-indigo-800 font-mono font-bold text-xs block">{selectedGradCourse.code || 'DIP-Course'}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">የመምህር ስም (Instructor):</span>
                  <strong className="text-slate-900 text-xs font-bold truncate block">{selectedGradCourse.teacher}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">የትምህርቱ ጊዜ / ክሬዲት (Duration):</span>
                  <strong className="text-emerald-800 text-xs font-bold block">{selectedGradCourse.credits} ክሬዲት ሰዓት</strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">ትምህርቱ የተሰጠበት ጊዜ:</span>
                  <strong className="text-indigo-950 font-black text-xs block">{gradingYear} ዓ.ም — {gradingSemester}ኛ ሴሚስተር</strong>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Grade Entry Table */}
          {(() => {
            if (!selectedGradCourse) {
              return <div className="text-xs text-slate-500 py-6 text-center">እባክዎ መጀመሪያ ኮርስ ይምረጡ።</div>;
            }

            const criteria = getCourseAssessmentItems(selectedGradCourse);
            const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);

            return (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 sticky top-0 font-bold uppercase text-[10px] text-slate-700 z-10 border-b">
                    <tr>
                      <th className="p-2.5">ተ.ቁ</th>
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">የተማሪ ሙሉ ስም</th>
                      <th className="p-2.5 text-center">ጾታ</th>
                      {criteria.map((it) => (
                        <th key={it.id} className="p-2 text-center min-w-[70px] bg-indigo-50/50">
                          <span className="block font-bold truncate max-w-[80px]">{it.label}</span>
                          <span className="block text-[9px] font-mono font-black text-indigo-900">({it.max}%)</span>
                        </th>
                      ))}
                      <th className="p-2.5 text-center bg-emerald-100/70 text-emerald-950 border-b-2 border-emerald-500 font-black">
                        ድምር ({totalWeight}%)
                      </th>
                      <th className="p-2.5 text-center bg-amber-100/70 text-amber-950 border-b-2 border-amber-500 font-black">
                        ደረጃ
                      </th>
                      <th className="p-2.5 text-center bg-slate-100 text-slate-800">ነጥብ</th>
                      <th className="p-2.5 text-center bg-indigo-50/70 text-indigo-950">የሴሚስተር GPA</th>
                      <th className="p-2.5 text-right">ትራንስክሪፕት</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {diploma2018Students.map((s, idx) => {
                      const g = localGradingGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
                      const eff = getEffectiveGradeValues(g, criteria);
                      const semesterGPA = calculateStudentGPA(s, activeCoursesForGrading, grades, gradingYear, gradingSemester);

                      return (
                        <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-900">{s.id}</td>
                          <td className="p-2.5 font-bold text-slate-900">{s.name}</td>
                          <td className="p-2.5 text-center text-slate-600">{s.gender || '—'}</td>

                          {criteria.map((it) => {
                            const score = getCriterionScore(g, it.id);
                            return (
                              <td key={it.id} className="p-1.5 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={it.max}
                                  step="0.5"
                                  placeholder="—"
                                  value={score === 0 ? '' : score}
                                  onChange={(e) =>
                                    handleGradingScoreChange(s.uid, it.id, e.target.value, it.max)
                                  }
                                  className="w-14 px-1 py-1 text-center font-mono text-xs border border-indigo-200 rounded-lg bg-white shadow-2xs focus:ring-2 focus:ring-indigo-600"
                                  title={`${it.label} (ከ ${it.max}%)`}
                                />
                              </td>
                            );
                          })}

                          <td className="p-2.5 text-center font-black font-mono text-emerald-900 bg-emerald-50/40">
                            {eff.hasAny ? eff.total : '—'}
                          </td>
                          <td className="p-2.5 text-center font-black text-amber-800 bg-amber-50/40">
                            {eff.hasAny ? eff.letter : '—'}
                          </td>
                          <td className="p-2.5 text-center font-bold font-mono">
                            {eff.hasAny ? eff.points.toFixed(2) : '—'}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-indigo-900 bg-indigo-50/30">
                            {semesterGPA}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedTranscriptStudent(s)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[10px] px-2 py-1 rounded-lg font-bold border border-indigo-200 flex items-center gap-1 ml-auto cursor-pointer"
                              title="የዚህን ተማሪ ሙሉ ባለ 4 ሴሚስተር የምረቃ ትራንስክሪፕት ይመልከቱ"
                            >
                              <Award className="w-3 h-3 text-indigo-700" />
                              <span>ሙሉ ሰነድ</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: Alumni Archive (የተመረቁ ተማሪዎች ቋሚ ማህደር) */}
      {activeSubTab === 'archive' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <span>የተመረቁ ተማሪዎች ቋሚ ማህደር (Official Alumni Archive)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                የተመረቁ ተማሪዎች ዝርዝር፣ የተመረቁበት ዓመት፣ የተሰጣቸው ክብርና ሙሉ ትራንስክሪፕት በቋሚነት እዚህ ይቀመጣል።
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={archiveYearFilter}
                onChange={(e) => setArchiveYearFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
              >
                <option value="ALL">ሁሉንም የምረቃ ዓመታት</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} ዓ.ም ተመራቂዎች
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 font-bold uppercase text-[11px] text-slate-700 sticky top-0 z-10 border-b">
                <tr>
                  <th className="p-3">ተ.ቁ</th>
                  <th className="p-3">መለያ ቁጥር (ID)</th>
                  <th className="p-3">የተማሪ ሙሉ ስም</th>
                  <th className="p-3">ጾታ</th>
                  <th className="p-3">ፕሮግራም</th>
                  <th className="p-3 text-center">የምረቃ ዓመት</th>
                  <th className="p-3 text-center">ሴሚስተር</th>
                  <th className="p-3 text-center">ሁኔታ</th>
                  <th className="p-3 text-right">ይፋዊ ሰነድ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedGraduates.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      በዚህ መስፈርት የተገኘ የተመረቀ ተማሪ የለም። ከተማራቂዎች ማረጋገጫ ገጽ «መርቅ» የሚለውን በመጫን ተማሪዎችን መመርቅ ይችላሉ።
                    </td>
                  </tr>
                ) : (
                  archivedGraduates.map((s, idx) => {
                    return (
                      <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{s.id}</td>
                        <td className="p-3 font-bold text-slate-900">{s.name}</td>
                        <td className="p-3">{s.gender || '—'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.program === 'Degree'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {s.program}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-800">
                          {s.graduationYear || currentYear} ዓ.ም
                        </td>
                        <td className="p-3 text-center font-mono">
                          {s.graduationSemester || currentSemester}ኛ
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-950 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>ተመርቋል</span>
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTranscriptStudent(s)}
                            className="bg-indigo-700 hover:bg-indigo-800 text-white text-[10px] px-3 py-1.5 rounded-xl font-bold shadow-xs flex items-center gap-1 ml-auto cursor-pointer"
                            title="ይፋዊ የምረቃ ትራንስክሪፕት በፒዲኤፍ አትም / አስቀምጥ"
                          >
                            <Printer className="w-3 h-3 text-amber-300" />
                            <span>ትራንስክሪፕት አትም</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Historical 2018 Course (የመምህር ስም፥ የትምህርት ዓይነት፥ የትምህርቱ ጊዜ፥ ኮድ እና ጊዜ) */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-700" />
                <span>
                  {editingCourseTarget ? 'የኮርስ መረጃ ማሻሻያ (Edit Course)' : 'አዲስ የ2018 ኮርስ መመዝገቢያ'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCourseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourseModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  የትምህርት ዓይነት (Course Name) *
                </label>
                <input
                  type="text"
                  placeholder="ምሳሌ፦ እግዚአብሔርና መጽሐፍ ቅዱስ"
                  value={formCourseName}
                  onChange={(e) => setFormCourseName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    የትምህርቱ መለያ ኮድ (Course Code)
                  </label>
                  <input
                    type="text"
                    placeholder="ምሳሌ፦ DIP-101"
                    value={formCourseCode}
                    onChange={(e) => setFormCourseCode(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    የትምህርቱ ጊዜ / ክሬዲት (Credits)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={formCourseCredits}
                    onChange={(e) => setFormCourseCredits(parseInt(e.target.value) || 3)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  የመምህር ስም (Instructor / Teacher Name) *
                </label>
                <input
                  type="text"
                  list="teachers-datalist"
                  placeholder="ምሳሌ፦ መ/ር አስራት አማኑኤል"
                  value={formCourseTeacher}
                  onChange={(e) => setFormCourseTeacher(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900"
                  required
                />
                <datalist id="teachers-datalist">
                  {teachers.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <p className="text-[10px] text-slate-400 mt-1">
                  ከመምህራን ዝርዝር መምረጥ ወይም አዲስ የመምህር ስም መተየብ ይችላሉ
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    የትምህርት ዘመን (Academic Year)
                  </label>
                  <select
                    value={formCourseYear}
                    onChange={(e) => setFormCourseYear(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900 cursor-pointer"
                  >
                    <option value="2018">2018 ዓ.ም (የቀደመ ዓመት)</option>
                    <option value="2019">2019 ዓ.ም (የአሁን ዓመት)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ትምህርቱ የተሰጠበት ሴሚስተር
                  </label>
                  <select
                    value={formCourseSemester}
                    onChange={(e) => setFormCourseSemester(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900 cursor-pointer"
                  >
                    <option value="1">1ኛ ሴሚስተር</option>
                    <option value="2">2ኛ ሴሚስተር</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingCourseTarget ? 'ለውጦችን መዝግብ' : 'ኮርሱን መዝግብ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Consolidated Graduation Transcript Modal */}
      {selectedTranscriptStudent && (
        <GraduationTranscriptModal
          student={selectedTranscriptStudent}
          allCourses={courses}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          churchLogo={churchLogo}
          officialConfig={officialConfig}
          onClose={() => setSelectedTranscriptStudent(null)}
        />
      )}

      {/* Course Grade Report PDF Modal for Diploma Graduates Course */}
      {isPdfGradeReportOpen && selectedGradCourse && (
        <CourseGradeReportPdfModal
          course={selectedGradCourse}
          students={diploma2018Students}
          grades={localGradingGrades}
          currentYear={gradingYear}
          currentSemester={gradingSemester}
          churchLogo={churchLogo}
          officialConfig={officialConfig}
          onClose={() => setIsPdfGradeReportOpen(false)}
        />
      )}

      {/* Excel Upload Modal for Diploma Graduates Course */}
      {isExcelUploadOpen && selectedGradCourse && (
        <ExcelUploadModal
          course={selectedGradCourse}
          students={diploma2018Students}
          currentYear={gradingYear}
          currentSemester={gradingSemester}
          onApplyGrades={handleApplyExcelGrades}
          onClose={() => setIsExcelUploadOpen(false)}
          showNotify={showNotify}
        />
      )}
    </div>
  );
};
