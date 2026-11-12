// Explicit synthetic preview fixtures. Not imported by the API or database.
import { type DashboardView, type Domain } from './family-center-v2';
export type Scenario = 'education' | 'identity' | 'health' | 'wealth' | 'multi' | 'new';
export const scenarios: Scenario[] = ['multi','education','identity','health','wealth','new'];
const labels = {
  education: ['升学规划与学业支持','Education planning & learning'],
  identity: ['身份规划与材料准备','Identity planning & documents'],
  health: ['深圳国际医疗协调','Shenzhen international care coordination'],
  wealth: ['家庭保障规划咨询','Family protection consultation'],
};
export function fixture(scenario: Scenario, en: boolean, family = 'demo-family-a'): DashboardView {
  const first = family === 'demo-family-a';
  const active: Domain[] = scenario === 'new' ? [] : scenario === 'multi' ? ['education','identity','health'] : [scenario];
  const subject = first ? 'demo-child-a' : 'demo-self-b';
  const members = first ? [{id:'demo-self-a',name:en?'Alex · sample':'我 · 合成示例',relation:'self'}, {id:subject,name:en?'Robin · sample':'小禾 · 合成示例',relation:'student'}] : [{id:subject,name:en?'Morgan · sample':'林安 · 合成示例',relation:'self'}];
  const families = [{id:'demo-family-a',name:en?'Sample family A':'合成家庭 A',members:first?members:[]}, {id:'demo-family-b',name:en?'Sample family B':'合成家庭 B',members:!first?members:[]}];
  return { families:scenario==='new'?[]:families,
    services: active.map(domain => ({id:`demo-${family}-${domain}`,domain,title:labels[domain][en?1:0],status:en?'In progress · sample':'进行中 · 合成示例',subject,next:en?'Confirm the next step with your adviser.':'与顾问确认下一步安排。'})),
    dates: active.map((domain,i) => ({id:`demo-date-${domain}`,title:en?'Adviser follow-up · sample':'顾问跟进 · 合成示例',domain,date:i===0?'2026-11-10':null,verified:i===0,source:en?'Built-in synthetic fixture':'内置合成场景',service:`demo-${family}-${domain}`})),
    reports: active.includes('education') ? [{id:'demo-report',subject,title:en?'Learning planning summary · sample':'学业规划摘要 · 合成示例',source:en?'Synthetic published summary':'合成已发布摘要'}] : [] };
}
