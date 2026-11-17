
let score = 0;
let level = 1;
let lives = 3;

let model;
let webcam;
let isRunning = false;

const MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/mNstQrFaO/";

async function startGame() {
  const status = document.getElementById("hand-status");

  if (isRunning) return;

  score = 0;
  level = 1;
  lives = 3;
  updateGameInfo();

  status.textContent = "AI 모델 불러오는 중...";

  try {
    if (typeof tmImage === "undefined") {
      throw new Error("Teachable Machine 라이브러리를 불러오지 못했습니다.");
    }

    model = await tmImage.load(
      MODEL_URL + "model.json",
      MODEL_URL + "metadata.json"
    );

    webcam = new tmImage.Webcam(400, 300, true);

    await webcam.setup();
    await webcam.play();

    const area = document.getElementById("camera-area");
    area.innerHTML = "";
    area.appendChild(webcam.canvas);

    isRunning = true;
    status.textContent = "손바닥을 보여주세요!";
    predict();

  } catch (error) {
    status.textContent = "연결 오류";
    alert("오류: " + error.message);
    console.error(error);
  }
}

async function predict() {
  if (!isRunning) return;

  try {
    webcam.update();

    const predictions = await model.predict(webcam.canvas);

    let best = predictions.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    document.getElementById("hand-status").textContent =
      best.className + " (" +
      Math.round(best.probability * 100) + "%)";

  } catch (error) {
    console.error("인식 오류:", error);
    return;
  }

  requestAnimationFrame(predict);
}

function updateGameInfo() {
  document.getElementById("score").textContent = score;
  document.getElementById("level").textContent = level;
  document.getElementById("lives").textContent =
    "❤️".repeat(lives);
}
