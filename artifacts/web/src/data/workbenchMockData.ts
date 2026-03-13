import type { OntologyVersion, OntologyModule } from "@/types/workbench";

// ---------------------------------------------------------------------------
// Seed ontology — represents the "initial_confirmed" version (v1)
// that the first experiment record inherits from.
// ---------------------------------------------------------------------------

const SEED_MODULES: OntologyModule[] = [
  {
    key: "system",
    title: "实验系统",
    content:
      "ZnO 薄膜 RF 磁控溅射沉积系统\n\n基底材料：Si(100) 晶圆（4英寸，电阻率 1–10 Ω·cm）\n靶材：99.99% ZnO 陶瓷靶（直径 3 英寸）\n溅射腔室本底真空：< 5×10⁻⁶ Pa\n工作气体：Ar/O₂ 混合气（Ar 40 sccm，O₂ 10 sccm）\n溅射功率：RF 150 W\n基底温度：室温至 300°C 可控",
    status: "inherited",
    isHighlighted: false,
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    key: "preparation",
    title: "实验准备",
    content:
      "基底预处理流程\n\n1. 丙酮超声清洗 10 min\n2. 乙醇超声清洗 10 min\n3. 去离子水冲洗 3×5 min\n4. 氮气吹干\n5. UV-臭氧处理 15 min（去除有机残留）\n\n靶材预溅射：5 min（遮挡基底，去除靶表面污染层）",
    status: "inherited",
    isHighlighted: false,
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    key: "operation",
    title: "实验操作",
    content:
      "沉积步骤\n\n1. 装载基底，腔室抽至本底真空\n2. 通入工作气体，稳定 5 min\n3. 开启 RF 电源，预溅射 5 min\n4. 移开挡板，开始沉积\n5. 控制退火温度梯度：200 / 300 / 400 / 500°C\n6. 各温度下沉积时间：30 min\n7. 自然冷却至室温后取样",
    status: "inherited",
    isHighlighted: false,
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    key: "measurement",
    title: "测量过程",
    content:
      "表征手段\n\nXRD（X 射线衍射）：分析薄膜晶体结构和取向\n  设备：Rigaku SmartLab，Cu Kα辐射，扫描范围 20–80°\nSEM（扫描电子显微镜）：观察表面形貌\n  工作电压 5 kV，放大倍数 10k / 50k\n四探针法：测量方块电阻\n  探针间距 1 mm，电流 1 mA",
    status: "inherited",
    isHighlighted: false,
    updatedAt: "2026-03-01T08:00:00Z",
  },
  {
    key: "data",
    title: "实验数据",
    content:
      "预期数据格式\n\n退火温度 | XRD (002) 峰位 | 结晶度评估 | 方块电阻\n200°C   | 34.42°         | 中等        | ~500 Ω/□\n300°C   | 34.46°         | 较好        | ~200 Ω/□\n400°C   | 34.50°         | 良好        | ~80 Ω/□\n500°C   | 34.52°         | 优秀        | ~30 Ω/□",
    status: "inherited",
    isHighlighted: false,
    updatedAt: "2026-03-01T08:00:00Z",
  },
];

/**
 * Version 0 — system-generated from initialization wizard output.
 * Never shown to the user directly; serves as the parent of v1.
 */
export const ONTOLOGY_V0: OntologyVersion = {
  id: "ont_v0",
  versionNumber: 0,
  parentVersionId: null,
  source: "initial_generated",
  modules: SEED_MODULES,
  confirmedAt: "2026-03-01T08:30:00Z",
};

/**
 * Version 1 — user-confirmed during initialization.
 * This is what the first experiment record inherits.
 */
export const ONTOLOGY_V1: OntologyVersion = {
  id: "ont_v1",
  versionNumber: 1,
  parentVersionId: "ont_v0",
  source: "initial_confirmed",
  modules: SEED_MODULES,
  confirmedAt: "2026-03-01T09:00:00Z",
};

/** The default confirmed ontology version to inherit from when creating records. */
export const DEFAULT_ONTOLOGY_VERSION: OntologyVersion = ONTOLOGY_V1;

/** All seed versions, ordered oldest first. */
export const SEED_ONTOLOGY_VERSIONS: OntologyVersion[] = [ONTOLOGY_V0, ONTOLOGY_V1];
