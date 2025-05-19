const clientId = "3126f61f8a594d72bdcba7d124c1fc58"; // Replace with your client ID
const redirectUri = "https://baddreams34.github.io/scotify.github.io/"; // Must match Spotify Dashboard

// DOM Elements
const loginButton = document.getElementById("loginButton");
const profileSection = document.getElementById("profile");

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  loginButton.addEventListener("click", handleLogin);
  checkForAuthCode();
});

async function handleLogin() {
  await redirectToAuthCodeFlow(clientId);
}

function checkForAuthCode() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    // Remove code from URL
    window.history.replaceState({}, document.title, window.location.pathname);
    processAuthCode(code);
  }
}

async function processAuthCode(code) {
  try {
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    populateUI(profile);
    profileSection.style.display = "block";
    loginButton.style.display = "none";
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
  params.append("scope", "user-read-private user-read-email");
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

  const { access_token } = await result.json();
  return access_token;
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
    document.getElementById("imgUrl").innerText = profile.images[0].url;
  }

  document.getElementById("id").innerText = profile.id;
  document.getElementById("email").innerText = profile.email || "Not provided";
  document.getElementById("uri").innerText = profile.uri;
  document
    .getElementById("uri")
    .setAttribute("href", profile.external_urls.spotify);
  document.getElementById("url").innerText = profile.href;
  document.getElementById("url").setAttribute("href", profile.href);
}
