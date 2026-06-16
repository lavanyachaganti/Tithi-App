import { useCallback, useEffect, useState } from "react";
import "./App.css";

function getCurrentDateTime() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return {
    date: now.toLocaleDateString("en-CA"),
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

function formatDisplayDate(value) {
  if (!value) return "--";

  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function getTithiTimeLabel(type, language = "English") {
  const labelMap = {
    Telugu: {
      start: "ప్రారంభ సమయం:",
      end: "ముగింపు సమయం:",
    },
    Tamil: {
      start: "தொடக்க நேரம்:",
      end: "முடிவுத் நேரம்:",
    },
    English: {
      start: "Start Time:",
      end: "End Time:",
    },
  };

  const normalizedLanguage = labelMap[language] ? language : "English";
  return labelMap[normalizedLanguage][type];
}

function formatVarjyamTime(value, language = "English") {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const locale = language === "Tamil" ? "ta-IN" : "en-IN";
  return parsed.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function formatTimeOnly(value) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function isEarlierIstDate(value, currentDate) {
  if (!value || !currentDate) return false;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  const valueIstDate = parsed.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  return valueIstDate < currentDate;
}

function App() {
  const [language, setLanguage] = useState("Telugu");
  const [date, setDate] = useState(() => getCurrentDateTime().date);
  const [time, setTime] = useState(() => getCurrentDateTime().time);
  const [tithi, setTithi] = useState("Fetching…");
  const [tithiStartTime, setTithiStartTime] = useState("");
  const [tithiEndTime, setTithiEndTime] = useState("");
  const [authMode, setAuthMode] = useState(null);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tithi-user"));
      return stored?.token || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tithi-user"));
      return stored?.name ? {
        name: stored.name,
        email: stored.email,
        role: stored.role || "user",
      } : null;
    } catch {
      return null;
    }
  });
  const [route, setRoute] = useState(() => {
    const path = window.location.pathname || "/";
    return path.startsWith("/") ? path : "/";
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [profileViewMode, setProfileViewMode] = useState("view"); // "view", "manage" or "update"
  const [passwordChangeMode, setPasswordChangeMode] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeMessage, setPasswordChangeMessage] = useState({ type: "", text: "" });
  const [varjyamDetails, setVarjyamDetails] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [skipAutoFetch] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [showAllPersonalNotifications, setShowAllPersonalNotifications] = useState(false);
  const [varjyamNotification, setVarjyamNotification] = useState(null);
  const [varjyamNotificationError, setVarjyamNotificationError] = useState("");
  const [varjyamNotificationLoading, setVarjyamNotificationLoading] = useState(false);
  const [showVarjyamModal, setShowVarjyamModal] = useState(false);

  const navigate = useCallback((path) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    if (window.location.pathname !== normalizedPath) {
      window.history.pushState({}, "", normalizedPath);
    }
    setRoute(normalizedPath);
  }, []);

  const isAdmin = user?.role === "admin";
  const isAdminPortal = route.startsWith("/admin");

  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname || "/");
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (isAdminPortal && !isAdmin) {
      navigate("/");
    }
  }, [isAdminPortal, isAdmin, navigate]);


  useEffect(() => {
    if (window.location.pathname !== route) {
      window.history.replaceState({}, "", route);
    }
  }, [route]);

  const toggleShowPassword = () => setShowPassword((v) => !v);
  const toggleShowConfirmPassword = () => setShowConfirmPassword((v) => !v);

  const fetchTithi = useCallback(async () => {
    if (!date || !time) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({ lang: language, date, time });
      const response = await fetch(`/api/tithi?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const statusCode = response.status;
        console.error("Tithi fetch error:", statusCode, errorData.error);
        throw new Error("Tithi unavailable");
      }

      const data = await response.json();
      setTithi(data.tithi || "Tithi not available");
      setTithiStartTime(data.startTime || "");
      setTithiEndTime(data.endTime || "");
    } catch (error) {
      console.error("Tithi fetch error:", error?.message);
      setTithi("Tithi unavailable");
      setTithiStartTime("");
      setTithiEndTime("");
      setVarjyamDetails([]);
    } finally {
      setLoading(false);
    }
  }, [date, language, time]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
          setToken(null);
          localStorage.removeItem("tithi-user");
        }
        return;
      }

      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Notification fetch failed:", error);
    }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    setUsersError("");

    try {
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setUsersError(data.error || "Failed to fetch users.");
        setAdminUsers([]);
        return;
      }

      const data = await response.json();
      setAdminUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch users failed:", error);
      setUsersError("Failed to fetch users.");
      setAdminUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAdminPortal && isAdmin) fetchUsers();
  }, [isAdminPortal, isAdmin, fetchUsers]);

  useEffect(() => {
    if (isAdminPortal && isAdmin) {
      fetchNotifications();
    }
  }, [isAdminPortal, isAdmin, fetchNotifications]);

  const fetchCurrentUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Session invalid");
      }

      const data = await response.json();
      if (data?.user) {
        const restoredUser = {
          name: data.user.name,
          email: data.user.email,
          role: data.user.role || "user",
        };
        setUser(restoredUser);
        localStorage.setItem("tithi-user", JSON.stringify({ ...restoredUser, token }));
      }
    } catch (error) {
      setUser(null);
      setToken(null);
      localStorage.removeItem("tithi-user");
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    }
  }, [token, fetchCurrentUser]);

  const fetchVarjyamNotification = useCallback(async () => {
    if (!date || !time) return;

    setVarjyamNotificationLoading(true);
    setVarjyamNotificationError("");

    try {
      const response = await fetch(`/api/varjyam/notification?date=${encodeURIComponent(date)}`);
      const data = await response.json();

      if (!response.ok) {
        console.error("Varjyam fetch error:", response.status, data.error);
        setVarjyamDetails([]);
        setVarjyamNotificationError(data.message || "Varjyam unavailable");
        return;
      }

      if (Array.isArray(data.varjyam) && data.varjyam.length > 0) {
        setVarjyamDetails(data.varjyam);
        setVarjyamNotificationError("");
      } else {
        setVarjyamDetails([]);
        if (data.needsRefresh) {
          setVarjyamNotificationError("Varjyam data not cached. Click refresh button.");
        }
      }
    } catch (error) {
      console.error("Varjyam fetch error:", error?.message);
      setVarjyamDetails([]);
      setVarjyamNotificationError("Varjyam unavailable");
    } finally {
      setVarjyamNotificationLoading(false);
    }
  }, [date, time]);

  useEffect(() => {
    if (skipAutoFetch) return;
    if (!date || !time) return;
    fetchTithi();
  }, [fetchTithi, date, time]);

  useEffect(() => {
    if (skipAutoFetch) return;
    fetchVarjyamNotification();
  }, [fetchVarjyamNotification]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = async () => {
    if (skipAutoFetch) return;

    setRefreshing(true);
    try {
      const postResp = await fetch(`/api/panchang/refresh?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`, { method: "POST" });
      let postData = {};
      try {
        postData = await postResp.json();
      } catch (e) {
        // ignore parse errors
      }

      if (!postResp.ok) {
        console.error("Refresh request failed:", postResp.status, postData.error);
        setVarjyamNotificationError(postData.message || "Refresh failed");
        setTithi("Tithi unavailable");
        setVarjyamDetails([]);
        return;
      }

      if (postData.tithi) {
        const t = typeof postData.tithi === "string" ? postData.tithi : (postData.tithi.name || postData.tithi.tithiName || JSON.stringify(postData.tithi));
        setTithi(t);
      }

      setVarjyamDetails(Array.isArray(postData.varjyam) ? postData.varjyam : []);
      setVarjyamNotificationError("");

      try {
        await fetchTithi();
      } catch (e) {
        console.error("fetchTithi after refresh failed:", e?.message || e);
      }

      try {
        await fetchVarjyamNotification();
      } catch (e) {
        console.error("fetchVarjyamNotification after refresh failed:", e?.message || e);
      }
    } catch (error) {
      console.error("Refresh flow error:", error?.message || error);
      setVarjyamNotificationError("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setAuthForm({ name: "", email: "", password: "", confirmPassword: "" });
    setAuthError("");
    setAuthSuccess("");
  };

  const closeAuthModal = () => {
    setAuthMode(null);
    setAuthError("");
    setAuthSuccess("");
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthSubmit = async (event) => {
    console.log("AUTH START");
    event.preventDefault();
    console.log("MODE", authMode);
    setAuthError("");
    setAuthLoading(true);

    try {
      if (authMode === "register") {
        if (!authForm.name.trim()) {
          throw new Error("Please enter your name.");
        }
        if (authForm.password !== authForm.confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        console.log("VALIDATION SUCCESS");
      }

      const endpoint = authMode === "register" ? "/api/register" : "/api/login";
      console.log("ENDPOINT", endpoint);
      const payload = authMode === "register"
        ? {
            name: authForm.name.trim(),
            email: authForm.email.trim(),
            password: authForm.password,
            confirmPassword: authForm.confirmPassword,
          }
        : {
            email: authForm.email.trim(),
            password: authForm.password,
          };
      console.log("PAYLOAD", payload);
      console.log("BEFORE FETCH");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("RESPONSE STATUS", response.status);

      const responseClone = response.clone();
      let data = {};
      try {
        data = await response.json();
      } catch (parseErr) {
        const text = await responseClone.text().catch(() => null);
        console.log("RESPONSE DATA", text);
        if (!response.ok) {
          throw new Error(text || "Authentication failed.");
        }
      }
      if (Object.keys(data).length > 0) {
        console.log("RESPONSE DATA", data);
      }

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      const userData = {
        name: data.user?.name || authForm.name.trim(),
        email: data.user?.email || authForm.email.trim(),
        role: data.user?.role || "user",
      };

      setUser(userData);
      setToken(data.token || null);
      setNotifications([]);
      localStorage.setItem("tithi-user", JSON.stringify({ ...userData, token: data.token || null }));
      setShowUserMenu(false);

      if (authMode === "register") {
        setAuthSuccess("Registration successful. You are now logged in.");
      } else {
        closeAuthModal();
      }

      fetchNotifications();
    } catch (error) {
      console.log("AUTH ERROR", error);
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setNotifications([]);
    setShowUserMenu(false);
    localStorage.removeItem("tithi-user");
    navigate("/");
  };

  const handleProfileClick = () => {
    setShowUserMenu(false);
    setProfileViewMode("view");
    setPasswordChangeMode(false);
    setShowProfileView(true);
  };

  const handlePasswordChange = async () => {
    setPasswordChangeMessage({ type: "", text: "" });
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordChangeMessage({ type: "error", text: "All password fields are required." });
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordChangeMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setPasswordChangeMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    
    setPasswordChangeLoading(true);
    
    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setPasswordChangeMessage({ type: "success", text: "Password changed successfully! You will be logged out." });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordChangeMode(false);
        setTimeout(() => {
          handleLogout();
        }, 1400);
      } else {
        setPasswordChangeMessage({ type: "error", text: data.error || "Failed to change password." });
      }
    } catch (error) {
      setPasswordChangeMessage({ type: "error", text: "Error changing password. Please try again." });
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const closeProfileView = () => {
    setShowProfileView(false);
    setPasswordChangeMode(false);
    window.scrollTo(0, 0);
  };

  const handleNotificationsClick = () => {
    setShowUserMenu(false);
    const notificationsSection = document.querySelector(".notification-panel");
    if (notificationsSection) {
      notificationsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToSection = (selector) => {
    const section = document.querySelector(selector);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setShowUserMenu(false);
  };

  const handleSimulateSubscription = () => {
    const nextCount = subscriberCount + 1;
    setSubscriberCount(nextCount);
    setNotifications((prev) => [
      {
        id: Date.now(),
        user: `Subscriber ${nextCount}`,
        type: "subscription",
        message: `Subscribed today and received today’s Varjyam details for ${formatDisplayDate(date)}.`,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      },
      ...prev,
    ]);
  };

  const adminNotifications = notifications.filter((item) => {
    const normalizedType = String(item.type || "").toLowerCase();
    const message = String(item.message || "").toLowerCase();
    return (
      normalizedType === "admin" ||
      normalizedType === "system" ||
      normalizedType === "activity" ||
      message.includes("admin") ||
      message.includes("system") ||
      message.includes("activity") ||
      message.includes("new user registered")
    );
  });

  const personalNotifications = notifications.filter((item) => !adminNotifications.includes(item));

  const recentRegistrations = adminNotifications.filter((item) =>
    item.message?.toLowerCase().startsWith("new user registered")
  );

  const registrationRows = recentRegistrations.map((item, index) => {
    const splitData = item.message.split(":");
    const name = splitData[1]?.trim() || "Unknown";
    return {
      id: item.id || `${name}-${index}`,
      name,
      email: "—",
      language,
      registeredAt: item.time || "—",
      status: "Active",
    };
  });

  const uniqueUsers = new Set(
    notifications
      .map((item) => item.message?.split(":")[1]?.trim())
      .filter(Boolean)
  );

  const totalUsers = Math.max(uniqueUsers.size, 1);
  const activeSubscriptions = subscriberCount;
  const totalNotifications = notifications.length;
  const totalAdminNotifications = adminNotifications.length;
  const totalUserNotifications = personalNotifications.length;

  // Backend already returns notifications sorted by createdAt descending.
  // Use the first item as the latest notification and show the rest only when requested.
  const latestNotification = notifications[0] || null;
  const remainingNotifications = notifications.slice(1);
  const latestPersonalNotification = personalNotifications[0] || null;
  const remainingPersonalNotifications = personalNotifications.slice(1);

  const userReminders = [
    "Check today’s Varjyam before your next planned event.",
    `Keep your preferred language set to ${language}.`,
    "Review your personal notifications and subscription status.",
  ];

  const personalSubscriptions = {
    status: "Active",
    plan: "Monthly Insights",
    renewal: "7 days",
    nextBilling: formatDisplayDate(date),
  };

  const renderAdminPortal = () => (
    <>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Admin Portal</p>
          <h1>Admin Dashboard</h1>
          <p className="dashboard-intro">
            View admin activity, notification history, subscription overview, and Tithi/Varjyam logs.
          </p>
        </div>
      </section>

      <section className="top-cards-grid">
        <article className="card hero-card">
          <div className="card-title">
            <span className="card-icon">📊</span>
            <div>
              <p>Admin overview</p>
              <strong>System summary</strong>
            </div>
          </div>
          <div className="hero-content">
            <div className="hero-meta-row">
              <span>Total Notifications</span>
              <span>{totalNotifications}</span>
            </div>
            <div className="hero-meta-row">
              <span>Admin Notifications</span>
              <span>{totalAdminNotifications}</span>
            </div>
            <div className="hero-meta-row">
              <span>User Notifications</span>
              <span>{totalUserNotifications}</span>
            </div>
            <div className="hero-meta-row">
              <span>Total Users</span>
              <span>{totalUsers}</span>
            </div>
            <div className="hero-meta-row">
              <span>Active Subscriptions</span>
              <span>{activeSubscriptions}</span>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-section">
        <article className="section-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">User Activity</p>
              <h2>Recent registrations & activity</h2>
            </div>
          </div>
          {registrationRows.length === 0 ? (
            <p className="empty-state">No recent user registrations found.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Language</th>
                    <th>Registered At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registrationRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.email}</td>
                      <td>{row.language}</td>
                      <td>{row.registeredAt}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="section-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Notification Management</p>
              <h2>Admin & user notifications</h2>
            </div>
          </div>
          <div className="hero-list">
            <div className="hero-list-item admin-block">
              <strong>Admin notifications</strong>
              <span>{totalAdminNotifications} recent items</span>
            </div>
            <div className="hero-list-item admin-block">
              <strong>User notifications</strong>
              <span>{totalUserNotifications} recent items</span>
            </div>
          </div>
          <div className="notification-panel admin-notifications-panel">
            <h3 className="section-subtitle">Latest notifications</h3>
            {notifications.length === 0 ? (
              <p className="empty-state">No notifications are available at the moment.</p>
            ) : (
              <>
                <ul className="notification-feed">
                  <li key={latestNotification.id || latestNotification.time} className="notification-feed-item">
                    <div>
                      <strong>{latestNotification.user || "Notification"}</strong>
                      <p>{latestNotification.message}</p>
                    </div>
                    <span>{latestNotification.time}</span>
                  </li>
                </ul>
                {remainingNotifications.length > 0 && !showAllNotifications && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowAllNotifications(true)}
                  >
                    View All Notifications
                  </button>
                )}
                {showAllNotifications && remainingNotifications.length > 0 && (
                  <ul className="notification-feed notification-feed-expanded">
                    {remainingNotifications.map((item) => (
                      <li key={item.id || item.time} className="notification-feed-item">
                        <div>
                          <strong>{item.user || "Notification"}</strong>
                          <p>{item.message}</p>
                        </div>
                        <span>{item.time}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </article>

        <article className="section-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Users Management</p>
              <h2>Manage registered users</h2>
            </div>
          </div>

          <div className="table-wrap">
            {usersLoading ? (
              <p className="empty-state">Loading users…</p>
            ) : usersError ? (
              <p className="empty-state">{usersError}</p>
            ) : adminUsers.length === 0 ? (
              <p className="empty-state">No users found.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((u) => {
                    const adminCount = adminUsers.filter((x) => x.role === "admin").length;
                    const isSelf = user && user.email === u.email;
                    const cannotDeleteLastAdmin = u.role === "admin" && adminCount <= 1;

                    const createdAtDisplay = u.createdAt ? formatDisplayDate(new Date(u.createdAt).toLocaleDateString("en-CA")) : "—";

                    return (
                      <tr key={u.id}>
                        <td>{u.name || "—"}</td>
                        <td>{u.email || "—"}</td>
                        <td>{u.role === "admin" ? "Administrator" : "User"}</td>
                        <td>{createdAtDisplay}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="secondary-button danger-button"
                            onClick={() => { setUserToDelete(u); setShowDeleteConfirm(true); }}
                            disabled={isSelf || cannotDeleteLastAdmin || !isAdmin}
                            title={isSelf ? "Cannot delete the currently logged-in user" : cannotDeleteLastAdmin ? "Cannot delete the last admin" : "Delete user"}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="section-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Subscription Overview</p>
              <h2>Current plan visibility</h2>
            </div>
          </div>
          <div className="summary-list">
            <div className="summary-item">
              <span>Plan</span>
              <strong>{personalSubscriptions.plan}</strong>
            </div>
            <div className="summary-item">
              <span>Status</span>
              <strong>{personalSubscriptions.status}</strong>
            </div>
            <div className="summary-item">
              <span>Renewal</span>
              <strong>{personalSubscriptions.renewal}</strong>
            </div>
            <div className="summary-item">
              <span>Next billing</span>
              <strong>{personalSubscriptions.nextBilling}</strong>
            </div>
          </div>
        </article>

        <article className="section-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Varjyam / Tithi Logs</p>
              <h2>Latest astrology updates</h2>
            </div>
          </div>
          <div className="hero-list">
            <div className="hero-list-item admin-block">
              <strong>Recent Tithi</strong>
              <span>{tithi || "Unavailable"}</span>
            </div>
            <div className="hero-list-item admin-block">
              <strong>Latest Varjyam</strong>
              <span>{varjyamDetails[0] ? `${formatVarjyamTime(varjyamDetails[0].start)} — ${formatVarjyamTime(varjyamDetails[0].end)}` : "No Varjyam details"}</span>
            </div>
          </div>
        </article>
      </section>
    </>
  );

  const renderProfileView = () => {
    const profileTitle = passwordChangeMode
      ? "Change Password"
      : profileViewMode === "manage"
      ? "Manage Account"
      : profileViewMode === "view"
      ? "Profile"
      : "Update Profile";

    if (profileViewMode === "manage" && !passwordChangeMode) {
      return (
        <section className={`profile-view-section ${profileViewMode === "manage" ? "wide" : ""}`}>
          <div className="profile-header">
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button type="button" className="profile-back-button" onClick={closeProfileView} aria-label="Back">←</button>
              <h1>{profileTitle}</h1>
            </div>
          </div>

          <div className="profile-cards-row">
            <article className="profile-card">
              <div className="profile-section-title">Account Information</div>
              <div className="profile-content">
                <div className="profile-item">
                  <span className="profile-label">Name</span>
                  <strong className="profile-value">{user?.name || "N/A"}</strong>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Email</span>
                  <strong className="profile-value">{user?.email || "N/A"}</strong>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Role</span>
                  <strong className="profile-value">{user?.role === "admin" ? "Administrator" : "User"}</strong>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Account Status</span>
                  <strong className="profile-value" style={{ color: "#4CAF50" }}>Active</strong>
                </div>
              </div>
            </article>

            <article className="profile-card">
              <div className="profile-section-title">Subscription Details</div>
              <div className="profile-content">
                <div className="profile-item">
                  <span className="profile-label">Plan</span>
                  <strong className="profile-value">{personalSubscriptions.plan}</strong>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Plan Status</span>
                  <strong className="profile-value" style={{ color: "#4CAF50" }}>{personalSubscriptions.status}</strong>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Renewal Window</span>
                  <strong className="profile-value">{personalSubscriptions.renewal}</strong>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Next Billing</span>
                  <strong className="profile-value">{personalSubscriptions.nextBilling}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>
      );
    }

    if (profileViewMode === "view" && !passwordChangeMode) {
      return (
        <section className="profile-view-section">
          <div className="profile-header">
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button type="button" className="profile-back-button" onClick={closeProfileView} aria-label="Back">←</button>
              <h1>{profileTitle}</h1>
            </div>
          </div>
          <article className="profile-card">
            <div className="profile-section-title">Account Information</div>
            <div className="profile-content">
              <div className="profile-item">
                <span className="profile-label">Name</span>
                <strong className="profile-value">{user?.name || "N/A"}</strong>
              </div>
              <div className="profile-item">
                <span className="profile-label">Email</span>
                <strong className="profile-value">{user?.email || "N/A"}</strong>
              </div>
              <div className="profile-item">
                <span className="profile-label">Role</span>
                <strong className="profile-value">{user?.role === "admin" ? "Administrator" : "User"}</strong>
              </div>
              <div className="profile-item">
                <span className="profile-label">Account Status</span>
                <strong className="profile-value" style={{ color: "#4CAF50" }}>Active</strong>
              </div>
            </div>
          </article>
        </section>
      );
    }

    if (!passwordChangeMode) {
      return (
        <section className="profile-view-section">
          <div className="profile-header">
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button type="button" className="profile-back-button" onClick={closeProfileView} aria-label="Back">←</button>
              <h1>{profileTitle}</h1>
            </div>
          </div>
          <article className="profile-card">
            <div className="profile-section-title">Account Information</div>
            <div className="profile-content">
              <div className="profile-item">
                <span className="profile-label">Name</span>
                <strong className="profile-value">{user?.name || "N/A"}</strong>
              </div>
              <div className="profile-item">
                <span className="profile-label">Email</span>
                <strong className="profile-value">{user?.email || "N/A"}</strong>
              </div>
            </div>
          </article>
          <div className="profile-actions">
            <button type="button" className="primary-button" onClick={() => setPasswordChangeMode(true)}>Change Password</button>
            <button type="button" className="secondary-button" onClick={closeProfileView}>Close</button>
          </div>
        </section>
      );
    }

    return (
      <section className="profile-view-section">
        <div className="profile-header">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button type="button" className="profile-back-button" onClick={closeProfileView} aria-label="Back">←</button>
            <h1>{profileTitle}</h1>
          </div>
        </div>
        <article className="profile-card">
          <form className="password-change-form">
            {passwordChangeMessage.text && (
              <div className={`password-message password-${passwordChangeMessage.type}`}>
                {passwordChangeMessage.text}
              </div>
            )}
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter your current password"
                disabled={passwordChangeLoading}
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Enter your new password"
                disabled={passwordChangeLoading}
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Confirm your new password"
                disabled={passwordChangeLoading}
              />
            </div>
            <div className="profile-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handlePasswordChange}
                disabled={passwordChangeLoading}
              >
                {passwordChangeLoading ? "Updating..." : "Update Password"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setPasswordChangeMode(false);
                  setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  setPasswordChangeMessage({ type: "", text: "" });
                  window.scrollTo(0, 0);
                }}
                disabled={passwordChangeLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </article>
      </section>
    );
  };

  return (
    <div className="dashboard-shell">
      <div className="dashboard-backdrop" aria-hidden="true">
        <span className="om-mark">ॐ</span>
        <span className="om-mark alt">ॐ</span>
      </div>

      <main className="dashboard-body">
        <header className="dashboard-header">
          <div className="header-core">
            <div className="header-label">
              <span className="header-label-title">Tithi Name</span>
              <div className="tithi-with-refresh">
                <strong>{tithi || "Fetching current Tithi..."}</strong>
                <button
                  type="button"
                  className="refresh-button"
                  onClick={handleRefresh}
                  aria-label="Refresh dashboard"
                  disabled={refreshing}
                  aria-busy={refreshing}
                >
                  {refreshing ? "Refreshing…" : "⟳"}
                </button>
              </div>
            </div>
            <div className="header-control">
              <label>
                <span>Time</span>
                <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </label>
            </div>
            <div className="header-control">
              <label>
                <span>Date</span>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
            </div>
            <div className="header-control">
              <label>
                <span>Language</span>
                <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option value="Telugu">Telugu</option>
                  <option value="Tamil">Tamil</option>
                </select>
              </label>
            </div>
          </div>

          <div className="header-actions">
            {user ? (
              <>
                {isAdmin ? (
                  <>
                    <span className="role-badge role-pill role-admin" aria-hidden="true">🛡 ADMIN</span>
                    <button type="button" className="secondary-button" onClick={() => navigate("/admin/dashboard")}>Admin Portal</button>
                    <button type="button" className="user-badge" onClick={() => setShowUserMenu((value) => !value)}>
                      {user.name}
                    </button>
                  </>
                ) : (
                  <button type="button" className="user-badge" onClick={() => setShowUserMenu((value) => !value)} aria-label={`Open user menu for ${user.name}`}>
                    {user.name}
                  </button>
                )}
              </>
            ) : (
              <div className="auth-actions">
                <button type="button" className="secondary-button" onClick={() => openAuthModal("login")}>Login</button>
                <button type="button" className="primary-button" onClick={() => openAuthModal("register")}>Register</button>
              </div>
            )}
            {user && showUserMenu && (
              <div className="user-menu-dropdown">
                <button type="button" className="user-menu-item" onClick={handleProfileClick}>
                  View Profile
                </button>
                <button type="button" className="user-menu-item" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {showProfileView ? renderProfileView() : isAdminPortal && isAdmin ? renderAdminPortal() : user ? (
          <section className="top-varjyam-area">
            <article className="section-card varjyam-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Astrology</p>
                  <h2>Varjyam & Tithi details</h2>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleRefresh}
                    disabled={refreshing || varjyamNotificationLoading}
                  >
                    {refreshing || varjyamNotificationLoading ? "Refreshing..." : "Refresh"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowVarjyamModal(true)}
                  >
                    View details
                  </button>
                </div>
              </div>

              {varjyamNotificationError && (
                <div className="error-state">
                  {varjyamNotificationError}
                </div>
              )}

              <div className="hero-list">
                <div className="hero-list-item">
                  <div>
                    <strong>Today's Tithi</strong>
                    <p>{tithi || "Unavailable"}</p>
                    <div style={{ display: "flex", gap: "150px", alignItems: "center" }}>
                      <span>
                        {getTithiTimeLabel("start", language)} {tithiStartTime ? formatVarjyamTime(tithiStartTime, language) : "—"}
                        {tithiStartTime && isEarlierIstDate(tithiStartTime, date) ? " (started earlier)" : ""}
                      </span>
                      <span>{getTithiTimeLabel("end", language)} {tithiEndTime ? formatVarjyamTime(tithiEndTime, language) : "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="hero-list-item">
                  <strong>Latest Varjyam</strong>
                  <span>{varjyamDetails[0] ? `${formatVarjyamTime(varjyamDetails[0].start)} — ${formatVarjyamTime(varjyamDetails[0].end)}` : "No Varjyam details"}</span>
                </div>
              </div>
            </article>

            <article className="section-card personal-notifications-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Personal dashboard</p>
                  <h2>Notifications & reminders</h2>
                </div>
                <button type="button" className="secondary-button" onClick={() => scrollToSection(".personal-notifications-card")}>View All</button>
              </div>

              <div className="reminder-panel">
                <h3 className="reminder-heading">Today's reminders</h3>
                <ul className="reminder-list">
                  {userReminders.map((line) => (
                    <li key={line} className="reminder-item">{line}</li>
                  ))}
                </ul>
              </div>

              <div className="notification-panel personal-notifications-panel">
                <h3 className="section-subtitle">Personal Notifications</h3>
                {personalNotifications.length === 0 ? (
                  <p className="empty-state">No personal notifications at the moment.</p>
                ) : (
                  <>
                    <ul className="notification-feed">
                      <li key={latestPersonalNotification.id || latestPersonalNotification.time} className="notification-feed-item">
                        <div>
                          <strong>{latestPersonalNotification.user || "Alert"}</strong>
                          <p>{latestPersonalNotification.message}</p>
                        </div>
                        <span>{latestPersonalNotification.time}</span>
                      </li>
                    </ul>
                    {remainingPersonalNotifications.length > 0 && !showAllPersonalNotifications && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setShowAllPersonalNotifications(true)}
                      >
                        View All Personal Notifications
                      </button>
                    )}
                    {showAllPersonalNotifications && remainingPersonalNotifications.length > 0 && (
                      <ul className="notification-feed notification-feed-expanded">
                        {remainingPersonalNotifications.map((item) => (
                          <li key={item.id || item.time} className="notification-feed-item">
                            <div>
                              <strong>{item.user || "Alert"}</strong>
                              <p>{item.message}</p>
                            </div>
                            <span>{item.time}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </article>

            <article className="section-card varjyam-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Astrology</p>
                  <h2>Varjyam & Tithi details</h2>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleRefresh}
                    disabled={refreshing || varjyamNotificationLoading}
                  >
                    {refreshing || varjyamNotificationLoading ? "Refreshing..." : "Refresh"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowVarjyamModal(true)}
                  >
                    View details
                  </button>
                </div>
              </div>

              {varjyamNotificationError && (
                <div className="error-state">
                  {varjyamNotificationError}
                </div>
              )}

              <div className="hero-list">
                <div className="hero-list-item">
                  <div>
                    <strong>Today’s Tithi</strong>
                    <p>{tithi || "Unavailable"}</p>
                    {tithiStartTime && tithiEndTime && (
                      <>
                        <p>Start: {formatVarjyamTime(tithiStartTime, language)}</p>
                        <p>End: {formatVarjyamTime(tithiEndTime, language)}</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="hero-list-item">
                  <strong>Latest Varjyam</strong>
                  <span>{varjyamDetails[0] ? `${formatVarjyamTime(varjyamDetails[0].start)} — ${formatVarjyamTime(varjyamDetails[0].end)}` : "No Varjyam details"}</span>
                </div>
              </div>

              <div className="varjyam-update-section">
                <h3 className="section-subtitle">Latest Varjyam Update</h3>
                {varjyamNotification && varjyamNotification.message ? (
                  <div className="notification-panel varjyam-notification-panel">
                    <p>{varjyamNotification.message}</p>
                  </div>
                ) : (
                  <div className="notification-panel empty-state">
                    No latest Varjyam update available.
                  </div>
                )}
              </div>
            </article>
            </section>
        ) : (
          <section className="guest-panel">
            <div className="section-card guest-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Welcome</p>
                  <h2>Sign in to access your dashboard</h2>
                </div>
              </div>
              <p className="guest-copy">Create or sign in with your account to view personalized Varjyam details, subscription status, and notifications.</p>
              <div className="guest-actions">
                <button type="button" className="primary-button" onClick={() => openAuthModal("login")}>Login</button>
                <button type="button" className="secondary-button" onClick={() => openAuthModal("register")}>Register</button>
              </div>
            </div>
          </section>
        )}

        <footer className="dashboard-footer">
          <span>Tithi App</span>
          <span>Version 1.0.0</span>
          <span>© 2026 Tithi App</span>
        </footer>
      </main>

      {authMode && (
        <div className="auth-modal-backdrop" onClick={closeAuthModal}>
          <div className="auth-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="auth-modal-header">
              <h3>{authMode === "login" ? "Login" : "Register"}</h3>
              <button type="button" className="auth-close-button" onClick={closeAuthModal} aria-label="Close modal">×</button>
            </div>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === "register" && (
                <label className="auth-field">
                  <span>Name</span>
                  <input type="text" name="name" value={authForm.name} onChange={handleAuthChange} placeholder="Your name" />
                </label>
              )}
              <label className="auth-field">
                <span>Email</span>
                <input type="email" name="email" value={authForm.email} onChange={handleAuthChange} placeholder="you@example.com" required />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={toggleShowPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.9 21.9 0 0 1 5.06-6.06" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M1 1l22 22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="3" strokeWidth="1.2" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
              {authMode === "register" && (
                <label className="auth-field">
                  <span>Confirm Password</span>
                  <div className="password-field">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={authForm.confirmPassword}
                      onChange={handleAuthChange}
                      placeholder="Confirm password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={toggleShowConfirmPassword}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.9 21.9 0 0 1 5.06-6.06" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M1 1l22 22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="12" r="3" strokeWidth="1.2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
              )}
              {authError && <p className="auth-error">{authError}</p>}
              {authSuccess && <p className="auth-success">{authSuccess}</p>}
              <button type="submit" className="auth-submit-button" disabled={authLoading}>
                {authLoading ? "Please wait..." : authMode === "login" ? "Login" : "Register"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showVarjyamModal && (
        <div className="modal-backdrop" onClick={() => setShowVarjyamModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Varjyam details for {formatDisplayDate(date)}</h3>
              <button type="button" className="modal-close" onClick={() => setShowVarjyamModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {varjyamNotificationError && <div className="error-state">{varjyamNotificationError}</div>}
              {varjyamDetails && varjyamDetails.length > 0 ? (
                <ul className="varjyam-list">
                  {varjyamDetails.map((v, idx) => (
                    <li key={idx} className="varjyam-row">
                      <div className="varjyam-label">{v.title || `Varjyam ${idx + 1}`}</div>
                      <div className="varjyam-times">Start: {formatVarjyamTime(v.start)}<br/>End: {formatVarjyamTime(v.end)}</div>
                      {v.note && <div className="varjyam-note">{v.note}</div>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No Varjyam details available for the selected date/time.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && userToDelete && (
        <div className="modal-backdrop" onClick={() => { if (!deletingUser) { setShowDeleteConfirm(false); setUserToDelete(null); } }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm delete</h3>
              <button type="button" className="modal-close" onClick={() => { if (!deletingUser) { setShowDeleteConfirm(false); setUserToDelete(null); } }}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this user?</p>
              <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="secondary-button" onClick={() => { setShowDeleteConfirm(false); setUserToDelete(null); }} disabled={deletingUser}>Cancel</button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={async () => {
                    if (!userToDelete) return;
                    setDeletingUser(true);
                    try {
                      const resp = await fetch(`/api/admin/users/${userToDelete.id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                      });
                      const data = await resp.json().catch(() => ({}));
                      if (!resp.ok) {
                        const msg = data.error || data.message || "Failed to delete user.";
                        alert(msg);
                      } else {
                        // refresh list
                        await fetchUsers();
                        setShowDeleteConfirm(false);
                        setUserToDelete(null);
                      }
                    } catch (err) {
                      console.error("Delete user failed:", err);
                      alert("Failed to delete user.");
                    } finally {
                      setDeletingUser(false);
                    }
                  }}
                  disabled={deletingUser}
                >
                  {deletingUser ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
