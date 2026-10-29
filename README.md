# 大家政便當廠・儲值訂餐系統（前端）

校園便當儲值與訂餐系統的前端應用。學生可線上查詢餘額、點餐與檢視交易紀錄；管理員可設定當日餐廳、進行儲值／扣款、管理訂單與使用者，並查看營運數據分析。本專案為純前端（HTML / CSS / 原生 JavaScript ES Modules），後端採用 [Supabase](https://supabase.com/)（Auth + PostgreSQL + RPC + Realtime），並以 PWA 形式提供離線與推播能力。

---

## 目錄

- [功能特色](#功能特色)
- [技術棧](#技術棧)
- [系統角色與流程](#系統角色與流程)
- [時間規則](#時間規則)
- [專案結構](#專案結構)
- [快速開始](#快速開始)
- [環境設定](#環境設定)
- [PWA 與離線支援](#pwa-與離線支援)
- [推播通知](#推播通知)
- [開發規範](#開發規範)
- [CI / CD](#ci--cd)
- [安全性說明](#安全性說明)
- [部署](#部署)
- [授權](#授權)

---

## 功能特色

### 學生端
- **註冊 / 登入**：以 6 位學號註冊，系統以 `${學號}@bhg.app` 作為 Supabase Auth 的偽電子郵件。
- **線上點餐**：載入當日餐廳、菜單與個人餘額，支援購物車與下單時間保護。
- **餘額與交易查詢**：即時查詢餘額，交易紀錄分頁載入（每頁 5 筆）。
- **帳戶管理**：檢視姓名、餘額、累計消費，並可登出。
- **修改密碼**。
- **用餐評價**：於評價時段內對當日餐點評分。

### 管理端
- **管理員登入**：Supabase Auth 登入後，額外比對 `admins` 表的 `auth_uid` 才授予權限。
- **餐廳設定**：設定 `system_settings` 中的 `today_restaurant` 與 `today_order_end`，並依 `todayStatus` 顯示不同操作狀態。
- **財務操作**：
  - 直接儲值（含二次確認）
  - 單筆扣款
  - 批量扣款
  - 皆透過 Supabase RPC 呼叫後端函式完成
- **訂單管理**：以日期區間（最多 7 天）篩選，聯查 `orders`、`order_users`、`order_items`。
- **使用者管理**：透過 RPC `change_user_id` 變更學號，並同步更新使用者資料、交易紀錄與訂單歷史。
- **數據分析**：總使用者數、總儲值、總消費、系統總餘額、平均餘額、交易筆數，以及消費排名與交易趨勢。

### 平台能力
- **PWA**：可安裝至主畫面，支援離線瀏覽（`offline.html` 回退）。
- **推播通知**：透過 OneSignal 與 Google Apps Script 觸發「今日餐廳」通知。
- **輕量狀態管理**：`AppState` 以觀察者模式管理全域狀態。
- **模組化分層**：`core/`、`admin/`、`user/`、`shared/` 職責分明。

---

## 技術棧

| 類別 | 技術 |
|---|---|
| 前端 | HTML5、CSS3、原生 JavaScript（ES Modules） |
| 後端 / BaaS | Supabase（Auth、PostgreSQL、RPC、Realtime） |
| PWA | Web App Manifest、Service Worker、[Workbox 5.1.2](https://developer.chrome.com/docs/workbox/) |
| 推播 | OneSignal Web SDK |
| 自動化 API | Google Apps Script（GAS） |
| 圖示 / 字型 | Font Awesome（CDN） |
| 程式碼品質 | ESLint、Prettier |
| CI | GitHub Actions |
| 部署 | GitHub Pages（`.nojekyll`） |

---

## 系統角色與流程

### 學生端流程
1. **註冊**：輸入學號、姓名、密碼（≥ 6 位），經 `validateRegisterInput` 驗證後建立 Supabase Auth 帳號。
2. **登入**：以 `${學號}@bhg.app` 登入 Supabase Auth。
3. **點餐**：載入今日餐廳、菜單與餘額，結合 `isUserOrderTime()` 與 `todayStatus` 判斷是否可點餐。
4. **查詢**：查看餘額與交易紀錄。
5. **帳戶管理**：檢視個人資訊、修改密碼、登出。

### 管理端流程
1. **登入**：Supabase Auth 登入後查詢 `admins` 表驗證管理員身分。
2. **餐廳設定**：設定當日餐廳與點餐截止時間，狀態依 `todayStatus` 呈現。
3. **財務操作**：儲值、單筆扣款、批量扣款（均經 RPC）。
4. **訂單管理**：日期區間篩選並檢視訂單明細。
5. **數據分析**：統計營運指標與趨勢。
6. **使用者管理**：變更學號並同步相關資料。

---

## 時間規則

系統時間邏輯集中於 `js/core/time.js`，目前硬編碼如下（可依需求調整）：

| 功能 | 時間窗口 |
|---|---|
| 學生點餐 | 08:00 – 10:00 |
| 管理員設定餐廳 | 08:00 – 12:00 |
| 用餐評價 | 12:00 – 16:00 |

> 時間判斷為前端 UX 控制，實際下單與資料寫入仍應由後端（RLS / RPC）把關。

---

## 專案結構

```
bhg-frontend/
├── .github/
│   └── workflows/
│       └── lint.yml              # CI：ESLint / Prettier / 檔案完整性檢查
├── .prettierrc
├── .prettierignore
├── .nojekyll                     # GitHub Pages 用
├── eslint.config.js
├── index.html                    # 登入 / 註冊 / 管理員登入入口
├── 404.html
├── offline.html                  # 離線回退頁
├── manifest.webmanifest
├── service-worker.js             # Workbox Network-First + 離線回退
├── styles.css
├── api.js                        # 外部 API（GAS 推播）
├── onesignal/
│   ├── OneSignalSDKWorker.js
│   └── OneSignalSDKUpdaterWorker.js
├── pages/
│   ├── admin/
│   │   ├── analytics.html        # 數據分析
│   │   ├── finance.html          # 儲值 / 扣款
│   │   ├── operations.html       # 餐廳設定 / 訂單
│   │   └── users.html            # 使用者管理
│   └── user/
│       ├── account.html          # 帳戶管理
│       ├── home.html             # 首頁
│       └── order.html            # 點餐
└── js/
    ├── admin/
    │   ├── analytics.js
    │   ├── auth.js
    │   ├── deduct.js
    │   ├── orders.js
    │   ├── query.js
    │   ├── recharge.js
    │   ├── restaurant.js
    │   └── users.js
    ├── core/
    │   ├── common.js
    │   ├── core.js
    │   ├── navigation.js
    │   ├── preload.js
    │   ├── state.js              # AppState（觀察者模式）
    │   ├── supabase.js           # Supabase 客戶端初始化
    │   ├── time.js               # 時間窗口邏輯
    │   └── ui.js
    ├── shared/
    │   ├── notify.js
    │   └── tutorial.js
    └── user/
        ├── account.js
        ├── changepwd.js
        ├── meal-order.js
        ├── meal.js
        ├── query.js
        └── register.js
```

---

## 快速開始

### 前置需求
- 現代瀏覽器（支援 ES Modules、Service Worker）
- 任一靜態伺服器（**不可直接以 `file://` 開啟**，ES Modules 與 Service Worker 需 HTTP(S)）

### 本地啟動
```bash
git clone https://github.com/bhg-delicious-organization/bhg-frontend.git
cd bhg-frontend

# 任選一種靜態伺服器
npx serve .
# 或
python3 -m http.server 8080
```

開啟 `http://localhost:8080/`。

> 建議使用本機 HTTPS 或 `localhost`，Service Worker 僅在安全來源下註冊。

---

## 環境設定

### 1. Supabase
於 `js/core/supabase.js` 設定 Supabase 專案資訊：

```js
// js/core/supabase.js
export const SUPABASE_URL = 'https://<your-project>.supabase.co';
export const SUPABASE_ANON_KEY = '<your-anon-key>';
```

> 使用 `sb_publishable_` 前綴的 anon key。其安全性依賴 **Row Level Security（RLS）** 與 RPC 權限設定。

### 2. Google Apps Script（推播 API）
於 `api.js` 設定 GAS Web App 端點：

```js
// api.js
const GAS_URL = 'https://script.google.com/macros/s/<deployment-id>/exec';
```

### 3. OneSignal
於 `index.html` 設定 OneSignal App ID（若使用推播）：

```html
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.init({ appId: '<your-onesignal-app-id>' });
  });
</script>
```

### 4. PWA Manifest
依實際站台調整 `manifest.webmanifest` 中的 `start_url`、`scope`、`name`、`icons`。

### 5. 資料表與 RPC 契約
前端依賴下列 Supabase 物件，部署前請確認已建立並設定 RLS：

**資料表**
- `users`：使用者資料（姓名、餘額、累計消費等）
- `transactions`：儲值 / 消費交易紀錄
- `admins`：管理員清單（`auth_uid`）
- `system_settings`：系統設定（`today_restaurant`、`today_order_end`）
- `orders`、`order_users`、`order_items`：訂單與明細

**RPC**
- `admin_recharge`：儲值
- `admin_deduct`：單筆扣款 / 批量扣款
- `change_user_id`：變更學號並同步資料

---

## PWA 與離線支援

- **Service Worker**：採 Workbox Network-First 策略；HTML 導覽請求失敗時回退至 `offline.html`。
- **不快取的外部來源**：`supabase.co`、`script.google.com`、OneSignal 等 API 請求會跳過快取。
- **更新機制**：修改 `service-worker.js` 時請同步更新版本號（CI 會檢查格式）。

註冊邏輯（示意）：
```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}
```

---

## 推播通知

管理員設定當日餐廳後，會呼叫 Google Apps Script 端點觸發 OneSignal 推播：

```js
// api.js（示意）
export async function notifyTodayRestaurant(restaurant) {
  return fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurant }),
  });
}
```

> 推播權限需使用者主動允許；OneSignal Worker 檔案置於 `onesignal/` 目錄。

---

## 開發規範

### 程式碼風格
- 使用 **Prettier**（設定於 `.prettierrc`）格式化。
- 使用 **ESLint**（設定於 `eslint.config.js`）檢查。

### 常用指令
```bash
# ESLint
npx eslint .

# Prettier 檢查
npx prettier --check .

# Prettier 自動格式化
npx prettier --write .
```

### 模組分層慣例
| 目錄 | 職責 |
|---|---|
| `js/core/` | 核心基礎設施（Supabase、狀態、路由、時間、UI） |
| `js/admin/` | 管理端業務邏輯 |
| `js/user/` | 學生端業務邏輯 |
| `js/shared/` | 跨角色共用（通知、教學） |

新增模組時，請於檔案頭註明依賴關係，並避免跨層直接耦合。

---

## CI / CD

`.github/workflows/lint.yml` 於 push / PR 時執行：

- ESLint 檢查
- Prettier 格式檢查
- 關鍵檔案存在性檢查
- Service Worker 版本號格式檢查
- 常見函式名稱拼寫檢查

> 目前 ESLint 與 Prettier 步驟為 `continue-on-error`，不會阻斷流程；建議在穩定後改為強制門檻。

---

## 安全性說明

### 信任邊界
- **Supabase anon key 為公開資訊**，其安全性完全依賴 **RLS 策略** 與 **RPC 權限**。
- **前端權限判斷僅為 UX**：`AppState.isAdmin()` 與路由守衛可被繞過，真正的授權必須在後端（RLS / RPC 內 `auth.uid()` 與 `admins` 表比對）落實。
- **財務 RPC**（`admin_recharge`、`admin_deduct`、`change_user_id`）必須在函式內驗證呼叫者為管理員，並驗證金額、併發與幂等性。

### 建議強化
- 對 `users`、`transactions`、`admins`、`system_settings`、`orders` 等表啟用並審計 RLS。
- 學生登入使用可預測的 `${學號}@bhg.app`，建議搭配速率限制與強密碼政策。
- 動態 HTML 一律使用 `escapeHtml`；避免直接將後端 `error.message` 呈現給終端使用者。
- 第三方腳本建議固定版本並考慮 SRI 或自託管。
- 部署時建議加上 CSP（可透過 `<meta http-equiv="Content-Security-Policy">` 或反向代理響應頭）。

---

## 部署

本專案以 **GitHub Pages** 部署：

1. 將專案推送至 `main` 分支。
2. 於 Repository Settings → Pages 選擇來源分支。
3. `.nojekyll` 檔案用於停用 Jekyll 處理。
4. 確認 `manifest.webmanifest` 與 `service-worker.js` 的路徑與 `scope` 正確。

> 若需自訂響應標頭（如 CSP、HSTS），建議搭配 Cloudflare Pages 或反向代理。

---

## 授權

本專案為校園內部使用之私有專案，授權條款請洽維護團隊。


---

### 撰寫說明

這份 README 依我對整個專案的理解整理，重點放在：

1. **真實反映程式碼結構**：目錄樹與檔案清單直接對應你提供的所有檔案。
2. **功能描述具體可驗證**：每項功能都能對應到實際的 JS 模組（如 `admin_deduct`、`change_user_id`、`AppState`、`isUserOrderTime()`）。
3. **設定步驟可操作**：Supabase、GAS、OneSignal、Manifest 的設定位置與範例皆指向真實檔案。
4. **安全段落誠實揭露風險**：明確指出 anon key、前端權限、RPC 信任邊界等關鍵議題，避免誤導。
5. **不誇大未實作的功能**：專案中沒有的測試框架、沒有配置的 CSP 響應頭，都以「建議」而非「已具備」陳述。

你可以依實際的授權條款、OneSignal App ID、Supabase 專案資訊，替換文件中的佔位符（`<your-...>`）。
