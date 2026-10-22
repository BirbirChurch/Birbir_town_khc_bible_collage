import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Course, GradeBreakdown, Student } from '../types.ts';
import { getCourseAssessmentItems } from '../utils/gradeCalculations.ts';
import {
  parseExcelGradesFile,
  downloadCourseGradeTemplateExcel,
  ParseExcelResult
} from '../utils/excelUtils.ts';

interface ExcelUploadModalProps {
  course: Course;
  students: Student[];
  currentYear: string;
  currentSemester: string;
  onApplyGrades: (updatedScoresByUid: Record<string, Record<string, number>>) => void;
  onClose: () => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  course,
  students,
  currentYear,
  currentSemester,
  onApplyGrades,
  onClose,
  showNotify
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const criteria = getCourseAssessmentItems(course);
  const enrolled = students.filter((s) => s.program === course.program);

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);

    try {
      const result = await parseExcelGradesFile(file, course, students);
      setParseResult(result);
      if (result.success) {
        showNotify(
          `ኤክሴል ተፈትሾ ${result.matchedStudentsCount} ተማሪዎች በስኬት ተገኝተዋል!`,
          'success'
        );
      } else {
        showNotify(
          result.errors[0] || 'በፋይሉ ውስጥ የሚመሳሰል የተማሪ መረጃ አልተገኘም!',
          'error'
        );
      }
    } catch (err: any) {
      showNotify(err?.message || 'ፋይሉን ማንበብ አልተቻለም!', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || !parseResult.success) return;

    const scoresByUid: Record<string, Record<string, number>> = {};

    parseResult.rows.forEach((row) => {
      if (row.isValid && row.studentUid) {
        scoresByUid[row.studentUid] = row.scores;
      }
    });

    onApplyGrades(scoresByUid);
    showNotify(
      `የ${parseResult.matchedStudentsCount} ተማሪዎች ውጤት ከኤክሴል በስኬት ተጭኗል! ለውጦቹን ለማጽደቅ «ለውጦችን መዝግብ» የሚለውን ይጫኑ።`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/60 rounded-xl shadow-inner text-amber-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>የተማሪዎች ውጤት ከኤክሴል (Excel / CSV) መጫኛ</span>
              </h3>
              <p className="text-xs text-emerald-200">
                ኮርስ: <span className="font-bold text-amber-300">{course.name}</span> ({course.program}) | መምህር: {course.teacher} | 🇪🇹 {currentYear} ዓ.ም ({currentSemester}ኛ ሴሚስተር - ኢ.ዘ.አ)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="ዝጋ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Quick Guide & Download Template banner */}
          <div className="bg-gradient-to-r from-amber-50 to-emerald-50/40 p-4 rounded-2xl border border-amber-300/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>ትክክለኛውን የውጤት ፎርማት ለመጠቀም፦</span>
              </h4>
              <p className="text-[11px] text-slate-600">
                የተማሪዎችን ስም ዝርዝርና የመመዘኛ አምዶችን ያካተተ የተዘጋጀ አብነት አውርደው ውጤቱን ሞልተው ይጫኑ።
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                downloadCourseGradeTemplateExcel(course, students);
                showNotify('የኤክሴል አብነት ሰነድ ወርዷል!', 'success');
              }}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-emerald-900 border border-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>የኤክሴል አብነት አውርድ (.xlsx)</span>
            </button>
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
              dragActive
                ? 'border-emerald-600 bg-emerald-50/60 scale-[0.99]'
                : selectedFile
                ? 'border-emerald-500 bg-emerald-50/20'
                : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                {selectedFile ? selectedFile.name : 'የኤክሴል ወይም የCSV ፋይል ይምረጡ ወይም እዚህ ይጎትቱ'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                የሚደገፉ ቅርጸቶች: .xlsx, .xls, .csv (የማይክሮሶፍት ኤክሴል ፋይሎች)
              </p>
            </div>

            {selectedFile && (
              <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                መጠን: {(selectedFile.size / 1024).toFixed(1)} KB ✓
              </span>
            )}
          </div>

          {/* Loading status */}
          {isParsing && (
            <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-600 animate-pulse">
              የኤክሴል ሰነዱ እየተነበበና እየተፈተሸ ነው... እባክዎ ይጠብቁ
            </div>
          )}

          {/* Parse Result Summary & Preview Table */}
          {parseResult && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`p-1.5 rounded-xl ${
                      parseResult.success
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {parseResult.success ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">
                      የተፈተሹ ተማሪዎች: {parseResult.matchedStudentsCount} / {enrolled.length}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-2">
                      (በሰነዱ ውስጥ ያሉ ጠቅላላ ረድፎች: {parseResult.totalRows})
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                    parseResult.matchedStudentsCount === enrolled.length
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : parseResult.matchedStudentsCount > 0
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-rose-50 text-rose-900 border-rose-300'
                  }`}
                >
                  {parseResult.matchedStudentsCount === enrolled.length
                    ? 'ሁሉም ተማሪዎች ተዛምደዋል ✓'
                    : `${parseResult.matchedStudentsCount} ተማሪዎች ተገኝተዋል`}
                </span>
              </div>

              {parseResult.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>ማስታወሻ፦</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {parseResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Rows Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 sticky top-0 text-[10px] font-bold uppercase text-slate-600">
                    <tr>
                      <th className="p-2">ID</th>
                      <th className="p-2">የተማሪ ስም</th>
                      {criteria.map((c) => (
                        <th key={c.id} className="p-2 text-center">
                          {c.label} ({c.max}%)
                        </th>
                      ))}
                      <th className="p-2 text-center bg-emerald-50 text-emerald-900 font-black">
                        ድምር
                      </th>
                      <th className="p-2 text-center">ሁኔታ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseResult.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.isValid
                            ? 'hover:bg-slate-50'
                            : 'bg-rose-50/50 text-rose-900'
                        }
                      >
                        <td className="p-2 font-mono font-bold">{row.studentId}</td>
                        <td className="p-2 font-medium">{row.studentName}</td>
                        {criteria.map((c) => (
                          <td key={c.id} className="p-2 text-center font-mono">
                            {row.isValid ? (row.scores[c.id] ?? 0) : '—'}
                          </td>
                        ))}
                        <td className="p-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          {row.isValid ? row.totalScore : '—'}
                        </td>
                        <td className="p-2 text-center">
                          {row.isValid ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ተዛምዷል ✓
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                              {row.notes || 'ያልተዛመደ'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[11px] text-slate-500">
            ማሳሰቢያ፦ ኤክሴሉን ሲጭኑ ነባር ያልተቀየሩ ውጤቶች አይጠፉም፤ አዳዲሶቹ ይተካሉ።
          </p>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ተመለስ
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parseResult || !parseResult.success}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${
                !parseResult || !parseResult.success
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
              }`}
            >
              <span>ውጤቶችን መዝግብና ተግብር</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
