
let score = 0;
let level = 1;
let lives = 3;

let model;
let webcam;
let isRunning = false;

const MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/mNstQrFaO/";

async function initCamera() {
  try {
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);

    webcam = new tmImage.Webcam(400, 300, true);
    await webcam.setup();
    await webcam.play();

    const cameraArea = document.getElementById("camera-area");
    cameraArea.innerHTML = "";
    cameraArea.appendChild(webcam.canvas);

    isRunning = true;
    predict();

  } catch (error) {
    console.error("카메라 오류:", error);
    alert("카메라 연결 실패: " + error.message);
  }
}

async function predict() {
  if (!isRunning) return;

  webcam.update();

  const predictions = await model.predict(webcam.canvas);

  let best = predictions.reduce((a, b) =>
    a.probability > b.probability ? a : b
  );

  document.getElementById("hand-status").textContent =
    best.className + " (" +
    Math.round(best.probability * 100) + "%)";

  requestAnimationFrame(predict);
}

function updateGameInfo() {
  document.getElementById("score").textContent = score;
  document.getElementById("level").textContent = level;
  document.getElementById("lives").textContent =
    "❤️".repeat(lives);
}

function startGame() {
  score = 0;
  level = 1;
  lives = 3;

  updateGameInfo();

  initCamera();
}

document.addEventListener("DOMContentLoaded", function() {
  const startButton =
    document.getElementById("start-button");

  if (!startButton) {
    console.error("시작 버튼을 찾을 수 없습니다.");
    return;
  }

  startButton.addEventListener("click", startGame);
});
