document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    Toastify({
      text: 'กรุณาเข้าสู่ระบบก่อน',
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  if (!eventId) {
    Toastify({
      text: 'ไม่พบรหัสกิจกรรม',
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
    return;
  }

  try {
    const userResponse = await fetch('http://localhost:8000/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
    }

    const user = await userResponse.json();
    if (user.role !== 'admin') {
      Toastify({
        text: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);
      return;
    }

    // ดึงข้อมูลกิจกรรม
    const response = await fetch(`http://localhost:8000/events/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('ไม่สามารถดึงข้อมูลกิจกรรมได้');
    }

    const event = await response.json();
    document.getElementById('eventId').value = event.id;
    document.getElementById('name').value = event.name;
    document.getElementById('description').value = event.description || '';
    document.getElementById('event_date').value = new Date(event.event_date).toISOString().split('T')[0];
    document.getElementById('event_start_time').value = new Date(event.event_start_time).toTimeString().slice(0, 5);
    document.getElementById('event_end_time').value = new Date(event.event_end_time).toTimeString().slice(0, 5);
    document.getElementById('registration_start_date').value = new Date(event.registration_start).toISOString().split('T')[0];
    document.getElementById('registration_start_time').value = new Date(event.registration_start).toTimeString().slice(0, 5);
    document.getElementById('registration_end_date').value = new Date(event.registration_end).toISOString().split('T')[0];
    document.getElementById('registration_end_time').value = new Date(event.registration_end).toTimeString().slice(0, 5);
    document.getElementById('location').value = event.location || '';
    document.getElementById('max_participants').value = event.max_participants;
  } catch (err) {
    Toastify({
      text: err.message,
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
  }

  document.getElementById('editEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('eventId').value;
    const name = document.getElementById('name').value;
    const description = document.getElementById('description').value;
    const event_date = document.getElementById('event_date').value;
    const event_start_time = document.getElementById('event_start_time').value;
    const event_end_time = document.getElementById('event_end_time').value;
    const registration_start_date = document.getElementById('registration_start_date').value;
    const registration_start_time = document.getElementById('registration_start_time').value;
    const registration_end_date = document.getElementById('registration_end_date').value;
    const registration_end_time = document.getElementById('registration_end_time').value;
    const location = document.getElementById('location').value;
    const max_participants = document.getElementById('max_participants').value;

    try {
      const response = await fetch(`http://localhost:8000/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          event_date,
          event_start_time: `${event_date}T${event_start_time}:00`,
          event_end_time: `${event_date}T${event_end_time}:00`,
          registration_start: `${registration_start_date}T${registration_start_time}:00`,
          registration_end: `${registration_end_date}T${registration_end_time}:00`,
          location,
          max_participants: parseInt(max_participants),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'การอัปเดตกิจกรรมล้มเหลว');
      }

      Toastify({
        text: 'อัปเดตกิจกรรมสำเร็จ',
        backgroundColor: '#976d44',
        position: 'top-right',
      }).showToast();
      setTimeout(() => {
        window.location.href = 'admin-dashboard.html';
      }, 1000);
    } catch (err) {
      Toastify({
        text: err.message,
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
    }
  });
});