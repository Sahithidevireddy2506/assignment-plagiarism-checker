# EduCheck - Assignment Submission & Plagiarism Checker

## Overview
EduCheck is an AI-powered web application for managing assignment submissions and performing automated plagiarism detection with AI-generated feedback. It supports two roles: **students** and **faculty**.

## Tech Stack
- **Backend:** Node.js + Express (v5)
- **Database:** MongoDB Atlas (via Mongoose)
- **Authentication:** JWT (jsonwebtoken) + bcryptjs
- **File Handling:** multer (in-memory storage), pdf-parse
- **Frontend:** Vanilla HTML/CSS/JS (served as static files)

## Project Structure
```
index.js              - Main server entry point (port 5000, host 0.0.0.0)
routes/
  auth.js             - Register & login endpoints (/api/auth)
  assignments.js      - Assignment CRUD (/api/assignments)
  submissions.js      - PDF upload, similarity check, feedback (/api/submissions)
Models/
  User.js             - User schema (name, email, password, role)
  Assignment.js       - Assignment schema (title, description, subject, deadline)
  Submission.js       - Submission schema (file, text, similarity score, feedback)
middleware/
  auth.js             - JWT verification middleware
public/
  login.html          - Login page (served as root /)
  register.html       - Registration page
  student-dashboard.html   - Student view
  facult-dashboard.html    - Faculty view
```

## Environment Variables
- `MONGO_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - JWT signing secret
- `PORT` - Server port (default: 5000)

## Key Features
1. Faculty can create assignments with deadlines
2. Students upload PDF assignments
3. System extracts text from PDFs and computes Jaccard similarity against other submissions
4. AI-generated feedback based on similarity score and content length

## Running the App
```bash
npm start
```
Server runs on `http://0.0.0.0:5000`

## Deployment
Configured for autoscale deployment with `node index.js`.
