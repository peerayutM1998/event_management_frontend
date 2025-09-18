document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
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
    const response = await fetch(`http://localhost:8000/events/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('ไม่สามารถดึงข้อมูลกิจกรรมได้');
    }

    const activity = await response.json();
    document.getElementById('activityName').textContent = activity.name;
    document.getElementById('activityDescription').textContent = activity.description || 'ไม่มีคำอธิบาย';
    document.getElementById('activityDate').textContent = `วันที่: ${new Date(activity.event_date).toLocaleDateString('th-TH')}`;
    document.getElementById('activityTime').textContent = `เวลา: ${new Date(activity.event_start_time).toLocaleTimeString('th-TH')} - ${new Date(activity.event_end_time).toLocaleTimeString('th-TH')}`;
    document.getElementById('activityLocation').textContent = `สถานที่: ${activity.location || 'ไม่ระบุ'}`;
    document.getElementById('activityMaxParticipants').textContent = `จำนวนผู้เข้าร่วมสูงสุด: ${activity.max_participants}`;
  } catch (err) {
    Toastify({
      text: err.message,
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
  }

  const registerBtn = document.getElementById('registerBtn');
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const captureBtn = document.getElementById('captureBtn');
  const preview = document.getElementById('preview');
  let faceImageBase64 = null;

  registerBtn.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      video.style.display = 'block';
      captureBtn.style.display = 'block';
      registerBtn.style.display = 'none';
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
      captureBtn.style.display = 'none';
      preview.innerHTML += `<button id="confirmRegister" class="btn btn-brown-500 mt-2">ยืนยันลงทะเบียน</button>`;
      document.getElementById('confirmRegister').addEventListener('click', handleRegister);
    }, 'image/jpeg');
  });

  function handleRegister() {
    if (!faceImageBase64) {
      Toastify({
        text: 'กรุณาถ่ายภาพใบหน้าก่อนลงทะเบียน',
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
      return;
    }

    fetch('http://localhost:8000/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    .then(response => response.json())
    .then(user => {
      const userId = user.id;

      fetch('http://localhost:8000/registrations/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: parseInt(eventId),
          user_id: userId,
          face_image: faceImageBase64,
        }),
      })
      .then(response => response.json())
      .then(data => {
        Toastify({
          text: `การลงทะเบียนสำเร็จ: ${data.notes}`,
          backgroundColor: '#976d44',
          position: 'top-right',
        }).showToast();
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 2000);
      })
      .catch(err => {
        Toastify({
          text: err.message || 'การลงทะเบียนล้มเหลว',
          backgroundColor: '#dc3545',
          position: 'top-right',
        }).showToast();
      });
    })
    .catch(err => {
      Toastify({
        text: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้',
        backgroundColor: '#dc3545',
        position: 'top-right',
      }).showToast();
    });
  }
});