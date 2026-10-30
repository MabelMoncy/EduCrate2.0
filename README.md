# EduCrate

## 1. Introduction
EduCrate is a full-stack web application built using the MERN stack designed to help students discover, share, and manage academic resources such as previous year questions (PYQs) and lecture notes. It provides a secure platform featuring user authentication via Firebase, dedicated student dashboards to track uploaded resources, and cloud-based file management utilizing Cloudinary.

## 2. Tech Stacks Used

### Frontend (client)
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS & Autoprefixer
- **Routing:** React Router DOM
- **Authentication:** Firebase Auth
- **Icons:** Lucide React
- **HTTP Client:** Axios

### Backend (server)
- **Environment:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **File Uploads:** Multer & Cloudinary
- **Security:** Helmet, Express Rate Limit, Express Mongo Sanitize, cors, bcryptjs
- **Authentication:** JSON Web Tokens (JWT) & Firebase Admin SDK

## 3. Installation and Setup

### Prerequisites
Before you begin, ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/)
- npm or yarn
- MongoDB (local or Atlas cluster)
- [Firebase account](https://firebase.google.com/)
- [Cloudinary account](https://cloudinary.com/)

### Clone the repository
```bash
git clone https://github.com/MabelMoncy/EduCrate2.0
cd EduCrate2.0
```

### Install Dependencies

**For Backend (Server):**
```bash
cd server
npm install
```

**For Frontend (Client):**
```bash
cd ../client
npm install
```

### Environment Configuration
The project requires environment variables for both the client and server. 
You can use the provided `.env.example` file in the root directory as a reference.

1. Create a `.env` file in the `server` directory and add the following keys:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=<Your MongoDB Connection String>
JWT_SECRET=<Your JWT Secret Key>
CORS_ORIGINS=http://localhost:3000
CLOUDINARY_CLOUD_NAME=<Your Cloudinary Cloud Name>
CLOUDINARY_API_KEY=<Your Cloudinary API Key>
CLOUDINARY_API_SECRET=<Your Cloudinary API Secret>
FIREBASE_PROJECT_ID=<Your Firebase Project ID>
FIREBASE_CLIENT_EMAIL=<Your Firebase Client Email>
FIREBASE_PRIVATE_KEY=<Your Firebase Private Key>
```

2. Create a `.env` file in the `client` directory and add the following keys:
```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=<Your Firebase API Key>
VITE_FIREBASE_AUTH_DOMAIN=<Your Firebase Auth Domain>
VITE_FIREBASE_PROJECT_ID=<Your Firebase Project ID>
VITE_FIREBASE_APP_ID=<Your Firebase App ID>
```

## 4. How to run

To run the project locally, you will need to start both the frontend and backend development servers.

**Step 1: Start the Server (Backend)**
Open a terminal instance and navigate to the server folder:
```bash
cd server
npm run dev
```
The backend should now be running on `http://localhost:5000`.

**Step 2: Start the Client (Frontend)**
Open a new terminal instance and navigate to the client folder:
```bash
cd client
npm run dev
```
The frontend application will compile and become available at `http://localhost:3000`.
