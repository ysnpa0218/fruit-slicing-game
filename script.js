
// ===================================
// 1. 게임 기본 설정
// ===================================

let score = 0;
let level = 1;
let lives = 3;

let model;
let webcam;
let hands;

let isRunning = false;
let gameActive = false;
let trackingBusy = false;

let fruits = [];

let currentGesture = "";
let currentProbability = 0;

let gestureHistory = [];
let stableGesture = "";

let handPoint = null;
let previousHandPoint = null;

let lastSpawn = 0;
let lastCutTime = 0;

const MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/mNstQrFaO/";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const statusText = document.getElementById("hand-status");
const startButton = document.getElementById("start-button");


// ===================================
// 2. 게임 시작 및 재시작
// ===================================

async function startGame() {

  // 이미 실행 중이면 게임만 다시 시작
  if (isRunning) {
    resetGame();
    return;
  }

  startButton.disabled = true;
  statusText.textContent = "AI 모델 불러오는 중...";

  try {

    // Teachable Machine 모델 불러오기
    model = await tmImage.load(
      MODEL_URL + "model.json",
      MODEL_URL + "metadata.json"
    );

    // 카메라 연결
    webcam = new tmImage.Webcam(400, 300, true);

    await webcam.setup();
    await webcam.play();

    const cameraArea =
      document.getElementById("camera-area");

    cameraArea.innerHTML = "";
    cameraArea.appendChild(webcam.canvas);

    // MediaPipe 손 추적 설정
    hands = new Hands({
      locateFile: (file) => {
        return "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" + file;
      }
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    hands.onResults(onHandResults);

    isRunning = true;

    resetGame();

    startButton.disabled = false;
    startButton.textContent = "게임 다시 시작";

    statusText.textContent = "손바닥을 보여주세요!";

    predictLoop();
    gameLoop();

  } catch (error) {

    console.error("게임 실행 오류:", error);

    statusText.textContent = "연결 오류";

    alert(
      "게임 실행에 실패했습니다.\n" +
      error.message
    );

    startButton.disabled = false;
  }
}


// ===================================
// 3. 게임 초기화
// ===================================

function resetGame() {

  score = 0;
  level = 1;
  lives = 3;

  fruits = [];

  gestureHistory = [];
  stableGesture = "";

  handPoint = null;
  previousHandPoint = null;

  lastSpawn = Date.now();
  lastCutTime = 0;

  gameActive = true;

  updateGameInfo();

  statusText.textContent = "게임 시작! 보자기로 움직여보세요.";

}


// ===================================
// 4. 손동작 인식
// ===================================

async function predictLoop() {

  if (!isRunning) return;

  try {

    const predictions =
      await model.predict(webcam.canvas);

    const best = predictions.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    currentGesture = best.className.trim();
    currentProbability = best.probability;

    updateGesture();

    statusText.textContent =
      currentGesture +
      " (" +
      Math.round(currentProbability * 100) +
      "%)";

  } catch (error) {

    console.error("손 인식 오류:", error);

  }

  if (isRunning) {
    setTimeout(predictLoop, 120);
  }
}


// ===================================
// 5. 손동작 안정화
// ===================================

function updateGesture() {

  const detected =
    currentProbability >= 0.75
      ? currentGesture
      : "";

  gestureHistory.push(detected);

  if (gestureHistory.length > 5) {
    gestureHistory.shift();
  }

  const counts = {};

  gestureHistory.forEach(name => {
    if (name) {
      counts[name] = (counts[name] || 0) + 1;
    }
  });

  let bestName = "";

  for (const name in counts) {
    if (counts[name] >= 4) {
      bestName = name;
    }
  }

  stableGesture = bestName;
}


// ===================================
// 6. 실제 손 위치 추적
// ===================================

function onHandResults(results) {

  if (
    results.multiHandLandmarks &&
    results.multiHandLandmarks.length > 0
  ) {

    const landmarks =
      results.multiHandLandmarks[0];

    // 손바닥 중앙 부분을 추적
    const palm = landmarks[9];

    handPoint = {
      x: palm.x * canvas.width,
      y: palm.y * canvas.height
    };

    if (
      gameActive &&
      stableGesture === "보자기" &&
      previousHandPoint
    ) {

      const dx =
        handPoint.x - previousHandPoint.x;

      const dy =
        handPoint.y - previousHandPoint.y;

      const distance =
        Math.sqrt(dx * dx + dy * dy);

      if (
        distance > 3 &&
        Date.now() - lastCutTime > 70
      ) {

        sliceFruit(
          previousHandPoint,
          handPoint
        );

        lastCutTime = Date.now();
      }
    }

    previousHandPoint = { ...handPoint };

  } else {

    handPoint = null;
    previousHandPoint = null;
  }
}


// ===================================
// 7. 과일 생성
// ===================================

function createFruit() {

  const bomb = Math.random() < 0.20;

  const fruitTypes = [
    "🍉",
    "🍊",
    "🍇",
    "🍓",
    "🍍",
    "🍌",
    "🍒"
  ];

  const size = Math.max(
    0.55,
    1 - (level - 1) * 0.07
  );

  fruits.push({

    x: 60 + Math.random() * 680,
    y: 390,

    speedX: (Math.random() - 0.5) * 3,
    speedY: -8 - Math.random() * 3,

    gravity: 0.16,

    size: size,

    emoji: bomb
      ? "🍎"
      : fruitTypes[
          Math.floor(Math.random() * fruitTypes.length)
        ],

    bomb: bomb

  });
}


// ===================================
// 8. 손의 이동 경로와 과일 충돌
// ===================================

function distanceToSegment(point, start, end) {

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(
      point.x - start.x,
      point.y - start.y
    );
  }

  let t = (
    (point.x - start.x) * dx +
    (point.y - start.y) * dy
  ) / lengthSquared;

  t = Math.max(0, Math.min(1, t));

  const closestX = start.x + t * dx;
  const closestY = start.y + t * dy;

  return Math.hypot(
    point.x - closestX,
    point.y - closestY
  );
}


// ===================================
// 9. 과일 자르기
// ===================================

function sliceFruit(start, end) {

  for (let i = fruits.length - 1; i >= 0; i--) {

    const fruit = fruits[i];

    const distance = distanceToSegment(
      fruit,
      start,
      end
    );

    if (distance < 43 * fruit.size) {

      if (fruit.bomb) {

        lives--;

        updateGameInfo();

        // 폭탄을 자르면 게임 종료 조건 확인
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


// ===================================
// 10. 점수 및 목숨 표시
// ===================================

function updateGameInfo() {

  document.getElementById("score").textContent =
    score;

  document.getElementById("level").textContent =
    level;

  document.getElementById("lives").textContent =
    "❤️".repeat(lives);

}


// ===================================
// 11. 게임 오버
// ===================================

function endGame() {

  gameActive = false;

  statusText.textContent = "게임 오버!";

  startButton.textContent = "다시 시작하기";

  alert(
    "GAME OVER!\n" +
    "최종 점수: " + score
  );
}


// ===================================
// 12. 게임 화면 그리기
// ===================================

function drawGame() {

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // 배경
  ctx.fillStyle = "#101827";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  if (gameActive) {

    const now = Date.now();

    // 과일 생성 간격
    if (now - lastSpawn > 1100) {

      createFruit();

      lastSpawn = now;
    }

    // 과일 움직임
    for (let i = fruits.length - 1; i >= 0; i--) {

      const fruit = fruits[i];

      fruit.x += fruit.speedX;
      fruit.y += fruit.speedY;

      fruit.speedY += fruit.gravity;

      ctx.font =
        `${64 * fruit.size}px Arial`;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(
        fruit.emoji,
        fruit.x,
        fruit.y
      );

      // 과일 모양 폭탄에 경고 표시
      if (fruit.bomb) {

        ctx.font = "20px Arial";

        ctx.fillText(
          "⚠️",
          fruit.x + 24,
          fruit.y - 25
        );
      }

      // 화면 밖으로 나간 과일 제거
      if (fruit.y > 460) {

        fruits.splice(i, 1);
      }
    }

    // 손 위치 표시
    if (handPoint) {

      ctx.beginPath();

      ctx.arc(
        handPoint.x,
        handPoint.y,
        15,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        stableGesture === "보자기"
          ? "#00ff88"
          : "#ffffff";

      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;

      ctx.stroke();
    }

  } else {

    ctx.fillStyle = "#ffffff";

    ctx.font = "bold 42px Arial";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      "GAME OVER",
      canvas.width / 2,
      canvas.height / 2
    );
  }
}


// ===================================
// 13. 게임 실행 반복
// ===================================

async function gameLoop() {

  if (!isRunning) return;

  webcam.update();

  // MediaPipe 손 추적
  if (!trackingBusy) {

    trackingBusy = true;

    try {

      await hands.send({
        image: webcam.canvas
      });

    } catch (error) {

      console.error("손 위치 추적 오류:", error);

    }

    trackingBusy = false;
  }

  drawGame();

  requestAnimationFrame(gameLoop);
}
