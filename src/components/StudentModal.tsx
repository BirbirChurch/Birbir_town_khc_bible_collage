import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { ProgramType, Student } from '../types.ts';

interface StudentModalProps {
  existingUids: string[];
  onClose: () => void;
  onSave: (student: Student) => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  existingUids,
  onClose,
  onSave,
  showNotify
}) => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'ወንድ' | 'ሴት'>('ወንድ');
  const [program, setProgram] = useState<ProgramType>('Degree');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = id.trim();
    const cleanName = name.trim();

    if (!cleanId || !cleanName) {
      showNotify('እባክዎ ሙሉ መረጃዎችን ያስገቡ!', 'error');
      return;
    }

    const uid = `${program === 'Degree' ? 'deg' : 'dip'}_${cleanId}`;

    if (existingUids.includes(uid)) {
      showNotify(`ይህ የተማሪ መለያ ቁጥር (${cleanId}) በ${program} ፕሮግራም አስቀድሞ ተመዝግቧል!`, 'error');
      return;
    }

    onSave({
      uid,
      id: cleanId,
      name: cleanName,
      gender,
      program
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-emerald-950 text-white p-4.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">አዲስ ተማሪ መመዝገቢያ (Register Student)</h3>
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
            <label className="block font-bold text-slate-700 mb-1">የመለያ ኮድ (Student ID No)</label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="ምሳሌ: 201936"
              required
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">የተማሪው ሙሉ ስም</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="የአባት ስም ጨምሮ..."
              required
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ጾታ</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-semibold focus:ring-2 focus:ring-emerald-700"
            >
              <option value="ወንድ">ወንድ</option>
              <option value="ሴት">ሴት</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
            >
              ሰርዝ
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
            >
              መዝግብ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
