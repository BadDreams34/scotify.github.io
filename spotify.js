<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My Spotify Profile</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      #profile {
        margin-top: 20px;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
      }
      #avatar img {
        border-radius: 50%;
        margin: 10px 0;
      }
    </style>
  </head>
  <body>
    <h1>Display your Spotify profile data</h1>
    <button id="loginButton">Login with Spotify</button>

    <section id="profile" style="display: none">
      <h2>Logged in as <span id="displayName"></span></h2>
      <div id="avatar"></div>
      <ul>
        <li>User ID: <span id="id"></span></li>
        <li>Email: <span id="email"></span></li>
        <li>Spotify URI: <a id="uri" href="#"></a></li>
        <li>Link: <a id="url" href="#"></a></li>
        <li>Profile Image URL: <span id="imgUrl"></span></li>
      </ul>
    </section>

    <script src="spotify.js" type="module"></script>
  </body>
</html>
