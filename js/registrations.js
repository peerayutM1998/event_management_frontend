document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token'); // Assuming auth.js stores token in localStorage
  if (!token) {
    Toastify({
      text: 'กรุณาเข้าสู่ระบบ',
      backgroundColor: 'red',
      duration: 3000
    }).showToast();
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetch('/registrations/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('ไม่สามารถดึงข้อมูลการลงทะเบียนได้');
    }

    const registrations = await response.json();
    const registrationTable = document.getElementById('registrationTable');
    registrationTable.innerHTML = '';

    // Fetch event and user details for each registration
    for (const reg of registrations) {
      const eventResponse = await fetch(`/events/${reg.event_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userResponse = await fetch(`/users/${reg.user_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const event = eventResponse.ok ? await eventResponse.json() : { name: 'ไม่พบกิจกรรม' };
      const user = userResponse.ok ? await userResponse.json() : { full_name: 'ไม่พบผู้ใช้' };

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${reg.id}</td>
        <td>${event.name}</td>
        <td>${user.full_name}</td>
        <td>${new Date(reg.registration_date).toLocaleString('th-TH')}</td>
        <td>${reg.status}</td>
        <td>${reg.attendance_time ? new Date(reg.attendance_time).toLocaleString('th-TH') : '-'}</td>
      `;
      registrationTable.appendChild(row);
    }
  } catch (error) {
    Toastify({
      text: `ข้อผิดพลาด: ${error.message}`,
      backgroundColor: 'red',
      duration: 3000
    }).showToast();
  }
});