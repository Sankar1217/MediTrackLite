import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';

const PrintAppointment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [prescriptionError, setPrescriptionError] = useState('');

  useEffect(() => {
    axios.get(`http://localhost:8080/appointments/patient/${id}`, { withCredentials: true })
      .then((res) => setAppointment(res.data))
      .catch((err) => console.error("Error fetching appointment:", err));

    axios.get("http://localhost:8080/api/auth/me", { withCredentials: true })
      .then((res) => setUserRole(res.data.role))
      .catch((err) => console.error("Error fetching user role:", err));
  }, [id]);

  // Fetch prescriptions and consultation notes if appointment is completed
  // Added via github
  useEffect(() => {
    if (appointment && appointment.status === 'COMPLETED') {
      setPrescriptions([]);
      setConsultationNotes('');
      setPrescriptionError('');
      axios.get(`http://localhost:8080/prescriptions/${appointment.id}`, { withCredentials: true })
        .then(res => {
          // If backend returns a single prescription, wrap in array
          if (Array.isArray(res.data)) {
            setPrescriptions(res.data);
            if (res.data.length > 0 && res.data[0].consultationNotes) {
              setConsultationNotes(res.data[0].consultationNotes);
            }
          } else if (res.data) {
            // If backend returns {medicines: [...], consultationNotes: "..."}
            if (Array.isArray(res.data.medicines)) {
              setPrescriptions(res.data.medicines);
              setConsultationNotes(res.data.consultationNotes || '');
            } else if (res.data.medicineName) {
              setPrescriptions([res.data]);
              setConsultationNotes(res.data.consultationNotes || '');
            } else {
              setPrescriptions([]);
              setConsultationNotes('');
            }
          } else {
            setPrescriptions([]);
            setConsultationNotes('');
          }
        })
        .catch(() => setPrescriptionError('No prescription found.'));
    }
  }, [appointment]);

  // Function to generate PDF from appointment details (with prescription if available)
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Appointment Details', 70, 20);
    doc.setFontSize(12);

    const body = [
      ['Appointment ID', appointment?.id],
      ['Patient Name', appointment?.patientEmail.split("@")[0]],
      ['Patient Email', appointment?.patientEmail],
      ['Doctor Name', appointment?.doctorName],
      ['Doctor Email', appointment?.doctorEmail],
      ['Date', appointment?.appointmentDate],
      ['Slot', appointment?.slot],
      ['Phone No', appointment?.phoneNo],
      ['Problem Description', appointment?.problemDescription],
      ['Status', appointment?.status],
      ['Created At', new Date(appointment?.createdAt).toLocaleString()],
    ];

    doc.autoTable({
      startY: 30,
      head: [['Field', 'Value']],
      body,
    });

    let lastY = doc.lastAutoTable.finalY;

    if (appointment?.status === 'COMPLETED') {
      if (consultationNotes) {
        doc.text('Consultation Notes:', 14, lastY + 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(consultationNotes, 14, lastY + 18, { maxWidth: 180 });
        lastY += 25;
      }
      if (prescriptions.length > 0) {
        doc.setFontSize(12);
        doc.text('Prescription', 14, lastY + 10);
        doc.autoTable({
          startY: lastY + 15,
          head: [['Medicine Name', 'Dosage Instructions', 'Frequency']],
          body: prescriptions.map(med => [
            med.medicineName || '',
            med.dosageInstructions || '',
            med.frequency || ''
          ]),
        });
      }
    }

    doc.save(`Appointment_${appointment?.id}.pdf`);
  };

  if (!appointment) {
    return <p style={{ textAlign: 'center', marginTop: '50px' }}>Loading appointment details...</p>;
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#eef2f5'
    }}>
      <div style={{
        padding: '30px',
        maxWidth: '600px',
        width: '100%',
        backgroundColor: '#f7f9fc',
        borderRadius: '10px',
        boxShadow: '0 0 12px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{ textAlign: 'center', color: '#1976d2' }}>Appointment Details</h2>
        <div style={{ marginTop: '20px', fontSize: '16px', lineHeight: '1.7' }}>
          <p><strong>Appointment ID:</strong> {appointment.id}</p>
          <p><strong>Patient Name:</strong> {appointment.patientEmail.split("@")[0]}</p>
          <p><strong>Patient Email:</strong> {appointment.patientEmail}</p>
          <p><strong>Doctor Name:</strong> {appointment.doctorName}</p>
          <p><strong>Doctor Email:</strong> {appointment.doctorEmail}</p>
          <p><strong>Date:</strong> {appointment.appointmentDate}</p>
          <p><strong>Slot:</strong> {appointment.slot}</p>
          <p><strong>Phone No:</strong> {appointment.phoneNo}</p>
          <p><strong>Problem Description:</strong> {appointment.problemDescription}</p>
          <p><strong>Status:</strong> {appointment.status}</p>
        </div>

        {appointment.status === 'COMPLETED' && (
          <div style={{
            marginTop: '30px',
            padding: '15px',
            background: '#e3f2fd',
            borderRadius: '8px'
          }}>
            <h3 style={{ color: '#1976d2' }}>Consultation Notes</h3>
            {consultationNotes ? (
              <div style={{ marginBottom: '15px', whiteSpace: 'pre-wrap' }}>
                {consultationNotes}
              </div>
            ) : (
              <div style={{ marginBottom: '15px', color: '#888' }}>No consultation notes.</div>
            )}
            <h3 style={{ color: '#1976d2' }}>Prescription</h3>
            {prescriptionError && <p style={{ color: 'red' }}>{prescriptionError}</p>}
            {prescriptions.length > 0 ? (
              <table style={{ width: '100%', marginTop: '10px', background: '#fff', borderRadius: '6px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Medicine Name</th>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Dosage Instructions</th>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((med, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '4px' }}>{med.medicineName}</td>
                      <td style={{ padding: '4px' }}>{med.dosageInstructions}</td>
                      <td style={{ padding: '4px' }}>{med.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !prescriptionError && <p>No prescription data found.</p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
          <button
            onClick={generatePDF}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Download PDF
          </button>
          <button
            onClick={() => navigate(userRole === 'DOCTOR' ? '/doctor' : '/patient')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#607d8b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintAppointment;
