
"use strict";

// =====================================
// FRUIT SLICER - 전체 게임 코드
// =====================================

const MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/mNstQrFaO/";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const livesElement = document.getElementById("lives");
const statusElement = document.getElementById("hand-status");
const cameraArea = document.getElementById("camera-area");
const startButton = document.getElementById("start-button");

// AI 모델의 실제 손동작 이름
const CUT_GESTURE = "손바닥을 펼친 모습";

// 게임 상태
let score = 0;
let level = 1;
let lives = 3;

let model = null;
let webcam = null;
let hands = null;

let isInitializing = false;
let isRunning = false;
let gameActive = false;

let fruits = [];

let currentGesture = "";
let stableGesture = "";

let gestureHistory = [];

let handPoint = null;
let previousHandPoint = null;

let lastSpawn = 0;
let lastCutTime = 0;

let animationId = null;
let predictionBusy = false;
let trackingBusy = false;

let cameraReady = false;


// =====================================
// 화면 정보 업데이트
// =====================================

function updateGameInfo() {

  scoreElement.textContent = score;
  levelElement.textContent = level;
  livesElement.textContent =
    "❤️".repeat(Math.max(0, lives));

}


// =====================================
// 게임 초기화
// =====================================

function resetGame() {

  score = 0;
  level = 1;
  lives = 3;

  fruits = [];

  gestureHistory = [];
  stableGesture = "";
  currentGesture = "";

  handPoint = null;
  previousHandPoint = null;

  lastSpawn = Date.now();
  lastCutTime = 0;

  gameActive = true;

  updateGameInfo();

  statusElement.textContent =
    "손바닥을 펼쳐주세요!";

}


// =====================================
// 시작 버튼
// =====================================

async function startGame() {

  if (isInitializing) return;

  // 카메라가 이미 준비되어 있다면 재시작
  if (cameraReady) {

    resetGame();

    if (!isRunning) {

      isRunning = true;

      requestAnimationFrame(gameLoop);

      predictionLoop();

    }

    return;
  }

  isInitializing = true;
  startButton.disabled = true;

  statusElement.textContent = "게임 준비 중...";

  try {

    // 1. AI 모델 불러오기

    statusElement.textContent =
      "AI 모델 불러오는 중...";

    model = await tmImage.load(
      MODEL_URL + "model.json",
      MODEL_URL + "metadata.json"
    );

    // 2. 카메라 연결

    statusElement.textContent =
      "카메라 연결 중...";

    webcam = new tmImage.Webcam(400, 300, true);

    await webcam.setup();
    await webcam.play();

    cameraArea.innerHTML = "";

    webcam.canvas.style.width = "100%";
    webcam.canvas.style.maxWidth = "400px";
    webcam.canvas.style.height = "auto";

    cameraArea.appendChild(webcam.canvas);

    // 3. MediaPipe 손 추적 설정

    statusElement.textContent =
      "손 추적 준비 중...";

    hands = new Hands({

      locateFile: function(file) {

        return (
          "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" +
          file
        );

      }

    });

    hands.setOptions({

      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.65

    });

    hands.onResults(handleHandResults);

    // 4. 게임 시작

    cameraReady = true;
    isRunning = true;

    resetGame();

    startButton.textContent = "게임 다시 시작";

    statusElement.textContent = "게임 시작!";

    console.log("게임 초기화 완료");

    requestAnimationFrame(gameLoop);

    predictionLoop();

  } catch (error) {

    console.error("게임 시작 오류:", error);

    statusElement.textContent =
      "시작 실패: " + error.message;

    alert(
      "게임 시작에 실패했습니다.\n\n" +
      error.message +
      "\n\n카메라 권한과 인터넷 연결을 확인해 주세요."
    );

    isRunning = false;
    cameraReady = false;

    if (webcam && webcam.stop) {
      webcam.stop();
    }

    webcam = null;
    model = null;
    hands = null;

    startButton.textContent = "다시 시작";

    cameraArea.innerHTML =
      "<p>카메라 연결에 실패했습니다.</p>";

  } finally {

    isInitializing = false;
    startButton.disabled = false;

  }

}


// =====================================
// 버튼 이벤트 연결
// =====================================

startButton.addEventListener("click", function() {

  console.log("게임 시작 버튼 클릭 성공");

  startGame();

});


// =====================================
// Teachable Machine 손동작 인식
// =====================================

async function predictionLoop() {

  if (!isRunning || predictionBusy) return;

  predictionBusy = true;

  try {

    webcam.update();

    const predictions =
      await model.predict(webcam.canvas);

    const best = predictions.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    currentGesture = best.className.trim();

    updateStableGesture(
      currentGesture,
      best.probability
    );

    statusElement.textContent =
      currentGesture +
      " (" +
      Math.round(best.probability * 100) +
      "%)";

  } catch (error) {

    console.error("손 인식 오류:", error);

  } finally {

    predictionBusy = false;

  }

  if (isRunning) {

    setTimeout(predictionLoop, 120);

  }

}


// =====================================
// 손동작 안정화
// =====================================

function updateStableGesture(name, probability) {

  // 기존 75%에서 60%로 조정
  const detected =
    probability >= 0.60 ? name : "";

  gestureHistory.push(detected);

  if (gestureHistory.length > 5) {
    gestureHistory.shift();
  }

  const counts = {};

  gestureHistory.forEach(item => {

    if (item) {
      counts[item] = (counts[item] || 0) + 1;
    }

  });

  stableGesture = "";

  // 최근 5회 중 3회 이상 일치하면 동작 인정
  for (const name in counts) {

    if (counts[name] >= 3) {

      stableGesture = name;

      break;
    }

  }

}


// =====================================
// MediaPipe 손 위치 추적
// =====================================

function handleHandResults(results) {

  if (
    !gameActive ||
    !results.multiHandLandmarks ||
    results.multiHandLandmarks.length === 0
  ) {

    handPoint = null;
    previousHandPoint = null;

    return;

  }

  const landmarks = results.multiHandLandmarks[0];

  // 손바닥 중심점
  const palm = landmarks[9];

  // 카메라 영상은 좌우 반전되므로 x축도 반전
  const point = {

    x: (1 - palm.x) * canvas.width,
    y: palm.y * canvas.height

  };

  handPoint = point;

  // 손바닥을 펼친 상태에서 움직이면 과일 자르기
  if (
    stableGesture === CUT_GESTURE &&
    previousHandPoint
  ) {

    const distance = Math.hypot(
      point.x - previousHandPoint.x,
      point.y - previousHandPoint.y
    );

    if (
      distance > 3 &&
      distance < 120 &&
      Date.now() - lastCutTime > 70
    ) {

      sliceFruit(previousHandPoint, point);

      lastCutTime = Date.now();

    }

  }

  previousHandPoint = { ...point };

}


// =====================================
// 과일 생성
// =====================================

function createFruit() {

  const bomb = Math.random() < 0.20;

  const fruitTypes = [
    "🍉", "🍊", "🍇", "🍓",
    "🍍", "🍌", "🍒"
  ];

  fruits.push({

    x: 60 + Math.random() *
      Math.max(1, canvas.width - 120),

    y: canvas.height - 10,

    speedX: (Math.random() - 0.5) * 3,

    speedY: -8 - Math.random() * 3,

    gravity: 0.16,

    size: Math.max(
      0.55,
      1 - (level - 1) * 0.07
    ),

    emoji: bomb
      ? "💣"
      : fruitTypes[
          Math.floor(Math.random() * fruitTypes.length)
        ],

    bomb: bomb

  });

}


// =====================================
// 손 이동 선과 과일 충돌
// =====================================

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

  const nearestX = start.x + t * dx;
  const nearestY = start.y + t * dy;

  return Math.hypot(
    point.x - nearestX,
    point.y - nearestY
  );

}


// =====================================
// 과일 자르기
// =====================================

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


// =====================================
// 게임 종료
// =====================================

function endGame() {

  gameActive = false;

  statusElement.textContent = "게임 오버!";

  startButton.textContent = "다시 시작하기";

}


// =====================================
// 게임 화면 그리기
// =====================================

function drawGame() {

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.fillStyle = "#101827";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  if (!gameActive) {

    ctx.fillStyle = "white";

    ctx.font = "bold 42px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
      "GAME OVER",
      canvas.width / 2,
      canvas.height / 2
    );

    return;

  }

  // 과일 생성
  if (Date.now() - lastSpawn > 1100) {

    createFruit();

    lastSpawn = Date.now();

  }

  // 과일 이동 및 그리기
  for (let i = fruits.length - 1; i >= 0; i--) {

    const fruit = fruits[i];

    fruit.x += fruit.speedX;
    fruit.y += fruit.speedY;
    fruit.speedY += fruit.gravity;

    ctx.font = `${64 * fruit.size}px Arial`;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      fruit.emoji,
      fruit.x,
      fruit.y
    );

    if (fruit.bomb) {

      ctx.font = "20px Arial";

      ctx.fillText(
        "⚠️",
        fruit.x + 24,
        fruit.y - 25
      );

    }

    if (fruit.y > canvas.height + 80) {

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
      stableGesture === CUT_GESTURE
        ? "#00ff88"
        : "#ffffff";

    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;

    ctx.stroke();

  }

}


// =====================================
// 게임 반복 실행
// =====================================

async function gameLoop() {

  if (!isRunning) return;

  if (webcam && hands && !trackingBusy) {

    trackingBusy = true;

    try {

      await hands.send({
        image: webcam.canvas
      });

    } catch (error) {

      console.error("손 추적 오류:", error);

    } finally {

      trackingBusy = false;

    }

  }

  drawGame();

  if (isRunning) {

    animationId = requestAnimationFrame(gameLoop);

  }

}
