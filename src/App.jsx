import { useCallback, useEffect, useRef, useState } from "react";
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

function getLanguageCode(language) {
  if (language === "Tamil") return "ta";
  if (language === "Telugu") return "te";
  return "en";
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [token, setToken] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tithi-user"));
      return stored?.token || null;
    } catch {
      return null;
    }
  });

  const apiBaseUrl = import.meta.env.VITE_API_BASE || (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://127.0.0.1:5000" : "");

  const buildApiUrl = (endpoint) => {
    const normalized = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return apiBaseUrl ? `${apiBaseUrl}${normalized}` : normalized;
  };
  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tithi-user"));
      return stored?.name ? {
        name: stored.name,
        email: stored.email,
        role: stored.role || "user",
        createdAt: stored.createdAt || null,
        lastLogin: stored.lastLogin || null,
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
  const [profileViewMode, setProfileViewMode] = useState("view");
  const [profileForm, setProfileForm] = useState({ name: "" });
  const [profileSaveMessage, setProfileSaveMessage] = useState({ type: "", text: "" });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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
  const lastLoadKeyRef = useRef("");
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [skipAutoFetch] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [showAllPersonalNotifications, setShowAllPersonalNotifications] = useState(false);
  const [varjyamNotification, setVarjyamNotification] = useState(null);
  const [varjyamNotificationError, setVarjyamNotificationError] = useState("");
  const [varjyamNotificationLoading, setVarjyamNotificationLoading] = useState(false);
  const [showVarjyamModal, setShowVarjyamModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState({ type: "", text: "" });
  const [clearNotificationsLoading, setClearNotificationsLoading] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [locationCoords, setLocationCoords] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tithi-location"));
      if (stored && typeof stored.lat === "number" && typeof stored.lng === "number") {
        return stored;
      }
    } catch {
      // ignore invalid storage
    }
    return null;
  });
  const [locationPermission, setLocationPermission] = useState(() => {
    try {
      return localStorage.getItem("tithi-location-permission") || "unknown";
    } catch {
      return "unknown";
    }
  });
  const [locationPromptStatus, setLocationPromptStatus] = useState(() => {
    try {
      const stored = localStorage.getItem("tithi-location-setup");
      if (stored) return stored;
      const storedCoords = JSON.parse(localStorage.getItem("tithi-location"));
      if (storedCoords && typeof storedCoords.lat === "number" && typeof storedCoords.lng === "number") {
        return "responded";
      }
      const storedPermission = localStorage.getItem("tithi-location-permission");
      if (storedPermission && storedPermission !== "unknown") {
        return "responded";
      }
    } catch {
      // ignore invalid storage
    }
    return "unknown";
  });
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationRequesting, setLocationRequesting] = useState(false);

  const updateLocationPromptStatus = useCallback((status) => {
    setLocationPromptStatus(status);
    try {
      localStorage.setItem("tithi-location-setup", status);
    } catch {
      // ignore storage errors
    }
  }, []);

  const storeLocationPermission = useCallback((status) => {
    setLocationPermission(status);
    try {
      localStorage.setItem("tithi-location-permission", status);
    } catch {
      // ignore storage errors
    }
  }, []);

  const storeLocationCoords = useCallback((coords) => {
    setLocationCoords(coords);
    try {
      localStorage.setItem("tithi-location", JSON.stringify(coords));
    } catch {
      // ignore storage errors
    }
    storeLocationPermission("granted");
  }, [storeLocationPermission]);

  const [locationLabel, setLocationLabel] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tithi-location-meta"));
      return typeof stored?.label === "string" ? stored.label : "";
    } catch {
      return "";
    }
  });

  const markLocationUnavailable = useCallback((status) => {
    setLocationCoords(null);
    setLocationLabel("");
    storeLocationPermission(status || "unavailable");
  }, [storeLocationPermission]);

  const requestLocationAccess = useCallback((force = false) => {
    if (!navigator?.geolocation) {
      markLocationUnavailable("unsupported");
      return;
    }

    if (locationPermission !== "unknown" && !force) {
      return;
    }

    setLocationRequesting(true);
    updateLocationPromptStatus("responded");

    let settled = false;
    const onFinish = (status, coords = null) => {
      if (settled) return;
      settled = true;
      setLocationRequesting(false);
      if (coords) {
        storeLocationCoords(coords);
      } else {
        markLocationUnavailable(status);
      }
    };

    const timeoutId = window.setTimeout(() => {
      onFinish("unavailable");
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude } = position.coords;
        onFinish("granted", {
          lat: Number(latitude.toFixed(6)),
          lng: Number(longitude.toFixed(6)),
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        if (error?.code === 1) {
          onFinish("denied");
        } else {
          onFinish("unavailable");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 900000 }
    );
  }, [locationPermission, markLocationUnavailable, storeLocationCoords, updateLocationPromptStatus]);

  const handleDisableLocation = useCallback(() => {
    setLocationCoords(null);
    setLocationLabel("");
    setLocationPermission("unknown");
    try {
      localStorage.removeItem("tithi-location");
      localStorage.removeItem("tithi-location-permission");
      localStorage.removeItem("tithi-location-meta");
    } catch {
      // ignore storage errors
    }
    setSettingsMessage({ type: "success", text: "Location disabled." });
  }, []);

  const handleAllowLocationSetup = useCallback(() => {
    updateLocationPromptStatus("responded");
    setShowLocationPrompt(false);
    requestLocationAccess(true);
  }, [requestLocationAccess, updateLocationPromptStatus]);

  const handleSkipLocationSetup = useCallback(() => {
    updateLocationPromptStatus("responded");
    setShowLocationPrompt(false);
  }, [updateLocationPromptStatus]);

  const handleEnableLocation = useCallback(() => {
    updateLocationPromptStatus("responded");
    requestLocationAccess(true);
  }, [requestLocationAccess, updateLocationPromptStatus]);

  const handleUpdateLocation = useCallback(() => {
    requestLocationAccess(true);
  }, [requestLocationAccess]);

  useEffect(() => {
    if (!locationCoords) {
      return;
    }

    let isActive = true;
    const stored = localStorage.getItem("tithi-location-meta");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (
          parsed &&
          parsed.lat === locationCoords.lat &&
          parsed.lng === locationCoords.lng &&
          typeof parsed.label === "string" &&
          parsed.lang === language
        ) {
          setLocationLabel(parsed.label);
          return;
        }
      } catch {
        // invalid metadata, ignore
      }
    }

    const controller = new AbortController();
    const fetchLocationName = async () => {
      try {
        const langCode = getLanguageCode(language);
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          locationCoords.lat
        )}&lon=${encodeURIComponent(locationCoords.lng)}&zoom=10&addressdetails=1&accept-language=${encodeURIComponent(
          langCode
        )}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error("Reverse geocode failed");
        }
        const data = await response.json();
        if (!isActive) return;

        const address = data?.address;
        let label = "Current Location";
        if (address) {
          const place = address.city || address.town || address.village || address.hamlet || address.county;
          const region = address.state || address.region || address.state_district;
          if (place && region) {
            label = `${place}, ${region}`;
          } else if (place) {
            label = `${place}${address.country ? `, ${address.country}` : ""}`;
          } else if (region) {
            label = region;
          } else if (address.country) {
            label = address.country;
          }
        }

        setLocationLabel(label);
        try {
          localStorage.setItem(
            "tithi-location-meta",
            JSON.stringify({ lat: locationCoords.lat, lng: locationCoords.lng, label, lang: language })
          );
        } catch {
          // ignore storage errors
        }
      } catch (error) {
        if (!isActive) return;
        console.debug("Reverse geocode failed:", error);
        setLocationLabel("Current Location");
      }
    };

    fetchLocationName();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [locationCoords, language]);

  useEffect(() => {
    if (user && locationPromptStatus === "unknown") {
      setShowLocationPrompt(true);
    }
  }, [user, locationPromptStatus]);

  const navigate = useCallback((path) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    if (window.location.pathname !== normalizedPath) {
      window.history.pushState({}, "", normalizedPath);
    }
    setRoute(normalizedPath);
  }, []);

  const displayLocation = locationCoords ? (locationLabel || "Current Location") : "";

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
  const toggleShowCurrentPassword = () => setShowCurrentPassword((v) => !v);
  const toggleShowNewPassword = () => setShowNewPassword((v) => !v);
  const toggleShowPasswordConfirm = () => setShowPasswordConfirm((v) => !v);
  const toggleShowDeletePassword = () => setShowDeletePassword((v) => !v);

  const resetPasswordVisibility = () => {
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowPasswordConfirm(false);
    setShowDeletePassword(false);
  };

  const isPasswordValid = (value) => {
    if (typeof value !== "string") return false;
    return /^[A-Za-z0-9@#$%^&*()!?_\-+=\[\]{};:'",.<>\/\\|~]{6,30}$/.test(value);
  };

  const getPasswordValidationError = (value) => {
    if (typeof value !== "string") return "Password must be 6 to 30 characters long and may include letters, numbers, and special characters.";
    if (value.length < 6 || value.length > 30) {
      return "Password must be 6 to 30 characters long and may include letters, numbers, and special characters.";
    }
    if (!/^[A-Za-z0-9@#$%^&*()!?_\-+=\[\]{};:'",.<>\/\\|~]*$/.test(value)) {
      return "Password must be 6 to 30 characters long and may include letters, numbers, and special characters.";
    }
    return "";
  };

  const isEmailValid = (value) => {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmed);
  };

  const getEmailValidationError = (value) => {
    if (!isEmailValid(value)) {
      return "Please enter a valid email address.";
    }
    return "";
  };

  const fetchTithi = useCallback(async () => {
    if (!date || !time) return;
    setLoading(true);

    const params = new URLSearchParams({ lang: language, date, time });
    if (locationCoords?.lat != null && locationCoords?.lng != null) {
      params.append("lat", String(locationCoords.lat));
      params.append("lng", String(locationCoords.lng));
    }
    const requestUrl = `/api/tithi?${params.toString()}`;
    console.debug("fetchTithi start", { selectedDate: date, selectedTime: time, requestUrl, locationCoords });

    try {
      const response = await fetch(requestUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const statusCode = response.status;
        console.error("Tithi fetch error:", statusCode, errorData.error);
        throw new Error("Tithi unavailable");
      }

      const data = await response.json();
      console.debug("fetchTithi response", { selectedDate: date, selectedTime: time, data });
      setTithi(data.tithi || "Tithi not available");
      setTithiStartTime(data.startTime || "");
      setTithiEndTime(data.endTime || "");
    } catch (error) {
      console.error("Tithi fetch error:", error?.message);
      setTithi("Tithi unavailable");
      setTithiStartTime("");
      setTithiEndTime("");
    } finally {
      setLoading(false);
    }
  }, [date, language, time, locationCoords]);

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
          createdAt: data.user.createdAt || null,
          lastLogin: data.user.lastLogin || null,
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

  const fetchInitialVarjyam = useCallback(async () => {
    if (!date || !time) return;

    setVarjyamNotificationLoading(true);
    setVarjyamNotificationError("");

    let refreshUrl = `/api/panchang/refresh?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;
    if (locationCoords?.lat != null && locationCoords?.lng != null) {
      refreshUrl += `&lat=${encodeURIComponent(locationCoords.lat)}&lng=${encodeURIComponent(locationCoords.lng)}`;
    }
    console.debug("fetchInitialVarjyam start", { selectedDate: date, selectedTime: time, refreshUrl, locationCoords });

    try {
      const response = await fetch(refreshUrl, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      console.debug("fetchInitialVarjyam response", { selectedDate: date, selectedTime: time, data });

      if (!response.ok) {
        console.error("Initial Varjyam fetch error:", response.status, data.error);
        setVarjyamDetails([]);
        setVarjyamNotificationError(data.message || "Varjyam unavailable");
        return;
      }

      if (Array.isArray(data.varjyam) && data.varjyam.length > 0) {
        setVarjyamDetails(data.varjyam);
        console.debug("fetchInitialVarjyam setVarjyamDetails", { newDetails: data.varjyam });
        setVarjyamNotificationError("");
      } else {
        setVarjyamDetails([]);
      }
    } catch (error) {
      console.error("Initial Varjyam fetch error:", error?.message);
      setVarjyamDetails([]);
      setVarjyamNotificationError("Varjyam unavailable");
    } finally {
      setVarjyamNotificationLoading(false);
    }
  }, [date, time, locationCoords]);

  const fetchVarjyamNotification = useCallback(async () => {
    if (!date || !time) return;

    setVarjyamNotificationLoading(true);
    setVarjyamNotificationError("");

    let requestUrl = `/api/varjyam/notification?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;
    if (locationCoords?.lat != null && locationCoords?.lng != null) {
      requestUrl += `&lat=${encodeURIComponent(locationCoords.lat)}&lng=${encodeURIComponent(locationCoords.lng)}`;
    }
    console.debug("fetchVarjyamNotification start", { selectedDate: date, selectedTime: time, requestUrl, locationCoords });

    try {
      const response = await fetch(requestUrl);
      const data = await response.json();
      console.debug("fetchVarjyamNotification response", { selectedDate: date, selectedTime: time, data });

      if (!response.ok) {
        console.error("Varjyam fetch error:", response.status, data.error);
        setVarjyamDetails([]);
        setVarjyamNotificationError(data.message || "Varjyam unavailable");
        return;
      }

      if (Array.isArray(data.varjyam) && data.varjyam.length > 0) {
        setVarjyamDetails(data.varjyam);
        console.debug("fetchVarjyamNotification setVarjyamDetails", { newDetails: data.varjyam });
        setVarjyamNotificationError("");
      } else {
        setVarjyamDetails([]);
        console.debug("fetchVarjyamNotification cleared varjyamDetails", { needsRefresh: data.needsRefresh, data });
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
  }, [date, time, locationCoords]);

  const loadDashboardData = useCallback(async () => {
    if (skipAutoFetch || !date || !time) return;

    await Promise.all([fetchTithi(), fetchVarjyamNotification()]);
  }, [date, time, fetchTithi, fetchVarjyamNotification, skipAutoFetch]);

  useEffect(() => {
    const loadKey = `${date}|${time}|${language}|${locationCoords?.lat ?? ""}|${locationCoords?.lng ?? ""}`;

    if (lastLoadKeyRef.current === loadKey) return;
    lastLoadKeyRef.current = loadKey;

    if (skipAutoFetch || !date || !time) return;
    loadDashboardData();
  }, [date, time, language, locationCoords?.lat, locationCoords?.lng, loadDashboardData, skipAutoFetch]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = async () => {
    if (skipAutoFetch) return;

    setRefreshing(true);
    console.debug("handleRefresh start", { selectedDate: date, selectedTime: time });

    try {
      let refreshUrl = `/api/panchang/refresh?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;
      if (locationCoords?.lat != null && locationCoords?.lng != null) {
        refreshUrl += `&lat=${encodeURIComponent(locationCoords.lat)}&lng=${encodeURIComponent(locationCoords.lng)}`;
      }
      const postResp = await fetch(refreshUrl, { method: "POST" });
      let postData = {};
      try {
        postData = await postResp.json();
      } catch (e) {
        // ignore parse errors
      }
      console.debug("handleRefresh response", { selectedDate: date, selectedTime: time, postData, status: postResp.status });

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

      if (Array.isArray(postData.varjyam) && postData.varjyam.length > 0) {
        setVarjyamDetails(postData.varjyam);
        console.debug("handleRefresh setVarjyamDetails", { newDetails: postData.varjyam });
      } else {
        setVarjyamDetails(Array.isArray(postData.varjyam) ? postData.varjyam : []);
      }
      setVarjyamNotificationError("");

      try {
        await fetchTithi();
      } catch (e) {
        console.error("fetchTithi after refresh failed:", e?.message || e);
      }

      if (!Array.isArray(postData.varjyam) || postData.varjyam.length === 0) {
        try {
          await fetchVarjyamNotification();
        } catch (e) {
          console.error("fetchVarjyamNotification after refresh failed:", e?.message || e);
        }
      } else {
        console.debug("Skipping fetchVarjyamNotification because refresh returned valid varjyam");
      }
    } catch (error) {
      console.error("Refresh flow error:", error?.message || error);
      setVarjyamNotificationError("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const openAuthModal = (mode) => {
    resetPasswordVisibility();
    setAuthMode(mode);
    setAuthForm({ name: "", email: "", password: "", confirmPassword: "" });
    setAuthError("");
    setAuthSuccess("");
  };

  const closeAuthModal = () => {
    setAuthMode(null);
    setAuthError("");
    setAuthSuccess("");
    resetPasswordVisibility();
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
      const emailError = getEmailValidationError(authForm.email);
      if (emailError) {
        throw new Error(emailError);
      }

      if (authMode === "register") {
        if (!authForm.name.trim()) {
          throw new Error("Please enter your name.");
        }
        if (authForm.password !== authForm.confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        console.log("VALIDATION SUCCESS");
      }

      const endpoint = authMode === "register" ? buildApiUrl("/api/register") : buildApiUrl("/api/login");
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
        createdAt: data.user?.createdAt || null,
        lastLogin: data.user?.lastLogin || null,
      };

      setUser(userData);
      setToken(data.token || null);
      setNotifications([]);
      localStorage.setItem("tithi-user", JSON.stringify({ ...userData, token: data.token || null }));
      setShowUserMenu(false);
      closeAuthModal();
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
    setProfileSaveMessage({ type: "", text: "" });
    setProfileForm({ name: user?.name || "" });
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

    const newPasswordError = getPasswordValidationError(passwordForm.newPassword);
    if (newPasswordError) {
      setPasswordChangeMessage({ type: "error", text: newPasswordError });
      return;
    }

    const confirmPasswordError = getPasswordValidationError(passwordForm.confirmPassword);
    if (confirmPasswordError) {
      setPasswordChangeMessage({ type: "error", text: confirmPasswordError });
      return;
    }
    
    setPasswordChangeLoading(true);
    
    try {
      const response = await fetch(buildApiUrl("/api/change-password"), {
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

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setPasswordChangeMessage({ type: "success", text: data.message || "Password changed successfully. Please login again." });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => {
          closePasswordModal();
          handleLogout();
          openAuthModal("login");
          navigate("/login");
        }, 1400);
      } else {
        const backendMessage = data.error || data.message || "Failed to change password.";
        setPasswordChangeMessage({ type: "error", text: backendMessage });
      }
    } catch (error) {
      setPasswordChangeMessage({ type: "error", text: error?.message || "Error changing password. Please try again." });
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handleClearNotifications = async () => {
    if (!token) return;
    setSettingsMessage({ type: "", text: "" });
    setClearNotificationsLoading(true);

    try {
      const response = await fetch(buildApiUrl("/api/notifications/clear"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Unable to clear notifications.");
      }

      await fetchNotifications();
      setSettingsMessage({ type: "success", text: "Notifications cleared successfully." });
    } catch (error) {
      setSettingsMessage({ type: "error", text: error?.message || "Unable to clear notifications." });
    } finally {
      setClearNotificationsLoading(false);
    }
  };

  const handleLogoutFromAllDevices = async () => {
    if (!token) return;
    const confirmed = window.confirm("Are you sure you want to logout from all devices?");
    if (!confirmed) return;

    setSettingsMessage({ type: "", text: "" });
    setLogoutAllLoading(true);

    try {
      const response = await fetch(buildApiUrl("/api/logout-all"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Unable to logout from all devices.");
      }

      handleLogout();
      openAuthModal("login");
      setSettingsMessage({ type: "success", text: "You have been logged out from all devices." });
      navigate("/login");
    } catch (error) {
      setSettingsMessage({ type: "error", text: error?.message || "Unable to logout from all devices." });
    } finally {
      setLogoutAllLoading(false);
    }
  };

  const openDeleteAccountModal = () => {
    setDeleteAccountError("");
    setDeleteAccountPassword("");
    setShowDeletePassword(false);
    setShowDeleteAccountModal(true);
  };

  const closeDeleteAccountModal = () => {
    setShowDeleteAccountModal(false);
    setDeleteAccountError("");
    setDeleteAccountPassword("");
    setShowDeletePassword(false);
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    if (!deleteAccountPassword.trim()) {
      setDeleteAccountError("Password is required.");
      return;
    }

    setDeleteAccountError("");
    setDeleteAccountLoading(true);

    try {
      const response = await fetch(buildApiUrl("/api/account"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: deleteAccountPassword }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Unable to delete account.");
      }

      closeDeleteAccountModal();
      handleLogout();
      openAuthModal("login");
      setSettingsMessage({ type: "success", text: "Account deleted successfully." });
      navigate("/login");
    } catch (error) {
      setDeleteAccountError(error?.message || "Unable to delete account.");
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const closeProfileView = () => {
    setShowProfileView(false);
    setProfileViewMode("view");
    setProfileSaveMessage({ type: "", text: "" });
    resetPasswordVisibility();
    window.scrollTo(0, 0);
  };

  const openProfileModal = () => {
    setShowUserMenu(false);
    setProfileViewMode("view");
    setProfileSaveMessage({ type: "", text: "" });
    setProfileForm({ name: user?.name || "" });
    setShowProfileView(true);
  };

  const handleProfileEdit = () => {
    setProfileViewMode("edit");
    setProfileForm({ name: user?.name || "" });
    setProfileSaveMessage({ type: "", text: "" });
  };

  const handleProfileCancel = () => {
    setProfileViewMode("view");
    setProfileForm({ name: user?.name || "" });
    setProfileSaveMessage({ type: "", text: "" });
  };

  const handleProfileSave = () => {
    const trimmedName = profileForm.name.trim();
    if (!trimmedName) {
      setProfileSaveMessage({ type: "error", text: "Name cannot be empty." });
      return;
    }

    const updatedUser = {
      ...user,
      name: trimmedName,
    };

    setUser(updatedUser);
    localStorage.setItem("tithi-user", JSON.stringify({ ...updatedUser, token }));
    setProfileSaveMessage({ type: "success", text: "Profile updated successfully." });
    setProfileViewMode("view");
  };

  const openPasswordModal = () => {
    resetPasswordVisibility();
    setShowUserMenu(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordChangeMessage({ type: "", text: "" });
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordChangeMessage({ type: "", text: "" });
    setPasswordChangeLoading(false);
    resetPasswordVisibility();
  };

  const openSettingsModal = () => {
    setShowSettingsModal(true);
    setShowUserMenu(false);
    setSettingsMessage({ type: "", text: "" });
  };

  const closeSettingsModal = () => {
    setShowSettingsModal(false);
    setSettingsMessage({ type: "", text: "" });
  };

  const formatAccountDate = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleNotificationsClick = () => {
    setShowUserMenu(false);
    const notificationsSection = document.querySelector(".notification-panel");
    if (notificationsSection) {
      notificationsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const openAllNotifications = () => {
    setShowAllNotifications(true);
  };

  const openAllPersonalNotifications = () => {
    setShowAllPersonalNotifications(true);
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
                    onClick={openAllNotifications}
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

      </section>
    </>
  );

  const renderProfileModal = () => {
    const profileTitle = profileViewMode === "edit" ? "Edit Profile" : "Profile";
    const createdAt = formatAccountDate(user?.createdAt);
    const lastLogin = formatAccountDate(user?.lastLogin);

    return (
      <div className="modal-backdrop profile-modal-backdrop" onClick={closeProfileView}>
        <div className="modal-card profile-modal-card" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <h3>{profileTitle}</h3>
            <button type="button" className="modal-close" onClick={closeProfileView} aria-label="Close profile modal">×</button>
          </div>

          {profileSaveMessage.text && (
            <div className={`password-message password-${profileSaveMessage.type}`}>
              {profileSaveMessage.text}
            </div>
          )}

          <div className="profile-content profile-modal-content">
            <div className="form-group">
              <label>Name</label>
              {profileViewMode === "edit" ? (
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(event) => setProfileForm({ name: event.target.value })}
                  placeholder="Enter your name"
                />
              ) : (
                <strong className="profile-value">{user?.name || "--"}</strong>
              )}
            </div>
            <div className="form-group">
              <label>Email</label>
              <strong className="profile-value">{user?.email || "--"}</strong>
            </div>
            <div className="form-group">
              <label>Role</label>
              <strong className="profile-value">{user?.role === "admin" ? "Administrator" : "User"}</strong>
            </div>
            {createdAt && (
              <div className="form-group">
                <label>Account Created Date</label>
                <strong className="profile-value">{createdAt}</strong>
              </div>
            )}
            <div className="form-group">
              <label>Last Login</label>
              <strong className="profile-value">{lastLogin}</strong>
            </div>
          </div>

          <div className="profile-actions profile-modal-actions">
            {profileViewMode === "edit" ? (
              <>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleProfileSave}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleProfileCancel}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" className="primary-button" onClick={handleProfileEdit}>
                  Edit Profile
                </button>
                <button type="button" className="secondary-button" onClick={closeProfileView}>
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPasswordModal = () => {
    return (
      <div className="modal-backdrop profile-modal-backdrop" onClick={closePasswordModal}>
        <div className="modal-card profile-modal-card" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <h3>Change Password</h3>
            <button type="button" className="modal-close" onClick={closePasswordModal} aria-label="Close password modal">×</button>
          </div>

              {passwordChangeMessage.text && (
            <div className={`password-message password-${passwordChangeMessage.type}`}>
              {passwordChangeMessage.text}
            </div>
          )}

          <form className="password-change-form">
            <div className="form-group">
              <label>Current Password</label>
              <div className="password-field">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  placeholder="Enter your current password"
                  disabled={passwordChangeLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={toggleShowCurrentPassword}
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? (
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
            </div>
            <div className="form-group">
              <label>New Password</label>
              <div className="password-field">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  placeholder="Enter your new password"
                  disabled={passwordChangeLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={toggleShowNewPassword}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
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
              <div className="password-note">
                Use 6–30 characters; letters, numbers, and special characters are allowed.
              </div>
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <div className="password-field">
                <input
                  type={showPasswordConfirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  placeholder="Confirm your new password"
                  disabled={passwordChangeLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={toggleShowPasswordConfirm}
                  aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
                >
                  {showPasswordConfirm ? (
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
            </div>
            <div className="profile-actions profile-modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handlePasswordChange}
                disabled={passwordChangeLoading}
              >
                {passwordChangeLoading ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" className="secondary-button" onClick={closePasswordModal} disabled={passwordChangeLoading}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderDeleteAccountModal = () => {
    return (
      <div className="modal-backdrop profile-modal-backdrop" onClick={closeDeleteAccountModal}>
        <div className="modal-card profile-modal-card" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <h3>Delete Account</h3>
            <button type="button" className="modal-close" onClick={closeDeleteAccountModal} aria-label="Close delete account modal">
              ×
            </button>
          </div>

          {deleteAccountError && (
            <div className="password-message password-error">
              {deleteAccountError}
            </div>
          )}

          <div className="profile-modal-content">
            <p className="password-note" style={{ marginBottom: "16px" }}>
              This action is permanent and cannot be undone. Please enter your password to confirm account deletion.
            </p>
            <div className="form-group">
              <label>Password</label>
              <div className="password-field">
                <input
                  type={showDeletePassword ? "text" : "password"}
                  value={deleteAccountPassword}
                  onChange={(event) => setDeleteAccountPassword(event.target.value)}
                  placeholder="Enter your password"
                  disabled={deleteAccountLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={toggleShowDeletePassword}
                  aria-label={showDeletePassword ? "Hide password" : "Show password"}
                >
                  {showDeletePassword ? (
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
            </div>
            <div className="profile-modal-actions">
              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteAccount}
                disabled={deleteAccountLoading}
              >
                {deleteAccountLoading ? "Deleting…" : "Delete Account"}
              </button>
              <button type="button" className="secondary-button" onClick={closeDeleteAccountModal} disabled={deleteAccountLoading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsModal = () => {
    const locationEnabled = Boolean(locationCoords?.lat != null && locationCoords?.lng != null);

    return (
      <div className="modal-backdrop profile-modal-backdrop" onClick={closeSettingsModal}>
        <div className="modal-card settings-modal-card" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <h3>Privacy & Settings</h3>
            <button
              type="button"
              className="modal-close"
              onClick={closeSettingsModal}
              aria-label="Close settings modal"
            >
              ×
            </button>
          </div>

          {settingsMessage.text && (
            <div className={`password-message password-${settingsMessage.type}`}>
              {settingsMessage.text}
            </div>
          )}

          <div className="profile-modal-content settings-modal-content">
            <div className="settings-action-row">
              <div className="settings-action-card compact-card">
                <strong>Clear Notifications</strong>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleClearNotifications}
                  disabled={clearNotificationsLoading}
                >
                  {clearNotificationsLoading ? "Clearing…" : "Clear Notifications"}
                </button>
              </div>
            </div>

            <div className="settings-action-row">
              <div className="settings-action-card compact-card">
                <strong>Logout From All Devices</strong>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleLogoutFromAllDevices}
                  disabled={logoutAllLoading}
                >
                  {logoutAllLoading ? "Logging out…" : "Logout From All Devices"}
                </button>
              </div>
            </div>

            <div className="settings-action-row">
              <div className="settings-action-card compact-card danger-card">
                <strong>Delete Account</strong>
                <button
                  type="button"
                  className="danger-button"
                  onClick={openDeleteAccountModal}
                  disabled={deleteAccountLoading}
                >
                  {deleteAccountLoading ? "Deleting…" : "Delete Account"}
                </button>
              </div>
            </div>

            <div className="settings-action-row location-settings-row">
              <div className="settings-action-card compact-card">
                <strong>Location Settings</strong>
                {locationEnabled ? (
                  <>
                    <div className="location-status">Current Location: {locationLabel || "Detected location"}</div>
                    <div className="location-settings-buttons">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={handleUpdateLocation}
                        disabled={locationRequesting}
                      >
                        {locationRequesting ? "Updating…" : "Update Location"}
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={handleDisableLocation}
                      >
                        Disable Location
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleEnableLocation}
                    disabled={locationRequesting}
                  >
                    {locationRequesting ? "Requesting…" : "Enable Location"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
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
              <div className="user-menu-wrap">
                {isAdmin ? (
                  <>
                    <span className="role-badge role-pill role-admin" aria-hidden="true">🛡 ADMIN</span>
                    <button type="button" className="secondary-button" onClick={() => navigate("/admin/dashboard")}>Admin Portal</button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="user-badge"
                  onClick={() => setShowUserMenu((value) => !value)}
                  aria-label={`Open user menu for ${user.name}`}
                >
                  {user.name}
                </button>
                {showUserMenu && (
                  <div className="user-menu-dropdown">
                    <button type="button" className="user-menu-item" onClick={handleProfileClick}>
                      Profile
                    </button>
                    <button type="button" className="user-menu-item" onClick={openPasswordModal}>
                      Change Password
                    </button>
                    <button type="button" className="user-menu-item" onClick={openSettingsModal}>
                      Privacy & Settings
                    </button>
                    <button type="button" className="user-menu-item" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-actions">
                <button type="button" className="secondary-button" onClick={() => openAuthModal("login")}>Login</button>
                <button type="button" className="primary-button" onClick={() => openAuthModal("register")}>Register</button>
              </div>
            )}
          </div>
        </header>

        {isAdminPortal && isAdmin ? renderAdminPortal() : user ? (
          <section className="top-varjyam-area">
            <article className="section-card astrology-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Astrology</p>
                  <h2>Varjyam & Tithi details</h2>
                </div>
                <div className="astrology-actions">
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

              <div className="astrology-cards">
                <article className="small-card tithi-card">
                  <strong>Today's Tithi</strong>
                  <p className="tithi-name">{tithi || "Unavailable"}</p>
                  <div className="tithi-time-row">
                    <span className="tithi-time-label">{getTithiTimeLabel("start", language)}</span>
                    <strong className="tithi-time-value">{tithiStartTime ? formatVarjyamTime(tithiStartTime, language) : "—"}</strong>
                  </div>
                  <div className="tithi-time-row">
                    <span className="tithi-time-label">{getTithiTimeLabel("end", language)}</span>
                    <strong className="tithi-time-value">{tithiEndTime ? formatVarjyamTime(tithiEndTime, language) : "—"}</strong>
                  </div>
                </article>

                <article className="small-card varjyam-summary-card">
                  <strong>Latest Varjyam</strong>
                  {varjyamDetails[0] ? (
                    <div className="varjyam-time-group">
                      <div className="varjyam-time-row">
                        <span className="varjyam-label">Start Time</span>
                        <strong className="varjyam-value">{formatVarjyamTime(varjyamDetails[0].start)}</strong>
                      </div>
                      <div className="varjyam-time-row">
                        <span className="varjyam-label">End Time</span>
                        <strong className="varjyam-value">{formatVarjyamTime(varjyamDetails[0].end)}</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="empty-state">No Varjyam details</p>
                  )}
                </article>
              </div>
            </article>

            <article className="section-card personal-notifications-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Personal dashboard</p>
                  <h2>Personal Notifications</h2>
                </div>
                <button type="button" className="secondary-button" onClick={() => scrollToSection(".personal-notifications-card")}>View All</button>
              </div>

              <div className="notification-panel personal-notifications-panel">
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
                        onClick={openAllPersonalNotifications}
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

      {showProfileView && renderProfileModal()}
      {showPasswordModal && renderPasswordModal()}
      {showDeleteAccountModal && renderDeleteAccountModal()}
      {showSettingsModal && renderSettingsModal()}

      {showLocationPrompt && (
        <div className="modal-backdrop profile-modal-backdrop" onClick={handleSkipLocationSetup}>
          <div className="modal-card settings-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Enable Location?</h3>
              <button type="button" className="modal-close" onClick={handleSkipLocationSetup} aria-label="Close modal">×</button>
            </div>
            <div className="modal-body">
              <p>Location helps provide more accurate Tithi and Varjyam calculations because timings may vary slightly between cities.</p>
            </div>
            <div className="profile-actions profile-modal-actions">
              <button type="button" className="primary-button" onClick={handleAllowLocationSetup} disabled={locationRequesting}>
                {locationRequesting ? "Requesting…" : "Allow Location"}
              </button>
              <button type="button" className="secondary-button" onClick={handleSkipLocationSetup} disabled={locationRequesting}>
                Skip For Now
              </button>
            </div>
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
