document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  console.log('Login: Attempting login for', username);

  try {
    const response = await fetch('http://localhost:8000/auths/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'username': username,
        'password': password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Login failed');
    }

    const data = await response.json();
    console.log('Login: Success, token:', data.access_token);
    localStorage.setItem('token', data.access_token);

    // ดึงข้อมูลผู้ใช้เพื่อตั้งค่า role
    const userResponse = await fetch('http://localhost:8000/users/me', {
      headers: {
        'Authorization': `Bearer ${data.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Cannot fetch user data');
    }

    const user = await userResponse.json();
    console.log('Login: User data:', user);
    localStorage.setItem('role', user.role);

    Toastify({
      text: 'เข้าสู่ระบบสำเร็จ',
      backgroundColor: '#976d44',
      position: 'top-right',
    }).showToast();

    if (user.role === 'admin') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  } catch (err) {
    console.error('Login Error:', err.message);
    Toastify({
      text: err.message,
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
  }
});