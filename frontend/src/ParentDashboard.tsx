import { useState, useEffect } from 'react'
import { api } from './lib/api'

// ===== TYPES =====
interface ChildInfo {
    student: { id: string; username: string; avatarUrl: string | null }
    classes: Array<{ id: string; name: string; teacher: { username: string } }>
    todayAttendance: Array<{ status: string; class: { name: string } }>
    pendingAssignments: number
}

interface TimelineItem {
    type: 'lesson' | 'test' | 'assignment'
    date: string
    title: string
    className: string
    summary?: string
    score?: number
    maxScore?: number
    status?: string
    grade?: number
    pagesFrom?: number
    pagesTo?: number
}

interface TestTrendItem {
    testTitle: string
    date: string
    score: number
    maxScore: number
    percentage: number
}

interface CommentItem {
    id: string
    content: string
    createdAt: string
    author: { id: string; username: string; role: string }
}

interface NotifItem {
    id: string
    message: string
    type: string
    read: boolean
    sentAt: string
}

type ParentTab = 'dashboard' | 'timeline' | 'trend' | 'comments'

export default function ParentDashboard() {
    const [tab, setTab] = useState<ParentTab>('dashboard')
    const [children, setChildren] = useState<ChildInfo[]>([])
    const [notifications, setNotifications] = useState<NotifItem[]>([])
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
    const [timeline, setTimeline] = useState<TimelineItem[]>([])
    const [testTrend, setTestTrend] = useState<TestTrendItem[]>([])
    const [comments, setComments] = useState<CommentItem[]>([])
    const [replyText, setReplyText] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadDashboard() }, [])
    useEffect(() => {
        if (selectedChildId) {
            loadTimeline(selectedChildId)
            loadTestTrend(selectedChildId)
            loadComments(selectedChildId)
        }
    }, [selectedChildId])

    async function loadDashboard() {
        const data = await api.get<{ children: ChildInfo[]; recentNotifications: NotifItem[] }>('/parent/dashboard')
        if (data) {
            setChildren(data.children || [])
            setNotifications(data.recentNotifications || [])
            if (data.children?.length > 0 && !selectedChildId) setSelectedChildId(data.children[0].student.id)
        }
        setLoading(false)
    }

    async function loadTimeline(childId: string) {
        const data = await api.get<TimelineItem[]>(`/parent/children/${childId}/timeline`)
        if (data) setTimeline(data)
    }

    async function loadTestTrend(childId: string) {
        const data = await api.get<TestTrendItem[]>(`/parent/children/${childId}/test-trend`)
        if (data) setTestTrend(data)
    }

    async function loadComments(childId: string) {
        const data = await api.get<CommentItem[]>(`/parent/children/${childId}/comments`)
        if (data) setComments(data)
    }

    async function sendReply() {
        if (!selectedChildId || !replyText.trim()) return
        const teacherComment = comments.find(c => c.author.role === 'teacher')
        if (!teacherComment) { alert('답변할 선생님 코멘트가 없습니다.'); return }
        const result = await api.post('/parent/comments/reply', {
            targetId: teacherComment.author.id, studentId: selectedChildId, content: replyText,
        })
        if (result) { setReplyText(''); loadComments(selectedChildId) }
        else { alert('답변 전송 실패') }
    }

    const selectedChild = children.find(c => c.student.id === selectedChildId)

    const tabs: Array<{ id: ParentTab; label: string; icon: string }> = [
        { id: 'dashboard', label: '현황', icon: '🏠' },
        { id: 'timeline', label: '타임라인', icon: '📅' },
        { id: 'trend', label: '성적추이', icon: '📈' },
        { id: 'comments', label: '상담', icon: '💬' },
    ]

    function getAttStatusIcon(status: string) { return status === 'present' ? '✅' : status === 'late' ? '⏰' : '❌' }
    function getAttStatusLabel(status: string) { return status === 'present' ? '출석' : status === 'late' ? '지각' : '결석' }

    return (
        <div className="parent-dashboard">
            <div className="teacher-tabs">
                {tabs.map(t => (
                    <button key={t.id} className={`teacher-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                        <span>{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            {children.length > 1 && (
                <div className="class-selector">
                    <label>자녀 선택:</label>
                    <select value={selectedChildId || ''} onChange={e => setSelectedChildId(e.target.value)}>
                        {children.map(c => <option key={c.student.id} value={c.student.id}>{c.student.username}</option>)}
                    </select>
                </div>
            )}

            {/* Dashboard */}
            {tab === 'dashboard' && (
                <div className="dashboard-grid">
                    {loading ? <div className="loading-spinner">로딩 중...</div> : children.length === 0 ? (
                        <div className="empty-state"><div className="empty-icon">👨‍👩‍👧</div><p>연결된 자녀가 없습니다.<br />선생님에게 학부모 연동을 요청해주세요.</p></div>
                    ) : (
                        <>
                            {children.map(child => (
                                <div key={child.student.id} className="child-card card-section">
                                    <div className="child-header"><div className="student-avatar-sm">{child.student.username[0]}</div><h3>{child.student.username}</h3></div>
                                    <div className="child-classes">{child.classes.map(cls => <div key={cls.id} className="child-class-item"><span className="class-name">{cls.name}</span><span className="teacher-name">{cls.teacher.username}</span></div>)}</div>
                                    <div className="child-stats">
                                        <div className="child-stat"><span className="child-stat-label">오늘 출결</span>
                                            <div className="child-attendance-tags">
                                                {child.todayAttendance.length === 0 ? <span className="att-badge att-none">기록 없음</span> :
                                                    child.todayAttendance.map((a, i) => <span key={i} className={`att-badge att-${a.status}`}>{getAttStatusIcon(a.status)} {a.class.name} {getAttStatusLabel(a.status)}</span>)}
                                            </div>
                                        </div>
                                        <div className="child-stat"><span className="child-stat-label">미완료 과제</span><span className={`child-stat-value ${child.pendingAssignments > 0 ? 'warn' : ''}`}>{child.pendingAssignments}건</span></div>
                                    </div>
                                </div>
                            ))}
                            {notifications.length > 0 && (
                                <div className="card-section notifications-preview"><h3>🔔 최근 알림</h3>
                                    {notifications.slice(0, 5).map(n => <div key={n.id} className={`notif-item ${n.read ? 'read' : 'unread'}`}><span className="notif-msg">{n.message}</span><span className="notif-time">{new Date(n.sentAt).toLocaleDateString('ko-KR')}</span></div>)}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Timeline */}
            {tab === 'timeline' && (
                <div className="timeline-section">
                    <h3>📅 {selectedChild?.student.username || '자녀'} 학습 타임라인</h3>
                    {timeline.length === 0 ? <div className="empty-state"><div className="empty-icon">📅</div><p>학습 기록이 없습니다.</p></div> : (
                        <div className="timeline-list">
                            {timeline.map((item, i) => (
                                <div key={i} className={`timeline-item timeline-${item.type}`}>
                                    <div className="timeline-dot">{item.type === 'lesson' ? '📖' : item.type === 'test' ? '📊' : '📝'}</div>
                                    <div className="timeline-content">
                                        <div className="timeline-header"><span className="timeline-type-badge">{item.type === 'lesson' ? '수업' : item.type === 'test' ? '테스트' : '과제'}</span><span className="timeline-date">{new Date(item.date).toLocaleDateString('ko-KR')}</span></div>
                                        <h4>{item.title}</h4><span className="timeline-class">{item.className}</span>
                                        {item.type === 'lesson' && item.summary && <p className="timeline-summary">{item.summary}</p>}
                                        {item.type === 'lesson' && item.pagesFrom && item.pagesTo && <p className="timeline-pages">📄 p.{item.pagesFrom} ~ p.{item.pagesTo}</p>}
                                        {item.type === 'test' && <p className="timeline-score">점수: <strong>{item.score}/{item.maxScore}</strong> ({Math.round((item.score! / item.maxScore!) * 100)}%)</p>}
                                        {item.type === 'assignment' && <p className="timeline-status">상태: {item.status === 'graded' ? `채점됨 (${item.grade}점)` : item.status === 'submitted' ? '제출됨' : '미제출'}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Test Trend */}
            {tab === 'trend' && (
                <div className="trend-section">
                    <h3>📈 {selectedChild?.student.username || '자녀'} 성적 추이</h3>
                    {testTrend.length === 0 ? <div className="empty-state"><div className="empty-icon">📈</div><p>테스트 기록이 없습니다.</p></div> : (
                        <>
                            <div className="trend-chart">
                                {testTrend.map((t, i) => (
                                    <div key={i} className="trend-bar-group">
                                        <div className="trend-bar-wrapper"><div className="trend-bar" style={{ height: `${t.percentage}%` }} title={`${t.testTitle}: ${t.score}/${t.maxScore}점 (${t.percentage}%)`}><span className="trend-bar-label">{t.percentage}%</span></div></div>
                                        <span className="trend-bar-title" title={t.testTitle}>{t.testTitle.length > 6 ? t.testTitle.slice(0, 6) + '…' : t.testTitle}</span>
                                    </div>
                                ))}
                            </div>
                            <table className="trend-table"><thead><tr><th>테스트명</th><th>날짜</th><th>점수</th><th>비율</th></tr></thead>
                                <tbody>{testTrend.map((t, i) => <tr key={i}><td>{t.testTitle}</td><td>{new Date(t.date).toLocaleDateString('ko-KR')}</td><td>{t.score}/{t.maxScore}</td><td><span className={`percentage-badge ${t.percentage >= 80 ? 'good' : t.percentage >= 60 ? 'mid' : 'low'}`}>{t.percentage}%</span></td></tr>)}</tbody>
                            </table>
                        </>
                    )}
                </div>
            )}

            {/* Comments */}
            {tab === 'comments' && (
                <div className="comments-section">
                    <h3>💬 선생님 비공개 코멘트</h3>
                    {comments.length === 0 ? <div className="empty-state"><div className="empty-icon">💬</div><p>코멘트가 없습니다.</p></div> : (
                        <div className="comments-list">
                            {comments.map(c => (
                                <div key={c.id} className={`comment-bubble ${c.author.role === 'teacher' ? 'from-teacher' : 'from-parent'}`}>
                                    <div className="comment-meta"><span className="comment-author">{c.author.role === 'teacher' ? '👩‍🏫' : '👩‍👧'} {c.author.username}</span><span className="comment-time">{new Date(c.createdAt).toLocaleString('ko-KR')}</span></div>
                                    <p>{c.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="comment-reply-box">
                        <textarea placeholder="답변을 입력하세요..." value={replyText} onChange={e => setReplyText(e.target.value)} />
                        <button className="btn-primary" onClick={sendReply} disabled={!replyText.trim()}>답변 보내기</button>
                    </div>
                </div>
            )}
        </div>
    )
}
