'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'teacher'>('student');

  // Student Form
  const [classCode, setClassCode] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('girl');
  const [isStudentLoading, setIsStudentLoading] = useState(false);

  // Teacher Form
  const [teacherName, setTeacherName] = useState('');
  const [className, setClassName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  // Created Class Modal
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // Load saved teacher settings from localStorage
    const savedApiKey = localStorage.getItem('direct_gemini_api_key');
    const savedTeacherName = localStorage.getItem('direct_teacher_name');
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedTeacherName) setTeacherName(savedTeacherName);
  }, []);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCode.trim() || !studentNumber.trim() || !name.trim()) return;

    setIsStudentLoading(true);
    try {
      const codeUpper = classCode.trim().toUpperCase();
      const classRef = doc(db, 'direct_classes', codeUpper);
      const classSnap = await getDoc(classRef);

      if (!classSnap.exists()) {
        alert('존재하지 않는 수업 코드입니다. 코드를 다시 확인해 주세요.');
        setIsStudentLoading(false);
        return;
      }

      // Save student profile
      localStorage.setItem('direct_student_name', name.trim());
      localStorage.setItem('direct_student_number', studentNumber.trim());

      router.push(`/chat?code=${codeUpper}&number=${encodeURIComponent(studentNumber.trim())}&name=${encodeURIComponent(name.trim())}&gender=${gender}`);
    } catch (err: any) {
      console.error(err);
      alert('수업 확인 중 오류가 발생했습니다: ' + (err.message || ''));
      setIsStudentLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !className.trim() || !apiKey.trim()) {
      alert('선생님 성함, 수업 이름, Gemini API 키를 모두 입력해 주세요.');
      return;
    }

    setIsCreatingClass(true);
    try {
      // Save API key & name to localStorage for next time (딸깍)
      localStorage.setItem('direct_gemini_api_key', apiKey.trim());
      localStorage.setItem('direct_teacher_name', teacherName.trim());

      // Generate random 6-character code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Save class in Firestore
      await setDoc(doc(db, 'direct_classes', code), {
        code,
        className: className.trim(),
        teacherName: teacherName.trim(),
        apiKey: apiKey.trim(),
        createdAt: serverTimestamp(),
      });

      setCreatedCode(code);
    } catch (err: any) {
      console.error('Class creation error:', err);
      alert('수업 개설 중 오류가 발생했습니다: ' + (err.message || ''));
    } finally {
      setIsCreatingClass(false);
    }
  };

  const shareUrl = typeof window !== 'undefined' && createdCode
    ? `${window.location.origin}/chat?code=${createdCode}`
    : '';

  const copyShareUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
            간편 수업 플랫폼
          </span>
          <h1 style={{ fontSize: '1.8rem', marginTop: '0.6rem', marginBottom: '0.4rem', color: 'var(--primary)', fontWeight: 800 }}>
            꿈통 시그널: 남북 딜레마 협상
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            중학생을 위한 진로 및 통일 도덕 토론 시뮬레이션
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.8rem' }}>
          <button
            type="button"
            className="glass-button"
            style={{
              flex: 1,
              background: role === 'student' ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
              color: role === 'student' ? '#fff' : 'var(--text-main)',
              border: role === 'student' ? 'none' : '1px solid var(--surface-glass-border)',
              padding: '10px 16px',
            }}
            onClick={() => setRole('student')}
          >
            👨‍🎓 학생 입장
          </button>
          <button
            type="button"
            className="glass-button"
            style={{
              flex: 1,
              background: role === 'teacher' ? 'var(--primary)' : 'rgba(255,255,255,0.6)',
              color: role === 'teacher' ? '#fff' : 'var(--text-main)',
              border: role === 'teacher' ? 'none' : '1px solid var(--surface-glass-border)',
              padding: '10px 16px',
            }}
            onClick={() => setRole('teacher')}
          >
            👩‍🏫 교사 수업 개설
          </button>
        </div>

        {role === 'student' ? (
          /* Student Form */
          <form onSubmit={handleStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                수업 코드 (6자리)
              </label>
              <input
                className="glass-input"
                placeholder="선생님이 알려주신 6자리 코드 (예: K8D9F2)"
                required
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  학번
                </label>
                <input
                  className="glass-input"
                  placeholder="예: 30105"
                  required
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                />
              </div>
              <div style={{ flex: 1.2 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  이름
                </label>
                <input
                  className="glass-input"
                  placeholder="예: 홍길동"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                학생 아바타 선택
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ flex: 1, padding: '10px', borderRadius: '8px', border: gender === 'girl' ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)', background: gender === 'girl' ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="gender" value="girl" checked={gender === 'girl'} onChange={(e) => setGender(e.target.value)} style={{ display: 'none' }} />
                  <span>👩‍🎓 여학생</span>
                </label>
                <label style={{ flex: 1, padding: '10px', borderRadius: '8px', border: gender === 'boy' ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)', background: gender === 'boy' ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="gender" value="boy" checked={gender === 'boy'} onChange={(e) => setGender(e.target.value)} style={{ display: 'none' }} />
                  <span>👨‍🎓 남학생</span>
                </label>
              </div>
            </div>

            <button className="glass-button" type="submit" disabled={isStudentLoading} style={{ marginTop: '0.5rem' }}>
              {isStudentLoading ? '입장 확인 중...' : '토론 시작하기 🚀'}
            </button>
          </form>
        ) : (
          /* Teacher Form */
          <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(37, 99, 235, 0.05)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.15)', fontSize: '0.85rem', color: 'var(--text-main)' }}>
              💡 <strong>회원가입 없이 즉시 사용:</strong> 성함과 수업명, 그리고 선생님의 무료 Gemini API 키만 넣으시면 1초 만에 수업이 개설됩니다!
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                선생님 성함
              </label>
              <input
                className="glass-input"
                placeholder="예: 김강렬 선생님"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                수업 이름
              </label>
              <input
                className="glass-input"
                placeholder="예: 3학년 2반 도덕 (남북 협상)"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  선생님 Gemini API 키
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'underline' }}
                >
                  무료 키 발급받기 ➔
                </a>
              </div>
              <input
                className="glass-input"
                type="password"
                placeholder="AIzaSy... (브라우저에 안전하게 저장됩니다)"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                * 입력하신 키는 다음 접속 시 자동으로 채워져 다시 입력할 필요가 없습니다.
              </span>
            </div>

            <button className="glass-button" type="submit" disabled={isCreatingClass} style={{ marginTop: '0.5rem', background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
              {isCreatingClass ? '수업 개설 중...' : '✨ 수업 개설하기 (딸깍)'}
            </button>
          </form>
        )}
      </div>

      {/* Class Created Modal */}
      {createdCode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', maxWidth: '480px', width: '100%', textAlign: 'center', background: '#fff' }}>
            <span style={{ fontSize: '2.5rem' }}>🎉</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.5rem', marginBottom: '0.3rem' }}>
              수업이 성공적으로 개설되었습니다!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              학생들에게 아래 수업 코드나 QR코드를 보여주세요.
            </p>

            <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '2px dashed #cbd5e1', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>수업 코드</div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '4px', color: '#1e293b' }}>
                {createdCode}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ padding: '12px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <QRCodeSVG value={shareUrl} size={160} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button
                className="glass-button"
                onClick={copyShareUrl}
                style={{ background: copiedLink ? '#10b981' : 'rgba(37, 99, 235, 0.1)', color: copiedLink ? '#fff' : 'var(--primary)', border: '1px solid var(--primary)', padding: '10px' }}
              >
                {copiedLink ? '✓ 초대 링크가 복사되었습니다!' : '📋 학생 초대 링크 복사하기'}
              </button>

              <button
                className="glass-button"
                onClick={() => router.push(`/monitor/${createdCode}`)}
                style={{ padding: '12px', fontWeight: 700 }}
              >
                교탁 모니터링 화면으로 이동 ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
