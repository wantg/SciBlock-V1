import type { WizardFormData } from "@/types/wizardForm";

/**
 * Front-end mock data that simulates an AI extraction from uploaded references.
 * Replace this with a real API response when the AI backend is ready.
 */
export const AI_MOCK_FILL: WizardFormData = {
  step2: {
    experimentName: "基于纳米粒子的催化性能研究",
    experimentType: "材料性能测试",
    goal: "验证功能化纳米粒子在目标催化反应中的转化效率，探究粒径分布与催化活性的定量关联，为后续工艺优化提供基础实验数据。",
  },

  step3: {
    materials:
      "1. TiO₂ 纳米催化剂（粒径 20 nm）50 mg\n" +
      "2. 底物溶液（浓度 0.1 mol/L）100 mL\n" +
      "3. 去离子水 200 mL\n" +
      "4. 分析纯乙醇 50 mL\n" +
      "5. 氮气（保护气，纯度 ≥ 99.9%）",
    environment: "恒温 25°C，相对湿度 < 40%，洁净实验室",
    estimatedTime: "约 2 小时",
  },

  step4: {
    operationSteps:
      "1. 称量 50 mg 纳米催化剂，分散于 50 mL 去离子水中\n" +
      "2. 超声处理 15 min，确保均匀分散，避免团聚\n" +
      "3. 加入底物溶液，磁力搅拌混合均匀\n" +
      "4. 在恒温 25°C 搅拌条件下反应 60 min\n" +
      "5. 每 10 min 取样 1 mL，过滤后备测\n" +
      "6. 反应结束后离心回收催化剂，洗涤 3 次",
    cautions:
      "· 纳米材料须在通风橱内操作，佩戴防护手套及 N95 口罩\n" +
      "· 超声过程注意控温，防止局部过热导致材料变性\n" +
      "· 取样时间点须精确记录，误差 ≤ 30 s\n" +
      "· 离心管使用前检查完整性，防止样品泄漏",
  },

  step5: {
    metrics: "底物转化率（%）、产物产率（%）、表观反应速率常数 k",
    method:
      "通过 UV-Vis 分光光度法在底物特征波长处测定吸光度，结合标准曲线计算浓度及转化率；" +
      "采用 HPLC 系统确认产物纯度及产率；对各时间点数据进行线性回归求得速率常数 k。",
    instruments:
      "UV-Vis 分光光度计（测量范围 200–800 nm）、HPLC 系统、分析天平（精度 0.0001 g）、超声破碎仪",
  },

  // Step 6 is intentionally empty — data collection happens during the experiment.
  step6: {
    recordingMethod: "",
    expectedResults: "",
  },
};
