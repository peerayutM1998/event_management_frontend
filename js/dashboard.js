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
    const response = await fetch('http://localhost:8000/registrations/', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('ไม่สามารถดึงข้อมูลการลงทะเบียนได้');
    }

    const registrations = await response.json();
    const registeredCount = registrations.length;
    const attendedCount = registrations.filter(reg => reg.status === 'attended').length;

    document.getElementById('registeredCount').textContent = registeredCount;
    document.getElementById('attendedCount').textContent = attendedCount;

    const eventTable = document.getElementById('eventTable');
    eventTable.innerHTML = '';
    registrations.forEach(async (reg) => {
      const eventResponse = await fetch(`http://localhost:8000/events/${reg.event_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const event = await eventResponse.json();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${reg.event_id}</td>
        <td>${event.name}</td>
        <td>${new Date(event.event_date).toLocaleDateString('th-TH')}</td>
        <td>${reg.status === 'attended' ? 'เข้าร่วมแล้ว' : reg.status === 'cancelled' ? 'ยกเลิก' : 'ลงทะเบียน'}</td>
        <td><a href="event.html?id=${reg.event_id}" class="btn btn-brown-400 btn-sm">รายละเอียด</a></td>
      `;
      eventTable.appendChild(row);
    });
  } catch (err) {
    Toastify({
      text: err.message,
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
  }
});