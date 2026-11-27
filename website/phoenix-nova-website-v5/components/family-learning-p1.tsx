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
  const [section, setSection] = useState<'academy' | 'practice'>('academy');
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
    <nav className="fc-learning-nav" aria-label={t('学习模块', 'Learning sections')}>
      <button type="button" aria-pressed={section === 'academy'} onClick={() => setSection('academy')}>
        <BookOpen size={20} aria-hidden="true"/>{t('凤启学苑 · 启明堂', 'Phoenix Academic Studio')}
      </button>
      <button type="button" aria-pressed={section === 'practice'} onClick={() => setSection('practice')}>
        <ClipboardCheck size={20} aria-hidden="true"/>ASKWISE {t('练习', 'practice')}
      </button>
    </nav>
    {section === 'academy' ? <div className="fc-learning-grid">
      <section aria-labelledby="fc-course-plan">
        <h3 id="fc-course-plan">{t('课程规划', 'Course plan')}</h3>
        {selected?.plan && <>
          <p><strong>{selected.plan.period}</strong></p>
          {selected.plan.goals.length > 0 && <ul>{selected.plan.goals.map((goal, index) => <li key={index}>{goal}</li>)}</ul>}
        </>}
        {selected && !selected.plan && <p>{t('暂未发布课程规划。', 'A course plan has not been published yet.')}</p>}
        {selected && selected.courses.length > 0 && <ul>{selected.courses.map((course, index) => <li key={index}>{course.title}</li>)}</ul>}
      </section>
      <section aria-labelledby="fc-teacher-arrangements">
        <h3 id="fc-teacher-arrangements">{t('老师安排', 'Teacher arrangements')}</h3>
        {selected?.courses.map((course, index) => {
          const arrangement = course.teacherArrangement;
          return <div className="fc-learning-arrangement" key={index}>
            <strong>{course.title}</strong>
            {arrangement ? <><p>{arrangement.teacherName}</p>
              {arrangement.meeting && <p>{arrangement.meeting}</p>}
              {arrangement.delivery && <p>{arrangement.delivery === 'ONLINE' ? t('线上', 'Online') : t('线下', 'In person')}</p>}
            </> : <p>{t('老师安排待发布。', 'Teacher arrangement pending publication.')}</p>}
          </div>;
        })}
      </section>
    </div> : <div className="fc-learning-grid">
      <section><h3>{t('练习进度', 'Practice progress')}</h3>
        {selected?.courses.map((course, index) => course.practiceTitle &&
          <div key={index}><p>{course.practiceTitle}</p><small>{statuses[course.status]}</small></div>)}
        {selected && !selected.courses.some(course => course.practiceTitle) && <p>{t('暂无已分派练习。', 'No practice has been assigned.')}</p>}
      </section>
    </div>}
    <div role="status" className="fc-learning-status">
      {view.state === 'loading' && t('正在核验学习资料…', 'Verifying access to learning records…')}
      {view.state === 'unavailable' && (reviewOnly
        ? section === 'academy' ? t('账号接通后，可在这里查看孩子已发布的课程规划和老师安排。', 'Once account access is connected, published course plans and teacher arrangements will appear here.')
          : t('练习服务接通后，可在这里查看获授权的练习进度。', 'Authorized practice progress will appear here once the practice service is connected.')
        : t('学习资料暂不可用。', 'Learning records are temporarily unavailable.'))}
      {view.state === 'denied' && t('当前账号没有学习资料访问权限。', 'This account has no access to learning records.')}
      {view.state === 'sign-in' && <Link href={`/${locale}/account`}>{t('登录后查看学习资料', 'Sign in to see learning records')}</Link>}
      {view.state === 'ready' && !selected?.courses.length && t('暂无已分派课程。', 'No courses have been assigned.')}
    </div>
    {view.state === 'unavailable' && !reviewOnly && <button type="button" className="fc-gold" onClick={() => setRefresh(value => value + 1)}>{t('重新读取', 'Retry')}</button>}
  </section>;
}
