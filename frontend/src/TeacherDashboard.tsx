import { useState, useEffect } from 'react'
import { api } from './lib/api'

// ===== TYPES =====
interface ClassData {
    id: string
    name: string
    description: string | null
    inviteCode: string
    _count: { enrollments: number; lessonPlans: number }
    enrollments: Array<{
        student: { id: string; username: string; avatarUrl: string | null }
        parent: { id: string; username: string } | null
    }>
}

interface LessonPlan {
    id: string
    title: string
    description: string | null
    scheduledDate: string | null
    progress: number
    assignments: Array<{ id: string; title: string; dueDate: string | null }>
    tests: Array<{ id: string; title: string; testDate: string | null }>
    records: Array<{ id: string; recordDate: string; summary: string | null; pagesFrom: number | null; pagesTo: number | null }>
}

interface DashboardData {
    classCount: number
    totalStudents: number
    todayLessons: Array<{ id: string; title: string; class: { name: string } }>
    pendingSubmissions: number
    pendingSubmissionsList: Array<{ student: { username: string }; assignment: { title: string } }>
    attendanceSummary: { present: number; late: number; absent: number }
}

interface Enrollment {
    student: { id: string; username: string; email: string; phone: string | null; avatarUrl: string | null }
    parent: { id: string; username: string; email: string; phone: string | null } | null
}

type TeacherTab = 'dashboard' | 'classes' | 'attendance' | 'lessons'

export default function TeacherDashboard() {
    const [tab, setTab] = useState<TeacherTab>('dashboard')
    const [dashboard, setDashboard] = useState<DashboardData | null>(null)
    const [classes, setClasses] = useState<ClassData[]>([])
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
    const [students, setStudents] = useState<Enrollment[]>([])
    const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([])
    const [attendance, setAttendance] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Attendance form state
    const [attendanceDate, setAttendanceDate] = useState(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'present' | 'late' | 'absent'>>({})

    // Lesson plan form
    const [showLessonForm, setShowLessonForm] = useState(false)
    const [lessonTitle, setLessonTitle] = useState('')
    const [lessonDesc, setLessonDesc] = useState('')
    const [lessonDate, setLessonDate] = useState('')

    useEffect(() => {
        loadDashboard()
        loadClasses()
    }, [])

    useEffect(() => {
        if (selectedClassId) {
            loadStudents(selectedClassId)
            loadLessonPlans(selectedClassId)
            loadAttendance(selectedClassId)
        }
    }, [selectedClassId])

    async function loadDashboard() {
        const data = await api.get<DashboardData>('/teacher/dashboard')
        if (data) setDashboard(data)
        setLoading(false)
    }

    async function loadClasses() {
        const data = await api.get<ClassData[]>('/teacher/classes')
        if (data) {
            setClasses(data)
            if (data.length > 0 && !selectedClassId) setSelectedClassId(data[0].id)
        }
    }

    async function loadStudents(classId: string) {
        const data = await api.get<Enrollment[]>(`/teacher/classes/${classId}/students`)
        if (data) {
            setStudents(data)
            const records: Record<string, 'present' | 'late' | 'absent'> = {}
            data.forEach((e) => { records[e.student.id] = 'present' })
            setAttendanceRecords(records)
        }
    }

    async function loadLessonPlans(classId: string) {
        const data = await api.get<LessonPlan[]>(`/teacher/classes/${classId}/lesson-plans`)
        if (data) setLessonPlans(data)
    }

    async function loadAttendance(classId: string, date?: string) {
        const url = date
            ? `/teacher/classes/${classId}/attendance?date=${date}`
            : `/teacher/classes/${classId}/attendance`
        const data = await api.get<any[]>(url)
        if (data) setAttendance(data)
    }

    async function submitAttendance() {
        if (!selectedClassId) return
        const records = Object.entries(attendanceRecords).map(([studentId, status]) => ({ studentId, status }))
        const result = await api.post(`/teacher/classes/${selectedClassId}/attendance`, { date: attendanceDate, records })
        if (result) {
            alert('출결 저장 완료!')
            loadAttendance(selectedClassId, attendanceDate)
        } else { alert('출결 저장 실패') }
    }

    async function createLessonPlan() {
        if (!selectedClassId || !lessonTitle) return
        const result = await api.post(`/teacher/classes/${selectedClassId}/lesson-plans`, {
            title: lessonTitle, description: lessonDesc || undefined, scheduledDate: lessonDate || undefined,
        })
        if (result) {
            setLessonTitle(''); setLessonDesc(''); setLessonDate(''); setShowLessonForm(false)
            loadLessonPlans(selectedClassId)
        } else { alert('수업계획 생성 실패') }
    }

    async function deleteLessonPlan(planId: string) {
        if (!selectedClassId || !confirm('삭제하시겠습니까?')) return
        await api.get(`/teacher/classes/${selectedClassId}/lesson-plans/${planId}`) // placeholder for DELETE
        loadLessonPlans(selectedClassId)
    }

    const selectedClass = classes.find(c => c.id === selectedClassId)

    const tabs: Array<{ id: TeacherTab; label: string; icon: string }> = [
        { id: 'dashboard', label: '대시보드', icon: '📊' },
        { id: 'classes', label: '반 관리', icon: '👥' },
        { id: 'attendance', label: '출결', icon: '✅' },
        { id: 'lessons', label: '수업계획', icon: '📋' },
    ]

    return (
        <div className="teacher-dashboard">
            <div className="teacher-tabs">
                {tabs.map(t => (
                    <button key={t.id} className={`teacher-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                        <span>{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            {tab !== 'dashboard' && classes.length > 0 && (
                <div className="class-selector">
                    <label>반 선택:</label>
                    <select value={selectedClassId || ''} onChange={e => setSelectedClassId(e.target.value)}>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c._count.enrollments}명)</option>)}
                    </select>
                </div>
            )}

            {tab === 'dashboard' && (
                <div className="dashboard-grid">
                    {loading ? <div className="loading-spinner">로딩 중...</div> : dashboard ? (
                        <>
                            <div className="stat-card"><div className="stat-icon">📚</div><div className="stat-value">{dashboard.classCount}</div><div className="stat-label">운영 반</div></div>
                            <div className="stat-card"><div className="stat-icon">👨‍🎓</div><div className="stat-value">{dashboard.totalStudents}</div><div className="stat-label">총 학생 수</div></div>
                            <div className="stat-card"><div className="stat-icon">📝</div><div className="stat-value">{dashboard.pendingSubmissions}</div><div className="stat-label">미채점 과제</div></div>
                            <div className="stat-card attendance-summary">
                                <div className="stat-icon">✅</div><div className="stat-label">오늘 출결</div>
                                <div className="attendance-bars">
                                    <span className="att-present">출석 {dashboard.attendanceSummary.present}</span>
                                    <span className="att-late">지각 {dashboard.attendanceSummary.late}</span>
                                    <span className="att-absent">결석 {dashboard.attendanceSummary.absent}</span>
                                </div>
                            </div>
                            {dashboard.todayLessons.length > 0 && (
                                <div className="today-lessons card-section">
                                    <h3>📅 오늘 수업</h3>
                                    {dashboard.todayLessons.map(l => <div key={l.id} className="today-lesson-item"><span className="lesson-class">{l.class.name}</span><span className="lesson-title">{l.title}</span></div>)}
                                </div>
                            )}
                            {dashboard.pendingSubmissionsList.length > 0 && (
                                <div className="pending-list card-section">
                                    <h3>📝 채점 대기 과제</h3>
                                    {dashboard.pendingSubmissionsList.map((s, i) => <div key={i} className="pending-item"><span className="pending-student">{s.student.username}</span><span className="pending-assignment">{s.assignment.title}</span></div>)}
                                </div>
                            )}
                        </>
                    ) : <div className="empty-state"><div className="empty-icon">📊</div><p>데이터를 불러올 수 없습니다.</p></div>}
                </div>
            )}

            {tab === 'classes' && (
                <div className="students-table">
                    <h3>{selectedClass?.name || '반'} — 학생 명단</h3>
                    {students.length === 0 ? <div className="empty-state"><div className="empty-icon">👥</div><p>등록된 학생이 없습니다.</p></div> : (
                        <table>
                            <thead><tr><th>학생명</th><th>이메일</th><th>연락처</th><th>학부모</th></tr></thead>
                            <tbody>
                                {students.map(e => (
                                    <tr key={e.student.id}>
                                        <td><div className="student-name-cell"><div className="student-avatar-sm">{e.student.username[0]}</div>{e.student.username}</div></td>
                                        <td>{e.student.email}</td><td>{e.student.phone || '-'}</td><td>{e.parent ? e.parent.username : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === 'attendance' && (
                <div className="attendance-section">
                    <div className="attendance-controls">
                        <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
                        <button className="btn-primary" onClick={submitAttendance}>💾 출결 저장</button>
                    </div>
                    {students.length === 0 ? <div className="empty-state"><div className="empty-icon">✅</div><p>학생을 먼저 등록해주세요.</p></div> : (
                        <div className="attendance-list">
                            {students.map(e => (
                                <div key={e.student.id} className="attendance-row">
                                    <div className="student-name-cell"><div className="student-avatar-sm">{e.student.username[0]}</div><span>{e.student.username}</span></div>
                                    <div className="attendance-btns">
                                        {(['present', 'late', 'absent'] as const).map(status => (
                                            <button key={status} className={`att-btn att-${status} ${attendanceRecords[e.student.id] === status ? 'active' : ''}`} onClick={() => setAttendanceRecords(prev => ({ ...prev, [e.student.id]: status }))}>
                                                {status === 'present' ? '✅ 출석' : status === 'late' ? '⏰ 지각' : '❌ 결석'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {attendance.length > 0 && (
                        <div className="card-section" style={{ marginTop: 24 }}>
                            <h3>📋 최근 출결 기록</h3>
                            <div className="attendance-history">
                                {attendance.slice(0, 20).map((a: any) => (
                                    <div key={a.id} className="att-history-row">
                                        <span className="att-date">{new Date(a.date).toLocaleDateString('ko-KR')}</span>
                                        <span className="att-name">{a.student.username}</span>
                                        <span className={`att-badge att-${a.status}`}>{a.status === 'present' ? '출석' : a.status === 'late' ? '지각' : '결석'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === 'lessons' && (
                <div className="lessons-section">
                    <div className="section-header"><h3>📋 수업 계획</h3><button className="btn-primary" onClick={() => setShowLessonForm(!showLessonForm)}>{showLessonForm ? '취소' : '+ 새 수업계획'}</button></div>
                    {showLessonForm && (
                        <div className="lesson-form card-section">
                            <input type="text" placeholder="수업 제목" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} />
                            <textarea placeholder="수업 설명 (선택)" value={lessonDesc} onChange={e => setLessonDesc(e.target.value)} />
                            <input type="date" value={lessonDate} onChange={e => setLessonDate(e.target.value)} />
                            <button className="btn-primary" onClick={createLessonPlan}>저장</button>
                        </div>
                    )}
                    {lessonPlans.length === 0 ? <div className="empty-state"><div className="empty-icon">📋</div><p>수업 계획이 없습니다.</p></div> : (
                        <div className="lesson-plan-list">
                            {lessonPlans.map(plan => (
                                <div key={plan.id} className="lesson-card">
                                    <div className="lesson-card-header">
                                        <h4>{plan.title}</h4>
                                        <div className="lesson-card-actions">
                                            {plan.scheduledDate && <span className="lesson-date">📅 {new Date(plan.scheduledDate).toLocaleDateString('ko-KR')}</span>}
                                            <button className="btn-ghost-sm" onClick={() => deleteLessonPlan(plan.id)}>🗑️</button>
                                        </div>
                                    </div>
                                    {plan.description && <p className="lesson-desc">{plan.description}</p>}
                                    <div className="lesson-progress"><div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${plan.progress}%` }} /></div><span>{plan.progress}%</span></div>
                                    <div className="lesson-meta">
                                        {plan.assignments.length > 0 && <span>📝 과제 {plan.assignments.length}건</span>}
                                        {plan.tests.length > 0 && <span>📊 테스트 {plan.tests.length}건</span>}
                                        {plan.records.length > 0 && <span>📖 진도기록 {plan.records.length}건</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
