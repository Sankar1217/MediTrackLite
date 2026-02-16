import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./../css/AdminHome.css";

const API = axios.create({
  baseURL: "http://localhost:8080",
  withCredentials: true,
});

const STATUS_COLORS = {
  PENDING: "#fbc02d",
  ACCEPTED: "#1976d2",
  REJECTED: "#e53935",
  IN_PROGRESS: "#00897b",
  COMPLETED: "#43a047",
  ACTIVE: "#43a047",
  INACTIVE: "#e53935",
  APPROVED: "#1976d2",
};

const APPOINTMENT_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "IN_PROGRESS",
  "COMPLETED",
];

const NAV_ITEMS = [
  { label: "Dashboard", key: "dashboard" },
  { label: "Users", key: "users" },
  { label: "Appointments", key: "appointments" },
  { label: "Analytics", key: "analytics" },
  { label: "Feedback", key: "feedback" },
];

const AdminHome = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({});
  const [dailyStats, setDailyStats] = useState([]);
  const [userCounts, setUserCounts] = useState({});
  const [users, setUsers] = useState([]);
  const [userStatusFilter, setUserStatusFilter] = useState("PENDING");
  const [appointments, setAppointments] = useState([]);
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("PENDING");
  const [toast, setToast] = useState("");
  const [showSessionAlert, setShowSessionAlert] = useState(false);
  const [doctorRatings, setDoctorRatings] = useState([]);
  const [appointmentsByPatient, setAppointmentsByPatient] = useState({});
  const [appointmentsByDoctor, setAppointmentsByDoctor] = useState({});
  const [adminUser, setAdminUser] = useState({ name: "Admin", email: "" });
  const [deletingUser, setDeletingUser] = useState(null);

  // Feedback state
  const [feedbacks, setFeedbacks] = useState([]);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState(null);

  const timeoutRef = useRef(null);

  // Helper to refresh all admin data
  const refreshAllAdminData = () => {
    fetchUsers(userStatusFilter);
    fetchUserCounts();
    fetchDoctorRatings();
    fetchStats();
    fetchAppointmentsByPatient();
    fetchAppointmentsByDoctor();
    fetchAppointments(appointmentStatusFilter);
    fetchFeedbacks();
  };

  // Session inactivity and back button prevention
  useEffect(() => {
    // Prevent back navigation
    window.history.pushState(null, null, window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, null, window.location.href);
      handleLogout(true);
    };
    window.addEventListener("popstate", handlePopState);

    // Inactivity timer
    const resetInactivityTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        handleLogout(true);
      }, 5 * 60 * 1000);
    };
    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("keydown", resetInactivityTimer);
    resetInactivityTimer();

    // Auth check
    fetchAuth();

    // Initial data
    fetchStats();
    fetchDailyStats();
    fetchUserCounts();
    fetchUsers(userStatusFilter);
    fetchAppointments(appointmentStatusFilter);
    fetchDoctorRatings();
    fetchAppointmentsByPatient();
    fetchAppointmentsByDoctor();
    fetchFeedbacks();

    return () => {
      clearTimeout(timeoutRef.current);
      window.removeEventListener("mousemove", resetInactivityTimer);
      window.removeEventListener("keydown", resetInactivityTimer);
      window.removeEventListener("popstate", handlePopState);
    };
    // eslint-disable-next-line
  }, []);

  // Refetch users/appointments when filter changes
  useEffect(() => {
    fetchUsers(userStatusFilter);
    // eslint-disable-next-line
  }, [userStatusFilter]);
  useEffect(() => {
    fetchAppointments(appointmentStatusFilter);
    // eslint-disable-next-line
  }, [appointmentStatusFilter]);

  const fetchAuth = async () => {
    try {
      const res = await API.get("/api/auth/me");
      if (res.data.role !== "ADMIN") {
        navigate("/login");
      } else {
        setAdminUser({ name: res.data.name || "Admin", email: res.data.email });
      }
    } catch {
      navigate("/login");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await API.get("/admin/stats/status");
      setStats(res.data);
    } catch {}
  };

  const fetchDailyStats = async () => {
    try {
      const res = await API.get("/admin/stats/daily");
      const arr = Object.entries(res.data).map(([date, count]) => ({
        date,
        count,
      }));
      arr.sort((a, b) => new Date(a.date) - new Date(b.date));
      setDailyStats(arr);
    } catch {}
  };

  const fetchUserCounts = async () => {
    try {
      const res = await API.get("/admin/stats/users");
      setUserCounts(res.data);
    } catch {}
  };

  const fetchUsers = async (status) => {
    try {
      const res = await API.get("/admin/users", { params: { status } });
      setUsers(res.data);
    } catch {
      setUsers([]);
    }
  };

  const fetchAppointments = async (status) => {
    try {
      const res = await API.get("/admin/appointments", { params: { status } });
      setAppointments(res.data);
    } catch {
      setAppointments([]);
    }
  };

  // Fetch all doctors and their average ratings
  const fetchDoctorRatings = async () => {
    try {
      // Get all active doctors
      const res = await API.get("/admin/users", { params: { status: "ACTIVE" } });
      const doctors = res.data.filter((u) => u.role === "DOCTOR");
      // For each doctor, fetch their average rating
      const ratings = await Promise.all(
        doctors.map(async (doc) => {
          try {
            const r = await API.get("/feedback/doctor/average", {
              params: { email: doc.email },
            });
            return {
              name: doc.name,
              email: doc.email,
              avgRating: r.data,
            };
          } catch {
            return {
              name: doc.name,
              email: doc.email,
              avgRating: 0,
            };
          }
        })
      );
      setDoctorRatings(ratings);
    } catch {
      setDoctorRatings([]);
    }
  };

  // Fetch appointments count by patient
  const fetchAppointmentsByPatient = async () => {
    try {
      const res = await API.get("/admin/appointments-by-patient");
      setAppointmentsByPatient(res.data);
    } catch {
      setAppointmentsByPatient({});
    }
  };

  // Fetch appointments by doctor and status
  const fetchAppointmentsByDoctor = async () => {
    try {
      const res = await API.get("/admin/appointments-by-doctor");
      setAppointmentsByDoctor(res.data);
    } catch {
      setAppointmentsByDoctor({});
    }
  };

  // Fetch all feedbacks for admin feedback tab
  const fetchFeedbacks = async () => {
    try {
      const res = await API.get("/admin/feedbacks");
      setFeedbacks(res.data);
    } catch {
      setFeedbacks([]);
    }
  };

  const handleUserStatusChange = async (id, newStatus) => {
    try {
      await API.put(`/admin/users/${id}/status`, null, { params: { status: newStatus } });
      setToast("User status updated!");
      fetchUsers(userStatusFilter);
      if (newStatus === "ACTIVE") fetchDoctorRatings();
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("Failed to update user status.");
      setTimeout(() => setToast(""), 2000);
    }
  };

  const handleUserFilter = (status) => {
    setUserStatusFilter(status);
  };

  const handleAppointmentFilter = (status) => {
    setAppointmentStatusFilter(status);
  };

  // Delete user logic
  const handleDeleteUser = async (email) => {
    if (!window.confirm("Are you sure you want to delete this user and all associated data?")) return;
    setDeletingUser(email);
    try {
      await API.delete("/admin/delete-user", { params: { email } });
      setToast("User deleted successfully.");
      fetchUsers(userStatusFilter);
      fetchDoctorRatings();
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("Failed to delete user.");
      setTimeout(() => setToast(""), 2000);
    }
    setDeletingUser(null);
  };

  // Delete feedback logic
  const handleDeleteFeedback = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to delete feedback for this appointment?")) return;
    setDeletingFeedbackId(appointmentId);
    try {
      await API.delete(`/admin/appointment/${appointmentId}`);
      setToast("Feedback deleted successfully.");
      fetchFeedbacks();
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("Failed to delete feedback.");
      setTimeout(() => setToast(""), 2000);
    }
    setDeletingFeedbackId(null);
  };

  const handleLogout = async (auto = false) => {
    try {
      await API.post("/api/auth/logout");
    } finally {
      if (auto) setShowSessionAlert(true);
      setTimeout(() => {
        setShowSessionAlert(false);
        navigate("/login");
      }, auto ? 1500 : 0);
      if (!auto) navigate("/login");
    }
  };
  // --- UI ---
  return  (
    <div className="admin-home-root">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-avatar">
          <img
            src="/avatar-admin.png"
            alt="Admin"
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#e3f2fd",
              objectFit: "cover",
              marginBottom: 10,
            }}
            onError={e => { e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; }}
          />
          <div className="admin-name">{adminUser.name}</div>
          <div className="admin-email">{adminUser.email}</div>
        </div>
        <div className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={activeTab === item.key ? "active" : ""}
              onClick={() => setActiveTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button className="admin-logout-btn" onClick={() => handleLogout(false)}>
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-main-content">
        {toast && <div className="toast">{toast}</div>}

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <>
            <h2 className="dashboard-title">Welcome {adminUser.name ? adminUser.name : "Admin"}</h2>
            <div className="admin-stats-row">
              <div className="admin-stats-card">
                <h4>Appointments by Status</h4>
                <div className="admin-status-list">
                  {APPOINTMENT_STATUSES.map((status) => (
                    <div key={status} className="admin-status-item">
                      <span
                        className="admin-status-dot"
                        style={{ background: STATUS_COLORS[status] || "#607d8b" }}
                      ></span>
                      <span style={{ fontWeight: 600 }}>{status}</span>
                      <span style={{ marginLeft: "auto", fontWeight: 700 }}>
                        {stats[status] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="admin-stats-card">
                <h4>Users</h4>
                <div className="admin-status-list">
                  <div className="admin-status-item">
                    <span className="admin-status-dot" style={{ background: "#1976d2" }}></span>
                    Doctors
                    <span style={{ marginLeft: "auto", fontWeight: 700 }}>{userCounts.Doctors || 0}</span>
                  </div>
                  <div className="admin-status-item">
                    <span className="admin-status-dot" style={{ background: "#43a047" }}></span>
                    Patients
                    <span style={{ marginLeft: "auto", fontWeight: 700 }}>{userCounts.Patients || 0}</span>
                  </div>
                </div>
              </div>
              <div className="custom-bar-chart">
  <h3 className="chart-title">Appointments Per Day</h3>
  <div className="bar-area">
    {dailyStats.length === 0 ? (
      <div className="no-data">No data</div>
    ) : (
      dailyStats.map((d, idx) => (
        <div key={idx} className="bar-wrapper">
          <div
            className="bar"
            style={{ height: `${d.count * 10}px` }}
            title={`${d.date}: ${d.count} appointments`}
          ></div>
          <span className="bar-label">{d.date.slice(5)}</span>
        </div>
      ))
    )}
  </div>
</div>

            </div>
          </>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="admin-section">
            <h3>Manage Users</h3>
            <div className="admin-tabs">
              {["PENDING", "ACTIVE", "INACTIVE"].map((status) => (
                <button
                  key={status}
                  className={userStatusFilter === status ? "active" : ""}
                  onClick={() => handleUserFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ color: "#888", textAlign: "center" }}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>
                          <span
                            className="admin-status-dot"
                            style={{ background: STATUS_COLORS[user.status] || "#607d8b" }}
                          ></span>
                          {user.status}
                        </td>
                        <td>
                          {user.status === "PENDING" && (
                            <button
                              className="admin-action-btn"
                              style={{ background: "#43a047" }}
                              onClick={() => handleUserStatusChange(user.id, "ACTIVE")}
                            >
                              Approve
                            </button>
                          )}
                          {user.status === "ACTIVE" && (
                            <button
                              className="admin-action-btn"
                              style={{ background: "#e53935" }}
                              onClick={() => handleUserStatusChange(user.id, "INACTIVE")}
                            >
                              Deactivate
                            </button>
                          )}
                          {user.status === "INACTIVE" && (
                            <button
                              className="admin-action-btn"
                              style={{ background: "#1976d2" }}
                              onClick={() => handleUserStatusChange(user.id, "ACTIVE")}
                            >
                              Activate
                            </button>
                          )}
                          <button
                            className="admin-action-btn"
                            style={{
                              background: "#b71c1c",
                              marginLeft: 4,
                              opacity: deletingUser === user.email ? 0.7 : 1,
                              pointerEvents: deletingUser === user.email ? "none" : "auto",
                            }}
                            onClick={() => handleDeleteUser(user.email)}
                            disabled={deletingUser === user.email}
                          >
                            {deletingUser === user.email ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Appointments */}
        {activeTab === "appointments" && (
          <div className="admin-section">
            <h3>Monitor Appointments</h3>
            <div className="admin-tabs">
              {APPOINTMENT_STATUSES.map((status) => (
                <button
                  key={status}
                  className={appointmentStatusFilter === status ? "active" : ""}
                  onClick={() => handleAppointmentFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Slot</th>
                    <th>Status</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ color: "#888", textAlign: "center" }}>
                        No appointments found.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((app) => (
                      <tr key={app.id}>
                        <td>{app.patientEmail}</td>
                        <td>{app.doctorEmail}</td>
                        <td>{app.appointmentDate}</td>
                        <td>{app.slot}</td>
                        <td>
                          <span
                            className="admin-status-dot"
                            style={{ background: STATUS_COLORS[app.status] || "#607d8b" }}
                          ></span>
                          {app.status}
                        </td>
                        <td>{app.problemDescription}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feedback */}
        {activeTab === "feedback" && (
          <div className="admin-section">
            <h3>All Feedbacks</h3>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Feedback ID</th>
                    <th>Appointment ID</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ color: "#888", textAlign: "center" }}>
                        No feedbacks found.
                      </td>
                    </tr>
                  ) : (
                    feedbacks.map((fb) => (
                      <tr key={fb.id}>
                        <td>{fb.feedbackId}</td>
                        <td>{fb.appointmentId}</td>
                        <td>
                          <span style={{ color: "#ffc107", fontWeight: 600 }}>
                            {fb.rating} ★
                          </span>
                        </td>
                        <td>{fb.comment}</td>
                        <td>
                          <button
                            className="admin-action-btn"
                            style={{
                              background: "#b71c1c",
                              opacity: deletingFeedbackId === fb.appointmentId ? 0.7 : 1,
                              pointerEvents: deletingFeedbackId === fb.appointmentId ? "none" : "auto",
                            }}
                            onClick={() => handleDeleteFeedback(fb.appointmentId)}
                            disabled={deletingFeedbackId === fb.appointmentId}
                          >
                            {deletingFeedbackId === fb.appointmentId ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics */}
        {activeTab === "analytics" && (
          <div>
            <div className="admin-section-row">
              <div className="admin-section" style={{ minWidth: 320, maxWidth: 400 }}>
                <h3>Doctor Feedback Ratings</h3>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Avg. Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorRatings.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ color: "#888", textAlign: "center" }}>
                            No doctors found.
                          </td>
                        </tr>
                      ) : (
                        doctorRatings.map((doc) => (
                          <tr key={doc.email}>
                            <td>{doc.name}</td>
                            <td>{doc.email}</td>
                            <td>
                              <span style={{ color: "#ffc107", fontWeight: 600 }}>
                                {doc.avgRating ? doc.avgRating.toFixed(2) : "0.00"} ★
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="admin-section" style={{ minWidth: 320, maxWidth: 500 }}>
                <h3>Appointments by Patient</h3>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Patient Email</th>
                        <th>Appointment Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(appointmentsByPatient).length === 0 ? (
                        <tr>
                          <td colSpan={2} style={{ color: "#888", textAlign: "center" }}>
                            No data found.
                          </td>
                        </tr>
                      ) : (
                        Object.entries(appointmentsByPatient).map(([email, count]) => (
                          <tr key={email}>
                            <td>{email}</td>
                            <td>{count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="admin-section" style={{ minWidth: 320, maxWidth: 700 }}>
                <h3>Appointments by Doctor & Status</h3>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Doctor Email</th>
                        {APPOINTMENT_STATUSES.map((status) => (
                          <th key={status}>{status}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(appointmentsByDoctor).length === 0 ? (
                        <tr>
                          <td colSpan={APPOINTMENT_STATUSES.length + 1} style={{ color: "#888", textAlign: "center" }}>
                            No data found.
                          </td>
                        </tr>
                      ) : (
                        Object.entries(appointmentsByDoctor).map(([doctorEmail, statusMap]) => (
                          <tr key={doctorEmail}>
                            <td>{doctorEmail}</td>
                            {APPOINTMENT_STATUSES.map((status) => (
                              <td key={status}>{statusMap[status] || 0}</td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session expired alert */}
        {showSessionAlert && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.2)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: "32px 48px",
                borderRadius: "12px",
                boxShadow: "0 2px 16px rgba(0,0,0,0.15)",
                fontSize: "1.2rem",
                color: "#333",
                textAlign: "center",
              }}
            >
              Session expired due to inactivity.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHome;