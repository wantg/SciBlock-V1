import type { WizardFormData } from "@/types/wizardForm";

/**
 * Front-end mock data simulating AI extraction from uploaded reference files.
 *
 * ALL steps now use the same "configurable field groups" data model:
 *   step → fields[] → (type: text | list | object) → objects[] → tags[]
 *
 * Replace with real AI API response when the backend is ready.
 */
export const AI_MOCK_FILL: WizardFormData = {
  // ── Step 2 — 实验系统 ─────────────────────────────────────────────────────
  step2: {
    fields: [
      { id: "ai-s2-1", name: "实验名称", type: "text",
        value: "基于纳米粒子的催化性能研究", items: [], objects: [] },
      { id: "ai-s2-2", name: "实验类型", type: "text",
        value: "材料性能测试", items: [], objects: [] },
      { id: "ai-s2-3", name: "实验目标", type: "text",
        value: "验证功能化纳米粒子在目标催化反应中的转化效率，探究粒径分布与催化活性的定量关联，为后续工艺优化提供基础实验数据。",
        items: [], objects: [] },
      { id: "ai-s2-4", name: "研究假设", type: "text",
        value: "粒径越小的 TiO₂ 纳米粒子因比表面积更大，催化活性越高，底物转化率越高。",
        items: [], objects: [] },
      {
        id: "ai-s2-5", name: "研究对象", type: "object", value: "", items: [],
        objects: [
          { id: "s2o-1", name: "TiO₂ 纳米催化剂", tags: [
            { id: "s2t-1", key: "粒径", value: "20 nm" },
            { id: "s2t-2", key: "用量", value: "50 mg" },
            { id: "s2t-3", key: "类型", value: "无机金属氧化物" },
          ]},
          { id: "s2o-2", name: "底物溶液", tags: [
            { id: "s2t-4", key: "浓度", value: "0.1 mol/L" },
            { id: "s2t-5", key: "体积", value: "100 mL" },
          ]},
          { id: "s2o-3", name: "模型目标污染物", tags: [
            { id: "s2t-6", key: "类型", value: "有机染料" },
            { id: "s2t-7", key: "特征吸收波长", value: "664 nm" },
          ]},
        ],
      },
      {
        id: "ai-s2-6", name: "实验设备", type: "object", value: "", items: [],
        objects: [
          { id: "s2e-1", name: "UV-Vis 分光光度计", tags: [
            { id: "s2t-10", key: "型号", value: "Lambda 950" },
            { id: "s2t-11", key: "测量范围", value: "200–800 nm" },
          ]},
          { id: "s2e-2", name: "超声破碎仪", tags: [
            { id: "s2t-12", key: "功率", value: "400 W" },
            { id: "s2t-13", key: "频率", value: "20 kHz" },
          ]},
          { id: "s2e-3", name: "分析天平", tags: [
            { id: "s2t-14", key: "精度", value: "0.0001 g" },
          ]},
        ],
      },
    ],
  },

  // ── Step 3 — 实验准备 ─────────────────────────────────────────────────────
  step3: {
    fields: [
      {
        id: "ai-s3-1", name: "准备材料", type: "object", value: "", items: [],
        objects: [
          { id: "s3o-1", name: "TiO₂ 纳米催化剂", tags: [
            { id: "s3t-1", key: "用量", value: "50 mg" },
            { id: "s3t-2", key: "纯度", value: "≥ 99%" },
          ]},
          { id: "s3o-2", name: "底物溶液", tags: [
            { id: "s3t-3", key: "浓度", value: "0.1 mol/L" },
            { id: "s3t-4", key: "体积", value: "100 mL" },
          ]},
          { id: "s3o-3", name: "去离子水", tags: [
            { id: "s3t-5", key: "体积", value: "200 mL" },
          ]},
          { id: "s3o-4", name: "分析纯乙醇", tags: [
            { id: "s3t-6", key: "体积", value: "50 mL" },
          ]},
        ],
      },
      {
        id: "ai-s3-2", name: "准备设备", type: "object", value: "", items: [],
        objects: [
          { id: "s3e-1", name: "超声破碎仪", tags: [
            { id: "s3t-7", key: "功率", value: "400 W" },
            { id: "s3t-8", key: "预热时间", value: "5 min" },
          ]},
          { id: "s3e-2", name: "分析天平", tags: [
            { id: "s3t-9", key: "精度", value: "0.0001 g" },
          ]},
          { id: "s3e-3", name: "磁力搅拌器", tags: [
            { id: "s3t-10", key: "转速", value: "500 rpm" },
          ]},
        ],
      },
      {
        id: "ai-s3-3", name: "环境条件", type: "object", value: "", items: [],
        objects: [
          { id: "s3c-1", name: "温度", tags: [
            { id: "s3t-11", key: "设定值", value: "25°C" },
            { id: "s3t-12", key: "控制精度", value: "±0.5°C" },
          ]},
          { id: "s3c-2", name: "相对湿度", tags: [
            { id: "s3t-13", key: "要求", value: "< 40%" },
          ]},
          { id: "s3c-3", name: "洁净环境", tags: [
            { id: "s3t-14", key: "操作区域", value: "通风橱内" },
          ]},
        ],
      },
      {
        id: "ai-s3-4", name: "前处理事项", type: "list", value: "", objects: [],
        items: [
          "所有玻璃器皿需预先用去离子水清洗三次并烘干",
          "催化剂称量后立即封存，避免吸潮",
          "底物溶液现配现用，不超过 2 小时",
          "确认恒温水浴已提前升温至 25°C",
        ],
      },
    ],
  },

  // ── Step 4 — 实验操作 ─────────────────────────────────────────────────────
  step4: {
    items: [
      {
        id: "ai-s4-1",
        order: 1,
        name: "催化剂分散",
        params: [
          { id: "s4t-1", key: "方法", value: "超声破碎" },
          { id: "s4t-2", key: "时间", value: "15 min" },
          { id: "s4t-3", key: "溶剂", value: "去离子水 50 mL" },
        ],
        notes: "纳米材料须在通风橱内操作，佩戴防护手套及 N95 口罩；超声过程注意控温防止材料变性",
      },
      {
        id: "ai-s4-2",
        order: 2,
        name: "底物混合",
        params: [
          { id: "s4t-4", key: "操作", value: "加入底物溶液，磁力搅拌" },
          { id: "s4t-5", key: "时间", value: "5 min" },
        ],
      },
      {
        id: "ai-s4-3",
        order: 3,
        name: "催化反应",
        params: [
          { id: "s4t-6", key: "时间", value: "60 min" },
          { id: "s4t-7", key: "温度", value: "25°C" },
          { id: "s4t-8", key: "搅拌速度", value: "500 rpm" },
        ],
      },
      {
        id: "ai-s4-4",
        order: 4,
        name: "定时取样",
        params: [
          { id: "s4t-9",  key: "频率", value: "每 10 min 一次" },
          { id: "s4t-10", key: "取样量", value: "1 mL" },
          { id: "s4t-11", key: "处理", value: "过滤后备测" },
        ],
        notes: "取样时间点须精确记录，误差 ≤ 30 s",
      },
      {
        id: "ai-s4-5",
        order: 5,
        name: "催化剂回收",
        params: [
          { id: "s4t-12", key: "方法", value: "离心" },
          { id: "s4t-13", key: "洗涤次数", value: "3 次" },
        ],
        notes: "离心管使用前检查完整性，防止样品泄漏",
      },
    ],
  },

  // ── Step 5 — 测量过程 ─────────────────────────────────────────────────────
  // New format: items[] — each entry is one complete measurement event.
  // name = 测量项名称; target = 测量目标; method / instrument optional.
  step5: {
    items: [
      {
        id: "ai-s5-item-1",
        name: "UV-Vis 底物浓度测定",
        method: "UV-Vis 分光光度法",
        instrument: "UV-Vis 分光光度计（Lambda 950）",
        target: "测定亚甲基蓝底物转化率，量化光催化降解效率",
        conditions: [
          { id: "ai-s5c-1", key: "检测波长",  value: "664 nm" },
          { id: "ai-s5c-2", key: "测量温度",  value: "25°C" },
          { id: "ai-s5c-3", key: "量程",      value: "200–800 nm" },
          { id: "ai-s5c-4", key: "取样间隔",  value: "10 min" },
          { id: "ai-s5c-5", key: "取样总次数", value: "6 次" },
        ],
        attachments: [],
      },
      {
        id: "ai-s5-item-2",
        name: "HPLC 产物纯度与产率分析",
        method: "HPLC 分析",
        instrument: "HPLC 系统",
        target: "确认反应产物纯度及产率，排除副产物干扰",
        conditions: [
          { id: "ai-s5c-6", key: "用途", value: "产物分析" },
        ],
        attachments: [],
      },
      {
        id: "ai-s5-item-3",
        name: "表观速率常数 k 计算",
        method: "线性回归（伪一级动力学）",
        instrument: undefined,
        target: "通过 ln(C/C₀) 对时间作图，拟合表观速率常数 k",
        conditions: [
          { id: "ai-s5c-7", key: "计算方式", value: "标准曲线法 + 线性回归" },
          { id: "ai-s5c-8", key: "单位",     value: "min⁻¹" },
        ],
        attachments: [],
      },
      {
        id: "ai-s5-item-4",
        name: "样品质量称量",
        method: undefined,
        instrument: "分析天平",
        target: "精确记录各试验组催化剂用量，保证数据可重现",
        conditions: [
          { id: "ai-s5c-9", key: "精度", value: "0.0001 g" },
        ],
        attachments: [],
      },
    ],
  },

  // ── Step 6 — 实验数据 (AI 只给空类别，用户填写) ─────────────────────────
  step6: {
    items: [
      {
        id: "ai-s6-1",
        name: "XRD 衍射峰位置与强度",
        attributes: [
          { key: "衍射角范围", value: "20°–80°" },
          { key: "峰值", value: "(002) 34.4°" },
        ],
        description: "用于确认 ZnO 薄膜的 c 轴择优取向及结晶质量",
      },
      {
        id: "ai-s6-2",
        name: "薄膜方块电阻",
        attributes: [
          { key: "测量方法", value: "四探针法" },
          { key: "单位", value: "Ω/□" },
        ],
        description: "评估不同退火温度下 ZnO 导电性的变化趋势",
      },
      {
        id: "ai-s6-3",
        name: "薄膜表面形貌",
        attributes: [
          { key: "表征手段", value: "SEM" },
          { key: "放大倍率", value: "50k×" },
        ],
        description: "观察晶粒尺寸与表面粗糙度随退火温度的演变",
      },
    ],
  },
};
