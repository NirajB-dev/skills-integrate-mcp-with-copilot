document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const sortBy = document.getElementById("sort-by");
  const userMenuBtn = document.getElementById("user-menu-btn");
  const adminPanel = document.getElementById("admin-panel");
  const adminStatus = document.getElementById("admin-status");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLoginBtn = document.getElementById("cancel-login-btn");
  const teacherUsername = document.getElementById("teacher-username");
  const teacherPassword = document.getElementById("teacher-password");

  let allActivities = [];
  let teacherToken = localStorage.getItem("teacherToken") || "";
  let teacherUsernameValue = "";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getSortedActivities(activities) {
    const selectedSort = sortBy.value;
    return [...activities].sort((first, second) => {
      if (selectedSort === "time") {
        const firstTime = first.details.start_time || "99:99";
        const secondTime = second.details.start_time || "99:99";
        if (firstTime !== secondTime) {
          return firstTime.localeCompare(secondTime);
        }
      }
      return first.name.localeCompare(second.name);
    });
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function getAuthHeaders() {
    if (!teacherToken) {
      return {};
    }

    return { "X-Teacher-Token": teacherToken };
  }

  function updateAdminUI() {
    if (teacherToken) {
      adminStatus.textContent = `Teacher: ${teacherUsernameValue || "Logged in"}`;
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    } else {
      adminStatus.textContent = "Student mode";
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
    }
  }

  async function checkSession() {
    if (!teacherToken) {
      updateAdminUI();
      return;
    }

    try {
      const response = await fetch("/auth/session", {
        headers: getAuthHeaders(),
      });
      const session = await response.json();

      if (session.authenticated) {
        teacherUsernameValue = session.username || "";
      } else {
        teacherToken = "";
        teacherUsernameValue = "";
        localStorage.removeItem("teacherToken");
      }
    } catch (error) {
      teacherToken = "";
      teacherUsernameValue = "";
      localStorage.removeItem("teacherToken");
    }

    updateAdminUI();
  }

  function applyFiltersAndRender() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;

    const filteredActivities = allActivities.filter(({ name, details }) => {
      const categoryMatch =
        selectedCategory === "all" ||
        (details.category || "General") === selectedCategory;

      const textMatch =
        searchTerm.length === 0 ||
        name.toLowerCase().includes(searchTerm) ||
        details.description.toLowerCase().includes(searchTerm);

      return categoryMatch && textMatch;
    });

    const sortedActivities = getSortedActivities(filteredActivities);

    activitiesList.innerHTML = "";

    if (sortedActivities.length === 0) {
      activitiesList.innerHTML =
        '<p class="empty-state">No activities match your current filters.</p>';
      return;
    }

    sortedActivities.forEach(({ name, details }) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;
      const category = details.category || "General";

      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${escapeHtml(
                        email
                      )}</span>${
                        teacherToken
                          ? `<button class="delete-btn" data-activity="${escapeHtml(
                              name
                            )}" data-email="${escapeHtml(email)}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${escapeHtml(name)}</h4>
        <p class="activity-meta">Category: ${escapeHtml(category)}</p>
        <p>${escapeHtml(details.description)}</p>
        <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        ${
          teacherToken
            ? `<div class="activity-actions">
                 <button class="register-btn" data-activity="${escapeHtml(
                   name
                 )}" type="button">Register student</button>
               </div>`
            : ""
        }
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });

    if (teacherToken) {
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      document.querySelectorAll(".register-btn").forEach((button) => {
        button.addEventListener("click", handleRegister);
      });
    }
  }

  function populateCategoryFilter() {
    const categories = [
      ...new Set(
        allActivities.map(({ details }) => details.category || "General")
      ),
    ].sort((first, second) => first.localeCompare(second));

    categoryFilter.innerHTML = '<option value="all">All categories</option>';
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      allActivities = Object.entries(activities).map(([name, details]) => ({
        name,
        details,
      }));

      populateCategoryFilter();
      applyFiltersAndRender();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleRegister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = prompt(`Enter student email to register for ${activity}:`);

    if (!email) {
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  searchInput.addEventListener("input", applyFiltersAndRender);
  categoryFilter.addEventListener("change", applyFiltersAndRender);
  sortBy.addEventListener("change", applyFiltersAndRender);

  userMenuBtn.addEventListener("click", () => {
    adminPanel.classList.toggle("hidden");
  });

  loginBtn.addEventListener("click", () => {
    adminPanel.classList.add("hidden");
    loginModal.classList.remove("hidden");
    teacherUsername.focus();
  });

  cancelLoginBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: teacherUsername.value.trim(),
          password: teacherPassword.value,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "Login failed", "error");
        return;
      }

      teacherToken = result.token;
      teacherUsernameValue = result.username;
      localStorage.setItem("teacherToken", teacherToken);
      updateAdminUI();
      loginModal.classList.add("hidden");
      loginForm.reset();
      showMessage("Teacher mode enabled", "success");
      applyFiltersAndRender();
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }

    teacherToken = "";
    teacherUsernameValue = "";
    localStorage.removeItem("teacherToken");
    updateAdminUI();
    adminPanel.classList.add("hidden");
    showMessage("Returned to student mode", "info");
    applyFiltersAndRender();
  });

  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Initialize app
  checkSession().then(fetchActivities);
});
