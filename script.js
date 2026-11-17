
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

    document.getElementById("camera-area").innerHTML = "";
    document.getElementById("camera-area").appendChild(webcam.canvas);

    isRunning = true;
    predict();
  } catch (error) {
    alert("카메라 연결에 실패했어요. 카메라 권한을 확인해 주세요.");
    console.error(error);
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
    best.className + " (" + Math.round(best.probability * 100) + "%)";

  requestAnimationFrame(predict);
}

function updateGameInfo() {
  document.getElementById("score").textContent = score;
  document.getElementById("level").textContent = level;
  document.getElementById("lives").textContent = "❤️".repeat(lives);
}

function startGame() {
  score = 0;
  level = 1;
  lives = 3;
  updateGameInfo();
  initCamera();
}

document.getElementById("start-button")
  .addEventListener("click", startGame);
