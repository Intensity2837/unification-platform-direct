'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';

interface StudentData {
  id: string;
  studentNumber: string;
  name: string;
  gender: string;
  stage: number;
  status: string; // 'IN_PROGRESS' | 'COMPLETED'
  quizScore?: number | null;
  score?: number | null;
  grade?: string | null;
  summary?: string | null;
  messages?: { role: string; content: string }[];
  updatedAt?: any;
}

export default function MonitorPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [classInfo, setClassInfo] = useState<any>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // 1. Fetch Class info
    const fetchClass = async () => {
      const classRef = doc(db, 'direct_classes', code);
      const snap = await getDoc(classRef);
      if (snap.exists()) {
        setClassInfo(snap.data());
      } else {
        alert('존재하지 않는 수업 코드입니다.');
        router.push('/');
      }
    };
    fetchClass();

    // 2. Real-time listener for students
    const studentsRef = collection(db, 'direct_classes', code, 'students');
    const unsubscribe = onSnapshot(studentsRef, (snapshot) => {
      const list: StudentData[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as StudentData);
      });
      // Sort by student number ascending
      list.sort((a, b) => (a.studentNumber || '').localeCompare(b.studentNumber || '', undefined, { numeric: true }));
      setStudents(list);
    });

    return () => unsubscribe();
  }, [code, router]);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/chat?code=${code}`
    : '';

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Excel Download Logic
  const handleDownloadExcel = () => {
    if (students.length === 0) {
      alert('다운로드할 학생 데이터가 아직 없습니다.');
      return;
    }

    const rows = students.map((s, idx) => ({
      연번: idx + 1,
      학번: s.studentNumber,
      이름: s.name,
      성별: s.gender === 'boy' ? '남학생' : '여학생',
      진행단계: s.status === 'COMPLETED' ? '완료' : `${s.stage || 1}단계 진행 중`,
      퀴즈정답: s.quizScore !== undefined && s.quizScore !== null ? `${s.quizScore}개` : '-',
      최종점수: s.score !== undefined && s.score !== null ? `${s.score}점` : '-',
      최종등급: s.grade || '-',
      AI평가요약: s.summary || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '토론결과');

    // Column widths
    worksheet['!cols'] = [
      { wch: 6 },  // 연번
      { wch: 10 }, // 학번
      { wch: 12 }, // 이름
      { wch: 8 },  // 성별
      { wch: 15 }, // 진행단계
      { wch: 10 }, // 퀴즈정답
      { wch: 10 }, // 최종점수
      { wch: 10 }, // 최종등급
      { wch: 60 }, // AI평가요약
    ];

    const fileName = `${classInfo?.className || '통일토론'}_${code}_토론결과.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Clean up and delete class
  const handleDeleteClass = async () => {
    if (!confirm('정말로 이 수업과 학생 데이터를 모두 삭제하시겠습니까?\n(삭제 전 [엑셀 다운로드]를 먼저 실행해 주세요!)')) {
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Delete all student documents
      const studentsRef = collection(db, 'direct_classes', code, 'students');
      const studentSnaps = await getDocs(studentsRef);
      const deletePromises = studentSnaps.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // 2. Delete class doc
      await deleteDoc(doc(db, 'direct_classes', code));

      alert('수업 데이터가 완전히 삭제되었습니다.');
      router.push('/');
    } catch (err: any) {
      console.error(err);
      alert('삭제 중 오류가 발생했습니다: ' + (err.message || ''));
    } finally {
      setIsDeleting(false);
    }
  };

  const completedCount = students.filter((s) => s.status === 'COMPLETED').length;
  const scoredStudents = students.filter((s) => typeof s.score === 'number');
  const avgScore = scoredStudents.length > 0
    ? Math.round(scoredStudents.reduce((acc, cur) => acc + (cur.score || 0), 0) / scoredStudents.length)
    : 0;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Top Header Card */}
      <div className="glass-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '1.5rem', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
              <span style={{ padding: '4px 10px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800 }}>
                실시간 교탁 모니터링
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                담당: {classInfo?.teacherName || '선생님'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              {classInfo?.className || '수업 진행 중'}
            </h1>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              className="glass-button"
              onClick={() => setShowQrModal(true)}
              style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '10px 16px', fontSize: '0.9rem' }}
            >
              📱 초대 QR코드 보기
            </button>
            <button
              className="glass-button"
              onClick={handleDownloadExcel}
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '10px 18px', fontWeight: 700, fontSize: '0.9rem' }}
            >
              📥 엑셀로 전체 결과 다운로드
            </button>
            <button
              className="glass-button"
              onClick={handleDeleteClass}
              disabled={isDeleting}
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', fontSize: '0.85rem' }}
            >
              {isDeleting ? '삭제 중...' : '🗑️ 수업 종료 및 데이터 삭제'}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>수업 코드</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>
              {code}
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>접속 학생</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {students.length}명
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>토론 완료</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
              {completedCount}명 <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>({students.length > 0 ? Math.round((completedCount / students.length) * 100) : 0}%)</span>
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>평균 평가 점수</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6' }}>
              {avgScore}점
            </div>
          </div>
        </div>
      </div>

      {/* Student List Table */}
      <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', background: '#fff' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
          학생 실시간 현황 ({students.length}명)
        </h2>

        {students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>⏳</span>
            학생들이 아직 입장하지 않았습니다.<br />
            학생들에게 <strong>수업 코드 ({code})</strong> 또는 QR코드를 보여주세요!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px 14px' }}>학번</th>
                  <th style={{ padding: '12px 14px' }}>이름</th>
                  <th style={{ padding: '12px 14px' }}>진행 상태</th>
                  <th style={{ padding: '12px 14px' }}>퀴즈 정답</th>
                  <th style={{ padding: '12px 14px' }}>평가 점수</th>
                  <th style={{ padding: '12px 14px' }}>등급</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>상세 보기</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{s.studentNumber}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {s.gender === 'boy' ? '👨‍🎓' : '👩‍🎓'} {s.name}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: s.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: s.status === 'COMPLETED' ? '#10b981' : '#2563eb'
                      }}>
                        {s.status === 'COMPLETED' ? '✓ 완료' : `${s.stage || 1}단계 진행 중`}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                      {s.quizScore !== undefined && s.quizScore !== null ? `${s.quizScore} / 5` : '-'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--primary)' }}>
                      {s.score !== undefined && s.score !== null ? `${s.score}점` : '-'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800 }}>
                      <span style={{
                        display: 'inline-block',
                        width: '28px',
                        height: '28px',
                        lineHeight: '28px',
                        textAlign: 'center',
                        borderRadius: '50%',
                        background: s.grade === 'S' || s.grade === 'A' ? '#dcfce7' : s.grade === 'B' ? '#e0e7ff' : '#f1f5f9',
                        color: s.grade === 'S' || s.grade === 'A' ? '#166534' : s.grade === 'B' ? '#3730a3' : '#64748b'
                      }}>
                        {s.grade || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        className="glass-button"
                        onClick={() => setSelectedStudent(s)}
                        style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                      >
                        상세 보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', maxWidth: '440px', width: '100%', textAlign: 'center', background: '#fff' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--primary)' }}>
              학생 접속용 QR 코드
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              스마트폰 또는 태블릿 카메라로 QR코드를 비춰주세요.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ padding: '16px', background: '#fff', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                <QRCodeSVG value={shareUrl} size={220} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '1.1rem', fontWeight: 800 }}>
              수업 코드: <span style={{ color: 'var(--primary)', letterSpacing: '2px' }}>{code}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                className="glass-button"
                onClick={copyShareUrl}
                style={{ background: copiedLink ? '#10b981' : 'rgba(37, 99, 235, 0.1)', color: copiedLink ? '#fff' : 'var(--primary)', border: '1px solid var(--primary)', padding: '10px' }}
              >
                {copiedLink ? '✓ 초대 링크가 복사되었습니다!' : '📋 접속 링크 복사하기'}
              </button>
              <button
                className="glass-button"
                onClick={() => setShowQrModal(false)}
                style={{ background: '#64748b', padding: '10px' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '700px', width: '100%', maxHeight: '85vh', overflowY: 'auto', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.8rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {selectedStudent.studentNumber} {selectedStudent.name} 학생 보고서
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  상태: {selectedStudent.status === 'COMPLETED' ? '토론 완료' : `${selectedStudent.stage}단계`} | 퀴즈: {selectedStudent.quizScore ?? '-'}개 | 점수: {selectedStudent.score ?? '-'}점 ({selectedStudent.grade ?? '-'})
                </span>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* AI Summary Section */}
            {selectedStudent.summary && (
              <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  📝 AI 종합 평가 및 세특 코멘트
                </h4>
                <div style={{ fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#334155' }}>
                  {selectedStudent.summary}
                </div>
              </div>
            )}

            {/* Chat Messages Log */}
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--text-main)' }}>
              💬 전체 토론 대화 기록 ({selectedStudent.messages?.length || 0}개)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {selectedStudent.messages?.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: msg.role === 'USER' ? 'rgba(37, 99, 235, 0.08)' : '#f1f5f9',
                    alignSelf: msg.role === 'USER' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.75rem', color: msg.role === 'USER' ? 'var(--primary)' : '#64748b', marginBottom: '3px' }}>
                    {msg.role === 'USER' ? `${selectedStudent.name} (학생)` : 'AI (꿈통이 / 북한 대표)'}
                  </strong>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                className="glass-button"
                onClick={() => setSelectedStudent(null)}
                style={{ padding: '8px 20px', background: '#64748b' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
