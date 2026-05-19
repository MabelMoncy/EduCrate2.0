# EduCrate 2.0 Project Documentation

EduCrate 2.0 is a MERN stack note sharing website for Computer Science students. The current system is public and open-access: users can browse, upload, preview, download, delete, search, and pin PDF academic resources without authentication.

The app uses React on the frontend, Express and Node.js on the backend, MongoDB for resource metadata, and Cloudinary for PDF file storage.

---

## 1. Project Directory Tree

```text
EduCrate2.0/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── workflows/
│   │   └── ci.yml
│   └── PULL_REQUEST_TEMPLATE.md
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── PDFPreviewModal.jsx
│   │   │   ├── SemesterUploadModal.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TopNav.jsx
│   │   │   └── UploadModal.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   ├── semesterData.js
│   │   │   └── semesterData.test.js
│   │   ├── pages/
│   │   │   ├── About.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Semester.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env
│   ├── .eslintignore
│   ├── .eslintrc.cjs
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── docs/
│   └── project_summary.readme
│
├── server/
│   ├── config/
│   │   ├── cloudinary.js
│   │   └── db.js
│   ├── controllers/
│   │   ├── resourceController.js
│   │   └── resourceController.test.js
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   └── uploadMiddleware.js
│   ├── models/
│   │   └── Resource.js
│   ├── routes/
│   │   └── apiRoutes.js
│   ├── .env
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
│
├── .gitattributes
├── .gitignore
└── ProjectDocument.md
```

---

## 2. Core System Design & Architecture

### High-Level Architecture

```text
React Client
  ↓ fetch() requests to /api
Vite Development Proxy
  ↓ proxies /api to http://localhost:5000
Express Backend
  ↓ validates request + handles multipart upload with Multer
Cloudinary
  stores PDF files as raw resources
MongoDB
  stores resource metadata and Cloudinary references
```

### Current Data Flow

1. A student uses the React frontend to browse semesters, notes, PYQs, recent uploads, or department papers.
2. The frontend calls API helper functions from `client/src/lib/api.js`.
3. API requests are made to relative URLs under `/api`.
4. In local development, Vite proxies `/api` requests to the backend at `http://localhost:5000`.
5. The Express backend receives requests through `server/routes/apiRoutes.js`.
6. Resource logic is handled in `server/controllers/resourceController.js`.
7. Metadata is saved in MongoDB through the `Resource` Mongoose model.
8. PDF files are stored in Cloudinary as `raw` resources.
9. The backend stores both:
   - Cloudinary HTTPS file URL in `fileUrl`
   - Cloudinary storage reference in `cloudinaryPublicId`
10. For preview/download, the frontend asks the backend for a temporary Cloudinary file URL.

### Upload Flow

```text
User selects PDF in React modal
  ↓
Frontend validates required fields and file type/size
  ↓
FormData is sent to POST /api/resources
  ↓
Multer reads the PDF into memory
  ↓
Backend validates title, description, semester, subject, type, MIME, and size
  ↓
Backend creates Cloudinary folder path and public ID
  ↓
cloudinary.uploader.upload_stream uploads the PDF
  ↓
MongoDB Resource document is created
  ↓
Created resource is returned to frontend
```

### Delete Flow

```text
User clicks delete
  ↓
Frontend calls DELETE /api/resources/:id
  ↓
Backend finds Resource by MongoDB _id
  ↓
Backend deletes Cloudinary file using cloudinaryPublicId
  ↓
Backend deletes MongoDB document
  ↓
Frontend refreshes resource list
```

### Preview / Download Flow

```text
User clicks preview or download
  ↓
Frontend calls GET /api/resources/:id/file-url
  ↓
Backend finds Resource by MongoDB _id
  ↓
Backend generates a temporary Cloudinary private_download_url
  ↓
Frontend opens the URL in Google Viewer, native browser viewer, or download mode
```

### Local Ports and URLs

| Service | Port | Local URL | Notes |
|---|---:|---|---|
| Frontend | `3000` | `http://localhost:3000` | Vite dev server from `client/vite.config.js` |
| Backend | `5000` | `http://localhost:5000` | Express server from `server/server.js` |
| API Base | proxied | `/api` | Frontend uses relative `/api`, Vite proxies to backend |

### Vite Proxy

```js
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    }
  }
}
```

---

## 3. Database Schema & Logic

### Current MongoDB Models

The current backend has one main Mongoose model:

- `Resource`

There are no separate `Note`, `Semester`, or `Subject` MongoDB schemas yet. Notes and PYQs are represented by the same `Resource` schema, using the `type` field:

- `notes`
- `pyq`

Semester and subject data are currently controlled using static allowlists in:

- Frontend: `client/src/lib/semesterData.js`
- Backend: `server/controllers/resourceController.js`

### Exact Mongoose Schema

Current file: `server/models/Resource.js`

```js
import mongoose from 'mongoose';

const resourceSchema = mongoose.Schema(
  {
    title: {
      type:     String,
      required: true,
    },
    description: {
      type:     String,
      required: true,
    },
    semester: {
      type:     String,
      required: true,
    },
    subject: {
      type:     String,
      required: true,
    },
    type: {
      type:    String,
      enum:    ['notes', 'pyq'],
      default: 'notes',
    },
    // Public HTTPS URL returned by Cloudinary (secure_url)
    fileUrl: {
      type:     String,
      required: true,
    },
    // Cloudinary public_id — stored to enable clean asset deletion
    cloudinaryPublicId: {
      type: String,
    },
    fileType: {
      type:     String,
      required: true,
      enum:     ['pdf'],
    },
    fileSize: {
      type: String,
    },
    // 'anonymous' for public uploads; extend later if auth is added
    uploadedBy: {
      type:     String,
      required: true,
    },
    isPinned: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
```

### Storage Reference Fields

The schema tracks Cloudinary storage using these fields:

| Field | Purpose |
|---|---|
| `fileUrl` | Public HTTPS URL returned by Cloudinary as `secure_url` |
| `cloudinaryPublicId` | Cloudinary `public_id`, used to delete files and generate temporary file links |
| `fileType` | Currently always `pdf` |
| `fileSize` | Human-readable file size such as `2.45 MB` |

### Resource Metadata Fields

| Field | Purpose |
|---|---|
| `title` | Display title for the uploaded resource |
| `description` | Short resource description |
| `semester` | Semester ID such as `S1`, `S2`, `S3`, etc. |
| `subject` | Subject name |
| `type` | Resource category: `notes` or `pyq` |
| `uploadedBy` | Currently always `anonymous` |
| `isPinned` | Whether the resource appears in Department Papers |
| `createdAt` | Auto-created by Mongoose timestamps |
| `updatedAt` | Auto-created by Mongoose timestamps |

### Semester and Subject Logic

Valid semesters:

```js
['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']
```

Current configured subject lists:

- `S1`: configured
- `S2`: configured
- `S3`: configured
- `S4`: configured
- `S5`: empty array, allows custom subject entry
- `S6`: empty array, allows custom subject entry
- `S7`: empty array, allows custom subject entry
- `S8`: empty array, allows custom subject entry

Backend subject validation only enforces the allowlist when a semester has a non-empty subject list:

```js
if (SEMESTER_SUBJECTS[semester]?.length > 0 && !SEMESTER_SUBJECTS[semester].includes(subject)) {
  res.status(400);
  throw new Error(`Invalid subject for ${semester}. Must be one of the predefined subjects.`);
}
```

---

## 4. Core Controllers & Endpoints

### API Routes

Current file: `server/routes/apiRoutes.js`

| Method | Endpoint | Controller / Handler | Purpose |
|---|---|---|---|
| `GET` | `/api/resources` | `getResources` | Fetch resources with optional filters |
| `POST` | `/api/resources` | `upload.single('file')`, `uploadResource` | Upload a PDF resource |
| `DELETE` | `/api/resources/:id` | `deleteResource` | Delete resource metadata and Cloudinary file |
| `PATCH` | `/api/resources/:id/pin` | `updateResourcePin` | Pin or unpin a resource |
| `GET` | `/api/resources/:id/file-url` | `getResourceFileUrl` | Generate temporary preview/download URL |
| `GET` | `/api/health` | inline handler | Health check |

### GET `/api/resources`

Fetches resources from MongoDB.

Supported query parameters:

| Query Param | Example | Purpose |
|---|---|---|
| `semester` | `S4` | Filter by semester |
| `subject` | `Operating Systems` | Filter by subject |
| `type` | `notes` | Filter by `notes` or `pyq` |
| `isPinned` | `true` | Fetch pinned resources |
| `limit` | `3` | Limit number of returned documents |
| `search` | `dbms` | Search title, description, semester, subject, and type |

Resources are sorted newest first:

```js
Resource.find(query).sort({ createdAt: -1 })
```

### POST `/api/resources`

Creates a new resource.

Expected multipart form fields:

| Field | Required | Description |
|---|---|---|
| `title` | Yes | Resource title |
| `description` | Yes | Resource description |
| `semester` | Yes | Semester ID such as `S4` |
| `subject` | Yes | Subject name |
| `type` | Optional | `notes` or `pyq`; defaults to `notes` |
| `file` | Yes | PDF file |

Multer middleware:

```js
router.route('/resources')
  .get(getResources)
  .post(upload.single('file'), uploadResource);
```

### Cloudinary Upload Logic

The backend uses Multer memory storage. The file is not written to local disk.

Current file: `server/middlewares/uploadMiddleware.js`

```js
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});
```

Cloudinary upload helper:

```js
const uploadToCloudinary = (buffer, folder, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder,
        public_id:     publicId,
        format:        'pdf',
        overwrite:     false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
```

Cloudinary folder and public ID generation:

```js
const safeSubject = sanitise(subject);
const safeName    = sanitise(file.originalname.replace(/\.pdf$/i, ''));
const folder      = `educrate/${semester}/${type}/${safeSubject}`;
const publicId    = `${Date.now()}_${safeName}`;
```

MongoDB resource creation after Cloudinary upload:

```js
const { secure_url, public_id: cloudinaryPublicId } = uploadResult;

const resource = await Resource.create({
  title:              title.trim().substring(0, 200),
  description:        description.trim().substring(0, 1000),
  semester,
  subject,
  type,
  fileUrl:            secure_url,
  cloudinaryPublicId,
  fileType:           'pdf',
  fileSize:           `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
  uploadedBy:         'anonymous',
});
```

### GET `/api/resources/:id/file-url`

Generates a temporary Cloudinary URL for preview/download.

Important details:

- Finds the resource by MongoDB `_id`.
- Requires `cloudinaryPublicId`.
- Supports `attachment=true` for download behavior.
- URL expires after 10 minutes.

```js
const attachment = req.query.attachment === 'true';
const expiresAt = Math.floor(Date.now() / 1000) + (10 * 60);
const url = cloudinary.utils.private_download_url(
  resource.cloudinaryPublicId,
  'pdf',
  {
    resource_type: 'raw',
    type: 'upload',
    ...(attachment ? { attachment: true } : {}),
    expires_at: expiresAt,
  }
);
```

### DELETE `/api/resources/:id`

Deletes both:

1. Cloudinary raw PDF file
2. MongoDB resource document

Cloudinary deletion:

```js
await cloudinary.uploader.destroy(resource.cloudinaryPublicId, {
  resource_type: 'raw',
});
```

### PATCH `/api/resources/:id/pin`

Updates `isPinned`.

Expected JSON body:

```json
{
  "isPinned": true
}
```

Controller logic:

```js
const resource = await Resource.findByIdAndUpdate(
  req.params.id,
  { isPinned },
  { new: true, runValidators: true }
);
```

### GET `/api/health`

Returns:

```json
{
  "status": "ok",
  "message": "EduCrate API is running"
}
```

---

## 5. Frontend Routing & Components

### React Router Routes

Current file: `client/src/App.jsx`

```jsx
<ErrorBoundary>
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/semester/:id" element={<Semester />} />
      <Route path="/about" element={<About />} />
    </Routes>
  </Router>
</ErrorBoundary>
```

| Route | Component | Purpose |
|---|---|---|
| `/` | `Dashboard.jsx` | Main student dashboard |
| `/semester/:id` | `Semester.jsx` | Semester-specific notes and PYQs |
| `/about` | `About.jsx` | About page |

`Login.jsx` exists only as a legacy placeholder and is not registered as a route.

### Main Frontend Components

| File | Role |
|---|---|
| `Layout.jsx` | Wraps page content with sidebar and top navigation |
| `Sidebar.jsx` | Left-side navigation |
| `TopNav.jsx` | Header, mobile menu button, and resource search input |
| `Dashboard.jsx` | Student dashboard with semester cards, recents, search results, upload, and department papers |
| `Semester.jsx` | Semester detail page with Notes and PYQs tabs |
| `UploadModal.jsx` | General dashboard upload modal |
| `SemesterUploadModal.jsx` | Context-aware upload modal for a specific semester and resource type |
| `PDFPreviewModal.jsx` | Opens PDF using Google Viewer, native viewer, or download |
| `ErrorBoundary.jsx` | App-level fallback for unexpected React render errors |

### Student Dashboard View

Current file: `client/src/pages/Dashboard.jsx`

The dashboard currently provides:

- Welcome header
- Upload button
- Semester grid for `S1` through `S8`
- Recents section
- View All / Show Less toggle
- Search results when `q` query parameter exists
- Department Papers section
- Pin/unpin buttons
- Preview and delete controls for resources

Dashboard API calls:

```js
const recents = await getResources({
  ...(showAll ? {} : { limit: 3 }),
  ...(searchTerm ? { search: searchTerm } : {}),
});

const papers = await getResources({ limit: 3, isPinned: true });
```

### Semester View

Current file: `client/src/pages/Semester.jsx`

The semester page provides:

- Back to dashboard button
- Semester title
- Counts for notes and PYQs
- Notes tab
- PYQs tab
- Subject folders for configured semesters
- Flat fallback notes list for semesters without configured subject lists
- Upload Notes button
- Upload PYQ button
- Preview, download, and delete controls

Notes fetch:

```js
const data = await getResources({ semester: id, type: 'notes' });
```

PYQ fetch:

```js
const data = await getResources({ semester: id, type: 'pyq' });
```

### Frontend API Helper

Current file: `client/src/lib/api.js`

The frontend centralizes backend calls in these functions:

| Function | Backend Endpoint |
|---|---|
| `getResources(params)` | `GET /api/resources` |
| `uploadResource(formData)` | `POST /api/resources` |
| `deleteResource(id)` | `DELETE /api/resources/:id` |
| `updateResourcePin(id, isPinned)` | `PATCH /api/resources/:id/pin` |
| `getResourceFileUrl(id, options)` | `GET /api/resources/:id/file-url` |

### How Upload Button Triggers Backend Upload

There are two upload entry points:

1. Dashboard Upload button opens `UploadModal`.
2. Semester page Upload Notes / Upload PYQ buttons open `SemesterUploadModal`.

Both modals:

1. Collect form fields.
2. Validate required values.
3. Validate PDF file type and size on the client side.
4. Create a `FormData` object.
5. Call `uploadResource(formData)`.
6. `uploadResource` sends a `POST` request to `/api/resources`.
7. Backend `upload.single('file')` parses the file.
8. Backend `uploadResource` uploads to Cloudinary and saves metadata to MongoDB.
9. On success, the frontend refreshes the resource list.

Example frontend upload call:

```js
const data = new FormData();
data.append('title', formData.title.trim());
data.append('description', formData.description.trim());
data.append('semester', semester);
data.append('subject', formData.subject);
data.append('type', uploadType);
data.append('file', formData.file);

await uploadResource(data);
onSuccess();
onClose();
```

### Search Flow

1. User types in `TopNav.jsx`.
2. Search value is saved to the URL as `?q=<term>&view=all`.
3. `Dashboard.jsx` reads the query parameter using `useSearchParams`.
4. Dashboard calls:

```js
getResources({ search: searchTerm })
```

5. Backend searches across:
   - `title`
   - `description`
   - `semester`
   - `subject`
   - `type`

### Pinning Flow

1. User clicks the pin icon on a resource.
2. Frontend calls:

```js
updateResourcePin(item._id, !item.isPinned)
```

3. Backend updates `isPinned`.
4. Dashboard refreshes resources.
5. Pinned resources appear in Department Papers.

---

## Current Development Notes

- Authentication is currently disabled/stubbed.
- Uploads are public and anonymous.
- Only PDF files are supported.
- Maximum upload size is 10 MB.
- Cloudinary stores actual PDF files.
- MongoDB stores metadata and file references.
- S1-S4 have official configured subjects.
- S5-S8 are valid semesters but currently accept custom subject input until official subject lists are added.
- The frontend dev server currently runs on port `3000`.
- The backend server defaults to port `5000`.
- Tests currently exist for:
  - Resource query construction
  - Semester subject configuration behavior

