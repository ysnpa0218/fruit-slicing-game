
// 게임 기본 설정
let score = 0;
let level = 1;
let lives = 3;

// 게임 시작 버튼
const startButton = document.getElementById("start-button");

startButton.addEventListener("click", function() {
  alert("🍉 게임을 시작합니다!");

  score = 0;
  level = 1;
  lives = 3;

  updateGameInfo();
});

// 점수와 목숨 화면 업데이트
function updateGameInfo() {
  document.getElementById("score").textContent = score;
  document.getElementById("level").textContent = level;

  document.getElementById("lives").textContent =
    "❤️".repeat(lives);
}

// 과일을 자를 때
function cutFruit() {
  score += 10;

  // 과일 10개마다 레벨 상승
  level = Math.floor(score / 100) + 1;

  updateGameInfo();
}

// 폭탄을 자를 때
function cutBomb() {
  lives--;

  updateGameInfo();

  if (lives <= 0) {
    alert("GAME OVER! 최종 점수: " + score);
  }
}
