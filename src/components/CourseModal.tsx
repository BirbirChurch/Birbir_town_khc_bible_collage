import React, { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { Course, ProgramType } from '../types.ts';

interface CourseModalProps {
  course: Course | null;
  teachers: string[];
  onClose: () => void;
  onSave: (courseData: Omit<Course, 'id'> & { id?: string }) => void;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  course,
  teachers,
  onClose,
  onSave
}) => {
  const [program, setProgram] = useState<ProgramType>(course ? course.program : 'Degree');
  const [name, setName] = useState(course ? course.name : '');
  const [teacher, setTeacher] = useState(course ? course.teacher : teachers[0] || '');
  const [schedule, setSchedule] = useState(course ? course.schedule : '');
  const [credits, setCredits] = useState<number>(course ? course.credits : 3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: course ? course.id : undefined,
      program,
      name: name.trim(),
      teacher,
      schedule: schedule.trim(),
      credits: Number(credits) || 3
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-emerald-950 text-white p-4.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">
              {course ? 'የኮርስ መረጃ ማስተካከያ' : 'አዲስ ኮርስ መጨመሪያ'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">የትምህርት ፕሮግራም</label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value as ProgramType)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-semibold focus:ring-2 focus:ring-emerald-700"
            >
              <option value="Degree">ድግሪ (Degree Program)</option>
              <option value="Diploma">ዲፕሎማ (Diploma Program)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">የኮርስ ስም</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ምሳሌ: ሥነ-አፈታት (Hermeneutics)"
              required
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">የተመደበ መምህር</label>
            <select
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-medium focus:ring-2 focus:ring-emerald-700"
            >
              {teachers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">የትምህርት ቀን / ሰዓት</label>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="ምሳሌ: ሰኞ 2:00 - 4:00"
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">ክሬዲት ሰዓት (Credits)</label>
              <input
                type="number"
                min="1"
                max="6"
                value={credits}
                onChange={(e) => setCredits(parseInt(e.target.value) || 3)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold text-slate-700"
            >
              ሰርዝ
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs"
            >
              አስቀምጥ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
