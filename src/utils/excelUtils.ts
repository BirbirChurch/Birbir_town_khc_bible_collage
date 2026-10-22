import * as XLSX from 'xlsx';
import { Course, GradeBreakdown, Student } from '../types.ts';
import {
  calculateStudentGPA,
  getCourseAssessmentItems,
  getCriterionScore,
  getEffectiveGradeValues,
  getGradeKey,
  resolveGradeBreakdown
} from './gradeCalculations.ts';

export interface ParsedGradeRow {
  studentUid: string;
  studentId: string;
  studentName: string;
  scores: Record<string, number>;
  totalScore?: number;
  isValid: boolean;
  notes?: string;
}

export interface ParseExcelResult {
  success: boolean;
  courseId: string;
  totalRows: number;
  matchedStudentsCount: number;
  rows: ParsedGradeRow[];
  warnings: string[];
  errors: string[];
}

/**
 * Clean and normalize a header string for matching
 */
function normalizeHeader(str: any): string {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[\s\-_()%]/g, '');
}

/**
 * Export course grades to a formatted Microsoft Excel (.xlsx) file
 */
export function exportCourseGradesToExcel(
  course: Course,
  students: Student[],
  grades: Record<string, GradeBreakdown>,
  currentYear: string,
  currentSemester: string
) {
  const enrolled = students.filter((s) => s.program === course.program);
  const criteria = getCourseAssessmentItems(course);
  const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);

  // Metadata rows
  const rows: any[][] = [
    ['የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት'],
    ['ይፋዊ የኮርስ ውጤት ሰነድ (Official Course Grade Sheet)'],
    [
      `የትምህርት ዓይነት: ${course.code ? `[${course.code}] ` : ''}${course.name}`,
      `ፕሮግራም: ${course.program}`,
      `መምህር: ${course.teacher}`,
      `የትምህርቱ ጊዜ / ክሬዲት: ${course.credits} ክሬዲት ሰዓት`
    ],

    [
      `የትምህርት ዘመን: ${currentYear} ዓ.ም`,
      `ሴሚስተር: ${currentSemester}ኛ ሴሚስተር`,
      `የተማሪዎች ብዛት: ${enrolled.length}`,
      `ቀን: ${new Date().toLocaleDateString('en-GB')}`
    ],
    [] // blank line
  ];

  // Table headers
  const headerRow = [
    'ተ.ቁ',
    'መለያ ቁጥር (ID)',
    'የተማሪ ሙሉ ስም',
    'ጾታ'
  ];

  criteria.forEach((it) => {
    headerRow.push(`${it.label} (${it.max}%)`);
  });

  headerRow.push(`ጠቅላላ ድምር (${totalWeight}%)`, 'የውጤት ፊደል', 'ነጥብ (Points)', 'አስተያየት');
  rows.push(headerRow);

  // Data rows
  let totalScoreSum = 0;
  let gradedCount = 0;

  enrolled.forEach((student, idx) => {
    const g = resolveGradeBreakdown(grades, student.uid, course.id, currentYear, currentSemester, student.id);
    const eff = getEffectiveGradeValues(g, criteria);

    if (eff.hasAny) {
      totalScoreSum += eff.total;
      gradedCount++;
    }

    const row: any[] = [
      idx + 1,
      student.id,
      student.name,
      student.gender || '—'
    ];

    criteria.forEach((it, itemIdx) => {
      const score = getCriterionScore(g, it.id, itemIdx);
      row.push(score > 0 ? score : (eff.hasAny ? 0 : ''));
    });

    row.push(
      eff.hasAny ? eff.total : '',
      eff.hasAny ? eff.letter : '',
      eff.hasAny ? eff.points.toFixed(2) : '',
      eff.hasAny ? (eff.points >= 2.0 ? 'አልፏል' : 'ደካማ/ወድቋል') : 'ውጤት አልገባም'
    );

    rows.push(row);
  });

  // Summary statistics row
  rows.push([]);
  const classAvg = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : '0.0';
  rows.push([
    'ማጠቃለያ',
    `ተፈታኝ ተማሪዎች: ${gradedCount} / ${enrolled.length}`,
    `የክፍሉ አማካይ ውጤት (Class Average): ${classAvg}%`,
    '',
    ...criteria.map(() => ''),
    '',
    '',
    '',
    ''
  ]);

  // Create worksheet and workbook
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  const colWidths = [
    { wch: 8 },  // ተ.ቁ
    { wch: 18 }, // መለያ ቁጥር
    { wch: 28 }, // ስም
    { wch: 10 }  // ጾታ
  ];
  criteria.forEach(() => colWidths.push({ wch: 18 }));
  colWidths.push({ wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 20 });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ውጤት');

  // Trigger download
  const cleanCourseName = course.name.replace(/[\/\\?%*:|"<>]/g, '_');
  const filename = `ውጤት_${cleanCourseName}_${course.program}_${currentYear}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export comprehensive multi-program master grade sheet to Excel (.xlsx)
 * Contains all courses, student details, semester GPA, and statistics.
 */
export function exportMasterGradesToExcel(
  students: Student[],
  courses: Course[],
  grades: Record<string, GradeBreakdown>,
  currentYear: string,
  currentSemester: string
) {
  const wb = XLSX.utils.book_new();

  // Helper to build a program or overall sheet
  const buildSheet = (studentList: Student[], title: string) => {
    const rows: any[][] = [
      ['የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት'],
      [`የተማሪዎች አጠቃላይ የውጤት መዝገብ — ${title} (Master Grade Sheet)`],
      [
        `የትምህርት ዘመን: ${currentYear} ዓ.ም (እንደ ኢትዮጵያ ዘመን አቆጣጠር)`,
        `ሴሚስተር: ${currentSemester}ኛ ሴሚስተር`,
        `ጠቅላላ ተማሪዎች: ${studentList.length}`,
        `የወጣበት ቀን: ${new Date().toLocaleDateString('en-GB')}`
      ],
      []
    ];

    // Relevant courses for this student group
    const relevantCourses = courses.filter((c) =>
      studentList.some((s) => s.program === c.program)
    );

    const header = [
      'ተ.ቁ',
      'መለያ ቁጥር (ID)',
      'የተማሪ ሙሉ ስም',
      'ጾታ',
      'ፕሮግራም',
      'የትምህርት ደረጃ / ዓመት'
    ];

    relevantCourses.forEach((c) => {
      header.push(`${c.name} (${c.credits}Cr)`);
    });

    header.push('ጠቅላላ ክሬዲት', 'ጠቅላላ ነጥብ (Points)', 'የሴሚስተር GPA', 'ደረጃ / ማዕረግ');
    rows.push(header);

    studentList.forEach((s, idx) => {
      let totalCreds = 0;
      let totalPts = 0;

      const row: any[] = [
        idx + 1,
        s.id,
        s.name,
        s.gender || '—',
        s.program,
        s.currentStudyYear ? `${s.currentStudyYear}ኛ ዓመት` : '1ኛ ዓመት'
      ];

      relevantCourses.forEach((c) => {
        if (c.program === s.program) {
          const g = resolveGradeBreakdown(grades, s.uid, c.id, currentYear, currentSemester, s.id);
          const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));
          if (eff.hasAny) {
            totalCreds += c.credits;
            totalPts += eff.points * c.credits;
            row.push(`${eff.total} (${eff.letter})`);
          } else {
            row.push('—');
          }
        } else {
          row.push('N/A');
        }
      });

      const gpa = totalCreds > 0 ? (totalPts / totalCreds).toFixed(2) : '0.00';
      const numGpa = Number(gpa);
      const standing = numGpa >= 3.8 ? 'በጣም ከፍተኛ ማዕረግ' : numGpa >= 3.5 ? 'ከፍተኛ ማዕረግ' : numGpa >= 2.0 ? 'አልፏል' : 'ዝቅተኛ';

      row.push(totalCreds, totalPts.toFixed(2), gpa, standing);
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const colWidths = [
      { wch: 6 },
      { wch: 16 },
      { wch: 28 },
      { wch: 8 },
      { wch: 12 },
      { wch: 16 }
    ];
    relevantCourses.forEach(() => colWidths.push({ wch: 20 }));
    colWidths.push({ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 20 });
    ws['!cols'] = colWidths;
    return ws;
  };

  // Sheet 1: Master All Students
  const wsAll = buildSheet(students, 'ጠቅላላ ተማሪዎች');
  XLSX.utils.book_append_sheet(wb, wsAll, 'አጠቃላይ_ውጤት');

  // Sheet 2: Degree Program
  const degreeStudents = students.filter((s) => s.program === 'Degree');
  if (degreeStudents.length > 0) {
    const wsDegree = buildSheet(degreeStudents, 'የድግሪ ፕሮግራም');
    XLSX.utils.book_append_sheet(wb, wsDegree, 'ድግሪ_ተማሪዎች');
  }

  // Sheet 3: Diploma Program
  const diplomaStudents = students.filter((s) => s.program === 'Diploma');
  if (diplomaStudents.length > 0) {
    const wsDiploma = buildSheet(diplomaStudents, 'የዲፕሎማ ፕሮግራም');
    XLSX.utils.book_append_sheet(wb, wsDiploma, 'ዲፕሎማ_ተማሪዎች');
  }

  const filename = `አጠቃላይ_የተማሪዎች_ውጤት_መዝገብ_${currentYear}_${currentSemester}ኛ_ሴሚስተር.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Generate a pre-filled Excel template (.xlsx) for this course
 * with student IDs and names pre-populated so teachers/admins just fill in scores!
 */
export function downloadCourseGradeTemplateExcel(
  course: Course,
  students: Student[]
) {
  const enrolled = students.filter((s) => s.program === course.program);
  const criteria = getCourseAssessmentItems(course);

  const rows: any[][] = [
    ['የውጤት ማስገቢያ አብነት (Grade Entry Template)'],
    [`ኮርስ: ${course.name} (${course.program}) | መምህር: ${course.teacher}`],
    ['መመሪያ፡ መለያ ቁጥር (ID) እና የተማሪ ስም እንዳይቀይሩ። በእያንዳንዱ መመዘኛ ስር ብቻ የቁጥር ውጤት ይሙሉ!'],
    []
  ];

  // Header row
  const headerRow = ['መለያ ቁጥር (ID)', 'የተማሪ ስም'];
  criteria.forEach((it) => {
    headerRow.push(`${it.label} (ከ ${it.max}%)`);
  });
  headerRow.push('አስተያየት');
  rows.push(headerRow);

  // Enrolled student rows
  enrolled.forEach((student) => {
    const row: any[] = [student.id, student.name];
    criteria.forEach(() => row.push('')); // blank for teacher to fill
    row.push('');
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    ...criteria.map(() => ({ wch: 20 })),
    { wch: 22 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'የውጤት_አብነት');

  const cleanCourseName = course.name.replace(/[\/\\?%*:|"<>]/g, '_');
  const filename = `የውጤት_አብነት_${cleanCourseName}_${course.program}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Parse an uploaded Excel (.xlsx, .xls) or CSV file
 */
export async function parseExcelGradesFile(
  file: File,
  course: Course,
  students: Student[]
): Promise<ParseExcelResult> {
  const enrolled = students.filter((s) => s.program === course.program);
  const criteria = getCourseAssessmentItems(course);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve({
            success: false,
            courseId: course.id,
            totalRows: 0,
            matchedStudentsCount: 0,
            rows: [],
            warnings: [],
            errors: ['የተመረጠው ኤክሴል ፋይል ምንም ሉህ (Sheet) የለውም!']
          });
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawRows || rawRows.length === 0) {
          resolve({
            success: false,
            courseId: course.id,
            totalRows: 0,
            matchedStudentsCount: 0,
            rows: [],
            warnings: [],
            errors: ['የኤክሴል ሰነዱ ባዶ ነው!']
          });
          return;
        }

        // Find the header row containing "ID" or "መለያ" or student names
        let headerRowIndex = -1;
        let idColIndex = -1;
        let nameColIndex = -1;

        for (let r = 0; r < Math.min(10, rawRows.length); r++) {
          const row = rawRows[r];
          for (let c = 0; c < row.length; c++) {
            const cellVal = normalizeHeader(row[c]);
            if (cellVal.includes('id') || cellVal.includes('መለያ') || cellVal.includes('studentid') || cellVal.includes('ቁጥር')) {
              if (idColIndex === -1) idColIndex = c;
            }
            if (cellVal.includes('ስም') || cellVal.includes('name') || cellVal.includes('ተማሪ')) {
              if (nameColIndex === -1) nameColIndex = c;
            }
          }
          if (idColIndex !== -1 || nameColIndex !== -1) {
            headerRowIndex = r;
            break;
          }
        }

        if (headerRowIndex === -1) {
          // Default to first row
          headerRowIndex = 0;
          idColIndex = 0;
          nameColIndex = 1;
        }

        const headerRow = rawRows[headerRowIndex];

        // Map criteria columns
        // Match by label name, or by criterion index
        const criterionColMap: Record<string, number> = {};
        const warnings: string[] = [];

        criteria.forEach((crit, critIdx) => {
          const critNorm = normalizeHeader(crit.label);
          let matchedCol = -1;

          // 1. Try finding column by label
          for (let c = 0; c < headerRow.length; c++) {
            if (c === idColIndex || c === nameColIndex) continue;
            const hNorm = normalizeHeader(headerRow[c]);
            if (hNorm && (hNorm.includes(critNorm) || critNorm.includes(hNorm))) {
              matchedCol = c;
              break;
            }
          }

          // 2. Try common keywords (ክፍል1, ክፍል2, ሚድ, ፋይናል, ተሳትፎ, አሳይመንት, ፕሮጀክት)
          if (matchedCol === -1) {
            for (let c = 0; c < headerRow.length; c++) {
              if (c === idColIndex || c === nameColIndex) continue;
              const hNorm = normalizeHeader(headerRow[c]);
              if (critIdx === 0 && (hNorm.includes('ክፍል1') || hNorm.includes('p1') || hNorm.includes('part1'))) matchedCol = c;
              else if (critIdx === 1 && (hNorm.includes('ክፍል2') || hNorm.includes('p2') || hNorm.includes('part2'))) matchedCol = c;
              else if (crit.label.includes('ሚድ') && (hNorm.includes('mid') || hNorm.includes('ሚድ'))) matchedCol = c;
              else if (crit.label.includes('ፋይናል') && (hNorm.includes('final') || hNorm.includes('ፋይናል'))) matchedCol = c;
              else if (crit.label.includes('ተሳትፎ') && (hNorm.includes('att') || hNorm.includes('ተሳትፎ'))) matchedCol = c;
              else if (crit.label.includes('አሳይመንት') && (hNorm.includes('assign') || hNorm.includes('አሳይመንት'))) matchedCol = c;
            }
          }

          // 3. Fallback to column position after Name
          if (matchedCol === -1) {
            const fallbackCol = (nameColIndex !== -1 ? nameColIndex : idColIndex) + 1 + critIdx;
            if (fallbackCol < headerRow.length) {
              matchedCol = fallbackCol;
              warnings.push(`መመዘኛ '${crit.label}' በስም አልተገኘም፤ በ${matchedCol + 1}ኛው አምድ ተገናኝቷል።`);
            }
          }

          if (matchedCol !== -1) {
            criterionColMap[crit.id] = matchedCol;
          }
        });

        // Parse student rows
        const parsedRows: ParsedGradeRow[] = [];
        let matchedCount = 0;

        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.every((c) => String(c).trim() === '')) continue; // skip blank rows

          const rawId = idColIndex !== -1 ? String(row[idColIndex]).trim() : '';
          const rawName = nameColIndex !== -1 ? String(row[nameColIndex]).trim() : '';

          if (!rawId && !rawName) continue;

          // Find student in enrolled students
          let matchedStudent = enrolled.find(
            (s) =>
              (rawId && s.id.toLowerCase() === rawId.toLowerCase()) ||
              (rawId && s.id.replace(/[\s\-_]/g, '').toLowerCase() === rawId.replace(/[\s\-_]/g, '').toLowerCase())
          );

          if (!matchedStudent && rawName) {
            matchedStudent = enrolled.find(
              (s) => s.name.trim().toLowerCase() === rawName.toLowerCase()
            );
          }

          if (matchedStudent) {
            matchedCount++;
            const scores: Record<string, number> = {};
            let rowTotal = 0;

            criteria.forEach((crit) => {
              const colIdx = criterionColMap[crit.id];
              let val = 0;
              if (colIdx !== undefined && colIdx < row.length) {
                const cellVal = String(row[colIdx]).trim();
                const num = parseFloat(cellVal);
                if (!isNaN(num)) {
                  val = Math.max(0, Math.min(crit.max, num));
                }
              }
              scores[crit.id] = val;
              rowTotal += val;
            });

            parsedRows.push({
              studentUid: matchedStudent.uid,
              studentId: matchedStudent.id,
              studentName: matchedStudent.name,
              scores,
              totalScore: rowTotal,
              isValid: true
            });
          } else {
            // Unmatched student
            parsedRows.push({
              studentUid: '',
              studentId: rawId || '—',
              studentName: rawName || 'ያልታወቀ ተማሪ',
              scores: {},
              isValid: false,
              notes: 'በዚህ ኮርስ ስም ዝርዝር ውስጥ ያልተገኘ'
            });
          }
        }

        resolve({
          success: matchedCount > 0,
          courseId: course.id,
          totalRows: parsedRows.length,
          matchedStudentsCount: matchedCount,
          rows: parsedRows,
          warnings,
          errors: matchedCount === 0 ? ['በኤክሴል ሰነዱ ውስጥ ምንም የሚመሳሰል የተማሪ መለያ ቁጥር (ID) አልተገኘም!'] : []
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('ፋይሉን ማንበብ አልተቻለም'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export comprehensive Master Semester Grade Sheet for all students across all courses
 */
export function exportMasterSemesterGradeSheetToExcel(
  students: Student[],
  courses: Course[],
  grades: Record<string, GradeBreakdown>,
  currentYear: string,
  currentSemester: string,
  programFilter: 'ALL' | 'Diploma' | 'Degree' = 'ALL'
) {
  const wb = XLSX.utils.book_new();

  const programsToExport = programFilter === 'ALL' ? ['Diploma', 'Degree'] : [programFilter];

  programsToExport.forEach((prog) => {
    const progStudents = students.filter((s) => s.program === prog);
    const progCourses = courses.filter((c) => c.program === prog);

    const sheetName = prog === 'Diploma' ? 'የዲፕሎማ ተማሪዎች' : 'የድግሪ ተማሪዎች';

    const rows: any[][] = [
      ['የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት'],
      [`ይፋዊ የተማሪዎች አጠቃላይ የሴሚስተር ውጤት ዝርዝር ሰነድ (${sheetName})`],
      [
        `የትምህርት ዘመን: ${currentYear} ዓ.ም`,
        `ሴሚስተር: ${currentSemester}ኛ ሴሚስተር`,
        `የተማሪዎች ብዛት: ${progStudents.length}`,
        `የኮርሶች ብዛት: ${progCourses.length}`,
        `የወጣበት ቀን: ${new Date().toLocaleDateString('en-GB')}`
      ],
      []
    ];

    // Header Row
    const headerRow = [
      'ተ.ቁ',
      'መለያ ቁጥር (ID)',
      'የተማሪ ሙሉ ስም',
      'ጾታ',
      'የትምህርት ዓመት'
    ];

    progCourses.forEach((c) => {
      headerRow.push(`${c.name} (${c.credits}cr)`);
    });

    headerRow.push('ጠቅላላ ክሬዲት', 'የሴሚስተር GPA', 'የትምህርት አቋም', 'የምረቃ ሁኔታ');
    rows.push(headerRow);

    // Student Data Rows
    let totalGpaSum = 0;
    let studentsWithGpa = 0;

    progStudents.forEach((student, idx) => {
      const gpaStr = calculateStudentGPA(student, courses, grades, currentYear, currentSemester);
      const gpaNum = parseFloat(gpaStr);
      if (!isNaN(gpaNum) && gpaNum > 0) {
        totalGpaSum += gpaNum;
        studentsWithGpa++;
      }

      const studyYearLabel = `${student.currentStudyYear || 1}ኛ ዓመት`;
      const isCandidate = student.graduationStatus === 'CANDIDATE' || student.admissionYear === '2018' || student.id.startsWith('2018');
      const isGraduated = student.graduationStatus === 'GRADUATED';
      const gradLabel = isGraduated ? 'የተመረቀ' : isCandidate ? 'ተማራቂ (2019)' : 'በመማር ላይ';

      const row: any[] = [
        idx + 1,
        student.id,
        student.name,
        student.gender || '—',
        studyYearLabel
      ];

      let studentTotalCredits = 0;

      progCourses.forEach((c) => {
        const g = resolveGradeBreakdown(grades, student.uid, c.id, currentYear, currentSemester, student.id);
        const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));
        if (eff.hasAny) {
          row.push(`${eff.total} (${eff.letter})`);
          studentTotalCredits += c.credits;
        } else {
          row.push('—');
        }
      });

      const standing = gpaNum >= 3.75 ? 'እጅግ ከፍተኛ ማዕረግ (Very Great Distinction)'
        : gpaNum >= 3.50 ? 'ከፍተኛ ማዕረግ (Great Distinction)'
        : gpaNum >= 3.25 ? 'ማዕረግ (Distinction)'
        : gpaNum >= 2.00 ? 'አልፏል (Pass)'
        : gpaNum > 0 ? 'ማስጠንቀቂያ (Warning)'
        : 'ውጤት አልተሞላም';

      row.push(
        studentTotalCredits,
        gpaStr,
        standing,
        gradLabel
      );

      rows.push(row);
    });

    // Summary row
    rows.push([]);
    const avgGpa = studentsWithGpa > 0 ? (totalGpaSum / studentsWithGpa).toFixed(2) : '0.00';
    rows.push([
      'አማካይ ማጠቃለያ',
      `ጠቅላላ ተማሪዎች: ${progStudents.length}`,
      `ውጤት የተሞላላቸው: ${studentsWithGpa}`,
      `የክፍሉ አማካይ GPA: ${avgGpa}`,
      ...progCourses.map(() => ''),
      '',
      '',
      '',
      ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    const colWidths = [
      { wch: 7 },
      { wch: 16 },
      { wch: 28 },
      { wch: 8 },
      { wch: 14 },
      ...progCourses.map(() => ({ wch: 20 })),
      { wch: 14 },
      { wch: 16 },
      { wch: 25 },
      { wch: 16 }
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const fileName = `የተማሪዎች_አጠቃላይ_ውጤት_${currentYear}_${currentSemester}ኛ_ሴሚስተር.xlsx`;
  XLSX.writeFile(wb, fileName);
}
