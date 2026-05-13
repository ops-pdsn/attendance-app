'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DarkModeToggle from '@/components/DarkModeToggle'
import UserNav from '@/components/UserNav'
import NotificationBell from '@/components/NotificationBell'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'

export const dynamic = 'force-dynamic'

const PRIORITY_STYLES = {
  urgent: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
  high: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30',
  normal: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  low: 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50'
}
const PRIORITY_BADGE = {
  urgent: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
  high: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
  normal: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  low: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
}

export default function AnnouncementsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()
  const { confirm } = useConfirm()

  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'normal',
    targetRole: 'all',
    expiresAt: ''
  })

  const isAdmin = ['admin', 'hr'].includes(session?.user?.role)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    else if (status === 'authenticated') fetchAnnouncements()
  }, [status])

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/announcements')
      if (res.ok) setAnnouncements(await res.json())
    } catch { toast.error('Failed to load announcements') }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ title: '', content: '', priority: 'normal', targetRole: 'all', expiresAt: '' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      title: item.title,
      content: item.content,
      priority: item.priority,
      targetRole: item.targetRole || 'all',
      expiresAt: item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.content) return toast.error('Title and content are required')
    setSubmitting(true)
    try {
      const url = editItem ? `/api/announcements/${editItem.id}` : '/api/announcements'
      const method = editItem ? 'PATCH' : 'POST'
      const body = { ...form, expiresAt: form.expiresAt || null }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(editItem ? 'Announcement updated' : 'Announcement published')
      setShowModal(false)
      fetchAnnouncements()
    } catch (err) { toast.error(err.message) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this announcement? This cannot be undone.', { confirmText: 'Delete', type: 'danger' })
    if (!ok) return
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Announcement deleted')
      fetchAnnouncements()
    } catch (err) { toast.error(err.message) }
  }

  if (status === 'loading') return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Announcements</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Company notices & updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Post
              </button>
            )}
            <NotificationBell />
            <DarkModeToggle />
            <UserNav />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <p className="text-5xl mb-3">📢</p>
            <p className="text-slate-600 dark:text-slate-300 font-medium">No announcements</p>
            <p className="text-slate-400 text-sm mt-1">Check back later for updates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(ann => {
              const isExpired = ann.expiresAt && new Date(ann.expiresAt) < new Date()
              return (
                <div key={ann.id} className={`rounded-2xl border p-5 transition-all ${PRIORITY_STYLES[ann.priority]} ${isExpired ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_BADGE[ann.priority]}`}>{ann.priority}</span>
                        {ann.targetRole !== 'all' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 capitalize">{ann.targetRole} only</span>
                        )}
                        {isExpired && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">Expired</span>}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{ann.title}</h3>
                      <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                        <span>By {ann.author?.name || 'Admin'}</span>
                        <span>•</span>
                        <span>{new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {ann.expiresAt && !isExpired && (
                          <>
                            <span>•</span>
                            <span>Expires {new Date(ann.expiresAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(ann)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(ann.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-white">{editItem ? 'Edit Announcement' : 'Post Announcement'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" placeholder="Announcement title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content *</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required rows={4} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none" placeholder="Write the announcement..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Audience</label>
                  <select value={form.targetRole} onChange={e => setForm({ ...form, targetRole: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm">
                    <option value="all">All Staff</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="manager">Managers</option>
                    <option value="employee">Employees</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expires (optional)</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
                  {submitting ? 'Publishing...' : (editItem ? 'Update' : 'Publish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
