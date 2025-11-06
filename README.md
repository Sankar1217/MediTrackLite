# MediTrackLite

MediTrack is a full-stack medical appointment management application designed to simplify the process of scheduling and managing doctor appointments. Built using **Spring Boot (backend)** and **React (frontend)**, the system supports role-based access for **Patients** and **Doctors**,  and appointment printing.

## 📌 Project Description

MediTrackLite serves as a lightweight but powerful healthcare portal where: 

- **Patients** can register, book appointments, upload reports, and access medical history.
- **Doctors** can manage appointments, update statuses, write prescriptions, and access analytics.
- **Admins** can monitor platform activity, manage users, and view system-wide reports.

This application supports role-based authentication and secure data handling to ensure privacy and efficiency in medical workflows. Deployed on **Render(Frontend), Railways(Backend)**. 
### Checkout MediTrackLite "https://meditrack-frontend-p0sd.onrender.com/"

##  Tech Stack

### Frontend (React + Vite)
- React Router for navigation
- Axios for API calls
- JavaScript
- VS Code as IDE

### Backend (Spring Boot)
- Spring Security for authentication and role-based access
- Spring Data JPA for database access
- BCrypt for password hashing
- Java Mail Sender for email based notifications
- Eclipse as IDE

## Requirements
- Java 21
- Maven
- MySQL 8+
- Node.js + npm

### Database
- MYSQL(Railway)

### Cloud Services
- Google Drive (file storage)

## 🔑 Key Features

### 👤 Authentication
- Secure login/logout with session-based access
- Role-based dashboards for `PATIENT`, `DOCTOR` and `ADMIN`
- Change password, forgot password and profile view functionality
- Password strength constraints & session protection

### 🩺 Patient Module
- Book appointments by selecting specialization, doctor, date, and slot
- Contact hospital on Whatsapp for queries
- Add phone number and problem description (max 200 chars)
- View booked appointments in reverse chronological order 
- Print appointment confirmation
- See prescription after appointment is completed and provide feedback
- Optionally upload medical reports for easier consultation
- Added Live chat feature

### 👨‍⚕️ Doctor Module
- View appointments split into **Pending** and **Accepted**
- Accept or Reject pending appointments
- Print accepted appointment details
- Add prescriptions after appointment is in progress
- Follow up patients via Whatsapp
- Can see feedback provided by patients and appointment analytics
- Otionally upload lab reports during prescription upload

### 🔒 Admin Module
- Dashboard Overview: View total number of doctors, patients, and appointments
- User Management:
    - View all users(doctors and patients)
    - Deactivate or remove users
    - User needs admin approval after registration
- Appointment Monitoring
    - Track pending, accepted, rejected, and completed appointments
    - Delete inappropriate feedbacks 
- View Analytical and Statistical data
  
### 💊 Prescription Management
- Add multiple medicines per appointment
- Consultation notes 
- Each medicine has:
  - Name
  - Dosage instructions
  - Frequency
- Prescriptions are linked to completed appointments
- Patients can view and print them

### 🕐Smart Schedulers
- Auto-rejects pending appointments after:
  - 30 minutes (if appointment is scheduled soon)
  - 12 hours (for general cleanup)
- Auto-update ACCEPTED appointments to IN_PROGRESS when slot time starts

### 💬 Chatbot Support System
- Symptom to disease mapping
- Common Medicine Advisory
- Disease Awareness

### 📧 Email Notification System
- Appointment Conformation
- Status Updates
- Feedback Alerts
- Forgot Password OTPs

### 🔒 Security Highlights
- Passwords stored with BCrypt hashing
- Session-aware protected endpoints
- Prevents unauthorized access via role-based filters

##  Project Structure
- MediTrackLite/
    - backend/  (Springboot Application)
    - frontend/ (React+Vite App)
    

##  Quick Setup
Follow these steps to run the project locally on your system
### Steps 
  1. **Clone the Repository**
    ```git clone https://github.com/Sankar1217/MediTrackLite.git```

#### Backend (Spring Boot)
1. Open the backend folder in Eclipse
2. Configure application.properties
   - spring.datasource.url=jdbc:mysql://localhost:3306/meditrackdb
   - spring.datasource.username=root
   - spring.datasource.password=your_password
   - configure .env file
3. Run the Spring Boot application
   - cd MediTrackLite/backend
   - mvn clean install
   - mvn spring-boot:run
4. It will start on: "http://localhost:8080"

#### Frontend (React + Vite)

1. Open the frontend folder in VS Code
2. cd MediTrackLite/frontend
3. Run these commands in Terminal:
   - npm install
   - npm run dev
4. It will start on: "http://localhost:5173"

###  Implemented Workflows
1. `Appointment Booking`
    - Only allows booking if doctor is available
    - Prevents race conditions during acceptance
2. `Prescription Handling`
   -  Multiple medicines per appointment
   -  Doctors enter prescription upon completion
   -  Patients can view and download after appointment
3. `File Uploads`
    - Patients upload past reports during booking
    - Doctors can upload lab requests after consultation
    - Stored on Google Drive with link sharing
4. `Feedback Flow`
    - Feedback allowed once per completed appointment
    - Doctors see feedback with average rating
5. `Admin Management`
    - Admin can monitor usage
    - User approval/deactivation
    - Secure delete with cascade cleanup
   
###  Sample API Endpoints
- POST `/api/auth/register` – Register user
- POST `/api/auth/login` – Login user
- GET `/api/auth/feedbacks` - Fetch list of feedbacks 
- POST `/appointments` – Book appointment
- GET `/appointments/doctor/pending` – Fetch doctor’s pending appointments
- PUT `/appointments/{id}/status` – Accept/Reject appointment
- POST `/prescriptions/upload` - Adds Prescription Details
- GET `/prescriptions/{appointmentId}` - Returns Prescription details based on appointmentId

###  Known Bugs and Limitations
- OTP delivery may fail occasionally due to JavaMailsender issues.
- File previews not supported, only download via Google Drive link.
- Timezone issues may appear in calendar view (FullCalendar) — ensure local time settings are correct.
-  No real-time updates (like WebSocket) — manual refresh needed in some views.
-  Analytics dashboard is basic, further metrics can be added.
-  Limited to few users as deployed on railway free tier.

 ## Future Enhancements
- Integreate Real time notifications to mobile number
- JWT-based token authentication
- Mobile app with React Native
- Invoice Generation
- Multi-language Support
  
##  What I Learned
- Implementing secure role-based authentication
- Integrating frontend and backend in a full-stack setup
- Managing session and user state in React
- Handling validations and protected routes
- Auto-scheduling using @Scheduled for rejecting stale appointments
- Building a modular, reusable component structure
- Generating printable PDF views for appointment summariest 
