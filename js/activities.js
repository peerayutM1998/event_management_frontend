document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const activitiesList = document.getElementById('activitiesList');
  const searchInput = document.getElementById('searchInput');

  let allActivities = [];

  try {
    const response = await fetch('http://localhost:8000/events/', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('ไม่สามารถดึงรายการกิจกรรมได้');
    }

    allActivities = await response.json();
    displayActivities(allActivities);
  } catch (err) {
    Toastify({
      text: err.message,
      backgroundColor: '#dc3545',
      position: 'top-right',
    }).showToast();
  }

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredActivities = allActivities.filter(activity =>
      activity.name.toLowerCase().includes(searchTerm) || activity.id.toString().includes(searchTerm)
    );
    displayActivities(filteredActivities);
  });

  function displayActivities(activities) {
    activitiesList.innerHTML = '';
    activities.forEach(activity => {
      const card = document.createElement('div');
      card.className = 'col-md-4 mb-4';
      card.innerHTML = `
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title text-brown-700">${activity.name}</h5>
            <p class="card-text text-brown-600">${new Date(activity.event_date).toLocaleDateString('th-TH')}</p>
            <p class="card-text text-brown-600">${activity.location || 'ไม่ระบุสถานที่'}</p>
            <a href="activity-detail.html?id=${activity.id}" class="btn btn-brown-500">ดูรายละเอียด</a>
          </div>
        </div>
      `;
      activitiesList.appendChild(card);
    });
  }
});