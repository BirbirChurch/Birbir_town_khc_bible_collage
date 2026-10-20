import * as XLSX from 'xlsx';
import { Course, GradeBreakdown, Student } from '../types.ts';
import {
  getCourseAssessmentItems,
  getCriterionScore,
  getEffectiveGradeValues,
  getGradeKey
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
      `የትምህርት ዓይነት: ${course.name}`,
      `ፕሮግራም: ${course.program}`,
      `መምህር: ${course.teacher}`,
      `ክሬዲት: ${course.credits}`
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
    const key = getGradeKey(student.uid, course.id, currentYear, currentSemester);
    const g = grades[key] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
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
