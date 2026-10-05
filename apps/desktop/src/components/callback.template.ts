export default `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <title>Screencap Auth</title>
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      font-weight: 400;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
      text-align: center;
      background-color: #f8f9fa;
    }
    .container {
      padding: 30px;
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
    }
    .logo {
      width: 130px;
      height: auto;
      margin-bottom: 20px;
    }
    p {
      font-size: 21px;
      line-height: 26px;
      color: #12161F;
      margin: 0;
    }
    .error {
      color: #dc2626;
      margin-top: 12px;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <svg class="logo" viewBox="0 0 170 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.6 4H4V13.6" stroke="#14161A" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/> <path d="M26.4 4H36V13.6" stroke="#14161A" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/> <path d="M13.6 36H4V26.4" stroke="#14161A" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/> <path d="M26.4 36H36V26.4" stroke="#14161A" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/> <circle cx="20" cy="20" r="7" fill="#FF4A2E"/> <text x="50" y="28.5" fill="#14161A" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="-0.48">screencap</text> </svg>
    <p id="message">You are now signed in. Please re-open the Screencap desktop app to continue.</p>
    <div id="error-container"></div>
  </div>
</body>
</html>
`;
