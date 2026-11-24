'use client';

import { useEffect, useState, Suspense, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

function QuizChallengeModal({ quizzes, onClose, studentName }: { quizzes: any[]; onClose: () => void; studentName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const currentQuiz = quizzes[currentIndex];

  const handleCheckInput = () => {
    if (!userAnswer.trim()) {
      alert('정답을 입력해주세요!');
      return;
    }
    const correctAns = currentQuiz.answer;
    const isCorrect = userAnswer.includes(correctAns) || correctAns.includes(userAnswer);
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      setFeedback({ isCorrect: true, msg: '정답입니다! 🎉' });
    } else {
      setFeedback({ isCorrect: false, msg: `아쉽습니다! 정답은 "${correctAns}"입니다.` });
    }
    setIsRevealed(true);
  };

  const handleCheckOption = (opt: string) => {
    setUserAnswer(opt);
    const correctAns = currentQuiz.answer;
    const isCorrect = opt === correctAns || opt.includes(correctAns) || correctAns.includes(opt);

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      setFeedback({ isCorrect: true, msg: '정답입니다! 🎉' });
    } else {
      setFeedback({ isCorrect: false, msg: `아쉽습니다! 정답은 "${correctAns}"입니다.` });
    }
    setIsRevealed(true);
  };

  const handleNext = () => {
    setUserAnswer('');
    setIsRevealed(false);
    setFeedback(null);
    if (currentIndex < quizzes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowSummary(true);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.9)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          width: '90%',
          maxWidth: '600px',
          borderRadius: '16px',
          padding: '2.5rem',
          color: '#fff',
          border: '2px solid rgba(255,255,255,0.1)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '1.5rem',
            cursor: 'pointer',
          }}
        >
          ✖
        </button>

        {showSummary ? (
          <div style={{ animation: 'fadeIn 0.5s ease-out', padding: '2rem 0', textAlign: 'center' }}>
            <h2 style={{ color: '#fbbf24', marginBottom: '1.5rem', fontSize: '2.2rem' }}>
              🎉 퀴즈 도전 완료!
            </h2>
            <p style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>
              총 {quizzes.length}문제 중 <span style={{ color: '#10b981', fontWeight: 'bold' }}>{correctCount}문제</span>를 맞췄습니다!
            </p>
            <p style={{ fontSize: '1.1rem', marginBottom: '2.5rem', color: '#cbd5e1' }}>
              {correctCount === quizzes.length
                ? '완벽해요! 친구의 토론 내용을 완벽하게 마스터하셨군요! 🏆'
                : correctCount >= Math.ceil(quizzes.length / 2)
                ? '잘 하셨어요! 대단한 실력이네요! 👍'
                : '조금 아쉽지만 훌륭한 도전이었어요! 💪'}
            </p>
            <button
              onClick={onClose}
              style={{
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                padding: '1rem',
                width: '100%',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1.1rem',
              }}
            >
              결과 공유방으로 돌아가기
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ color: '#fbbf24', marginBottom: '0.5rem', textAlign: 'center', fontSize: '1.5rem' }}>
              🎯 {studentName} 학생의 퀴즈 도전!
            </h2>
            <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '2rem' }}>
              문제 {currentIndex + 1} / {quizzes.length}
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
              <p style={{ fontSize: '1.2rem', lineHeight: 1.6, fontWeight: 'bold' }}>
                Q. {currentQuiz.question}
              </p>
            </div>

            {!isRevealed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {currentQuiz.options && currentQuiz.options.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {currentQuiz.options.map((opt: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => handleCheckOption(opt)}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.3)',
                          padding: '1rem',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.2s',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <input
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="나의 정답을 입력하세요..."
                      style={{
                        padding: '1.2rem',
                        borderRadius: '8px',
                        border: '1px solid #475569',
                        background: '#0f172a',
                        color: '#fff',
                        fontSize: '1.1rem',
                        outline: 'none',
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleCheckInput()}
                      autoFocus
                    />
                    <button
                      onClick={handleCheckInput}
                      style={{
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        padding: '1.2rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                      }}
                    >
                      정답 확인하기
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                {feedback && (
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      border: `2px solid ${feedback.isCorrect ? '#10b981' : '#ef4444'}`,
                      marginBottom: '1.5rem',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      color: feedback.isCorrect ? '#34d399' : '#f87171',
                      textAlign: 'center',
                      lineHeight: 1.5,
                    }}
                  >
                    {feedback.msg}
                  </div>
                )}
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                  <p style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.8rem' }}>
                    실제 정답: {currentQuiz.answer}
                  </p>
                  {currentQuiz.explanation && (
                    <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
                      해설: {currentQuiz.explanation}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '1.2rem',
                    width: '100%',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                  }}
                >
                  {currentIndex < quizzes.length - 1 ? '다음 문제로 ➔' : '퀴즈 완료하기 🌟'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ShareBoardContent({ classId }: { classId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlName = searchParams.get('name') || '';

  const [currentUserName, setCurrentUserName] = useState(urlName);
  const [students, setStudents] = useState<any[]>([]);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [activeQuizSet, setActiveQuizSet] = useState<any[] | null>(null);

  useEffect(() => {
    if (!currentUserName) {
      const storedName = localStorage.getItem('direct_student_name');
      const storedNumber = localStorage.getItem('direct_student_number');
      if (storedName) {
        setCurrentUserName(storedNumber ? `${storedNumber} ${storedName}` : storedName);
      }
    }
  }, [currentUserName]);

  // Load class & completed students
  useEffect(() => {
    if (!classId) return;

    const fetchBoardData = async () => {
      try {
        const codeUpper = classId.toUpperCase();
        const classRef = doc(db, 'direct_classes', codeUpper);
        const classSnap = await getDoc(classRef);

        if (classSnap.exists()) {
          setClassInfo(classSnap.data());
        }

        const studentsRef = collection(db, 'direct_classes', codeUpper, 'students');
        const snaps = await getDocs(studentsRef);
        const list: any[] = [];
        snaps.forEach((d) => {
          const data = d.data();
          if (data.status === 'COMPLETED' || data.summary) {
            list.push({ id: d.id, ...data });
          }
        });
        setStudents(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBoardData();
  }, [classId]);

  // Like toggle
  const toggleLike = async () => {
    if (!selectedStudent || !currentUserName) return;
    try {
      const studentRef = doc(db, 'direct_classes', classId.toUpperCase(), 'students', selectedStudent.studentNumber);
      const isLiked = (selectedStudent.likes || []).includes(currentUserName);

      if (isLiked) {
        await updateDoc(studentRef, {
          likes: arrayRemove(currentUserName),
        });
        setSelectedStudent((prev: any) => ({
          ...prev,
          likes: (prev.likes || []).filter((u: string) => u !== currentUserName),
        }));
      } else {
        await updateDoc(studentRef, {
          likes: arrayUnion(currentUserName),
        });
        setSelectedStudent((prev: any) => ({
          ...prev,
          likes: [...(prev.likes || []), currentUserName],
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !commentInput.trim() || !currentUserName) return;

    const newComment = {
      authorName: currentUserName,
      content: commentInput.trim(),
      createdAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    try {
      const studentRef = doc(db, 'direct_classes', classId.toUpperCase(), 'students', selectedStudent.studentNumber);
      await updateDoc(studentRef, {
        comments: arrayUnion(newComment),
      });

      setSelectedStudent((prev: any) => ({
        ...prev,
        comments: [...(prev.comments || []), newComment],
      }));
      setCommentInput('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
              <span style={{ background: '#3b82f6', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                우리 반 토론 공유방
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                수업 코드: <strong>{classId.toUpperCase()}</strong>
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              {classInfo?.className || '통일 토론 결과 보드'}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              내 이름: <strong style={{ color: '#38bdf8' }}>{currentUserName || '익명'}</strong>
            </span>
            <button
              onClick={() => router.push(`/chat?code=${classId}`)}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
            >
              내 토론방으로 ➔
            </button>
          </div>
        </div>

        {/* Board Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>데이터를 불러오는 중입니다...</div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed #334155' }}>
            아직 토론을 완료한 친구가 없습니다.<br />토론을 마치면 이곳에 친구들의 결과가 나타납니다!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {students.map((s) => {
              const quizCount = s.quizResults?.length || 0;
              const hasQuizzes = quizCount > 0;
              const likesCount = s.likes?.length || 0;
              const commentsCount = s.comments?.length || 0;

              return (
                <div
                  key={s.id}
                  style={{
                    background: '#1e293b',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    border: '1px solid #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f8fafc' }}>
                        {s.gender === 'boy' ? '👨‍🎓' : '👩‍🎓'} {s.studentNumber} {s.name}
                      </span>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
                        ✓ 완료 ({s.grade || 'A'})
                      </span>
                    </div>

                    <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '10px', fontSize: '0.85rem', lineHeight: 1.6, color: '#cbd5e1', maxHeight: '120px', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '1.2rem' }}>
                      {s.summary ? s.summary.slice(0, 150) + '...' : '토론을 성공적으로 마쳤습니다.'}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                      <span>❤️ 응원 {likesCount}</span>
                      <span>💬 댓글 {commentsCount}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setSelectedStudent(s)}
                        style={{
                          flex: 1,
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                        }}
                      >
                        대화 보기 & 응원
                      </button>

                      {hasQuizzes && (
                        <button
                          onClick={() => {
                            const formattedQuizzes = s.quizResults.map((q: any) => ({
                              question: q.question,
                              answer: q.correctAnswer,
                              explanation: '',
                            }));
                            setActiveQuizSet(formattedQuizzes);
                          }}
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                          }}
                        >
                          🎯 퀴즈 도전
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Student Dialog & Comments Modal */}
        {selectedStudent && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.8)',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <div
              style={{
                background: '#1e293b',
                width: '90%',
                maxWidth: '750px',
                maxHeight: '90vh',
                overflowY: 'auto',
                borderRadius: '16px',
                padding: '2rem',
                border: '1px solid #334155',
                position: 'relative',
              }}
            >
              <button
                onClick={() => setSelectedStudent(null)}
                style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✖
              </button>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#f8fafc' }}>
                {selectedStudent.studentNumber} {selectedStudent.name} 학생의 토론 결과
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                최종 등급: <strong style={{ color: '#38bdf8' }}>{selectedStudent.grade || 'A'}</strong> | 퀴즈 정답: {selectedStudent.quizScore ?? '-'}개
              </p>

              {/* Summary */}
              {selectedStudent.summary && (
                <div style={{ background: '#0f172a', padding: '1.2rem', borderRadius: '12px', marginBottom: '1.5rem', lineHeight: 1.6, fontSize: '0.95rem', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                  <h4 style={{ color: '#38bdf8', marginBottom: '0.5rem' }}>📝 AI 최종 평가 요약</h4>
                  {selectedStudent.summary}
                </div>
              )}

              {/* Chat Log */}
              <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.8rem', color: '#f8fafc' }}>
                💬 전체 토론 대화 기록
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '300px', overflowY: 'auto', marginBottom: '2rem', background: '#0f172a', padding: '1rem', borderRadius: '12px' }}>
                {selectedStudent.messages?.map((m: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: m.role === 'USER' ? '#1e3a8a' : '#334155',
                      alignSelf: m.role === 'USER' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '2px' }}>
                      {m.role === 'USER' ? selectedStudent.name : 'AI (꿈통이 / 북한 대표)'}
                    </strong>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  </div>
                ))}
              </div>

              {/* Likes & Comments Section */}
              <div style={{ borderTop: '1px solid #334155', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <button
                    onClick={toggleLike}
                    style={{
                      background: (selectedStudent.likes || []).includes(currentUserName) ? '#ef4444' : 'rgba(239,68,68,0.2)',
                      color: (selectedStudent.likes || []).includes(currentUserName) ? '#fff' : '#f87171',
                      border: '1px solid #ef4444',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    ❤️ {(selectedStudent.likes || []).includes(currentUserName) ? '응원 완료' : '친구 응원하기'} ({selectedStudent.likes?.length || 0})
                  </button>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    댓글 {selectedStudent.comments?.length || 0}개
                  </span>
                </div>

                {/* Comment Input */}
                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="친구에게 따뜻한 응원의 한마디를 남겨주세요..."
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    등록
                  </button>
                </form>

                {/* Comments List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {selectedStudent.comments?.map((c: any, idx: number) => (
                    <div key={idx} style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <strong style={{ color: '#38bdf8', marginRight: '6px' }}>{c.authorName}</strong>
                      <span style={{ color: '#cbd5e1' }}>{c.content}</span>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '8px' }}>{c.createdAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Challenge Modal */}
        {activeQuizSet && (
          <QuizChallengeModal
            quizzes={activeQuizSet}
            onClose={() => setActiveQuizSet(null)}
            studentName={selectedStudent?.name || '친구'}
          />
        )}
      </div>
    </div>
  );
}

export default function SharePage({ params }: { params: Promise<{ classId: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#fff' }}>공유방 로딩 중...</div>}>
      <ShareBoardContent classId={resolvedParams.classId} />
    </Suspense>
  );
}
