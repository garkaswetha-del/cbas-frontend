import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getAPI } from '../utils/api';
const API = getAPI();

const NCERT_GRADES = ['Grade 8', 'Grade 9', 'Grade 10'];
const SUBJECTS = ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Sanskrit', 'Computer Science'];

interface Props { user: any; }

export default function NcertLibraryPage({ user }: Props) {
  const [grade, setGrade] = useState('Grade 8');
  const [subject, setSubject] = useState('Science');
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [chapterNumber, setChapterNumber] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchChapters(); }, [grade, subject]);

  async function fetchChapters() {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/lesson-plans/ncert/chapters`, { params: { grade, subject } });
      setChapters(r.data);
    } finally { setLoading(false); }
  }

  async function upload() {
    if (!file || !chapterNumber || !chapterName) {
      alert('Fill in Chapter Number, Chapter Name, and select a PDF file.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('grade', grade);
      fd.append('subject', subject);
      fd.append('chapter_number', chapterNumber);
      fd.append('chapter_name', chapterName);
      fd.append('uploaded_by', user.id);
      await axios.post(`${API}/lesson-plans/ncert/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setChapterNumber('');
      setChapterName('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await fetchChapters();
    } catch (e: any) {
      alert('Upload failed: ' + (e.response?.data?.message || e.message));
    } finally { setUploading(false); }
  }

  async function deleteChapter(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will remove the chapter content and may affect lesson plan generation.`)) return;
    await axios.delete(`${API}/lesson-plans/ncert/${id}`);
    await fetchChapters();
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div>
        <h2 className="font-bold text-gray-800">NCERT Curriculum Library</h2>
        <p className="text-xs text-gray-500 mt-0.5">Upload NCERT chapter PDFs for Grade 8–10. The AI uses this content to generate lesson plans.</p>
      </div>

      {/* Grade + Subject selectors */}
      <div className="flex gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Grade</label>
          <div className="flex gap-2">
            {NCERT_GRADES.map(g => (
              <button key={g} onClick={() => setGrade(g)}
                className={`px-3 py-1.5 rounded text-xs border ${grade === g ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Subject</label>
          <select className="border rounded px-2 py-1.5 text-xs" value={subject} onChange={e => setSubject(e.target.value)}>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Upload form */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-semibold text-blue-700">Upload Chapter PDF</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-gray-600 mb-1">Chapter Number</label>
            <input type="number" className="w-full border rounded px-2 py-1" min={1} max={50}
              value={chapterNumber} onChange={e => setChapterNumber(e.target.value)} placeholder="e.g. 1" />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Chapter Name</label>
            <input className="w-full border rounded px-2 py-1"
              value={chapterName} onChange={e => setChapterName(e.target.value)} placeholder="e.g. Motion" />
          </div>
          <div className="col-span-2">
            <label className="block text-gray-600 mb-1">PDF File</label>
            <input ref={fileRef} type="file" accept=".pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs border rounded px-2 py-1 bg-white" />
            <p className="text-gray-400 mt-0.5">Upload the PDF for this specific chapter only. One PDF per chapter.</p>
          </div>
        </div>
        <button onClick={upload} disabled={uploading}
          className="px-4 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
          {uploading ? (
            <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> Extracting & Uploading…</span>
          ) : 'Upload Chapter'}
        </button>
        {uploading && <p className="text-xs text-blue-600">Extracting text from PDF… this may take a moment for large files.</p>}
      </div>

      {/* Chapter list */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 mb-2">
          {grade} · {subject} — {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} uploaded
        </h3>
        {loading ? (
          <p className="text-xs text-gray-400">Loading…</p>
        ) : chapters.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-xs text-gray-400">
            No chapters uploaded yet for {grade} {subject}.<br />Upload PDFs above to enable AI lesson plan generation.
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 text-xs">
                <div>
                  <span className="font-medium text-gray-800">Chapter {c.chapter_number}: {c.chapter_name}</span>
                  <span className="text-gray-400 ml-3">Uploaded by {c.uploaded_by || 'admin'} · {new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <button onClick={() => deleteChapter(c.id, c.chapter_name)}
                  className="text-red-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 space-y-1">
        <p className="font-semibold">Tips for best AI results:</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-600">
          <li>Upload one PDF per chapter (not the full textbook)</li>
          <li>NCERT digital PDFs from ncert.nic.in work best — avoid scanned images</li>
          <li>The AI reads up to 30,000 characters — enough for a full NCERT chapter</li>
          <li>Chapter names must match what teachers select in the lesson plan form</li>
        </ul>
      </div>
    </div>
  );
}
