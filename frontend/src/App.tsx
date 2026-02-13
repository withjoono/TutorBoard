import { useState, useEffect, useMemo } from 'react'
import { processSSOLogin, isLoggedIn, redirectToLogin, logout } from './lib/auth'
import { api } from './lib/api'
import { hubApi } from './lib/hub-api'
import './index.css'

// ===== TYPES =====

interface Assignment {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  className: string
  lessonTitle: string
  submission: { status: string; grade: number | null; feedback: string | null } | null
  isOverdue: boolean
}

interface Notification {
  id: string
  message: string
  type: string
  read: boolean
  sentAt: string
}

interface LessonEvent {
  id: string
  title: string
  subject: string
  date: string      // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string   // HH:MM
  color: string
  teacher?: string
  classId?: string  // links to ClassInfo.id
}

// ===== MOCK DATA =====
const SUBJECT_COLORS: Record<string, string> = {
  '수학': '#6366f1',
  '영어': '#14b8a6',
  '과학': '#f59e0b',
  '국어': '#ef4444',
  '사회': '#8b5cf6',
  '음악': '#ec4899',
}

const MOCK_LESSONS: LessonEvent[] = [
  { id: '1', title: '이차함수와 그래프', subject: '수학', date: '2026-02-07', startTime: '14:00', endTime: '15:30', color: SUBJECT_COLORS['수학'], teacher: '김선생님', classId: '1' },
  { id: '2', title: 'Writing Skills', subject: '영어', date: '2026-02-07', startTime: '16:00', endTime: '17:00', color: SUBJECT_COLORS['영어'], teacher: '박선생님', classId: '2' },
  { id: '3', title: '산과 염기 실험', subject: '과학', date: '2026-02-08', startTime: '10:00', endTime: '11:30', color: SUBJECT_COLORS['과학'], teacher: '이선생님', classId: '3' },
  { id: '4', title: '미적분 기초', subject: '수학', date: '2026-02-10', startTime: '14:00', endTime: '15:30', color: SUBJECT_COLORS['수학'], teacher: '김선생님', classId: '1' },
  { id: '5', title: 'Reading Comprehension', subject: '영어', date: '2026-02-10', startTime: '16:00', endTime: '17:00', color: SUBJECT_COLORS['영어'], teacher: '박선생님', classId: '2' },
  { id: '6', title: '한국 단편 소설', subject: '국어', date: '2026-02-11', startTime: '09:00', endTime: '10:00', color: SUBJECT_COLORS['국어'], teacher: '최선생님', classId: '4' },
  { id: '7', title: '전자기력', subject: '과학', date: '2026-02-11', startTime: '11:00', endTime: '12:30', color: SUBJECT_COLORS['과학'], teacher: '이선생님', classId: '3' },
  { id: '8', title: '확률과 통계', subject: '수학', date: '2026-02-12', startTime: '14:00', endTime: '15:30', color: SUBJECT_COLORS['수학'], teacher: '김선생님', classId: '1' },
  { id: '9', title: 'Listening Practice', subject: '영어', date: '2026-02-12', startTime: '16:00', endTime: '17:00', color: SUBJECT_COLORS['영어'], teacher: '박선생님', classId: '2' },
  { id: '10', title: '시 감상', subject: '국어', date: '2026-02-13', startTime: '09:00', endTime: '10:00', color: SUBJECT_COLORS['국어'], teacher: '최선생님', classId: '4' },
  { id: '11', title: '함수의 극한', subject: '수학', date: '2026-02-14', startTime: '14:00', endTime: '16:00', color: SUBJECT_COLORS['수학'], teacher: '김선생님', classId: '1' },
  { id: '12', title: '세계 지리', subject: '사회', date: '2026-02-14', startTime: '10:00', endTime: '11:00', color: SUBJECT_COLORS['사회'], teacher: '정선생님', classId: '5' },
  { id: '13', title: '화학 반응식', subject: '과학', date: '2026-02-15', startTime: '10:00', endTime: '11:30', color: SUBJECT_COLORS['과학'], teacher: '이선생님', classId: '3' },
  { id: '14', title: '수열', subject: '수학', date: '2026-02-17', startTime: '14:00', endTime: '15:30', color: SUBJECT_COLORS['수학'], teacher: '김선생님', classId: '1' },
  { id: '15', title: 'Grammar Workshop', subject: '영어', date: '2026-02-17', startTime: '16:00', endTime: '17:30', color: SUBJECT_COLORS['영어'], teacher: '박선생님', classId: '2' },
  { id: '16', title: '현대 소설', subject: '국어', date: '2026-02-18', startTime: '09:00', endTime: '10:00', color: SUBJECT_COLORS['국어'], teacher: '최선생님', classId: '4' },
  { id: '17', title: '운동과 에너지', subject: '과학', date: '2026-02-19', startTime: '10:00', endTime: '11:30', color: SUBJECT_COLORS['과학'], teacher: '이선생님', classId: '3' },
  { id: '18', title: '적분', subject: '수학', date: '2026-02-19', startTime: '14:00', endTime: '15:30', color: SUBJECT_COLORS['수학'], teacher: '김선생님', classId: '1' },
  { id: '19', title: 'Essay Writing', subject: '영어', date: '2026-02-20', startTime: '16:00', endTime: '17:30', color: SUBJECT_COLORS['영어'], teacher: '박선생님', classId: '2' },
  { id: '20', title: '한국사 근현대', subject: '사회', date: '2026-02-21', startTime: '10:00', endTime: '11:00', color: SUBJECT_COLORS['사회'], teacher: '정선생님', classId: '5' },
]

const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: '1', title: '수학 과제 3장 - 이차함수', description: '교재 p.45~60 문제 풀이', dueDate: '2026-02-09', className: '수학 심화반', lessonTitle: '이차함수와 그래프', submission: null, isOverdue: false },
  { id: '2', title: '영어 에세이 작성', description: 'My Future Dream 주제', dueDate: '2026-02-12', className: '영어 회화반', lessonTitle: 'Writing Skills', submission: { status: 'submitted', grade: null, feedback: null }, isOverdue: false },
  { id: '3', title: '과학 실험 보고서', description: '산과 염기 실험 결과 정리', dueDate: '2026-02-14', className: '과학 탐구반', lessonTitle: '산과 염기', submission: null, isOverdue: false },
  { id: '4', title: '국어 독후감', description: '소나기 읽고 감상문 작성', dueDate: '2026-02-01', className: '국어 문학반', lessonTitle: '한국 단편 소설', submission: { status: 'graded', grade: 92, feedback: '감상이 깊이 있고 좋습니다! 인물 분석이 특히 잘 되었어요.' }, isOverdue: false },
  { id: '5', title: '수학 선행 문제집', description: '미적분 기초 문제 20문항', dueDate: '2026-01-30', className: '수학 심화반', lessonTitle: '미적분 입문', submission: null, isOverdue: true },
]

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', message: '수학 과제 3장 마감이 2일 남았습니다.', type: 'assignment', read: false, sentAt: '2026-02-07T10:00:00' },
  { id: '2', message: '영어 에세이 제출이 확인되었습니다.', type: 'assignment', read: false, sentAt: '2026-02-06T15:30:00' },
  { id: '3', message: '국어 독후감에 피드백이 등록되었습니다.', type: 'assignment', read: false, sentAt: '2026-02-05T09:00:00' },
  { id: '4', message: '수학 중간고사 점수가 등록되었습니다: 88점', type: 'test', read: true, sentAt: '2026-02-04T14:00:00' },
  { id: '5', message: '2월 수업료 납부 기한이 다가옵니다.', type: 'payment', read: true, sentAt: '2026-02-03T08:00:00' },
]

// ===== HELPERS =====
const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function getMinuteDuration(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  r.setDate(r.getDate() - r.getDay())
  return r
}

// ===== DONUT CHART (pure SVG) =====
function DonutChart({ data }: { data: Array<{ subject: string; minutes: number; color: string; percentage: number }> }) {
  const size = 180
  const strokeWidth = 32
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let accumulated = 0

  return (
    <div className="donut-chart-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((item, i) => {
          const dashLength = (item.percentage / 100) * circumference
          const dashOffset = -accumulated * (circumference / 100)
          accumulated += item.percentage
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                transition: 'stroke-dasharray 1s ease, stroke-dashoffset 1s ease',
              }}
            />
          )
        })}
        <text x="50%" y="46%" textAnchor="middle" fill="var(--text-bright)" fontSize="1.1rem" fontWeight="800">
          {data.reduce((s, d) => s + d.minutes, 0)}분
        </text>
        <text x="50%" y="60%" textAnchor="middle" fill="var(--text-muted)" fontSize="0.65rem">
          총 수업시간
        </text>
      </svg>
      <div className="donut-legend">
        {data.map((item, i) => (
          <div className="donut-legend-item" key={i}>
            <span className="legend-dot" style={{ background: item.color }} />
            <span className="legend-label">{item.subject}</span>
            <span className="legend-value">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== CALENDAR COMPONENT =====
type CalendarView = 'month' | 'week' | 'day'

function LessonCalendar({ lessons, onLessonClick }: { lessons: LessonEvent[]; onLessonClick?: (lesson: LessonEvent) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 7)) // 2026-02-07
  const [view, setView] = useState<CalendarView>('month')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Lessons indexed by date
  const lessonsByDate = useMemo(() => {
    const map: Record<string, LessonEvent[]> = {}
    lessons.forEach(l => {
      if (!map[l.date]) map[l.date] = []
      map[l.date].push(l)
    })
    return map
  }, [lessons])

  // Navigate
  const navigate = (dir: number) => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setCurrentDate(d)
  }

  const goToday = () => {
    setCurrentDate(new Date(2026, 1, 7))
    setSelectedDate(formatDate(new Date(2026, 1, 7)))
  }

  // Header title
  const headerTitle = useMemo(() => {
    if (view === 'month') return `${currentDate.getFullYear()}년 ${MONTHS_KO[currentDate.getMonth()]}`
    if (view === 'week') {
      const ws = startOfWeek(currentDate)
      const we = addDays(ws, 6)
      return `${ws.getMonth() + 1}/${ws.getDate()} ~ ${we.getMonth() + 1}/${we.getDate()}`
    }
    return `${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일 (${DAYS_KO[currentDate.getDay()]})`
  }, [currentDate, view])

  // ===== MONTH VIEW =====
  const renderMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = formatDate(new Date(2026, 1, 7))

    const cells: Array<{ day: number | null; dateStr: string }> = []
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateStr: '' })
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, dateStr: formatDate(new Date(year, month, d)) })
    }

    return (
      <div className="cal-month">
        <div className="cal-weekdays">
          {DAYS_KO.map(d => <div key={d} className="cal-weekday">{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((cell, i) => {
            const hasLesson = cell.dateStr && lessonsByDate[cell.dateStr]
            const isToday = cell.dateStr === today
            const isSelected = cell.dateStr === selectedDate
            return (
              <div
                key={i}
                className={`cal-cell ${!cell.day ? 'empty' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => cell.day && setSelectedDate(cell.dateStr)}
              >
                {cell.day && (
                  <>
                    <span className="cal-day">{cell.day}</span>
                    {hasLesson && (
                      <div className="cal-dots">
                        {lessonsByDate[cell.dateStr].slice(0, 3).map((l, j) => (
                          <span key={j} className="cal-dot" style={{ background: l.color }} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ===== WEEK VIEW =====
  const renderWeek = () => {
    const ws = startOfWeek(currentDate)
    const today = formatDate(new Date(2026, 1, 7))
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))

    return (
      <div className="cal-week">
        {days.map((d, i) => {
          const ds = formatDate(d)
          const dayLessons = lessonsByDate[ds] || []
          const isToday = ds === today
          const isSelected = ds === selectedDate
          return (
            <div
              key={i}
              className={`cal-week-col ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedDate(ds)}
            >
              <div className="cal-week-header">
                <span className="cal-week-day-name">{DAYS_KO[d.getDay()]}</span>
                <span className={`cal-week-day-num ${isToday ? 'today-num' : ''}`}>{d.getDate()}</span>
              </div>
              <div className="cal-week-events">
                {dayLessons.map(l => (
                  <div key={l.id} className="cal-event-chip" style={{ borderLeftColor: l.color, background: `${l.color}18`, cursor: onLessonClick ? 'pointer' : undefined }} onClick={e => { if (onLessonClick) { e.stopPropagation(); onLessonClick(l) } }}>
                    <span className="event-time">{l.startTime}</span>
                    <span className="event-title">{l.subject}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ===== DAY VIEW =====
  const renderDay = () => {
    const ds = formatDate(currentDate)
    const dayLessons = (lessonsByDate[ds] || []).sort((a, b) => a.startTime.localeCompare(b.startTime))

    return (
      <div className="cal-day-view">
        {dayLessons.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <div className="empty-icon">📭</div>
            <div className="empty-text">오늘은 수업이 없어요</div>
          </div>
        ) : (
          dayLessons.map(l => (
            <div key={l.id} className="cal-day-event" style={{ borderLeftColor: l.color, cursor: onLessonClick ? 'pointer' : undefined }} onClick={() => onLessonClick?.(l)}>
              <div className="day-event-time">
                <span>{l.startTime}</span>
                <span className="time-divider">~</span>
                <span>{l.endTime}</span>
              </div>
              <div className="day-event-info">
                <div className="day-event-subject" style={{ color: l.color }}>{l.subject}</div>
                <div className="day-event-title">{l.title}</div>
                {l.teacher && <div className="day-event-teacher">👤 {l.teacher}</div>}
              </div>
              <div className="day-event-duration">{getMinuteDuration(l.startTime, l.endTime)}분</div>
            </div>
          ))
        )}
      </div>
    )
  }

  // Selected date lessons
  const selectedLessons = selectedDate ? (lessonsByDate[selectedDate] || []) : []

  return (
    <div className="calendar-wrapper">
      {/* Calendar Header */}
      <div className="cal-header">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => navigate(-1)}>◀</button>
          <span className="cal-title">{headerTitle}</span>
          <button className="cal-nav-btn" onClick={() => navigate(1)}>▶</button>
        </div>
        <div className="cal-view-toggle">
          {(['month', 'week', 'day'] as CalendarView[]).map(v => (
            <button
              key={v}
              className={`cal-view-btn ${view === v ? 'active' : ''}`}
              onClick={() => setView(v)}
            >
              {v === 'month' ? '월' : v === 'week' ? '주' : '일'}
            </button>
          ))}
          <button className="cal-today-btn" onClick={goToday}>오늘</button>
        </div>
      </div>

      {/* Calendar Body */}
      {view === 'month' && renderMonth()}
      {view === 'week' && renderWeek()}
      {view === 'day' && renderDay()}

      {/* Selected Date Detail (month/week view) */}
      {view !== 'day' && selectedDate && selectedLessons.length > 0 && (
        <div className="cal-selected-detail">
          <div className="cal-selected-title">
            📅 {new Date(selectedDate).getMonth() + 1}월 {new Date(selectedDate).getDate()}일 수업
          </div>
          {selectedLessons.map(l => (
            <div key={l.id} className="cal-detail-item" style={{ borderLeftColor: l.color, cursor: onLessonClick ? 'pointer' : undefined }} onClick={() => onLessonClick?.(l)}>
              <span className="detail-time">{l.startTime}~{l.endTime}</span>
              <span className="detail-subject" style={{ color: l.color }}>{l.subject}</span>
              <span className="detail-title">{l.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== COMPONENTS =====

function ProgressBar({ value, label }: { value: number; label: string }) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(value), 100)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <div className="progress-container">
      <div className="progress-label">
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>{value}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${animated}%` }} />
      </div>
    </div>
  )
}

// ====== PAGES ======

function DashboardPage() {
  const lessons = MOCK_LESSONS

  // Subject distribution
  const subjectDistribution = useMemo(() => {
    const map: Record<string, number> = {}
    lessons.forEach(l => {
      const mins = getMinuteDuration(l.startTime, l.endTime)
      map[l.subject] = (map[l.subject] || 0) + mins
    })
    const total = Object.values(map).reduce((s, v) => s + v, 0)
    return Object.entries(map)
      .map(([subject, minutes]) => ({
        subject,
        minutes,
        color: SUBJECT_COLORS[subject] || '#888',
        percentage: Math.round((minutes / total) * 100),
      }))
      .sort((a, b) => b.minutes - a.minutes)
  }, [lessons])

  return (
    <div>
      <div className="page-header">
        <h1>📅 수업 일정</h1>
        <p className="page-description">이번 달 수업 스케줄을 확인하세요</p>
      </div>

      {/* Calendar */}
      <LessonCalendar lessons={lessons} />

      {/* Subject Distribution Chart */}
      <div style={{ marginTop: 24 }}>
        <div className="section-title">📊 교과별 수업 비중</div>
        <div className="card">
          <DonutChart data={subjectDistribution} />
        </div>
      </div>
    </div>
  )
}

function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await api.get<Assignment[]>('/assignments/my')
      setAssignments(result || MOCK_ASSIGNMENTS)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="empty-state"><div className="empty-icon">⏳</div></div>

  const getStatusClass = (a: Assignment) => {
    if (a.isOverdue) return 'status-overdue'
    if (!a.submission) return 'status-pending'
    if (a.submission.status === 'graded') return 'status-graded'
    return 'status-submitted'
  }

  const getStatusLabel = (a: Assignment) => {
    if (a.isOverdue) return '기한 초과'
    if (!a.submission) return '미제출'
    if (a.submission.status === 'graded') return `${a.submission.grade}점`
    return '제출 완료'
  }

  return (
    <div>
      <div className="page-header">
        <h1>📝 과제</h1>
        <p className="page-description">할당된 과제를 확인하고 제출하세요</p>
      </div>

      <div className="assignment-list">
        {assignments.map((a) => (
          <div className="assignment-item" key={a.id}>
            <div className={`assignment-status ${getStatusClass(a)}`} />
            <div className="assignment-info">
              <div className="assignment-title">{a.title}</div>
              <div className="assignment-meta">
                {a.className} · {a.dueDate ? new Date(a.dueDate).toLocaleDateString('ko-KR') : '마감 없음'}
              </div>
              {a.submission?.feedback && (
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--color-accent)', fontStyle: 'italic' }}>
                  💬 "{a.submission.feedback}"
                </div>
              )}
            </div>
            <div>
              <span className="assignment-grade">{getStatusLabel(a)}</span>
            </div>
          </div>
        ))}
      </div>

      {assignments.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <div className="empty-text">모든 과제를 완료했어요!</div>
        </div>
      )}
    </div>
  )
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await api.get<Notification[]>('/notifications')
      setNotifications(result || MOCK_NOTIFICATIONS)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="empty-state"><div className="empty-icon">⏳</div></div>

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment': return '📝'
      case 'test': return '📊'
      case 'payment': return '💰'
      default: return '🔔'
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1>🔔 알림</h1>
          <p className="page-description">새로운 소식을 확인하세요</p>
        </div>
        <button className="btn btn-ghost" onClick={() => {
          api.patch('/notifications/read-all')
          setNotifications(notifications.map(n => ({ ...n, read: true })))
        }}>
          모두 읽음
        </button>
      </div>

      <div className="notification-list">
        {notifications.map((n) => (
          <div className={`notification-item ${!n.read ? 'unread' : ''}`} key={n.id}>
            <span className="notification-icon">{getNotificationIcon(n.type)}</span>
            <div className="notification-content">
              <div className="notification-message">{n.message}</div>
              <div className="notification-time">{formatTime(n.sentAt)}</div>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <div className="empty-text">새로운 알림이 없습니다</div>
        </div>
      )}
    </div>
  )
}

// ===== Class Detail Types & Mock Data =====
interface ClassInfo {
  id: string
  name: string
  teacher: string
  academy: string
  plan: string
  progress: number
  lessonsCount: number
  subject: string
}

interface LessonRecord {
  date: string
  dayOfWeek: string
  time: string
  attendance: 'present' | 'late' | 'absent'
  content: string
  assignmentResult: string | null
  nextAssignment: string | null
  testResult: string | null
}

interface Comment {
  id: string
  role: 'teacher' | 'student' | 'parent'
  name: string
  message: string
  timestamp: string
}

const MOCK_CLASSES: ClassInfo[] = [
  { id: '1', name: '수학 심화반', teacher: '김선생님', academy: '한빛 학원', plan: '이차함수, 미적분 기초, 확률과 통계 순서로 진행합니다. 매주 월/금 수업.', progress: 72, lessonsCount: 12, subject: '수학' },
  { id: '2', name: '영어 회화반', teacher: '박선생님', academy: '글로벌 어학원', plan: 'Speaking → Writing → Listening 순환 학습. 매주 화/목 수업.', progress: 58, lessonsCount: 8, subject: '영어' },
  { id: '3', name: '과학 탐구반', teacher: '이선생님', academy: '한빛 학원', plan: '물리, 화학, 생물 기초 실험과 이론을 병행합니다. 매주 수 수업.', progress: 85, lessonsCount: 10, subject: '과학' },
  { id: '4', name: '국어 문학반', teacher: '최선생님', academy: '한빛 학원', plan: '한국 단편소설, 현대시, 고전문학 감상. 매주 화 수업.', progress: 60, lessonsCount: 6, subject: '국어' },
  { id: '5', name: '사회 통합반', teacher: '정선생님', academy: '한빛 학원', plan: '세계 지리, 한국사, 사회문화 종합. 격주 금 수업.', progress: 40, lessonsCount: 4, subject: '사회' },
]

const MOCK_LESSON_RECORDS: Record<string, LessonRecord[]> = {
  '1': [
    { date: '2/7', dayOfWeek: '금', time: '14:00', attendance: 'present', content: '이차함수와 그래프', assignmentResult: '95점', nextAssignment: '교재 p.60~75', testResult: null },
    { date: '2/5', dayOfWeek: '수', time: '14:00', attendance: 'present', content: '이차방정식 응용', assignmentResult: '88점', nextAssignment: '교재 p.45~60', testResult: '88/100' },
    { date: '2/3', dayOfWeek: '월', time: '14:00', attendance: 'late', content: '함수의 개념 복습', assignmentResult: '92점', nextAssignment: '복습 프린트', testResult: null },
    { date: '1/31', dayOfWeek: '금', time: '14:00', attendance: 'present', content: '일차함수 심화', assignmentResult: null, nextAssignment: '교재 p.30~45', testResult: null },
    { date: '1/29', dayOfWeek: '수', time: '14:00', attendance: 'present', content: '좌표와 그래프', assignmentResult: '90점', nextAssignment: '워크시트 3장', testResult: '95/100' },
    { date: '1/27', dayOfWeek: '월', time: '14:00', attendance: 'absent', content: '수와 연산 총정리', assignmentResult: null, nextAssignment: '총정리 문제집', testResult: null },
  ],
  '2': [
    { date: '2/6', dayOfWeek: '목', time: '16:00', attendance: 'present', content: 'Essay Writing Basics', assignmentResult: null, nextAssignment: 'My Dream Essay', testResult: null },
    { date: '2/4', dayOfWeek: '화', time: '16:00', attendance: 'present', content: 'Reading Comprehension', assignmentResult: '85점', nextAssignment: 'Article 읽기', testResult: '92/100' },
    { date: '1/30', dayOfWeek: '목', time: '16:00', attendance: 'present', content: 'Grammar Workshop', assignmentResult: '78점', nextAssignment: '문법 워크시트', testResult: null },
    { date: '1/28', dayOfWeek: '화', time: '16:00', attendance: 'present', content: 'Listening Practice', assignmentResult: '90점', nextAssignment: 'Podcast 듣기', testResult: null },
  ],
  '3': [
    { date: '2/5', dayOfWeek: '수', time: '10:00', attendance: 'present', content: '산과 염기 실험', assignmentResult: '88점', nextAssignment: '실험 보고서', testResult: null },
    { date: '1/29', dayOfWeek: '수', time: '10:00', attendance: 'present', content: '전자기력 이론', assignmentResult: '92점', nextAssignment: '교재 5장 정리', testResult: '75/100' },
    { date: '1/22', dayOfWeek: '수', time: '10:00', attendance: 'present', content: '운동과 에너지', assignmentResult: null, nextAssignment: '실험 준비물', testResult: null },
  ],
}

const MOCK_COMMENTS: Record<string, Comment[]> = {
  '1': [
    { id: 'c1', role: 'teacher', name: '김선생님', message: '이번 주 이차함수 단원 잘 따라와주고 있어요. 다음 시간에 그래프 해석 위주로 진행합니다. 복습 꼭 해오세요!', timestamp: '2026-02-07 15:30' },
    { id: 'c2', role: 'student', name: '나', message: '네, 알겠습니다! 교재 문제 풀다 궁금한 점 있으면 여쭤봐도 될까요?', timestamp: '2026-02-07 16:00' },
    { id: 'c3', role: 'teacher', name: '김선생님', message: '물론이죠! 언제든 질문하세요 😊', timestamp: '2026-02-07 16:05' },
    { id: 'c4', role: 'parent', name: '어머니', message: '선생님 감사합니다. 집에서도 복습하도록 하겠습니다.', timestamp: '2026-02-07 18:20' },
  ],
  '2': [
    { id: 'c5', role: 'teacher', name: '박선생님', message: 'Essay 주제 자유롭게 선택해도 좋아요. 분량은 A4 한 장 이상이면 됩니다.', timestamp: '2026-02-06 17:00' },
    { id: 'c6', role: 'student', name: '나', message: 'My Dream 주제로 쓰면 될까요?', timestamp: '2026-02-06 17:30' },
    { id: 'c7', role: 'teacher', name: '박선생님', message: 'Good choice! Go for it 👍', timestamp: '2026-02-06 17:35' },
  ],
  '3': [
    { id: 'c8', role: 'teacher', name: '이선생님', message: '실험 보고서 양식은 수업 시간에 나눠준 프린트 참고해주세요.', timestamp: '2026-02-05 11:30' },
    { id: 'c9', role: 'student', name: '나', message: '결론 부분은 어느 정도 분량이면 될까요?', timestamp: '2026-02-05 14:00' },
    { id: 'c10', role: 'teacher', name: '이선생님', message: '5줄 이상이면 충분합니다. 실험 결과와 연결해서 쓰면 좋아요.', timestamp: '2026-02-05 14:10' },
  ],
}

function ClassDetailView({ cls, onBack }: { cls: ClassInfo; onBack: () => void }) {
  const records = MOCK_LESSON_RECORDS[cls.id] || []
  const comments = MOCK_COMMENTS[cls.id] || []
  const [newComment, setNewComment] = useState('')

  const attendanceIcon = (a: string) => {
    switch (a) {
      case 'present': return '✅'
      case 'late': return '⏰'
      case 'absent': return '❌'
      default: return '—'
    }
  }

  const attendanceLabel = (a: string) => {
    switch (a) {
      case 'present': return '출석'
      case 'late': return '지각'
      case 'absent': return '결석'
      default: return '—'
    }
  }

  return (
    <div>
      {/* Back Button */}
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 12, padding: '6px 0' }}>
        ← 수업 목록
      </button>

      {/* Class Header Card */}
      <div className="class-detail-header">
        <div className="class-detail-academy">🏫 {cls.academy}</div>
        <div className="class-detail-teacher">👤 {cls.teacher}</div>
        <div className="class-detail-name">📖 {cls.name}</div>
        <div className="class-detail-plan">
          <span className="plan-label">📋 수업 계획</span>
          <p>{cls.plan}</p>
        </div>
        <ProgressBar value={cls.progress} label={`전체 진도 · 수업 ${cls.lessonsCount}개`} />
      </div>

      {/* Lesson Records Table */}
      <div style={{ marginTop: 20 }}>
        <div className="section-title">📊 수업 기록</div>
        <div className="lesson-table-wrapper">
          <table className="lesson-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>출결</th>
                <th>수업내용</th>
                <th>과제 결과</th>
                <th>다음 과제</th>
                <th>테스트</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  <td className="cell-date">
                    <span className="date-main">{r.date}</span>
                    <span className="date-sub">({r.dayOfWeek}) {r.time}</span>
                  </td>
                  <td className="cell-attendance">
                    <span className={`att-badge att-${r.attendance}`}>
                      {attendanceIcon(r.attendance)} {attendanceLabel(r.attendance)}
                    </span>
                  </td>
                  <td className="cell-content">{r.content}</td>
                  <td className="cell-result">{r.assignmentResult || <span className="text-dim">—</span>}</td>
                  <td className="cell-next">{r.nextAssignment || <span className="text-dim">—</span>}</td>
                  <td className="cell-test">{r.testResult || <span className="text-dim">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comment Section */}
      <div style={{ marginTop: 24 }}>
        <div className="section-title">💬 코멘트</div>
        <div className="comment-section">
          <div className="comment-list">
            {comments.map((c) => (
              <div key={c.id} className={`comment-bubble ${c.role === 'student' ? 'mine' : ''}`}>
                <div className={`bubble-content bubble-${c.role}`}>
                  <div className="bubble-header">
                    <span className="bubble-role-icon">
                      {c.role === 'teacher' ? '👨‍🏫' : c.role === 'parent' ? '👩' : '🧑'}
                    </span>
                    <span className="bubble-name">{c.name}</span>
                    <span className="bubble-time">{c.timestamp.split(' ')[1]}</span>
                  </div>
                  <div className="bubble-message">{c.message}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Comment Input */}
          <div className="comment-input-wrapper">
            <input
              type="text"
              className="comment-input"
              placeholder="메시지를 입력하세요..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newComment.trim()) {
                  setNewComment('')
                }
              }}
            />
            <button
              className="comment-send-btn"
              disabled={!newComment.trim()}
              onClick={() => {
                if (newComment.trim()) setNewComment('')
              }}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Subject categories for dropdown
const SUBJECT_CATEGORIES: Record<string, string[]> = {
  '국어': ['국어'],
  '수학': ['수학'],
  '영어': ['영어'],
  '사회': ['사회'],
  '과학': ['과학'],
  '기타': [],
}

function ClassesPage() {
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [navMode, setNavMode] = useState<'calendar' | 'dropdown'>('calendar')

  // Dropdown states
  const [selCategory, setSelCategory] = useState<string>('')
  const [selSubject, setSelSubject] = useState<string>('')
  const [selClassId, setSelClassId] = useState<string>('')

  // Calendar: clicking a lesson event opens its class
  const handleLessonClick = (lesson: LessonEvent) => {
    const cls = MOCK_CLASSES.find(c => c.id === lesson.classId)
    if (cls) setSelectedClass(cls)
  }

  // Dropdown: filtered lists
  const availableSubjects = selCategory ? (SUBJECT_CATEGORIES[selCategory] || []) : []
  const availableClasses = selSubject ? MOCK_CLASSES.filter(c => c.subject === selSubject) : []

  const handleDropdownSelect = (classId: string) => {
    setSelClassId(classId)
    const cls = MOCK_CLASSES.find(c => c.id === classId)
    if (cls) setSelectedClass(cls)
  }

  if (selectedClass) {
    return <ClassDetailView cls={selectedClass} onBack={() => {
      setSelectedClass(null)
      setSelClassId('')
    }} />
  }

  return (
    <div>
      <div className="page-header">
        <h1>📚 내 수업</h1>
        <p className="page-description">일정 또는 과목으로 수업을 선택하세요</p>
      </div>

      {/* Navigation Mode Toggle */}
      <div className="classes-nav-toggle">
        <button
          className={`nav-toggle-btn ${navMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setNavMode('calendar')}
        >
          📅 일정으로 찾기
        </button>
        <button
          className={`nav-toggle-btn ${navMode === 'dropdown' ? 'active' : ''}`}
          onClick={() => setNavMode('dropdown')}
        >
          📂 과목으로 찾기
        </button>
      </div>

      {/* ====== CALENDAR MODE ====== */}
      {navMode === 'calendar' && (
        <div>
          <LessonCalendar lessons={MOCK_LESSONS} onLessonClick={handleLessonClick} />

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button className="btn btn-outline">➕ 초대 코드로 참여하기</button>
          </div>
        </div>
      )}

      {/* ====== DROPDOWN MODE ====== */}
      {navMode === 'dropdown' && (
        <div>
          {/* Cascading Dropdowns */}
          <div className="dropdown-cascade">
            {/* Step 1: 교과 */}
            <div className="dropdown-step">
              <label className="dropdown-label">① 교과 선택</label>
              <div className="dropdown-chips">
                {Object.keys(SUBJECT_CATEGORIES).map(cat => (
                  <button
                    key={cat}
                    className={`dropdown-chip ${selCategory === cat ? 'active' : ''}`}
                    onClick={() => {
                      setSelCategory(cat)
                      setSelSubject('')
                      setSelClassId('')
                    }}
                  >
                    {cat === '국어' ? '📖' : cat === '수학' ? '🔢' : cat === '영어' ? '🌐' : cat === '사회' ? '🌍' : cat === '과학' ? '🔬' : '📁'} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: 과목 */}
            {selCategory && availableSubjects.length > 0 && (
              <div className="dropdown-step">
                <label className="dropdown-label">② 과목 선택</label>
                <div className="dropdown-chips">
                  {availableSubjects.map(sub => (
                    <button
                      key={sub}
                      className={`dropdown-chip ${selSubject === sub ? 'active' : ''}`}
                      onClick={() => {
                        setSelSubject(sub)
                        setSelClassId('')
                      }}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: 수업명 */}
            {selSubject && availableClasses.length > 0 && (
              <div className="dropdown-step">
                <label className="dropdown-label">③ 수업 선택</label>
                <div className="dropdown-class-list">
                  {availableClasses.map(cls => (
                    <div
                      key={cls.id}
                      className={`dropdown-class-item ${selClassId === cls.id ? 'active' : ''}`}
                      onClick={() => handleDropdownSelect(cls.id)}
                    >
                      <div className="dropdown-class-info">
                        <div className="dropdown-class-name">📖 {cls.name}</div>
                        <div className="dropdown-class-meta">{cls.teacher} · {cls.academy}</div>
                      </div>
                      <ProgressBar value={cls.progress} label={`${cls.lessonsCount}개`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selSubject && availableClasses.length === 0 && (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-icon">📭</div>
                <div className="empty-text">해당 과목에 등록된 수업이 없습니다</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button className="btn btn-outline">➕ 초대 코드로 참여하기</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== ACCOUNT LINKAGE PAGE =====

interface LinkedAccount {
  linkId: number
  partnerId: number
  partnerName: string
  partnerType: string
  linkedAt: string
}

const ACCOUNT_GROUPS = [
  { key: 'student', label: '학생', emoji: '🎓', color: '#3b82f6' },
  { key: 'parent', label: '학부모', emoji: '❤️', color: '#ec4899' },
  { key: 'teacher', label: '선생님', emoji: '📖', color: '#22c55e' },
] as const

function AccountLinkagePage() {
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [linksLoading, setLinksLoading] = useState(true)
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null)

  const hubUrl = import.meta.env.VITE_HUB_URL || 'http://localhost:3000'

  const fetchLinkedAccounts = async () => {
    try {
      setLinksLoading(true)
      const result = await hubApi.get<LinkedAccount[]>('/mentoring/links')
      setLinkedAccounts(Array.isArray(result) ? result : [])
    } catch (err) {
      console.error('[계정연동] 연동 목록 조회 실패:', err)
    } finally {
      setLinksLoading(false)
    }
  }

  useEffect(() => {
    fetchLinkedAccounts()
  }, [])

  const groupedAccounts = useMemo(() => {
    const groups: Record<string, LinkedAccount[]> = {
      student: [],
      parent: [],
      teacher: [],
    }
    linkedAccounts.forEach((account) => {
      const type = account.partnerType || 'student'
      if (groups[type]) {
        groups[type].push(account)
      } else {
        groups.student.push(account)
      }
    })
    return groups
  }, [linkedAccounts])

  const handleCreateInvite = async () => {
    setInviteLoading(true)
    try {
      const result = await hubApi.post<{ code: string }>('/mentoring/invite')
      if (result?.code) {
        setInviteCode(result.code)
        setCopied(false)
      }
    } catch (err) {
      console.error('[계정연동] 초대 생성 실패:', err)
    } finally {
      setInviteLoading(false)
    }
  }

  const inviteLink = inviteCode
    ? `${hubUrl}/account-linkage/accept?code=${inviteCode}`
    : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const handleUnlink = async (linkId: number) => {
    if (!confirm('정말 연동을 해제하시겠습니까?')) return
    setUnlinkingId(linkId)
    try {
      await hubApi.delete(`/mentoring/links/${linkId}`)
      fetchLinkedAccounts()
    } catch {
      console.error('[계정연동] 연동 해제 실패')
    } finally {
      setUnlinkingId(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>🔗 계정 공유</h1>
        <p className="page-description">초대 링크를 생성하여 선생님/학부모 계정을 연동할 수 있습니다.</p>
      </div>

      {/* 초대 링크 생성 카드 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">✉️ 초대 링크 생성</div>

        <div style={{
          backgroundColor: 'var(--color-bg)',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 16,
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.7,
        }}>
          <p>1. 아래 버튼을 눌러 초대 링크를 생성합니다.</p>
          <p>2. 생성된 링크를 카톡이나 문자로 상대에게 보냅니다.</p>
          <p>3. 상대가 링크를 클릭하면 계정이 연동됩니다.</p>
          <p style={{ color: 'var(--color-accent)', fontWeight: 600 }}>※ 링크는 24시간 동안 유효합니다.</p>
        </div>

        {!inviteCode ? (
          <button
            className="btn btn-primary"
            onClick={handleCreateInvite}
            disabled={inviteLoading}
            style={{ width: '100%' }}
          >
            {inviteLoading ? '⏳ 생성 중...' : '🔗 초대 링크 생성하기'}
          </button>
        ) : (
          <div>
            <input
              type="text"
              readOnly
              value={inviteLink}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                fontSize: '0.82rem',
                fontFamily: 'monospace',
                color: 'var(--color-text)',
                marginBottom: 10,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={handleCopy}
                style={{ flex: 1 }}
              >
                {copied ? '✅ 복사됨!' : '📋 링크 복사'}
              </button>
              <button
                className="btn btn-outline"
                onClick={handleCreateInvite}
                disabled={inviteLoading}
              >
                🔄 새 링크
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 연동된 계정 목록 */}
      <div className="card">
        <div className="section-title">👥 연동된 계정</div>

        {linksLoading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
          </div>
        ) : linkedAccounts.length > 0 ? (
          <div>
            {ACCOUNT_GROUPS.map((group) => {
              const accounts = groupedAccounts[group.key] || []
              if (accounts.length === 0) return null

              return (
                <div key={group.key} style={{ marginBottom: 20 }}>
                  {/* 그룹 헤더 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    paddingBottom: 6,
                    borderBottom: '1px solid var(--color-border)',
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>{group.emoji}</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{group.label}</span>
                    <span style={{
                      fontSize: '0.75rem',
                      backgroundColor: group.color + '20',
                      color: group.color,
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontWeight: 600,
                    }}>
                      {accounts.length}명
                    </span>
                  </div>

                  {/* 계정 리스트 */}
                  {accounts.map((account) => (
                    <div
                      key={account.linkId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: '1px solid var(--color-border)',
                        marginBottom: 8,
                        backgroundColor: 'var(--color-surface)',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          backgroundColor: group.color + '20',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                        }}>
                          {group.emoji}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{account.partnerName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {new Date(account.linkedAt).toLocaleDateString('ko-KR')} 연동
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnlink(account.linkId)}
                        disabled={unlinkingId === account.linkId}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 8,
                          borderRadius: 8,
                          color: 'var(--color-text-muted)',
                          transition: 'all 0.2s',
                          fontSize: '1rem',
                          opacity: unlinkingId === account.linkId ? 0.5 : 1,
                        }}
                        title="연동 해제"
                      >
                        {unlinkingId === account.linkId ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-text">연동된 계정이 없습니다.</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              위에서 초대 링크를 생성하여 계정을 연동해보세요.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== LOGIN BANNER =====

function LoginBanner({ onClose }: { onClose: () => void }) {
  return (
    <div className="login-banner">
      <div className="login-banner-content">
        <span className="login-banner-icon">🎓</span>
        <span className="login-banner-text">
          로그인하면 학생, 선생님, 학부모가 함께 하는 수업 관리가 가능합니다
        </span>
        <button className="login-banner-cta" onClick={() => redirectToLogin()}>로그인</button>
      </div>
      <button className="login-banner-close" onClick={onClose} aria-label="닫기">✕</button>
    </div>
  )
}

// ===== LOGIN MODAL =====

function LoginModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={e => e.stopPropagation()}>
        <button className="login-modal-close" onClick={onClose}>✕</button>
        <div className="login-modal-icon">🔐</div>
        <h3 className="login-modal-title">로그인이 필요합니다</h3>
        <p className="login-modal-message">{message}</p>
        <button className="btn btn-login" onClick={() => redirectToLogin()} style={{ width: '100%', marginTop: 16 }}>
          🚀 로그인하기
        </button>
        <button className="btn btn-ghost" onClick={onClose} style={{ width: '100%', marginTop: 8 }}>
          계속 둘러보기
        </button>
      </div>
    </div>
  )
}

// ===== PROMO PAGE =====

function PromoPage() {
  return (
    <div className="promo-page">
      {/* Hero Section */}
      <section className="promo-hero">
        <div className="promo-hero-badge">🎓 학생 전용 학습 플랫폼</div>
        <h1 className="promo-hero-title">
          나의 수업,
          <br />
          <span className="promo-hero-accent">한눈에 관리하세요</span>
        </h1>
        <p className="promo-hero-description">
          TutorBoard와 함께 수업 일정, 과제, 성적을 체계적으로 관리하고
          <br />
          선생님·학부모와 실시간으로 소통하세요.
        </p>
        <button className="btn btn-login" onClick={() => redirectToLogin()}>
          🚀 시작하기
        </button>
      </section>

      {/* Features Section */}
      <section className="promo-features">
        <div className="promo-feature-card">
          <div className="promo-feature-icon">📅</div>
          <h3 className="promo-feature-title">수업 일정 관리</h3>
          <p className="promo-feature-desc">
            월별·주별·일별 캘린더로 모든 수업 일정을 확인하고 관리합니다.
          </p>
        </div>
        <div className="promo-feature-card">
          <div className="promo-feature-icon">📝</div>
          <h3 className="promo-feature-title">과제 & 성적 추적</h3>
          <p className="promo-feature-desc">
            과제 제출 현황과 성적 피드백을 실시간으로 확인할 수 있습니다.
          </p>
        </div>
        <div className="promo-feature-card">
          <div className="promo-feature-icon">💬</div>
          <h3 className="promo-feature-title">선생님·학부모 소통</h3>
          <p className="promo-feature-desc">
            수업별 코멘트와 계정 연동으로 원활한 소통이 가능합니다.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="promo-footer">
        <p>© 2026 TutorBoard. 더 나은 학습을 위한 첫 걸음.</p>
      </div>
    </div>
  )
}

// ===== MAIN APP =====
type TabId = 'home' | 'classes' | 'assignments' | 'notifications'

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [showLinkage, setShowLinkage] = useState(false)
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const [showBanner, setShowBanner] = useState(true)
  const [loginModalMessage, setLoginModalMessage] = useState<string | null>(null)

  // SSO 코드가 있으면 백그라운드로 처리 (화면 차단 없음)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('sso_code')) {
      processSSOLogin().then((ok) => { if (ok) setLoggedIn(true) })
    }
  }, [])

  const tabs: Array<{ id: TabId; icon: string; label: string }> = [
    { id: 'home', icon: '🏠', label: '홈' },
    { id: 'classes', icon: '📚', label: '수업' },
    { id: 'assignments', icon: '📝', label: '과제' },
    { id: 'notifications', icon: '🔔', label: '알림' },
  ]

  const unreadCount = 5

  return (
    <>
      {/* Login Banner (비로그인 시) */}
      {!loggedIn && showBanner && (
        <LoginBanner onClose={() => setShowBanner(false)} />
      )}

      {/* Login Modal */}
      {loginModalMessage && (
        <LoginModal
          message={loginModalMessage}
          onClose={() => setLoginModalMessage(null)}
        />
      )}

      {/* Navbar */}
      <nav className="navbar">
        <a className="navbar-brand" href="/">
          <span className="logo-icon">🎓</span>
          TutorBoard
        </a>
        <div className="navbar-actions">
          {loggedIn ? (
            <>
              <button
                className="notification-btn"
                onClick={() => { setShowLinkage(!showLinkage); if (showLinkage) setActiveTab('home') }}
                title="계정 공유"
                style={{ position: 'relative' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
              </button>
              <button className="notification-btn" onClick={() => { setShowLinkage(false); setActiveTab('notifications') }}>
                🔔
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              <button
                className="notification-btn"
                onClick={() => { if (confirm('로그아웃 하시겠습니까?')) { logout(); setLoggedIn(false) } }}
                title="로그아웃"
              >
                🔓
              </button>
            </>
          ) : (
            <button
              className="btn btn-outline"
              onClick={() => redirectToLogin()}
              style={{ fontSize: '0.8rem', padding: '8px 16px' }}
            >
              로그인
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <main className="main-content">
        {showLinkage && loggedIn ? (
          <AccountLinkagePage />
        ) : (
          <>
            {activeTab === 'home' && (loggedIn ? <DashboardPage /> : <PromoPage />)}
            {activeTab === 'classes' && <ClassesPage />}
            {activeTab === 'assignments' && <AssignmentsPage />}
            {activeTab === 'notifications' && <NotificationsPage />}
          </>
        )}
      </main>

      {/* Bottom Tabs */}
      <div className="bottom-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setShowLinkage(false) }}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </>
  )
}

export default App
