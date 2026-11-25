function runWorkbench() {
  const endpoint = "/internal/website-consultations";
  const list = document.querySelector("#lead-list");
  const notice = document.querySelector("#workbench-status");
  const refresh = document.querySelector("#refresh-queue");
  const duplicates = document.querySelector("#duplicate-list");
  const firstLead = document.querySelector("#duplicate-first");
  const secondLead = document.querySelector("#duplicate-second");
  const summary = document.querySelector("#summary");
  const distribution = document.querySelector("#distribution");
  const workload = document.querySelector("#workload");
  const duplicatePanel = document.querySelector("#duplicate-panel");
  const title = document.querySelector("#view-title");
  const scope = document.querySelector("#view-scope");
  let activeView;
  let requests = new AbortController();
  let generation = 0;
  const labels = { EDUCATION: "教育", IDENTITY: "身份", WEALTH: "财富", HEALTH: "健康" };

  async function request(path = "", body) {
    const epoch = generation;
    const response = await fetch(endpoint + path, body === undefined ? {
      cache: "no-store", signal: requests.signal,
    } : {
      method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: requests.signal,
    });
    if (epoch !== generation) throw new DOMException("视图已更新", "AbortError");
    if (!response.ok) {
      clearContacts();
      if ([401, 403].includes(response.status)) clearData();
      throw new Error(response.status === 401 ? "员工会话已失效，请通过统一员工入口重新登录。" :
        response.status === 403 ? "当前视图授权不可用。请刷新授权。" : "当前操作未完成。请刷新队列后重试。");
    }
    const data = await response.json();
    if (epoch !== generation) throw new DOMException("视图已更新", "AbortError");
    return data;
  }

  function clearContacts() {
    for (const node of document.querySelectorAll("[data-contact]")) node.replaceChildren();
  }

  function clearData() {
    for (const node of [list, duplicates, summary, distribution, workload]) node.replaceChildren();
    for (const select of [firstLead, secondLead]) select.replaceChildren(new Option("请选择线索", ""));
  }

  function resetRequests() {
    requests.abort();
    requests = new AbortController();
    generation++;
    clearData();
  }

  function metric(label, value) {
    const card = element("div");
    card.className = "metric";
    card.append(element("span", label), element("strong", String(value)));
    summary.append(card);
  }

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }

  function action(label, perform) {
    const button = element("button", label);
    button.type = "button";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try { await perform(button); }
      catch (error) { if (error.name !== "AbortError") notice.textContent = error.message; }
      finally { button.disabled = false; }
    });
    return button;
  }

  async function loadDuplicates() {
    const { items, suggestions } = await request("/duplicates");
    duplicates.replaceChildren();
    for (const pair of suggestions) {
      const row = element("li");
      row.append(element("p", "可能重复 · 待人工判断"),
        element("code", pair.firstLeadId + " / " + pair.secondLeadId),
        action("提交此候选", async () => {
          await request("/duplicates/propose", pair);
          await loadDuplicates();
          notice.textContent = "已提交，等待另一名员工审核。";
        }));
      duplicates.append(row);
    }
    for (const item of items) {
      const row = element("li");
      row.append(element("code", item.firstLeadId + " / " + item.secondLeadId));
      row.append(element("p", item.status === "PENDING" ? "待独立审核" : "已确认重复"));
      if (item.canReview) {
        for (const [decision, label] of [["CONFIRMED", "确认重复"], ["DISMISSED", "驳回候选"]]) {
          row.append(action(label, async () => {
            await request("/duplicates/review", { candidateId: item.candidateId, decision });
            await loadDuplicates();
            notice.textContent = "已记录审核。";
          }));
        }
      }
      if (item.status === "CONFIRMED") {
        for (const [sourceLeadId, targetLeadId, label] of [
          [item.firstLeadId, item.secondLeadId, "保留第二条"],
          [item.secondLeadId, item.firstLeadId, "保留第一条"],
        ]) {
          row.append(action(label, async () => {
            if (!window.confirm("确认合并，并保留线索 " + targetLeadId + "？")) return;
            await request("/duplicates/merge", { candidateId: item.candidateId, sourceLeadId, targetLeadId });
            await loadQueue();
            notice.textContent = "已记录合并。";
          }));
        }
      }
      duplicates.append(row);
    }
  }

  async function loadQueue() {
    resetRequests();
    const epoch = generation;
    refresh.disabled = true;
    notice.textContent = "正在读取线索…";
    try {
      const { views } = await request("/views");
      for (const button of document.querySelectorAll("[data-view]")) {
        button.hidden = button.dataset.view !== "FOUNDER" && !views.includes(button.dataset.view);
        button.setAttribute("aria-pressed", String(button.dataset.view === activeView));
      }
      if (activeView !== "FOUNDER" && !views.includes(activeView)) activeView = views.includes("DISPATCHER") ? "DISPATCHER" : views[0];
      duplicatePanel.hidden = activeView !== "DISPATCHER";
      document.querySelector("#workload-panel").hidden = activeView !== "DISPATCHER";
      document.querySelector("#integration-boundary").hidden = activeView === "FOUNDER";
      document.querySelector("#founder-boundary").hidden = activeView !== "FOUNDER";
      for (const button of document.querySelectorAll("[data-view]")) button.setAttribute("aria-pressed", String(button.dataset.view === activeView));
      if (activeView === "FOUNDER") {
        title.textContent = "Founder · 经营概览";
        scope.textContent = "设计预览 · HOLD · 尚未接通经营数据";
        for (const label of ["今日新增咨询", "本周新增客户", "客户转化", "正在跟进", "逾期事项"]) metric(label, "—");
        for (const label of ["官网咨询", "已分配", "已联系", "已核验客户", "已签约", "Service Project"]) distribution.append(element("span", label + " · 待授权"));
        notice.textContent = "Founder 组织级管理授权契约待确认，经营数据读取保持关闭。";
        return;
      }
      if (!activeView) {
        title.textContent = "暂无可用工作视图";
        scope.textContent = "请由现有身份与组织授权负责人核对员工映射。";
        notice.textContent = "当前员工没有有效的工作台角色授权。";
        return;
      }
      title.textContent = activeView === "DISPATCHER" ? "Dispatcher · 业务调度" : "Adviser · My Work";
      scope.textContent = activeView === "DISPATCHER" ? "仅获授权组织及业务范围 · 联系方式默认关闭" : "仅负责的线索与待办 · 联系方式按次授权并审计";
      const { items, summary: stats, services, workload: people, limited } = await request("/views/" + activeView);
      for (const [label, value] of activeView === "DISPATCHER" ? [
        ["今日新增咨询", stats.newToday], ["待分配", stats.unassigned], ["待跟进", stats.pending], ["已逾期", stats.overdue],
      ] : [["我的线索", stats.total], ["今日待办", stats.dueToday], ["已逾期", stats.overdue], ["已完成联系", stats.completed]]) metric(label, value);
      for (const [domain, label] of Object.entries(labels)) distribution.append(element("span", label + " · " + (services.find(item => item.service === domain)?.count ?? 0)));
      for (const person of people ?? []) {
        const row = element("li");
        row.append(element("code", person.assigneeId), element("span", "待跟进 " + person.pending + " · 逾期 " + person.overdue));
        workload.append(row);
      }
      for (const item of items) {
        if (activeView === "DISPATCHER") for (const select of [firstLead, secondLead]) select.append(new Option(item.leadId, item.leadId));
        const row = element("li");
        const entry = element("article");
        const path = "/" + encodeURIComponent(item.leadId);
        entry.append(element("h2", (labels[item.service] ?? "服务") + "咨询"),
          element("p", (item.status === "CONTACTED" ? "已联系" : item.status === "NEW" ? "新线索" : item.status) +
            " · " + new Date(item.receivedAt).toLocaleString("zh-CN")),
          element("code", item.leadId));
        if (item.nextDueAt) {
          const due = new Date(item.nextDueAt);
          if (!Number.isNaN(due.getTime())) {
            const overdue = due.getTime() <= Date.now();
            const hint = element("p", (overdue ? "待办已逾期 · " : "首次联系待办截止 · ") + due.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
            hint.className = overdue ? "overdue" : "due";
            entry.append(hint);
          }
        }
        const controls = element("div");
        controls.className = "actions";
        const email = element("p");
        email.setAttribute("aria-live", "polite");
        email.setAttribute("data-contact", "");
        if (item.canReveal) controls.append(action("查看邮箱", async button => {
          if (email.textContent) {
            email.replaceChildren();
            button.textContent = "查看邮箱";
            return;
          }
          const result = await request(path + "/contact", {});
          email.textContent = result.email;
          button.textContent = "隐藏邮箱";
        }));
        if (item.canAssign || item.canReassign) {
          const reassign = item.canReassign;
          const label = element("label", "顾问");
          const adviser = element("select");
          adviser.setAttribute("aria-label", "顾问");
          adviser.append(new Option("请选择顾问", ""));
          label.append(adviser);
          controls.append(action(reassign ? "加载接手顾问" : "加载可分配顾问", async button => {
            const { items: people } = await request(path + "/assignees");
            if (!people.length) {
              notice.textContent = "当前暂无可分配的顾问。";
              return;
            }
            for (const { id, name } of people) adviser.append(new Option(name, id));
            button.replaceWith(label, action(reassign ? "重新分派" : "分配", async () => {
              if (!adviser.value) throw new Error("请选择顾问。");
              await request(path + (reassign ? "/reassign" : "/assign"), { assigneeId: adviser.value });
              await loadQueue();
              notice.textContent = reassign ? "已重新分派跟进。" : "已分配跟进。";
            }));
          }));
        }
        if (item.canComplete) {
          controls.append(action("完成首次跟进", async () => {
            await request(path + "/complete", {});
            await loadQueue();
            notice.textContent = "已记录首次跟进。";
          }));
        }
        if (item.canCancel) {
          controls.append(action("取消首次跟进", async () => {
            if (!window.confirm("确认取消这条首次跟进待办？")) return;
            await request(path + "/cancel", {});
            await loadQueue();
            notice.textContent = "已取消首次跟进。";
          }));
        }
        const history = element("details");
        history.append(element("summary", "跟进历史"));
        for (const event of item.history) history.append(element("p", (event.kind === "ASSIGNED" ? "分派已记录" : "跟进状态已更新") + " · " + new Date(event.at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })));
        if (!item.history.length) history.append(element("p", "暂无跟进记录"));
        entry.append(controls, email, history);
        row.append(entry);
        list.append(row);
      }
      if (activeView === "DISPATCHER") await loadDuplicates();
      notice.textContent = (items.length ? "已载入获授权的线索。" : "暂无获授权的线索。") + (limited ? "当前显示最新 100 条，统计覆盖全部授权线索。" : "");
    } catch (error) {
      if (error.name !== "AbortError" && epoch === generation) { clearData(); notice.textContent = error.message; }
    } finally {
      if (epoch === generation) refresh.disabled = false;
    }
  }

  refresh.addEventListener("click", loadQueue);
  for (const button of document.querySelectorAll("[data-view]")) button.addEventListener("click", () => {
    activeView = button.dataset.view;
    void loadQueue();
  });
  document.querySelector("#duplicate-actions").append(action("提议重复线索", async () => {
    if (!firstLead.value || !secondLead.value || firstLead.value === secondLead.value) {
      throw new Error("请选择两条不同的线索。");
    }
    await request("/duplicates/propose", { firstLeadId: firstLead.value, secondLeadId: secondLead.value });
    await loadDuplicates();
    notice.textContent = "已提交，等待另一名员工审核。";
  }));
  window.addEventListener("pagehide", () => {
    resetRequests();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) resetRequests(); else void loadQueue(); });
  window.addEventListener("pageshow", event => { if (event.persisted) void loadQueue(); });
  void loadQueue();
}

export function workbenchHtml(nonce) {
  return `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>官网咨询工作台｜Phoenix Nova</title>
<style nonce="${nonce}">
*{box-sizing:border-box}[hidden]{display:none!important}body{font:15px/1.6 system-ui,sans-serif;margin:0;background:#F7F5EF;color:#0D1B2A}
header{background:#0D1B2A;color:#fff;padding:1rem max(1.25rem,calc((100vw - 74rem)/2));border-bottom:3px solid #C8A24A}header strong{font-size:1.25rem;letter-spacing:.08em}header small{color:#dfc98e;display:block}nav{display:flex;flex-wrap:wrap;gap:1rem;margin-top:.7rem}nav a{color:inherit;text-decoration:none}nav span{color:#b5bec4}
main{max-width:74rem;margin:auto;padding:1.25rem}ol,ul{list-style:none;padding:0;display:grid;gap:1rem}#lead-list{grid-template-columns:repeat(auto-fit,minmax(min(100%,26rem),1fr))}
article,.panel{background:#fff;padding:1.2rem;border:1px solid #e5e3db;border-radius:.7rem;margin:1rem 0}h1{font-size:1.7rem}h2{font-size:1.1rem}h2,p{margin:.5rem 0}code{overflow-wrap:anywhere;font-size:.8rem;color:#52626c}details{border-top:1px solid #eee;margin-top:1rem;padding-top:.5rem}summary{cursor:pointer}
#summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr));gap:.75rem}.metric{background:white;border:1px solid #e5e3db;border-top:3px solid #C8A24A;border-radius:.5rem;padding:1rem}.metric span{display:block;color:#57676a}.metric strong{font-size:2rem;font-weight:600}#distribution{display:flex;flex-wrap:wrap;gap:.6rem;margin:1rem 0}#distribution span{background:#e7efec;padding:.3rem .8rem;border-radius:2rem}#view-scope{color:#52626c}.overdue{color:#9d3d24;background:#fff2e7;padding:.4rem .6rem;border-radius:.3rem}#workload li{display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between}.hold{background:#fff9e9;border-color:#d6bf7d}
.actions{display:flex;flex-wrap:wrap;gap:.6rem;align-items:end;margin-top:1rem}label{display:grid;grid-template-columns:minmax(0,1fr);gap:.25rem;min-width:0;max-width:100%}
#duplicate-actions label{flex:1 1 14rem}#duplicate-actions select{width:100%;min-width:0}
button,select{font:inherit;min-height:44px;border:1px solid #376160;border-radius:.4rem;padding:.35rem .8rem}
select{max-width:100%;box-sizing:border-box}button{background:#315855;color:white;cursor:pointer}button[aria-pressed="true"]{background:#0D1B2A;box-shadow:inset 0 -3px #C8A24A}button:disabled{opacity:.6}button:focus-visible,a:focus-visible{outline:3px solid #C8A24A;outline-offset:3px}
@media(max-width:480px){#summary{grid-template-columns:repeat(2,minmax(0,1fr))}.metric{padding:.8rem}.metric strong{font-size:1.65rem}}
</style></head><body><header><strong>PHOENIX NOVA</strong><small>Corporate OS · 员工统一工作入口候选</small>
<nav aria-label="员工导航"><a href="#overview">Overview</a><a href="#crm">CRM</a><span>Service Projects · 待接入</span><a href="#my-work">My Work</a></nav></header>
<main id="crm"><h1>官网咨询工作台</h1><p>客户经营与跟进 · Phoenix Core</p>
<div class="actions" aria-label="工作视图"><button data-view="FOUNDER" type="button">Founder · 设计预览</button><button data-view="DISPATCHER" type="button" hidden>Dispatcher</button><button data-view="ADVISER" type="button" hidden>Adviser</button><button id="refresh-queue" type="button">刷新队列</button></div>
<section id="overview"><h2 id="view-title">正在核对员工授权</h2><p id="view-scope"></p><div id="summary" aria-label="工作概览"></div><div id="distribution" aria-label="业务分布及转化"></div></section>
<p id="workbench-status" role="status">正在读取线索…</p>
<section id="founder-boundary" class="panel hold" hidden><h2>经营授权 · HOLD</h2><p>本页仅为设计预览。Founder 的组织级管理授权确认前，经营统计与销售数据保持关闭。</p><p>经营预警：长期未跟进、超期任务、待审核重复客户、授权异常、服务交接待处理。均待权威范围接入。</p></section>
<section id="workload-panel" class="panel" hidden><h2>顾问工作量</h2><p>仅统计当前获授权队列中的分派与首次跟进任务。</p><ul id="workload"></ul></section>
<section id="duplicate-panel" aria-label="重复线索" class="panel" hidden><h2>重复线索</h2>
<div id="duplicate-actions" class="actions">
<label>第一条线索<select id="duplicate-first"></select></label>
<label>第二条线索<select id="duplicate-second"></select></label>
</div><ol id="duplicate-list" aria-label="待处理重复候选"></ol></section>
<section id="my-work"><ol id="lead-list" aria-label="咨询线索"></ol></section>
<section id="integration-boundary" class="panel"><h2>Clients · Conversion · Service Projects</h2><p>正式客户身份关联申请、合同和服务交接待接入现有授权流程。核验及家庭服务资料需独立授权；此咨询工作台不展示家庭私人资料。</p></section><noscript>此工作台需要 JavaScript。</noscript>
</main><script nonce="${nonce}">(${runWorkbench.toString()})();</script></body></html>`;
}
