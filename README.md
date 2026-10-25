# 社區小尖兵

「社區小尖兵」是社區服務網站的前端預覽專案，提供社區事件申報流程與 AI 社區服務對話介面，協助居民回報問題並查詢在地資訊。

GitHub repository：[MillerLiu94/LCS_project](https://github.com/MillerLiu94/LCS_project)

## 功能

- 以手機拍攝或選取照片，建立社區事件申報。
- 分析申報照片、確認事件位置，並查看申報結果。
- 透過 AI 對話查詢社區服務與生活資訊。
- 使用目前位置顯示地點及天氣；申報流程可搜尋或調整事件位置。
- 提供繁體中文介面與行動裝置版面。

> 這是前端預覽專案。聊天、天氣、照片分析與上傳、地點搜尋及案件送出等功能需要可連線的後端 API。地圖顯示需要 Google Maps API Key；未設定時，地圖功能無法使用。

## 使用技術

- HTML、CSS、原生 JavaScript
- [Vite](https://vite.dev/) 開發伺服器
- Google Maps JavaScript API（選用）

## 環境需求

- Node.js `^20.19.0` 或 `>=22.12.0`，以及 npm
- Git
- Windows PowerShell（啟動命令會執行 PowerShell 設定腳本）
- 專案相容的後端 API；地圖功能另需 Google Maps API Key

## 本機啟動

```powershell
git clone https://github.com/MillerLiu94/LCS_project.git preview
cd preview
npm ci
Copy-Item .env.example .env
```

請保留資料夾名稱 `preview`；目前 Vite 設定會從此資料夾的上一層提供 `/preview/` 網址。

編輯 `.env`，至少設定後端網址：

```dotenv
API_BASE_URL=https://your-backend.example.com
API_USE_PROXY=true
MOCK_AUTHOR_ACCOUNT=test1
GOOGLE_MAPS_API_KEY=
DEV_TUNNEL_HOST=
```

`API_BASE_URL` 請填後端網址，可使用服務根網址或以 `/api` 結尾。使用 Vite `/api` 代理時，將 `API_USE_PROXY` 設為 `true`；若前端直接連線後端則設為 `false`，並確認後端允許此網站的跨來源請求（CORS）。`GOOGLE_MAPS_API_KEY` 可留空；若要使用地圖，請填入已啟用 Maps JavaScript API 的金鑰。瀏覽器端金鑰會公開給訪客，請在 Google Cloud 限制允許的網域與 API。

啟動開發伺服器：

```powershell
npm run dev
```

開啟 <http://localhost:5500/preview/>。若透過開發隧道存取，請將隧道主機名稱填入 `DEV_TUNNEL_HOST`。

## 專案結構

```text
./
├── api/          # 前端 API 呼叫與執行期設定
├── assets/       # 圖片與圖示
├── css/          # 共用樣式與各頁樣式
├── js/           # 聊天、定位、天氣與申報流程
├── pages/        # 聊天與社區事件申報頁面
├── scripts/      # 開發環境設定腳本
├── index.html    # 首頁
└── vite.config.js
```

主要申報流程說明請參考 [`pages/report/operation-flow.md`](pages/report/operation-flow.md)。

## API 功能

前端會呼叫下列 API 路徑；請使用與專案相容的後端服務：

| 路徑 | 用途 |
| --- | --- |
| `GET /weather` | 依座標取得天氣 |
| `POST /chat/stream` | 串流 AI 對話 |
| `POST /uploads` | 上傳申報照片 |
| `POST /ai-analyze` | 分析照片內容 |
| `GET /places`、`GET /places/reverse` | 搜尋及反向查詢地點 |
| `POST /cases` | 建立社區事件案件 |

## 設定檔與安全

`.env`、產生的 `api/runtime-config.js`、`node_modules/` 和建置輸出都已列入 Git 忽略規則。請勿將 API 金鑰或其他機密提交至遠端倉庫。提交前確認 `.env` 沒有被追蹤；公開倉庫只應包含 `.env.example`。
