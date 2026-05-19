# EduCrate 2.0 — Project Summary & AI Context File

> **Last updated:** 16 May 2026  
> **Purpose:** Full context document for AI assistants picking up this project. Read this file first before making any changes.

---

## 1. What Is EduCrate?

EduCrate is a **public, open-access digital repository** for Computer Science students. It allows anyone — no login required — to **browse, upload, preview, and download** academic resources such as:

- 📄 **Notes** — Subject-wise study materials, unit notes, handwritten PDFs.
- 📝 **PYQs (Previous Year Questions)** — Past exam question papers.

The platform is organised by **semester (S1–S8)** and further by **subject** within each semester. Anyone can upload; anyone can access. No authentication whatsoever.

The project is built for a **BSc Computer Science / IT department** in India. Subject names, semester structure, and naming conventions reflect an Indian university curriculum.

---

## 2. Tech Stack

### Frontend (Client)
| Layer | Technology |
|---|---|
| Framework | React 18 (Vite) |
| Routing | React Router DOM v6 |
| Styling | TailwindCSS v3 |
| Icons | Lucide React |
| HTTP | Native `fetch` (no Axios in practice) |
| Language | JSX / JavaScript |

### Backend (Server)
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (via Mongoose) — stores resource **metadata** |
| File Storage | **Cloudinary** — stores the actual **PDF files** |
| File Upload | Multer (memory storage → Cloudinary stream) |
| Security | Helmet, CORS, express-rate-limit, manual NoSQL sanitiser |
| Logging | Morgan (dev only) |
| Language | ESM JavaScript (`"type": "module"`) |

---

## 3. Full Project Folder Structure

```
EduCrate2.0/
├── client/                         ← Vite + React frontend
│   ├── src/
│   │   ├── App.jsx                 ← Routes: /, /semester/:id, /about
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── Layout.jsx          ← Wraps pages with sidebar + topnav
│   │   │   ├── Sidebar.jsx         ← Navigation sidebar
│   │   │   ├── TopNav.jsx          ← Search bar + header
│   │   │   ├── SemesterUploadModal.jsx  ← Upload modal for semester pages
│   │   │   ├── UploadModal.jsx     ← Generic upload modal (Dashboard)
│   │   │   └── PDFPreviewModal.jsx ← In-app PDF iframe preview
│   │   ├── context/
│   │   │   └── AuthContext.jsx     ← Public no-op stub (no auth)
│   │   ├── lib/
│   │   │   ├── api.js              ← fetch wrappers: getResources, uploadResource, deleteResource
│   │   │   └── semesterData.js     ← Subject lists per semester (S1–S4 configured)
│   │   └── pages/
│   │       ├── Dashboard.jsx       ← Home: semester grid + recents + department papers
│   │       ├── Semester.jsx        ← Semester detail: notes folders + PYQs flat list
│   │       ├── About.jsx           ← About page
│   │       └── Login.jsx           ← Legacy stub; redirects to /
│   ├── .env                        ← VITE_API_URL (if needed)
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                         ← Express API backend
│   ├── server.js                   ← Entry point; loads middlewares, routes, DB
│   ├── config/
│   │   ├── db.js                   ← Mongoose connection
│   │   └── cloudinary.js           ← Cloudinary SDK init (from env vars)
│   ├── controllers/
│   │   └── resourceController.js   ← getResources, uploadResource, deleteResource
│   ├── middlewares/
│   │   ├── uploadMiddleware.js     ← Multer: memoryStorage, PDF-only, 10 MB limit
│   │   ├── authMiddleware.js       ← Public no-op stub (no auth)
│   │   └── errorMiddleware.js      ← notFound + errorHandler
│   ├── models/
│   │   └── Resource.js             ← Mongoose schema
│   ├── routes/
│   │   └── apiRoutes.js            ← GET/POST /api/resources, DELETE /api/resources/:id
│   ├── .env                        ← Credentials (see Section 5)
│   └── package.json
│
└── docs/
    └── project_summary.readme      ← THIS FILE
```

---

## 4. How the Upload Flow Works (End-to-End)

```
[User selects PDF in SemesterUploadModal]
         ↓
[Client-side validation: PDF only, ≤10 MB]
         ↓
[FormData POSTed to POST /api/resources]
  Fields: title, description, semester, subject, type, file
         ↓
[Multer middleware: reads file into memory buffer]
         ↓
[resourceController.uploadResource()]
  1. Validates: title, description, semester (allowlist), type (allowlist), subject (allowlist), MIME, size
  2. Builds Cloudinary folder path:
       educrate/<semester>/<type>/<sanitised_subject>
       e.g. educrate/S4/notes/Operating_Systems
  3. Builds public_id:
       <timestamp>_<sanitised_filename_without_ext>
       e.g. 1716000000000_unit3_notes
  4. Calls uploadToCloudinary(buffer, folder, publicId)
       → cloudinary.uploader.upload_stream (resource_type: 'raw', format: 'pdf')
       → Returns { secure_url, public_id }
  5. Saves metadata to MongoDB (Resource document):
       { title, description, semester, subject, type,
         fileUrl (secure_url), cloudinaryPublicId,
         fileType: 'pdf', fileSize, uploadedBy: 'anonymous' }
  6. Returns 201 with the new Resource document
```

### Delete Flow
```
[User clicks delete on a resource]
         ↓
DELETE /api/resources/:id
         ↓
[resourceController.deleteResource()]
  1. Finds resource by MongoDB _id
  2. Calls cloudinary.uploader.destroy(cloudinaryPublicId, { resource_type: 'raw' })
  3. Calls Resource.findByIdAndDelete(_id)
  4. Returns { message: 'Resource deleted successfully' }
```

---

## 5. Environment Variables

### `server/.env`
```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://educrate2026_db_user:<password>@cluster0.q1ug6ch.mongodb.net/?appName=Cluster0

# Cloudinary — get from https://console.cloudinary.com → Settings → API Keys
CLOUDINARY_CLOUD_NAME=your_cloud_name_here    ← MUST BE FILLED
CLOUDINARY_API_KEY=your_api_key_here          ← MUST BE FILLED
CLOUDINARY_API_SECRET=your_api_secret_here    ← MUST BE FILLED
```

> **⚠️ IMPORTANT:** The Cloudinary credentials in `server/.env` are placeholder values as of 16 May 2026. The user needs to fill them in from their Cloudinary dashboard before uploads will work. Cloud name is `dlavwndne` (visible in dashboard screenshot).

### `client/.env`
Currently empty / unused. The Vite dev proxy in `vite.config.js` forwards `/api` → `http://localhost:5000`.

---

## 6. MongoDB Resource Schema

```js
{
  title:              String,   // required, max 200 chars
  description:        String,   // required, max 1000 chars
  semester:           String,   // required, e.g. 'S4'
  subject:            String,   // required, validated against allowlist
  type:               String,   // enum: ['notes', 'pyq'], default 'notes'
  fileUrl:            String,   // required — Cloudinary secure_url (HTTPS)
  cloudinaryPublicId: String,   // stored for clean deletes via cloudinary.uploader.destroy()
  fileType:           String,   // enum: ['pdf'] — always 'pdf'
  fileSize:           String,   // e.g. '2.45 MB'
  uploadedBy:         String,   // required — always 'anonymous' (public platform)
  isPinned:           Boolean,  // default false
  createdAt:          Date,     // auto (timestamps: true)
  updatedAt:          Date,     // auto (timestamps: true)
}
```

---

## 7. Semester & Subject Configuration

Subjects are configured in **two places** that must stay in sync:

1. **`client/src/lib/semesterData.js`** — used by the frontend to render subject dropdowns and folder cards.
2. **`server/controllers/resourceController.js`** (the `SEMESTER_SUBJECTS` const) — used for backend allowlist validation.

### Currently Configured Semesters

| Semester | Subjects |
|---|---|
| S1 | 10 subjects (Maths-1, Physics, Chemistry, Engineering Graphics, Intro to EEE, Algorithmic Thinking with Python, Health & Wellness, Life Skills, Digital 101, EEE Workshop) |
| S2 | 11 subjects (Maths-2, Physics, Chemistry, Foundations of Computing, C Programming, Discrete Maths, Engineering Entrepreneurship, Health & Wellness, Life Skills, Digital 101, IT Workshop) |
| S3 | 7 subjects (Maths-3, Theory of Computation, DSA, OOP, Digital Electronics, Economics, Engineering Ethics) |
| S4 | 8 subjects (COA, OS, Maths-4, Engineering Ethics, DBMS, Cyber Ethics, OS Lab, DBMS Lab) |
| S5–S8 | ⚠️ **NOT YET CONFIGURED** — subject lists are empty arrays. Add subjects to both files when ready. |

### Adding a New Semester's Subjects

1. Add to `client/src/lib/semesterData.js` → `SEMESTER_SUBJECTS`
2. Add the **exact same** subject names to `server/controllers/resourceController.js` → `SEMESTER_SUBJECTS`
3. Subject names are case-sensitive and must match exactly.

---

## 8. API Endpoints

All endpoints are under `/api`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/resources` | Fetch resources. Supports query params: `semester`, `subject`, `type`, `isPinned`, `limit`, `search` |
| `POST` | `/api/resources` | Upload a resource. Multipart form: `title`, `description`, `semester`, `subject`, `type`, `file` |
| `DELETE` | `/api/resources/:id` | Delete a resource by MongoDB `_id` (also removes from Cloudinary) |
| `PATCH` | `/api/resources/:id/pin` | Pin/unpin a resource for Department Papers |
| `GET` | `/api/resources/:id/file-url` | Generate a temporary Cloudinary URL for preview/download |
| `GET` | `/api/health` | Health check — returns `{ status: 'ok' }` |

---

## 9. Frontend Pages & Routes

| Route | Component | Description |
|---|---|---|
| `/` | `Dashboard.jsx` | Semester grid (S1–S8), recent uploads, department papers, global upload button |
| `/semester/:id` | `Semester.jsx` | Subject folders (Notes tab) + flat list (PYQs tab) for a given semester |
| `/about` | `About.jsx` | About page describing the platform |
| `/login` | `Login.jsx` | **Legacy stub** — immediately redirects to `/`. Not in use. |

---

## 10. Changes Made — 16 May 2026

### ❌ Removed: Supabase (Completely Eliminated)

The project previously used **Supabase** for file storage. It has been fully ripped out:

| What was removed | Where |
|---|---|
| `@supabase/supabase-js` npm package | `server/package.json` (uninstalled) |
| `@supabase/supabase-js` npm package | `client/package.json` (uninstalled) |
| `server/config/supabase.js` | **Deleted** |
| `client/src/lib/supabase.js` | **Deleted** |
| All `supabase.storage.upload()` calls | Replaced in `resourceController.js` |
| All `supabase.storage.remove()` calls | Replaced in `resourceController.js` |
| All `supabase.auth.*` calls | Removed from `authMiddleware.js`, `AuthContext.jsx`, `Login.jsx` |
| Supabase env vars | Removed from `server/.env` |

### ✅ Added: Cloudinary for PDF Storage

| What was added | Where | Details |
|---|---|---|
| `cloudinary` npm package (v2) | `server/package.json` | `npm install cloudinary` |
| `server/config/cloudinary.js` | **New file** | Initialises Cloudinary SDK from env vars |
| `uploadToCloudinary()` helper | `resourceController.js` | Wraps `upload_stream` in a Promise; uses `resource_type: 'raw'` for PDFs |
| `cloudinaryPublicId` field | `server/models/Resource.js` | Stored in MongoDB for clean deletes (no URL parsing needed) |
| Cloudinary delete in `deleteResource` | `resourceController.js` | `cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })` |
| Cloudinary credential placeholders | `server/.env` | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

### 🧹 Cleaned Up: Auth & Legacy Files

| File | What changed |
|---|---|
| `server/middlewares/authMiddleware.js` | Replaced Supabase auth logic with a public no-op `protect()` stub |
| `client/src/context/AuthContext.jsx` | Replaced Supabase session management with a stub that always returns `null` user |
| `client/src/pages/Login.jsx` | Replaced Supabase sign-in logic with an instant redirect to `/` |

---

## 11. Known Pending Items / Next Steps

1. **✅ Cloudinary credentials are set** — `server/.env` has real values for `CLOUDINARY_CLOUD_NAME` (`dlavwndne`), `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Upload is fully operational once the server is running.

2. **S5–S8 official subject lists still need curriculum confirmation** — these semesters are now usable because the upload UI accepts a custom subject when no configured list exists. Add official subject arrays to `semesterData.js` and `resourceController.js` when confirmed.

3. **Search is implemented** — the top nav search writes `q` to the URL, the dashboard shows matching resources, and the backend searches title, description, semester, subject, and type.

4. **Dashboard "View All" is implemented** — the Recents panel can switch between the three-item view and the full resource list.

5. **Pinned Department Papers are manageable** — resources can be pinned/unpinned from the dashboard through `PATCH /api/resources/:id/pin`.

6. **React error boundary added** — app-level fallback UI catches unexpected render errors.

7. **Automated tests added** — server and client both have Node test scripts covering resource query construction and semester configuration behavior.

---

## 12. How to Run the Project

### Start the Backend
```bash
cd server
npm run dev          # starts on http://localhost:5000
```

### Start the Frontend
```bash
cd client
npm run dev          # starts on http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:5000`, so no CORS issues in development.

---

## 13. Security Notes

- **PDF-only uploads**: enforced at both multer level (MIME check) and controller level (double-check).
- **10 MB file size limit**: enforced at both multer level and controller level.
- **Semester allowlist**: only `S1–S8` accepted.
- **Subject allowlist**: for configured semesters, only predefined subject names pass.
- **Type allowlist**: only `notes` or `pyq` accepted.
- **NoSQL injection prevention**: manual sanitiser in `server.js` removes keys starting with `$` or containing `.` from `req.body` and `req.params`.
- **Rate limiting**: 100 requests per 15 minutes per IP on `/api/*`.
- **Helmet**: standard HTTP security headers.
- **Filename sanitisation**: all special characters replaced with underscores before building the Cloudinary path.

---

*End of project summary. This file should be updated whenever significant changes are made to the project.*
