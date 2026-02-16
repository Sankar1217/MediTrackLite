import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import Spinner from '../pages/Spinner'; 
import PrivateChat from '../pages/PrivateChat'; 

//import timeGridPlugin from '@fullcalendar/timegrid';
import './../css/DoctorHome.css';
import '@fullcalendar/common/main.css';



const DoctorHome = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [toast, setToast] = useState('');
  const [view, setView] = useState('appointments');
  const [calendarView, setCalendarView] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    appointmentId: '',
    medicines: [{ medicineName: '', dosageInstructions: '', frequency: '' }],
    consultationNotes: '',
  });
  const [prescriptionError, setPrescriptionError] = useState('');
  const [prescriptionSuccess, setPrescriptionSuccess] = useState('');
  const [labReportFile, setLabReportFile] = useState(null);

  const [showCenterAlert, setShowCenterAlert] = useState(false);

  // Feedback state
  const [doctorFeedback, setDoctorFeedback] = useState([]);
  const [averageRating, setAverageRating] = useState(null);

  // Doctor analytics state
  const [doctorAnalytics, setDoctorAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);
const [prescriptionSubmitting, setPrescriptionSubmitting] = useState(false);
const [chatPatient, setChatPatient] = useState(null); 



  const API = axios.create({
    baseURL: 'http://localhost:8080',
    withCredentials: true,
  });

  const ANALYTICS_API = axios.create({
    baseURL: 'http://localhost:8080/analytics',
    withCredentials: true,
  });
  const timeoutRef = useRef(null);
  const resetInactivityTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleLogout(true);
    }, 5 * 60 * 1000);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await API.get('/api/auth/me');
        if (res.data.role !== 'DOCTOR') navigate('/login');
        else {
          setUser(res.data);
          loadAppointments(res.data.email);
          fetchDoctorFeedback(res.data.email);
          fetchAverageRating(res.data.email);
          fetchDoctorAnalytics(res.data.email);
        }
      } catch {
        navigate('/login');
      }
    };

    fetchUser();
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    resetInactivityTimer();

    return () => {
      clearTimeout(timeoutRef.current);
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('keydown', resetInactivityTimer);
    };
    // eslint-disable-next-line
  }, []);

  const loadAppointments = async (email) => {
    try {
      const res = await API.get('/appointments/doctor', { params: { email } });
      setAppointments(res.data);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    }
  };

  // Fetch all feedback for this doctor
  const fetchDoctorFeedback = async (email) => {
    try {
      const res = await API.get('/feedback/doctor', { params: { email } });
      setDoctorFeedback(res.data);
    } catch (err) {
      setDoctorFeedback([]);
    }
  };

  // Fetch average rating for this doctor
  const fetchAverageRating = async (email) => {
    try {
      const res = await API.get('/feedback/doctor/average', { params: { email } });
      setAverageRating(res.data);
    } catch (err) {
      setAverageRating(null);
    }
  };

  // Fetch doctor analytics
  const fetchDoctorAnalytics = async (email) => {
    setAnalyticsLoading(true);
    try {
      const res = await ANALYTICS_API.get(`/doctor-analytics?email=${encodeURIComponent(email)}`);
      setDoctorAnalytics(res.data);
    } catch {
      setDoctorAnalytics(null);
    }
    setAnalyticsLoading(false);
  };

  const handleStatus = async (id, status) => {
    setStatusUpdating(true);
    try {
      await API.put(`/appointments/${id}/status`, null, { params: { status } });
      setToast(`Status updated to ${status}`);
      if (user?.email) loadAppointments(user.email);
    } catch {
      setToast('Error updating status');
    }
    setStatusUpdating(false);
    setTimeout(() => setToast(''), 3000);
  };

  const handleLogout = async (auto = false) => {
    try {
      await API.post('/api/auth/logout');
    } finally {
      if (auto) alert('Session expired due to inactivity');
      navigate('/login');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }
    try {
      await API.post('/api/auth/change-password', { oldPassword, newPassword });
      alert('Password changed successfully!');
      setShowChangePassword(false);
      navigate('/login');
    } catch (err) {
      setError(
        (err.response && (
          typeof err.response.data === 'string'
            ? err.response.data
            : err.response.data?.message
        )) || 'Failed to change password.'
      );
    }
  };

  const openPrescriptionForm = (id) => {
    setPrescriptionForm({
      appointmentId: id,
      medicines: [{ medicineName: '', dosageInstructions: '', frequency: '' }],
      consultationNotes: '',
    });
    setLabReportFile(null);
    setPrescriptionError('');
    setPrescriptionSuccess('');
    setShowPrescriptionForm(true);
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    const { appointmentId, medicines, consultationNotes } = prescriptionForm;

    if (medicines.some(m => !m.medicineName || !m.dosageInstructions || !m.frequency)) {
      setPrescriptionError('All fields are required.');
      return;
    }
    setPrescriptionSubmitting(true); 

    try {
      const formData = new FormData();
      const prescriptionRequest = {
        appointmentId,
        prescriptions: medicines,
        consultationNotes,
      };
      formData.append('data', new Blob([JSON.stringify(prescriptionRequest)], { type: 'application/json' }));
      if (labReportFile) {
        formData.append('labReport', labReportFile);
      }
      await API.post('/prescriptions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPrescriptionSuccess('Uploaded successfully.');
      setShowCenterAlert(true);
      setShowPrescriptionForm(false);
      loadAppointments(user.email);
      setTimeout(() => setShowCenterAlert(false), 1000);
    } catch {
      setPrescriptionError('Failed to upload prescription.');
    }
    setPrescriptionSubmitting(false); 

  };

  const addMedicineRow = () => {
    setPrescriptionForm((prev) => ({
      ...prev,
      medicines: [...prev.medicines, { medicineName: '', dosageInstructions: '', frequency: '' }],
    }));
  };

  const removeMedicineRow = (index) => {
    setPrescriptionForm((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index),
    }));
  };

  const handleMedicineChange = (index, e) => {
    const { name, value } = e.target;
    const updated = [...prescriptionForm.medicines];
    updated[index][name] = value;
    setPrescriptionForm({ ...prescriptionForm, medicines: updated });
  };

  // Only these statuses
  const STATUS_LABELS = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed'
  };
  const STATUS_KEYS = Object.keys(STATUS_LABELS);

  const filteredAppointments = appointments.filter(app =>
    statusFilter === 'ALL' ? true : app.status === statusFilter
  );

  // Download report handler for completed appointments
  const handleDownloadReport = (labReportsPath) => {
    if (!labReportsPath) return;
    window.open(labReportsPath, '_blank');
  };

  // Filter completed appointments for feedback display
  const completedAppointments = appointments.filter(app => app.status === 'COMPLETED');

  // Calendar View for Doctor
  
const DoctorCalendarView = ({ appointments, onStatusUpdate }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filtered = appointments.filter(appt => appt.status !== 'REJECTED');

  const events = filtered.map(appt => {
    let slot = appt.slot;
    if (slot && slot.length === 4) slot = '0' + slot;
    if (!slot || !/^\d{2}:\d{2}$/.test(slot)) slot = '09:00';

    // Format slot to readable time (e.g. 02:30 PM)
    const [hour, minute] = slot.split(':');
    const timeObj = new Date();
    timeObj.setHours(parseInt(hour));
    timeObj.setMinutes(parseInt(minute));
   
    return {
      title: `${appt.patientEmail.split('@')[0]} - ${appt.slot}`,
      start: `${appt.appointmentDate}T${slot}`,
      color:
        appt.status === 'COMPLETED'
          ? '#4caf50'
          : appt.status === 'IN_PROGRESS'
          ? '#9c27b0'
          : appt.status === 'ACCEPTED'
          ? '#2196f3'
          : appt.status === 'PENDING'
          ? '#ff9800'
          : '#607d8b',
      extendedProps: appt
    };
  });

  return (
    <div className="calendar-wrapper">
      <h2 className="calendar-title">📅 Doctor's Appointment Calendar</h2>

      <div className="calendar-legend">
        <span className="legend-item" style={{ backgroundColor: '#4caf50' }}>✔ Completed</span>
        <span className="legend-item" style={{ backgroundColor: '#ff9800' }}>🕒 Pending</span>
        <span className="legend-item" style={{ backgroundColor: '#2196f3' }}>✔ Accepted</span>
        <span className="legend-item" style={{ backgroundColor: '#9c27b0' }}>⏳ In Progress</span>
      </div>

      <FullCalendar
  plugins={[dayGridPlugin, interactionPlugin]}
  initialView="dayGridMonth"
  height="auto"
  events={events}
  eventClick={(info) => setSelectedEvent(info.event.extendedProps)}
  eventDisplay="block"
  dayMaxEventRows={3}
  headerToolbar={{
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,dayGridWeek,dayGridDay', // ✅ only dayGrid views
  }}
  eventContent={(arg) => {
    const { title } = arg.event;
    return (
      <div style={{ fontSize: '13px', padding: '2px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title}
      </div>
    );
  }}
/>



      {/* Modal for full details */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-container animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedEvent(null)}>&times;</button>
            <h3 className="modal-title">📝 Appointment Details</h3>
            <div className="modal-content">
              <p><strong>Date:</strong> {selectedEvent.appointmentDate}</p>
              <p><strong>Time Slot:</strong> {selectedEvent.slot}</p>
              <p><strong>Patient:</strong> {selectedEvent.patientEmail}</p>
              <p><strong>Status:</strong> <span className={`status-badge ${selectedEvent.status.toLowerCase()}`}>{STATUS_LABELS[selectedEvent.status]}</span></p>
              {selectedEvent.problemDescription && <p><strong>Problem:</strong> {selectedEvent.problemDescription}</p>}
              {selectedEvent.patientReportPath && (
                <button
                  className="report-download-btn"
                  onClick={() =>
                    window.open(selectedEvent.patientReportPath, '_blank')
                  }
                >
                  📄 Download Patient Report
                </button>
              )}
              {selectedEvent.status === 'COMPLETED' && selectedEvent.prescriptionPath && (
                <button
                  className="report-download-btn"
                  style={{ backgroundColor: '#3f51b5', marginLeft: '10px' }}
                  onClick={() =>
                    window.open(`http://localhost:8080/files/download/${encodeURIComponent(selectedEvent.prescriptionPath)}`, '_blank')
                  }
                >
                  💊 Download Prescription
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  // Visualization for analytics (pie chart for medicines, bar for patient count, etc.)
  const renderAnalytics = () => {
    if (analyticsLoading) {
      return <div style={{ margin: 24, textAlign: 'center' }}>Loading analytics...</div>;
    }
    if (!doctorAnalytics) {
      return <div style={{ margin: 24, textAlign: 'center', color: '#888' }}>No analytics data found.</div>;
    }

    // Pie chart for most prescribed medicines
    const meds = doctorAnalytics.mostPrescribedMeds || {};
    const medsArr = Object.entries(meds);
    const totalMeds = medsArr.reduce((sum, [, count]) => sum + count, 0);

    // Feedback analytics
    const feedbacks = doctorFeedback || [];
    const feedbackCount = feedbacks.length;
    const avgRating = averageRating || 0;
    const ratingDist = [0, 0, 0, 0, 0];
    feedbacks.forEach(fb => {
      if (fb.rating >= 1 && fb.rating <= 5) ratingDist[fb.rating - 1]++;
    });

    // Simple pie chart using SVG
    let startAngle = 0;
    const pieColors = ['#1976d2', '#43a047', '#fbc02d', '#e53935', '#8e24aa', '#00897b', '#f57c00', '#6d4c41'];
    const pieSlices = medsArr.map(([name, count], idx) => {
      const angle = (count / totalMeds) * 360;
      const largeArc = angle > 180 ? 1 : 0;
      const x1 = 100 + 90 * Math.cos((Math.PI * startAngle) / 180);
      const y1 = 100 + 90 * Math.sin((Math.PI * startAngle) / 180);
      const x2 = 100 + 90 * Math.cos((Math.PI * (startAngle + angle)) / 180);
      const y2 = 100 + 90 * Math.sin((Math.PI * (startAngle + angle)) / 180);
      const path = `
        M100,100
        L${x1},${y1}
        A90,90 0 ${largeArc} 1 ${x2},${y2}
        Z
      `;
      const slice = (
        <path
          key={name}
          d={path}
          fill={pieColors[idx % pieColors.length]}
          stroke="#fff"
          strokeWidth="2"
        >
          <title>{name}: {count}</title>
        </path>
      );
      startAngle += angle;
      return slice;
    });

    // Bar chart for feedback rating distribution
    const maxDist = Math.max(...ratingDist, 1);
    return (
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginTop: 24 }}>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(25, 118, 210, 0.08)',
          padding: 24,
          minWidth: 320,
          flex: 1
        }}>
          <h3 style={{ marginBottom: 16 }}>Doctor Analytics</h3>
          <div style={{ marginBottom: 12 }}>
            <strong>Total Unique Patients:</strong> <span style={{ color: '#1976d2', fontSize: 20 }}>{doctorAnalytics.patientCount}</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Average Consultation Time:</strong> <span style={{ color: '#43a047', fontSize: 18 }}>{doctorAnalytics.averageConsultationTime} min</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Most Prescribed Medicines:</strong>
            {medsArr.length === 0 ? (
              <div style={{ color: '#888', marginTop: 6 }}>No prescriptions yet.</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
                <svg width="200" height="200" viewBox="0 0 200 200">
                  {pieSlices}
                </svg>
                <ul style={{ marginLeft: 16, listStyle: 'none', padding: 0 }}>
                  {medsArr.map(([name, count], idx) => (
                    <li key={name} style={{ marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        width: 16,
                        height: 16,
                        background: pieColors[idx % pieColors.length],
                        borderRadius: '50%',
                        marginRight: 8
                      }}></span>
                      <span>{name}: <b>{count}</b></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        {/* Feedback Analytics Visualization */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(25, 118, 210, 0.08)',
          padding: 24,
          minWidth: 320,
          flex: 1
        }}>
          <h3 style={{ marginBottom: 16 }}>Feedback Analytics</h3>
          <div style={{ marginBottom: 12 }}>
            <strong>Total Feedbacks:</strong> <span style={{ color: '#1976d2', fontSize: 20 }}>{feedbackCount}</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Average Rating:</strong> <span style={{ color: '#ffc107', fontSize: 20 }}>{avgRating ? avgRating.toFixed(2) : '0.00'} ★</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Rating Distribution:</strong>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 16, height: 150 }}>
              {ratingDist.map((count, idx) => (
                <div key={idx} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{
                    background: '#1976d2',
                    height: `${(count / maxDist) * 20}px`,
                    width: 18,
                    margin: '0 auto',
                    borderRadius: 4,
                    transition: 'height 0.3s'
                  }} title={`${idx + 1} Star: ${count}`}></div>
                  <div style={{ fontSize: 18, color: '#ffc107', marginTop: 4 }}>{'★'.repeat(idx + 1)}</div>
                  <div style={{ fontSize: 13, color: '#333' }}>{count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="doctor-dashboard-container">
      <h2 className="dashboard-title">Welcome Dr. {user?.name}</h2>
      {toast && <div className="toast">{toast}</div>}

      <div className="dashboard-content">
        <div className="sidebar">
          <img src="/images/docor_profile.jpg" alt="doctor" />
          <p>{user?.name}</p>
          {/* <p>{user?.email}</p> */}
          <button onClick={() => { setView('appointments'); setCalendarView(false); }}>Appointments</button>
          <button onClick={() => { setView('feedback'); setCalendarView(false); }}>Feedback</button>
          <button onClick={() => { setView('analytics'); setCalendarView(false); }}>Analytics</button>
          <button onClick={() => { setView('password'); setCalendarView(false); }}>Change Password</button>
          <button onClick={() => { setCalendarView(true); setView('calendar'); }}>Calendar View</button>
          <button className="red-button" onClick={() => handleLogout(false)}>Logout</button>
        </div>

        <div className="main-content" style={view === 'feedback' ? { display: 'flex', flexDirection: 'row', gap: 24 } : {}}>
          {calendarView ? (
            <DoctorCalendarView appointments={appointments} onStatusUpdate={handleStatus} />
          ) : view === 'appointments' ? (
            <>
              <div className="status-tabs">
                {STATUS_KEYS.map(s => (
                  <button
                    key={s}
                    className={statusFilter === s ? 'active' : ''}
                    onClick={() => setStatusFilter(s)}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>


              {statusUpdating && (
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
    <Spinner message="Updating appointment status..." />
  </div>
)}


              <div className="appointments-list">
                {appointments.filter(app => statusFilter === 'ALL' ? true : app.status === statusFilter).length === 0 ? (
                  <div style={{ color: '#888', margin: '24px 0', textAlign: 'center' }}>
                    No appointments{statusFilter !== 'ALL' ? ` with status "${STATUS_LABELS[statusFilter]}"` : ''}.
                  </div>
                ) : (
                  filteredAppointments.map(app => (
                    <div className="appointment-card" key={app.id}>
                      <p><strong>Patient:</strong> {app.patientEmail.split("@")[0]}</p>
                      <p><strong>Date:</strong> {app.appointmentDate}</p>
                      <p><strong>Time:</strong> {app.slot}</p>
                      <p><strong>Issue:</strong> {app.problemDescription}</p>
                      <button
                        style={{
                          margin: '8px 8px 0 0',
                          background: '#1976d2',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          padding: '4px 12px',
                          cursor: 'pointer'
                        }}
                        onClick={() => setChatPatient(app.patientEmail)}
                      >
                        Chat with Patient
                      </button>
                      {app.status === 'PENDING' && app.patientReportPath && (
                        <button
                          style={{ marginBottom: 8, backgroundColor: '#607d8b', color: 'white' }}
                          onClick={() => handleDownloadReport(app.patientReportPath)}
                        >
                          Download Report
                        </button>
                      )}
                      {app.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleStatus(app.id, 'ACCEPTED')}>✔ Accept</button>
                          <button className="red-button" onClick={() => handleStatus(app.id, 'REJECTED')}>✘ Reject</button>
                        </>
                      )}
                      {app.status === 'ACCEPTED' && (
                        <button onClick={() => handleStatus(app.id, 'IN_PROGRESS')}>Start</button>
                      )}
                      {app.status === 'IN_PROGRESS' && (
                        <button onClick={() => openPrescriptionForm(app.id)}>Upload Prescription</button>
                      )}
                      {app.status === 'COMPLETED' && (
                        <>
                          {app.labReportsPath && (
                            <button
                              style={{ marginRight: 8, backgroundColor: '#607d8b', color: 'white' }}
                              onClick={() => handleDownloadReport(app.labReportsPath)}
                            >
                              Download Lab Report
                            </button>
                          )}
                          <button onClick={() => navigate(`/print/${app.id}`)}>Print</button>
                          {app.phoneNo && (
                            <button
                              className="whatsapp-button"
                              style={{ backgroundColor: '#25D366', color: 'white', margin: '8px 0' }}
                              onClick={() =>
                                window.open(
                                  `https://wa.me/${app.phoneNo}?text=Hello%20this%20is%20Dr.%20${user?.name}%20regarding%20your%20appointment.`,
                                  '_blank'
                                )
                              }
                            >
                              <img
                                src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                                alt="WhatsApp"
                                style={{ width: 20, marginRight: 8, verticalAlign: 'middle' }}
                              />
                              WhatsApp Patient
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : view === 'feedback' ? (
            <>
              {/* Left half: completed appointments & feedback */}
              <div style={{ flex: 1, marginRight: 24 }}>
                <h4>Completed Appointments & Feedback</h4>
                {completedAppointments.length > 0 ? (
                  completedAppointments.map(app => {
                    const feedback = doctorFeedback.find(fb => fb.appointment && fb.appointment.id === app.id);
                    return (
                      <div key={app.id} className="appointment-card" style={{ background: '#f7f7f7', marginBottom: 12 }}>
                        <p><strong>Patient:</strong> {app.patientEmail.split("@")[0]}</p>
                        <p><strong>Date:</strong> {app.appointmentDate}</p>
                        <p><strong>Time:</strong> {app.slot}</p>
                        <p><strong>Issue:</strong> {app.problemDescription}</p>
                        {feedback ? (
                          <div style={{ marginTop: 8 }}>
                            <span style={{ color: '#ffc107', fontSize: 18 }}>
                              {'★'.repeat(feedback.rating)}
                              {'☆'.repeat(5 - feedback.rating)}
                            </span>
                            <span style={{ marginLeft: 8, color: '#333' }}>
                              {feedback.comment}
                            </span>
                          </div>
                        ) : (
                          <div style={{ color: '#888', marginTop: 8 }}>No feedback for this appointment.</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div>No completed appointments yet.</div>
                )}
              </div>
              {/* Right half: all feedbacks and average */}
              <div style={{ flex: 1, minWidth: 320 }}>
                <h3>Feedback Received</h3>
                {averageRating !== null && (
                  <div style={{ marginBottom: 16, fontWeight: 'bold' }}>
                    Average Rating: <span style={{ color: '#ffc107', fontSize: 22 }}>{averageRating.toFixed(2)} ★</span>
                  </div>
                )}
                {doctorFeedback.length === 0 ? (
                  <div>No feedback received yet.</div>
                ) : (
                  <div>
                    <h4>All Feedback</h4>
                    {doctorFeedback.map((fb, idx) => (
                      <div key={fb.id || idx} style={{ borderBottom: '1px solid #eee', padding: 8, marginBottom: 8 }}>
                        <span style={{ color: '#ffc107', fontSize: 18 }}>
                          {'★'.repeat(fb.rating)}
                          {'☆'.repeat(5 - fb.rating)}
                        </span>
                        <span style={{ marginLeft: 8, color: '#333' }}>{fb.comment}</span>
                        {fb.appointment && (
                          <span style={{ marginLeft: 16, color: '#888', fontSize: 13 }}>
                            (Patient: {fb.appointment.patientEmail.split("@")[0]}, Date: {fb.appointment.appointmentDate})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : view === 'analytics' ? (
            <div style={{ width: '100%' }}>
              {renderAnalytics()}
            </div>
          ) : view === 'password' ? (
            <form onSubmit={handleChangePassword} className="change-password-form">
              <h3>Change Password</h3>
              {error && <p className="error">{error}</p>}
              {success && <p className="success">{success}</p>}
              <input type="password" placeholder="Old Password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
              <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <input type="password" placeholder="Confirm Password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
              <button type="submit">Update</button>
            </form>
          ) : null}
        </div>
      </div>

      {showPrescriptionForm && (
        <div className="modal-overlay" onClick={() => setShowPrescriptionForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <h3>Upload Prescription</h3>

      {prescriptionSubmitting ? (
        <Spinner message="Uploading prescription..." />
      ) : (
        <>
            {prescriptionError && <p className="error">{prescriptionError}</p>}
            {prescriptionSuccess && <p className="success">{prescriptionSuccess}</p>}

            <form onSubmit={handlePrescriptionSubmit}>
              <div className="medicine-list">
                {prescriptionForm.medicines.map((m, i) => (
                  <div key={i} className="medicine-row">
                    <input name="medicineName" placeholder="Name" value={m.medicineName} onChange={e => handleMedicineChange(i, e)} />
                    <input name="dosageInstructions" placeholder="Dosage" value={m.dosageInstructions} onChange={e => handleMedicineChange(i, e)} />
                    <input name="frequency" placeholder="Frequency" value={m.frequency} onChange={e => handleMedicineChange(i, e)} />
                    {prescriptionForm.medicines.length > 1 && (
                      <button type="button" className="red-button" onClick={() => removeMedicineRow(i)}>Remove</button>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" className="add-button" onClick={addMedicineRow}>+ Add Medicine</button>

              <textarea
                placeholder="Consultation Notes"
                value={prescriptionForm.consultationNotes}
                onChange={e => setPrescriptionForm({ ...prescriptionForm, consultationNotes: e.target.value })}
              ></textarea>

              <label style={{ marginTop: 10, display: 'block' }}>
                Upload Lab Report (optional):
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setLabReportFile(e.target.files[0])}
                  style={{ display: 'block', marginTop: 5 }}
                />
              </label>

              <button type="submit" className="submit-button">Submit</button>
            </form>
            </>
             )}
          </div>
        </div>
      )}

      {showCenterAlert && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '32px 48px',
              borderRadius: '12px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
              fontSize: '1.2rem',
              color: '#333',
              textAlign: 'center'
            }}
          >
            Prescription uploaded successfully.
          </div>
        </div>
      )}
          {chatPatient && (
        <div className="modal-overlay" onClick={() => setChatPatient(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setChatPatient(null)}>&times;</button>
            <PrivateChat
              username={user?.email}
              peer={chatPatient}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorHome;