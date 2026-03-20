# SciBlock 账号信息

> 从 `sciblock_export.sql` 和种子脚本中提取的账号信息
> 提取时间: 2026-03-20

---

## 🔑 可用账号

| 邮箱 | 密码 | 角色 | 姓名 | 创建时间 |
|:---|:---|:---|:---|:---|
| `dev@sciblock.local` | `DevPass1234` | **instructor** | Dev User | 2026-03-15 |
| `demo@sciblock.com` | `DemoPass1234` | student | Demo Student | 2026-03-13 |
| `test@sciblock.dev` | ❓ 未知 | student | Test User | 2026-03-13 |

> 💡 **推荐使用**: `dev@sciblock.local` / `DevPass1234`（讲师权限，可访问所有功能）

---

## 📊 账号详情对比

| 属性 | dev@sciblock.local | demo@sciblock.com | test@sciblock.dev |
|:---|:---|:---|:---|
| **密码** | `DevPass1234` | `DemoPass1234` | ❓ 未知 |
| **角色** | instructor | student | student |
| **姓名** | Dev User | Demo Student | Test User |
| **UUID** | `999fc571-e132-47b3-a18e-c9951328a453` | `802b6a30-c171-4e6e-861b-3b33d6fb4225` | `eac3a045-b717-4243-a026-cbca6cac4da8` |
| **绑定学生** | - | 李婷 (li.ting@lab.edu) | - |
| **来源** | seed-dev-user.sh | seed-dev-data.ts | SQL 导出 |

---

## 🚀 快速登录

### API 登录
```bash
POST http://localhost:8082/api/auth/login
Content-Type: application/json

{
  "email": "dev@sciblock.local",
  "password": "DevPass1234"
}
```

### 前端登录
```
http://localhost:22333/login
```

---

## 🔧 重置账号

```bash
# 重置开发账号
bash scripts/seed-dev-user.sh

# 重置所有演示数据（包括账号）
bash scripts/seed-dev.sh
```

---

## ⚠️ 安全提示

| 项目 | 默认值 | 建议 |
|:---|:---|:---|
| 账号密码 | `DevPass1234` / `DemoPass1234` | 生产环境务必修改 |
| JWT_SECRET | `change-me-use-openssl-rand-hex-32` | 修改为随机强密钥 |
| ADMIN_SECRET | `sciblock-admin-dev` | 修改为复杂字符串 |

---

## 📁 相关文件

| 文件 | 用途 |
|:---|:---|
| `scripts/seed-dev-user.sh` | 创建/重置开发账号 |
| `scripts/src/seed-dev-user.ts` | 开发账号脚本（TS 版本） |
| `scripts/src/seed-dev-data.ts` | 创建演示数据 |
| `scripts/seed-dev.sh` | 一键重置所有数据 |
| `.env` | 环境变量配置 |
