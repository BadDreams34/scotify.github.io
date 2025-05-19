const clientId = "3126f61f8a594d72bdcba7d124c1fc58";
const redirectUri = "https://baddreams34.github.io/scotify.github.io/";

// DOM Elements
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const refreshButton = document.getElementById("refreshButton");
const profileSection = document.getElementById("profile");
const nowPlayingSection = document.getElementById("nowPlaying");
const noTrackMessage = document.getElementById("noTrack");
const trackInfo = document.getElementById("trackInfo");

// Token management
let accessToken = null;
let refreshToken = null;
let updateInterval = null;

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  loginButton.addEventListener("click", handleLogin);
  logoutButton.addEventListener("click", handleLogout);
  refreshButton.addEventListener("click", handleRefresh);
  checkForAuthCode();
});

async function handleLogin() {
  await redirectToAuthCodeFlow(clientId);
}

function handleLogout() {
  // Clear tokens and reset UI
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("verifier");

  // Clear any ongoing intervals
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  // Reset UI
  profileSection.style.display = "none";
  nowPlayingSection.style.display = "none";
  loginButton.style.display = "block";

  // Clear profile data
  document.getElementById("displayName").innerText = "";
  const avatar = document.getElementById("avatar");
  while (avatar.firstChild) {
    avatar.removeChild(avatar.firstChild);
  }
}

async function handleRefresh() {
  if (accessToken) {
    await checkCurrentlyPlaying(accessToken);
  }
}

function checkForAuthCode() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    window.history.replaceState({}, document.title, window.location.pathname);
    processAuthCode(code);
  }
}

async function processAuthCode(code) {
  try {
    const tokens = await getAccessToken(clientId, code);
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;

    const profile = await fetchProfile(accessToken);
    populateUI(profile);
    profileSection.style.display = "block";
    loginButton.style.display = "none";
    nowPlayingSection.style.display = "block";

    // Start checking for currently playing track
    await checkCurrentlyPlaying(accessToken);
    updateInterval = setInterval(
      () => checkCurrentlyPlaying(accessToken),
      5000,
    );
  } catch (error) {
    console.error("Error during authentication:", error);
    alert("Failed to authenticate with Spotify");
  }
}

async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", redirectUri);
  params.append(
    "scope",
    "user-read-private user-read-email user-read-currently-playing user-read-playback-state",
  );
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  window.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(clientId, code) {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("code_verifier", verifier);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!result.ok) {
    throw new Error(`HTTP error! status: ${result.status}`);
  }

  return await result.json();
}

async function refreshAccessToken() {
  if (!refreshToken) {
    console.error("No refresh token available");
    return null;
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("client_id", clientId);

  try {
    const result = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    if (!result.ok) {
      throw new Error(`HTTP error! status: ${result.status}`);
    }

    const tokens = await result.json();
    accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      refreshToken = tokens.refresh_token;
    }
    return accessToken;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!result.ok) {
    throw new Error(`HTTP error! status: ${result.status}`);
  }

  return await result.json();
}

function populateUI(profile) {
  document.getElementById("displayName").innerText = profile.display_name;

  if (profile.images && profile.images[0]) {
    const profileImage = new Image(200, 200);
    profileImage.src = profile.images[0].url;
    document.getElementById("avatar").appendChild(profileImage);
  }
}

async function checkCurrentlyPlaying(token) {
  try {
    let response = await fetchCurrentlyPlaying(token);

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetchCurrentlyPlaying(newToken);
      }
    }

    if (response.status === 204) {
      noTrackMessage.style.display = "block";
      trackInfo.style.display = "none";
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data?.item) {
      noTrackMessage.style.display = "block";
      trackInfo.style.display = "none";
      return;
    }

    displayCurrentlyPlaying(data);
  } catch (error) {
    console.error("Error:", error);
    noTrackMessage.style.display = "block";
    trackInfo.style.display = "none";
  }
}

async function fetchCurrentlyPlaying(token) {
  return await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

function displayCurrentlyPlaying(data) {
  // Validate required data
  if (!data?.item) {
    noTrackMessage.style.display = "block";
    trackInfo.style.display = "none";
    return;
  }

  noTrackMessage.style.display = "none";
  trackInfo.style.display = "block";

  // Track info with fallbacks
  document.getElementById("trackName").textContent =
    data.item.name || "Unknown Track";
  document.getElementById("artistName").textContent =
    data.item.artists?.map((artist) => artist.name).join(", ") ||
    "Unknown Artist";
  document.getElementById("albumName").textContent =
    data.item.album?.name || "Unknown Album";

  // Album image
  const trackImage = document.getElementById("trackImage");
  if (data.item.album?.images?.[0]?.url) {
    trackImage.src = data.item.album.images[0].url;
  } else {
    trackImage.src = "";
  }

  // Progress bar
  if (data.progress_ms && data.item.duration_ms) {
    const progressPercent = (data.progress_ms / data.item.duration_ms) * 100;
    document.getElementById("progressBar").style.width = `${progressPercent}%`;

    // Time display
    const progressTime = document.getElementById("progressTime");
    const progressMinutes = Math.floor(data.progress_ms / 60000);
    const progressSeconds = Math.floor((data.progress_ms % 60000) / 1000)
      .toString()
      .padStart(2, "0");
    const durationMinutes = Math.floor(data.item.duration_ms / 60000);
    const durationSeconds = Math.floor((data.item.duration_ms % 60000) / 1000)
      .toString()
      .padStart(2, "0");
    progressTime.textContent = `${progressMinutes}:${progressSeconds} / ${durationMinutes}:${durationSeconds}`;
  }

  // Device info - with null checks
  const deviceInfoElement = document.getElementById("deviceInfo");
  if (data.device) {
    deviceInfoElement.textContent = `Playing on ${data.device.name || "Unknown device"} (${data.device.type || "Unknown type"})`;
  } else {
    deviceInfoElement.textContent = "Playing on unknown device";
  }
}
