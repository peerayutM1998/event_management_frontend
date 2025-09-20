document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'admin') {
    Toastify({
      text: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    return;
  }

  const eventSelect = document.getElementById('eventSelect');
  const openAttendanceBtn = document.getElementById('openAttendanceBtn');
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const captureBtn = document.getElementById('captureBtn');
  const preview = document.getElementById('preview');
  let faceImageBase64 = null;
  let selectedEventId = null;

  try {
    const eventsResponse = await fetch('http://localhost:8000/events/', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!eventsResponse.ok) {
      throw new Error('ไม่สามารถดึงรายการกิจกรรมได้');
    }

    const events = await eventsResponse.json();
    events.forEach(event => {
      const option = document.createElement('option');
      option.value = event.id;
      option.textContent = `${event.name} (${new Date(event.event_date).toLocaleDateString('th-TH')})`;
      eventSelect.appendChild(option);
    });
  } catch (err) {
    Toastify({
      text: err.message,
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
  }

  eventSelect.addEventListener('change', (e) => {
    selectedEventId = e.target.value;
  });

  openAttendanceBtn.addEventListener('click', async () => {
    if (!selectedEventId) {
      Toastify({
        text: 'กรุณาเลือกกิจกรรม',
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/registrations/${selectedEventId}/open-attendance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'เปิดโหมดเข้าร่วมล้มเหลว');
      }

      Toastify({
        text: 'เปิดโหมดเข้าร่วมสำเร็จ',
        backgroundColor: '#976d44',
        position: 'top-right',
      }).showToast();

      // เปิดกล้อง
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      video.style.display = 'block';
      captureBtn.style.display = 'block';
    } catch (err) {
      Toastify({
        text: err.message,
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
    }
  });

  captureBtn.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const resizedCanvas = document.createElement('canvas');
      resizedCanvas.width = 100;
      resizedCanvas.height = 100;
      const resizedCtx = resizedCanvas.getContext('2d');
      resizedCtx.drawImage(canvas, 0, 0, 100, 100);
      faceImageBase64 = resizedCanvas.toDataURL('image/jpeg').split(',')[1];

      preview.innerHTML = `<img src="${resizedCanvas.toDataURL('image/jpeg')}" alt="Preview" style="width: 128px; height: 128px; object-fit: cover; border-radius: 8px;" />`;
      // ส่งข้อมูลสแกนไป backend
      checkIn(selectedEventId, faceImageBase64);
    }, 'image/jpeg');
  });

  async function checkIn(eventId, faceImage) {
    try {
      const response = await fetch(`http://localhost:8000/registrations/${eventId}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          face_image: faceImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'การสแกนใบหน้าล้มเหลว');
      }

      Toastify({
        text: 'เข้าร่วมกิจกรรมสำเร็จ',
        backgroundColor: '#976d44',
        position: 'top-right',
      }).showToast();
    } catch (err) {
      Toastify({
        text: err.message,
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
    }
  }
});