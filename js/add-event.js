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
  } catch (err) {
    Toastify({
      text: err.message,
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
  }

  document.getElementById('addEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
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
      const response = await fetch('http://localhost:8000/events/', {
        method: 'POST',
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
        throw new Error(errorData.detail || 'การเพิ่มกิจกรรมล้มเหลว');
      }

      Toastify({
        text: 'เพิ่มกิจกรรมสำเร็จ',
        backgroundColor: '#976d44',
        position: 'top-right',
      }).showToast();
      document.getElementById('addEventForm').reset();
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