/**
 * report.ts — data access layer for AI report generation.
 *
 * Layer: API / data access (no React, no context).
 *
 * Current implementation: stub that builds a structured HTML report from
 * local module data with a simulated 1.5 s network delay.
 *
 * Migration path to real backend:
 *   1. Replace the `setTimeout` block with `fetch("/api/reports/generate", {...})`
 *   2. Keep the function signature identical — callers (useExperimentReport hook) need
 *      no changes.
 */

import type { ReportGeneratorInput } from "@/types/report";
import type {
  SystemObject,
  PrepItem,
  OperationStep,
  MeasurementItem,
  DataItem,
} from "@/types/ontologyModules";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate an experiment report from confirmed module data.
 * Returns a TipTap-compatible HTML string.
 */
export async function generateExperimentReport(
  input: ReportGeneratorInput,
): Promise<string> {
  // Simulate backend latency (replace with real fetch in production)
  await new Promise((resolve) => setTimeout(resolve, 1600));
  return buildReportHtml(input);
}

// ---------------------------------------------------------------------------
// HTML builder (stub implementation)
// ---------------------------------------------------------------------------

function buildReportHtml(input: ReportGeneratorInput): string {
  const { title, experimentType, objective, modules } = input;

  const sd = (key: string) =>
    modules.find((m) => m.key === key)?.structuredData ?? {};

  const system      = (sd("system").systemObjects      ?? []) as SystemObject[];
  const prep        = (sd("preparation").prepItems      ?? []) as PrepItem[];
  const operation   = (sd("operation").operationSteps   ?? []) as OperationStep[];
  const measurement = (sd("measurement").measurementItems ?? []) as MeasurementItem[];
  const data        = (sd("data").dataItems             ?? []) as DataItem[];

  const now = new Date().toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  const lines: string[] = [];

  // ── Title ──────────────────────────────────────────────────────────────
  lines.push(`<h1>${esc(title) || "（未命名实验）"}</h1>`);
  lines.push(`<p><em>报告生成时间：${now}</em></p>`);
  lines.push("<hr>");

  // ── Section 1: 实验概述 ───────────────────────────────────────────────
  lines.push("<h2>一、实验概述</h2>");
  lines.push("<ul>");
  if (experimentType) lines.push(`<li><strong>实验类型：</strong>${esc(experimentType)}</li>`);
  if (objective)      lines.push(`<li><strong>实验目标：</strong>${esc(objective)}</li>`);
  lines.push("</ul>");

  // ── Section 2: 实验系统 ───────────────────────────────────────────────
  lines.push("<h2>二、实验系统</h2>");
  if (system.length === 0) {
    lines.push("<p>（暂无实验系统数据）</p>");
  } else {
    lines.push("<ul>");
    for (const obj of system) {
      const attrs = obj.attributes.map((t) => `${esc(t.key)}：${esc(t.value)}`).join("；");
      lines.push(
        `<li><strong>${esc(obj.name)}</strong>（${esc(obj.role)}）` +
        (attrs ? `<br><em>${attrs}</em>` : "") +
        (obj.description ? `<br>${esc(obj.description)}` : "") +
        "</li>",
      );
    }
    lines.push("</ul>");
  }

  // ── Section 3: 实验准备 ───────────────────────────────────────────────
  lines.push("<h2>三、实验准备</h2>");
  if (prep.length === 0) {
    lines.push("<p>（暂无实验准备数据）</p>");
  } else {
    // Group by category
    const groups = new Map<string, PrepItem[]>();
    for (const item of prep) {
      const cat = item.category || "其他";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    }
    for (const [cat, items] of groups) {
      lines.push(`<p><strong>${esc(cat)}</strong></p><ul>`);
      for (const item of items) {
        const attrs = item.attributes.map((t) => `${esc(t.key)}：${esc(t.value)}`).join("；");
        lines.push(
          `<li>${esc(item.name)}` +
          (attrs ? `（${attrs}）` : "") +
          "</li>",
        );
      }
      lines.push("</ul>");
    }
  }

  // ── Section 4: 实验操作步骤 ───────────────────────────────────────────
  lines.push("<h2>四、实验操作步骤</h2>");
  if (operation.length === 0) {
    lines.push("<p>（暂无操作步骤数据）</p>");
  } else {
    lines.push("<ol>");
    const sorted = [...operation].sort((a, b) => a.order - b.order);
    for (const step of sorted) {
      const params = step.params.map((t) => `${esc(t.key)}：${esc(t.value)}`).join("；");
      lines.push(
        `<li><strong>${esc(step.name)}</strong>` +
        (params ? `<br><em>参数：${params}</em>` : "") +
        (step.notes ? `<br>备注：${esc(step.notes)}` : "") +
        "</li>",
      );
    }
    lines.push("</ol>");
  }

  // ── Section 5: 测量与表征 ─────────────────────────────────────────────
  lines.push("<h2>五、测量与表征</h2>");
  if (measurement.length === 0) {
    lines.push("<p>（暂无测量数据）</p>");
  } else {
    lines.push("<ul>");
    for (const item of measurement) {
      const conds = item.conditions.map((t) => `${esc(t.key)}：${esc(t.value)}`).join("；");
      lines.push(
        `<li><strong>${esc(item.name)}</strong>` +
        (item.instrument ? `，仪器：${esc(item.instrument)}` : "") +
        (item.method ? `，方法：${esc(item.method)}` : "") +
        `，对象：${esc(item.target)}` +
        (conds ? `<br><em>条件：${conds}</em>` : "") +
        "</li>",
      );
    }
    lines.push("</ul>");
  }

  // ── Section 6: 实验数据 ───────────────────────────────────────────────
  lines.push("<h2>六、实验数据</h2>");
  if (data.length === 0) {
    lines.push("<p>（暂无实验数据）</p>");
  } else {
    lines.push("<ul>");
    for (const item of data) {
      const attrs = item.attributes.map((t) => `${esc(t.key)}：${esc(t.value)}`).join("；");
      lines.push(
        `<li><strong>${esc(item.name)}</strong>` +
        (attrs ? `（${attrs}）` : "") +
        (item.description ? `<br>${esc(item.description)}` : "") +
        "</li>",
      );
    }
    lines.push("</ul>");
  }

  // ── Section 7: 结果分析与结论 ─────────────────────────────────────────
  lines.push("<h2>七、结果分析与结论</h2>");
  lines.push(
    "<p>根据实验数据，本实验验证了以下内容：</p>" +
    "<p>（请在此补充数据分析与实验结论）</p>",
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(str: string | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
