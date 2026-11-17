import assert from "node:assert/strict";
import test from "node:test";
import { articles, channels, policies, searchArticles, topics } from "../lib/insights-content.ts";

test("five bilingual channels each have a real article and an independent topic", () => {
  assert.equal(channels.length, 5);
  for (const channel of channels) {
    assert.ok(articles.some(a => a.channel === channel.id), channel.id);
    assert.ok(channel.title.zh && channel.title.en);
  }
  assert.equal(topics.length, 4);
  for (const topic of topics) assert.ok(articles.some(a => a.topic === topic.slug), topic.slug);
});

test("search, exact filters and pagination operate on the catalogue", () => {
  assert.ok(searchArticles({ query: "JUPAS" }).items.some(a => a.slug === "hong-kong-undergraduate-application-routes"));
  assert.equal(searchArticles({ channel: "health" }).items.length, 1);
  assert.equal(searchArticles({ channel: "education", tag: "A-Level" }).total, 1);
  assert.equal(searchArticles({ channel: "education", page: 1, pageSize: 4 }).items.length, 4);
  assert.equal(searchArticles({ channel: "education", page: 2, pageSize: 4 }).items.length, 2);
  assert.equal(searchArticles({ channel: "education", page: -4 }).page, 1);
  assert.equal(searchArticles({ query: "no-match-9038" }).total, 0);
});

test("editorial previews contain sources but cannot masquerade as published articles", () => {
  for (const article of articles) {
    assert.equal(article.status, "editorial-preview");
    assert.equal(article.publishedAt, null);
    assert.equal(article.reviewer, null);
    assert.equal(new URL(article.source.url).protocol, "https:");
    assert.ok(article.source.checkedAt);
    assert.ok(article.facts.length && article.analysis.length && article.actions.length);
  }
  for (const policy of policies) {
    assert.ok(["待核实", "已发布", "即将生效", "已生效", "已失效"].includes(policy.status));
    assert.ok(policy.source.checkedAt && policy.authority.zh);
    assert.ok(policy.effectiveLabel.zh);
  }
});
