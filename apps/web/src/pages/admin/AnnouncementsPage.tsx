import { useState } from 'react';
import { apiDelete, apiPatch, apiPost } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';

export function AdminAnnouncementsPage() {
  const feed = useApi<any[]>('/admin/announcements');
  const [form, setForm] = useState({
    title: '',
    body: '',
    isPublished: true,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiPost('/admin/announcements', form);
    setForm({ title: '', body: '', isPublished: true });
    await feed.refetch();
  };

  const toggle = async (item: any) => {
    await apiPatch(`/admin/announcements/${item.id}`, {
      title: item.title,
      body: item.body,
      isPublished: !item.isPublished,
    });
    await feed.refetch();
  };

  const remove = async (id: string) => {
    await apiDelete(`/admin/announcements/${id}`);
    await feed.refetch();
  };

  if (feed.loading) {
    return <LoadingSkeleton rows={8} />;
  }

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Announcements Management" />
        <form className="form-grid" onSubmit={submit}>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          <textarea placeholder="Announcement body" value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
            />
            Publish now
          </label>
          <button className="button primary" type="submit" disabled={!form.title || !form.body}>
            Post Announcement
          </button>
        </form>
      </Card>

      <Card>
        <ul className="plain-list">
          {feed.data?.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </div>
              <div className="inline-actions">
                <button className="button secondary" onClick={() => toggle(item)}>
                  {item.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button className="button danger" onClick={() => remove(item.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
