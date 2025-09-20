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
    const response = await fetch('/users/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
    }

    const users = await response.json();
    const userTable = document.getElementById('userTable');
    userTable.innerHTML = '';

    users.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.full_name}</td>
        <td>${user.student_id || '-'}</td>
        <td>${user.email || '-'}</td>
        <td>${user.role}</td>
      `;
      userTable.appendChild(row);
    });
  } catch (error) {
    Toastify({
      text: `ข้อผิดพลาด: ${error.message}`,
      backgroundColor: 'red',
      duration: 3000
    }).showToast();
  }
});