document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token || role !== 'student') {
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
  const checkInBtn = document.getElementById('checkInBtn');
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const captureBtn = document.getElementById('captureBtn');
  const preview = document.getElementById('preview');
  let faceImageBase64 = null;
  let selectedEventId = null;

  try {
    const registrationsResponse = await fetch('http://localhost:8000/registrations/my-registrations', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!registrationsResponse.ok) {
      throw new Error('ไม่สามารถดึงรายการลงทะเบียนได้');
    }

    const registrations = await registrationsResponse.json();
    const openEvents = registrations.filter(reg => reg.status === 'registered'); // สมมติว่าลงทะเบียนแล้วและเปิดโหมด

    openEvents.forEach(reg => {
      const option = document.createElement('option');
      option.value = reg.event_id;
      option.textContent = `${reg.event_name} (${new Date(reg.event_date).toLocaleDateString('th-TH')})`;
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

  checkInBtn.addEventListener('click', async () => {
    if (!selectedEventId) {
      Toastify({
        text: 'กรุณาเลือกกิจกรรม',
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      video.style.display = 'block';
      captureBtn.style.display = 'block';
      checkInBtn.style.display = 'none';
    } catch (err) {
      Toastify({
        text: 'ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาตกล้อง',
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
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);
    } catch (err) {
      Toastify({
        text: err.message,
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
    }
  }
});