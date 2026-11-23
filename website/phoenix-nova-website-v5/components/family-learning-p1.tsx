'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {BookOpen, ClipboardCheck} from 'lucide-react';
import type {FamilyLearning} from '@/lib/family-learning';

type View = {state: 'loading' | 'unavailable' | 'denied' | 'sign-in'} | {state: 'ready'; data: FamilyLearning};

export function FamilyLearningP1({locale, reviewOnly = false}: {locale: 'zh' | 'en'; reviewOnly?: boolean}) {
  const en = locale === 'en';
  const t = (zh: string, english: string) => en ? english : zh;
  const [view, setView] = useState<View>({state: reviewOnly ? 'unavailable' : 'loading'});
  const [subject, setSubject] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (reviewOnly) return;
    let request: AbortController | undefined;
    let refreshTimer: ReturnType<typeof setTimeout>;
    const clear = () => {
      request?.abort();
      clearTimeout(refreshTimer);
      setView({state: 'loading'});
    };
    const load = async () => {
      clear();
      if (document.visibilityState !== 'visible') return;
      const controller = new AbortController();
      request = controller;
      const timeout = setTimeout(() => controller.abort('timeout'), 8000);
      try {
        const response = await fetch('/api/family-learning', {cache: 'no-store', signal: controller.signal});
        const next: View = response.ok ? {state: 'ready', data: await response.json()} :
          {state: response.status === 401 ? 'sign-in' : response.status === 403 ? 'denied' : 'unavailable'};
        if (!controller.signal.aborted) {
          setView(next);
          if (next.state === 'ready') refreshTimer = setTimeout(() => void load(), 30000);
        }
      } catch {
        if (!controller.signal.aborted || controller.signal.reason === 'timeout') setView({state: 'unavailable'});
      } finally {
        clearTimeout(timeout);
      }
    };
    void load();
    const visibility = () => { if (document.visibilityState === 'visible') void load(); else clear(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', clear);
    window.addEventListener('pageshow', visibility);
    return () => {
      request?.abort();
      clearTimeout(refreshTimer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', clear);
      window.removeEventListener('pageshow', visibility);
    };
  }, [refresh, reviewOnly]);
  const selected = view.state === 'ready'
    ? view.data.students.find(student => student.ref === subject) ?? view.data.students[0]
    : undefined;
  const statuses = {ASSIGNED: t('已分派', 'Assigned'), SUBMITTED: t('已提交', 'Submitted'), REVIEWED: t('已反馈', 'Feedback available')};
  return <section className="fc-panel fc-learning" aria-labelledby="family-learning-heading">
    <h2 id="family-learning-heading">{t('我的学习', 'My Learning')}</h2>
    {view.state === 'ready' && view.data.role === 'PARENT' && view.data.students.length > 1 &&
      <label className="fc-learning-child">{t('选择学生', 'Choose a student')}
        <select value={selected?.ref ?? ''} onChange={event => setSubject(event.target.value)}>
          {view.data.students.map(student => <option value={student.ref} key={student.ref}>{student.name}</option>)}
        </select>
      </label>}
    <div className="fc-learning-grid">
      <section><h3><BookOpen size={20} aria-hidden="true"/>{t('启明堂课程', 'Academy courses')}</h3>
        {selected?.courses.map((course, index) => <p key={index}>{course.title}</p>)}
      </section>
      <section><h3><ClipboardCheck size={20} aria-hidden="true"/>ASKWISE {t('练习', 'practice')}</h3>
        {selected?.courses.map((course, index) => course.practiceTitle &&
          <div key={index}><p>{course.practiceTitle}</p><small>{statuses[course.status]}</small></div>)}
      </section>
    </div>
    <div role="status" className="fc-learning-status">
      {view.state === 'loading' && t('正在核验学习资料…', 'Verifying access to learning records…')}
      {view.state === 'unavailable' && t('学习资料暂不可用。', 'Learning records are temporarily unavailable.')}
      {view.state === 'denied' && t('当前账号没有学习资料访问权限。', 'This account has no access to learning records.')}
      {view.state === 'sign-in' && <Link href={`/${locale}/account`}>{t('登录后查看学习资料', 'Sign in to see learning records')}</Link>}
      {view.state === 'ready' && !selected?.courses.length && t('暂无已分派课程。', 'No courses have been assigned.')}
    </div>
    {view.state === 'unavailable' && !reviewOnly && <button type="button" className="fc-gold" onClick={() => setRefresh(value => value + 1)}>{t('重新读取', 'Retry')}</button>}
  </section>;
}
