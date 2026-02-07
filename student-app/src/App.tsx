import { useState, useEffect } from 'react'
import { isLoggedIn, processSSOLogin, redirectToLogin, logout } from './lib/auth'
import { api } from './lib/api'
import './index.css'

// ===== TYPES =====
interface DashboardData {
  summary: {
    totalClasses: number
    avgProgress: number
    pendingAssignments: number
    avgScore: number
    unreadNotifications: number
  }
  recentTests: Array<{
    testTitle: string
    score: number
    maxScore: number
    percentage: number
    takenAt: string
  }>
  upcomingDeadlines: Array<{
    id: string
    title: string
    dueDate: string
    className: string
    daysLeft: number | null
  }>
  recentBadges: Array<{
    id: string
    badgeType: string
    badgeName: string
    earnedAt: string
  }>
}

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

// ===== MOCK DATA =====
const MOCK_DASHBOARD: DashboardData = {
  summary: {
    totalClasses: 3,
    avgProgress: 72,
    pendingAssignments: 3,
    avgScore: 85,
    unreadNotifications: 5,
  },
  recentTests: [
    { testTitle: '수학 중간고사', score: 88, maxScore: 100, percentage: 88, takenAt: '2026-02-05' },
    { testTitle: '영어 단어', score: 92, maxScore: 100, percentage: 92, takenAt: '2026-02-03' },
    { testTitle: '과학 퀴즈', score: 75, maxScore: 100, percentage: 75, takenAt: '2026-01-28' },
    { testTitle: '국어 독해', score: 80, maxScore: 100, percentage: 80, takenAt: '2026-01-20' },
    { testTitle: '수학 쪽지시험', score: 95, maxScore: 100, percentage: 95, takenAt: '2026-01-15' },
  ],
  upcomingDeadlines: [
    { id: '1', title: '수학 과제 3장', dueDate: '2026-02-09', className: '수학 심화반', daysLeft: 2 },
    { id: '2', title: '영어 단어 테스트 준비', dueDate: '2026-02-12', className: '영어 회화반', daysLeft: 5 },
    { id: '3', title: '과학 실험 보고서', dueDate: '2026-02-14', className: '과학 탐구반', daysLeft: 7 },
  ],
  recentBadges: [
    { id: '1', badgeType: 'streak', badgeName: '🔥 5일 연속 출석', earnedAt: '2026-02-07' },
    { id: '2', badgeType: 'perfect', badgeName: '💯 만점 달성', earnedAt: '2026-02-03' },
    { id: '3', badgeType: 'submit', badgeName: '📝 과제 10개 완료', earnedAt: '2026-01-28' },
  ],
}

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

// ===== COMPONENTS =====

function ScoreChart({ data }: { data: DashboardData['recentTests'] }) {
  const maxPercentage = 100
  return (
    <div className="chart-container">
      <div className="chart-bars">
        {data.map((item, i) => (
          <div className="chart-bar-wrapper" key={i}>
            <div
              className="chart-bar"
              style={{ height: `${(item.percentage / maxPercentage) * 100}%` }}
            >
              <span className="bar-value">{item.percentage}%</span>
            </div>
            <span className="chart-bar-label">{item.testTitle.slice(0, 5)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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

function LoginPage() {
  return (
    <div className="login-page">
      <div className="hero-icon">🎓</div>
      <h1>TutorBoard</h1>
      <p className="subtitle">나의 학습을 한눈에 관리하세요</p>
      <button className="btn btn-login" onClick={redirectToLogin}>
        🚀 로그인하고 시작하기
      </button>
    </div>
  )
}

function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await api.get<DashboardData>('/dashboard/student')
      setData(result || MOCK_DASHBOARD) // fallback to mock
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="empty-state"><div className="empty-icon">⏳</div></div>
  if (!data) return null

  return (
    <div>
      <div className="page-header">
        <h1>👋 안녕하세요!</h1>
        <p className="page-description">오늘도 열심히 공부해봐요</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="value">{data.summary.avgProgress}%</div>
          <div className="label">전체 진도</div>
        </div>
        <div className="summary-card">
          <div className="value">{data.summary.pendingAssignments}</div>
          <div className="label">미제출 과제</div>
          {data.summary.pendingAssignments > 0 && (
            <div className="trend trend-down">⚠️ 제출 필요</div>
          )}
        </div>
        <div className="summary-card">
          <div className="value">{data.summary.avgScore}</div>
          <div className="label">평균 점수</div>
          <div className="trend trend-up">▲ +5점</div>
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar value={data.summary.avgProgress} label="📊 전체 학습 진도" />

      {/* Badges */}
      {data.recentBadges.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="section-title">🏆 최근 배지</div>
          <div className="badge-row">
            {data.recentBadges.map((b) => (
              <div className="badge" key={b.id}>
                <span className="badge-icon">{b.badgeName.split(' ')[0]}</span>
                {b.badgeName.split(' ').slice(1).join(' ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Deadlines */}
      <div style={{ marginTop: 20 }}>
        <div className="section-title">📝 다가오는 마감</div>
        <div className="deadline-list">
          {data.upcomingDeadlines.map((d) => (
            <div className={`deadline-item ${d.daysLeft !== null && d.daysLeft <= 2 ? 'urgent' : ''}`} key={d.id}>
              <span className="deadline-icon">⏰</span>
              <div className="deadline-info">
                <div className="deadline-title">{d.title}</div>
                <div className="deadline-class">{d.className}</div>
              </div>
              <span className="deadline-days">
                {d.daysLeft !== null ? `D-${d.daysLeft}` : '날짜 미정'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Score Chart */}
      <div style={{ marginTop: 20 }}>
        <div className="section-title">📈 점수 추이</div>
        <div className="card">
          <ScoreChart data={data.recentTests} />
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
      setAssignments(result || MOCK_ASSIGNMENTS) // fallback to mock
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

function ClassesPage() {
  return (
    <div>
      <div className="page-header">
        <h1>📚 내 수업</h1>
        <p className="page-description">등록된 클래스를 확인하세요</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { name: '수학 심화반', teacher: '김선생님', progress: 72, lessonsCount: 12 },
          { name: '영어 회화반', teacher: '박선생님', progress: 58, lessonsCount: 8 },
          { name: '과학 탐구반', teacher: '이선생님', progress: 85, lessonsCount: 10 },
        ].map((cls, i) => (
          <div className="card" key={i}>
            <div className="card-header">
              <div className="card-title">📖 {cls.name}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cls.teacher}</span>
            </div>
            <ProgressBar value={cls.progress} label={`수업 ${cls.lessonsCount}개`} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <button className="btn btn-outline">➕ 초대 코드로 참여하기</button>
      </div>
    </div>
  )
}

// ===== MAIN APP =====
type TabId = 'home' | 'classes' | 'assignments' | 'notifications'

function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [ssoProcessing, setSsoProcessing] = useState(false)

  useEffect(() => {
    async function handleSSO() {
      const params = new URLSearchParams(window.location.search)
      if (params.has('sso_code')) {
        setSsoProcessing(true)
        const success = await processSSOLogin()
        if (success) {
          setLoggedIn(true)
        }
        setSsoProcessing(false)
      }
    }
    handleSSO()
  }, [])

  if (ssoProcessing) {
    return (
      <div className="login-page">
        <div className="hero-icon" style={{ animation: 'pulse-badge 1s infinite' }}>⌛</div>
        <h1>로그인 중...</h1>
      </div>
    )
  }

  if (!loggedIn) {
    return <LoginPage />
  }

  const tabs: Array<{ id: TabId; icon: string; label: string }> = [
    { id: 'home', icon: '🏠', label: '홈' },
    { id: 'classes', icon: '📚', label: '수업' },
    { id: 'assignments', icon: '📝', label: '과제' },
    { id: 'notifications', icon: '🔔', label: '알림' },
  ]

  const unreadCount = 5 // In real app, fetch from API

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <a className="navbar-brand" href="/">
          <span className="logo-icon">🎓</span>
          TutorBoard
        </a>
        <div className="navbar-actions">
          <button className="notification-btn" onClick={() => setActiveTab('notifications')}>
            🔔
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          <button className="avatar-btn" onClick={logout} title="로그아웃">
            S
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="main-content">
        {activeTab === 'home' && <DashboardPage />}
        {activeTab === 'classes' && <ClassesPage />}
        {activeTab === 'assignments' && <AssignmentsPage />}
        {activeTab === 'notifications' && <NotificationsPage />}
      </main>

      {/* Bottom Tabs */}
      <div className="bottom-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
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
