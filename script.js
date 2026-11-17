
let score = 0;
let level = 1;
let lives = 3;

let model;
let webcam;
let isRunning = false;
let gameActive = false;

let fruits = [];
let lastSpawn = 0;
let lastCutTime = 0;

let previousPixels = null;
let previousHandPoint = null;

let currentGesture = "";
let currentProbability = 0;

let handCursor = null;

const MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/mNstQrFaO/";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// 게임 시작
async function startGame() {
  if (isRunning) return;

  const status = document.getElementById("hand-status");

  status.textContent = "AI 모델 불러오는 중...";

  try {
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

    score = 0;
    level = 1;
    lives = 3;

    fruits = [];
    previousPixels = null;
    previousHandPoint = null;
    handCursor = null;

    isRunning = true;
    gameActive = true;

    updateGameInfo();

    status.textContent = "손바닥을 보여주세요!";

    requestAnimationFrame(predict);
    requestAnimationFrame(gameLoop);

  } catch (error) {
    status.textContent = "연결 오류";
    alert("게임 실행 오류: " + error.message);
    console.error(error);
  }
}

// 손동작 인식
async function predict() {
  if (!isRunning) return;

  try {
    const predictions = await model.predict(webcam.canvas);

    let best = predictions.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    currentGesture = best.className;
    currentProbability = best.probability;

    document.getElementById("hand-status").textContent =
      currentGesture + " (" +
      Math.round(currentProbability * 100) + "%)";

  } catch (error) {
    console.error("손 인식 오류:", error);
  }

  if (isRunning) {
    requestAnimationFrame(predict);
  }
}

// 손의 움직임 감지
function detectMotion() {
  const cameraContext = webcam.canvas.getContext("2d");

  const frame = cameraContext.getImageData(
    0, 0, 400, 300
  );

  const pixels = frame.data;

  if (!previousPixels) {
    previousPixels = new Uint8ClampedArray(pixels);
    return;
  }

  let sumX = 0;
  let sumY = 0;
  let changed = 0;

  for (let y = 0; y < 300; y += 4) {
    for (let x = 0; x < 400; x += 4) {
      const i = (y * 400 + x) * 4;

      const diff =
        Math.abs(pixels[i] - previousPixels[i]) +
        Math.abs(pixels[i + 1] - previousPixels[i + 1]) +
        Math.abs(pixels[i + 2] - previousPixels[i + 2]);

      if (diff > 65) {
        sumX += x;
        sumY += y;
        changed++;
      }
    }
  }

  previousPixels = new Uint8ClampedArray(pixels);

  if (changed < 12) return;

  const x = sumX / changed;
  const y = sumY / changed;

  handCursor = {
    x: x / 400 * canvas.width,
    y: y / 300 * canvas.height
  };

  if (previousHandPoint) {
    const dx = x - previousHandPoint.x;
    const dy = y - previousHandPoint.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (
      currentGesture === "보자기" &&
      currentProbability > 0.65 &&
      distance > 5 &&
      Date.now() - lastCutTime > 100
    ) {
      sliceFruit(handCursor.x, handCursor.y);
      lastCutTime = Date.now();
    }
  }

  previousHandPoint = { x, y };
}

// 과일 생성
function createFruit() {
  const bomb = Math.random() < 0.2;

  const fruitTypes = ["🍉", "🍊", "🍇", "🍓", "🍍"];

  const fruit = {
    x: 60 + Math.random() * 680,
    y: 390,
    speedX: (Math.random() - 0.5) * 3,
    speedY: -7 - Math.random() * 3,
    gravity: 0.15,
    size: Math.max(0.55, 1 - (level - 1) * 0.07),
    emoji: bomb ? "🍎" :
      fruitTypes[Math.floor(Math.random() * fruitTypes.length)],
    bomb: bomb
  };

  fruits.push(fruit);
}

// 과일 자르기
function sliceFruit(x, y) {
  for (let i = fruits.length - 1; i >= 0; i--) {
    const fruit = fruits[i];

    const dx = x - fruit.x;
    const dy = y - fruit.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 42 * fruit.size) {
      if (fruit.bomb) {
        lives--;
        updateGameInfo();

        if (lives <= 0) {
          endGame();
        }
      } else {
        score += 10;

        level = Math.floor(score / 100) + 1;

        updateGameInfo();
      }

      fruits.splice(i, 1);
    }
  }
}

// 점수와 목숨 업데이트
function updateGameInfo() {
  document.getElementById("score").textContent = score;
  document.getElementById("level").textContent = level;

  document.getElementById("lives").textContent =
    "❤️".repeat(lives);
}

// 게임 종료
function endGame() {
  gameActive = false;

  document.getElementById("hand-status").textContent =
    "게임 오버!";

  alert("GAME OVER!\n최종 점수: " + score);
}

// 게임 화면 그리기
function gameLoop() {
  if (!isRunning) return;

  webcam.update();

  if (gameActive) {
    detectMotion();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#202b3b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameActive) {
    const now = Date.now();

    if (now - lastSpawn > 1000) {
      createFruit();
      lastSpawn = now;
    }

    for (let i = fruits.length - 1; i >= 0; i--) {
      const fruit = fruits[i];

      fruit.x += fruit.speedX;
      fruit.y += fruit.speedY;
      fruit.speedY += fruit.gravity;

      ctx.font = `${64 * fruit.size}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(fruit.emoji, fruit.x, fruit.y);

      if (fruit.y > 460) {
        fruits.splice(i, 1);
      }
    }

    // 손의 움직임 표시
    if (handCursor && currentGesture === "보자기") {
      ctx.beginPath();
      ctx.arc(
        handCursor.x,
        handCursor.y,
        13,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

  } else {
    ctx.fillStyle = "white";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "GAME OVER",
      canvas.width / 2,
      canvas.height / 2
    );
  }

  requestAnimationFrame(gameLoop);
}
