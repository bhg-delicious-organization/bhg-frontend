// ==================== tutorial.js ====================
// 新手教學系統
// 依賴：js/core/common.js、js/core/state.js
// =========================================================

// ==================== 教學步驟定義 ====================

const tutorialSteps = {
  // ===== 查詢頁教學（4 步驟）=====
  query: [
    {
      title: '📖 輸入學號',
      description: '在白色輸入框中輸入您的 6 位數學號。',
      selector: '#queryStudentId'
    },
    {
      title: '🔍 查詢餘額',
      description: '點擊「查詢」按鈕，查看目前餘額。',
      selector: '#page-user-query .btn-primary'
    },
    {
      title: '📊 查看交易紀錄',
      description: '查詢後下方會顯示您最近的 5 筆交易紀錄。',
      selector: '#transactionTable',
      cardPosition: 'top'
    },
    {
      title: '💾 記住學號',
      description: '點擊右上角「學號」按鈕。<br>儲存您的學號，下次自動填入。',
      selector: '.quick-id-btn',
      cardPosition: 'bottom'
    }
  ],

  // ===== 儲值頁教學（3 步驟）=====
  recharge: [
    {
      title: '🎁 輸入禮包碼',
      description: '請輸入 6 位數禮包碼。',
      selector: '#giftCode'
    },
    {
      title: '👤 輸入學號',
      description: '請輸入您的 6 位數學號。',
      selector: '#rechargeStudentId'
    },
    {
      title: '✅ 確認儲值',
      description: '點擊「確認儲值」按鈕，完成儲值。',
      selector: '#page-user-recharge .btn-success'
    }
  ],

  // ===== 訂飯頁教學（3 步驟）=====
  meal: [
    {
      title: '🍱 輸入學號',
      description: '請輸入您的 6 位數學號。',
      selector: '#mealStudentId'
    },
    {
      title: '📥 載入資料',
      description: '點擊「載入」按鈕。<br>系統會顯示目前餘額和今日餐點狀態。',
      selector: '#page-user-meal .btn-primary'
    },
    {
      title: '🍽️ 開始點餐',
      description: '如果今日餐廳已設定，會出現「點餐」按鈕。<br>點擊後進入點餐頁面，負債無法點餐。',
      selector: '#mealSelection .btn-success',
      disableTarget: true,
      forceVisibleParent: '#mealSelection'
    }
  ],

  // ===== 申請頁教學（3 步驟）=====
  register: [
    {
      title: '📝 填寫學號',
      description: '請輸入您的 6 位數學號。',
      selector: '#registerStudentId'
    },
    {
      title: '👤 填寫姓名',
      description: '請輸入您的真實姓名。',
      selector: '#registerName'
    },
    {
      title: '✅ 送出申請',
      description: '確認資料無誤後，點擊送出申請。',
      selector: '#page-user-register .btn-success'
    }
  ],

  // ===== 帳號頁教學 - 未登入 =====
  accountNotLoggedIn: [
    {
      title: '🔐 登入',
      description: '請輸入您的 6 位數學號。<br>若無密碼可留空，直接點擊「登入」。',
      selector: '#accountLoginStudentId',
      cardPosition: 'top'
    },
    {
      title: '🔑 密碼',
      description: '輸入您的密碼（若已設定）。<br>若無密碼可留空。',
      selector: '#accountLoginPassword',
      cardPosition: 'bottom'
    },
    {
      title: '✅ 登入',
      description: '點擊「登入」按鈕，完成登入。',
      selector: '#accountNotLoggedIn .btn-primary',
      cardPosition: 'bottom'
    }
  ],

  // ===== 帳號頁教學 - 已登入 =====
  accountLoggedIn: [
    {
      title: '👤 個人資訊',
      description: '這裡顯示您的學號、姓名、總消費金額。',
      selector: '#accountLoggedIn',
      cardPosition: 'top'
    },
    {
      title: '🔑 修改密碼',
      description: '點擊「修改密碼」按鈕，前往修改密碼頁面。',
      selector: '#accountLoggedIn .btn-primary',
      cardPosition: 'bottom'
    },
    {
      title: '🚪 登出',
      description: '點擊「登出」按鈕，即可登出帳號。',
      selector: '#accountLogoutBtn',
      cardPosition: 'bottom'
    }
  ],

  // ===== 修改密碼頁教學 =====
  changepwd: [
    {
      title: '🔑 原密碼',
      description: '請輸入您的原始密碼。',
      selector: '#changepwdOldPassword',
      cardPosition: 'top'
    },
    {
      title: '📝 新密碼',
      description: '請輸入新密碼。<br>新密碼長度至少需要 4 個字元。',
      selector: '#changepwdNewPassword',
      cardPosition: 'bottom'
    },
    {
      title: '✅ 確認新密碼',
      description: '請再次輸入新密碼，確保兩次輸入一致。',
      selector: '#changepwdConfirmPassword',
      cardPosition: 'bottom'
    },
    {
      title: '💾 確認修改',
      description: '點擊「確認修改密碼」按鈕，完成密碼更新。',
      selector: '#page-user-changepwd .btn-primary',
      cardPosition: 'bottom'
    },
    {
      title: '🔙 返回',
      description: '點擊「返回帳號頁面」按鈕，回到帳號頁面。',
      selector: '#page-user-changepwd .btn-secondary',
      cardPosition: 'bottom'
    }
  ]
};

// ==================== 教學狀態變數 ====================

let currentTutorialPage = null;
let currentTutorialStep = 0;
let tutorialStepsList = [];
let scrollPosition = 0;
let tutorialModifications = [];

// ==================== 核心函數 ====================

/**
 * 啟動新手教學
 * @param {string} pageName - 頁面名稱 (query, recharge, meal, register, account, changepwd)
 */
function startTutorial(pageName) {
  console.log('📖 啟動新手教學，頁面:', pageName);

  try {
    const overlay = document.getElementById('tutorialOverlay');
    if (!overlay) {
      console.error('❌ 找不到 tutorialOverlay 元素');
      showMessageModal('❌ 錯誤', '教學系統初始化失敗，請重新整理頁面');
      return;
    }

    let steps = null;

    // 根據頁面名稱和登入狀態選擇教學步驟
    if (pageName === 'account') {
      const isLoggedIn = !!AppState.currentStudentId();
      if (isLoggedIn) {
        steps = tutorialSteps.accountLoggedIn;
      } else {
        steps = tutorialSteps.accountNotLoggedIn;
      }
    } else {
      steps = tutorialSteps[pageName];
    }

    if (!steps || steps.length === 0) {
      showMessageModal('📖 教學提示', '此頁面暫無教學內容');
      return;
    }

    currentTutorialPage = pageName;
    tutorialStepsList = steps;
    currentTutorialStep = 0;

    // 記錄當前滾動位置
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    // 鎖定滾動
    document.body.classList.add('tutorial-active');
    document.body.style.top = `-${scrollPosition}px`;

    overlay.style.display = 'flex';

    setTimeout(() => {
      showTutorialStep(0);
    }, 100);

    console.log('✅ 新手教學啟動成功，共', steps.length, '個步驟');

  } catch (error) {
    console.error('❌ 啟動新手教學失敗:', error);
    showMessageModal('❌ 錯誤', '啟動教學失敗，請稍後再試');
  }
}

/**
 * 顯示指定步驟的教學內容
 */
function showTutorialStep(stepIndex) {
  try {
    restoreModifications();

    const step = tutorialStepsList[stepIndex];
    if (!step) return;

    console.log('📖 顯示教學步驟:', stepIndex + 1, '/', tutorialStepsList.length, '-', step.title);

    // 1. 更新卡片內容
    const titleEl = document.getElementById('tutorialTitle');
    const descEl = document.getElementById('tutorialDescription');
    const counterSpan = document.getElementById('tutorialStepCounter');
    const nextBtn = document.getElementById('tutorialNextBtn');

    if (titleEl) titleEl.innerHTML = `<i class="fas fa-graduation-cap"></i> ${step.title}`;
    if (descEl) descEl.innerHTML = step.description;
    if (counterSpan) counterSpan.textContent = `第 ${stepIndex + 1} / ${tutorialStepsList.length} 步`;

    if (nextBtn) {
      if (stepIndex === tutorialStepsList.length - 1) {
        nextBtn.innerHTML = '完成 <i class="fas fa-check"></i>';
      } else {
        nextBtn.innerHTML = '下一步 <i class="fas fa-arrow-right"></i>';
      }
    }

    // 2. 先處理強制顯示父容器
    if (step.forceVisibleParent) {
      const parentElement = document.querySelector(step.forceVisibleParent);
      if (parentElement) {
        const originalInlineDisplay = parentElement.style.display;
        const computedDisplay = window.getComputedStyle(parentElement).display;
        console.log('🔍 強制顯示父容器:', step.forceVisibleParent, '原始顯示:', computedDisplay);

        if (computedDisplay === 'none') {
          tutorialModifications.push({
            type: 'forceVisible',
            element: parentElement,
            originalInlineDisplay: originalInlineDisplay
          });
          parentElement.style.display = 'flex';
          console.log('✅ 已強制顯示父容器');
        }
      }
    }

    // 3. 調整教學卡片位置
    const tutorialCard = document.querySelector('.tutorial-card');
    if (tutorialCard) {
      tutorialCard.style.bottom = '';
      tutorialCard.style.top = '';

      if (step.cardPosition === 'top') {
        tutorialCard.style.bottom = 'auto';
        tutorialCard.style.top = '70px';
      } else {
        tutorialCard.style.bottom = '20px';
        tutorialCard.style.top = 'auto';
      }
    }

    // 4. 高亮目標元素
    const targetElement = highlightElement(step.selector);

    // 5. 禁用目標按鈕
    if (step.disableTarget && targetElement && targetElement.disabled !== undefined) {
      tutorialModifications.push({
        type: 'disable',
        element: targetElement,
        originalDisabled: targetElement.disabled
      });
      targetElement.disabled = true;
      targetElement.style.opacity = '0.7';
      targetElement.style.cursor = 'not-allowed';
    }

  } catch (error) {
    console.error('❌ 顯示教學步驟失敗:', error);
  }
}

/**
 * 高亮指定元素
 */
function highlightElement(selector) {
  try {
    const highlightDiv = document.getElementById('tutorialHighlight');
    if (!highlightDiv) return null;

    const targetElement = document.querySelector(selector);
    if (!targetElement || targetElement.offsetParent === null) {
      console.warn('⚠️ 找不到目標元素:', selector);
      highlightDiv.style.display = 'none';
      return null;
    }

    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    highlightDiv.style.display = 'block';
    highlightDiv.style.top = (rect.top + scrollTop - 8) + 'px';
    highlightDiv.style.left = (rect.left + scrollLeft - 8) + 'px';
    highlightDiv.style.width = (rect.width + 16) + 'px';
    highlightDiv.style.height = (rect.height + 16) + 'px';

    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return targetElement;
  } catch (error) {
    console.error('❌ 高亮元素失敗:', error);
    return null;
  }
}

/**
 * 恢復所有教學過程中的臨時修改
 */
function restoreModifications() {
  for (let mod of tutorialModifications) {
    if (mod.type === 'disable') {
      mod.element.disabled = mod.originalDisabled;
      mod.element.style.opacity = '';
      mod.element.style.cursor = '';
    } else if (mod.type === 'forceVisible') {
      mod.element.style.display = mod.originalInlineDisplay;
    }
  }
  tutorialModifications = [];
}

/**
 * 下一步教學
 */
function nextTutorialStep() {
  try {
    if (currentTutorialStep + 1 < tutorialStepsList.length) {
      currentTutorialStep++;
      showTutorialStep(currentTutorialStep);
    } else {
      endTutorial();
    }
  } catch (error) {
    console.error('❌ 下一步教學失敗:', error);
  }
}

/**
 * 跳過教學
 */
function skipTutorial() {
  console.log('⏭️ 使用者跳過教學');
  endTutorial();
}

/**
 * 結束教學（噴彩帶 + 恢復狀態）
 */
function endTutorial() {
  try {
    console.log('🎓 結束教學，開始噴彩帶！');

    // 1. 恢復所有臨時修改
    restoreModifications();

    // 2. 重置教學卡片位置
    const tutorialCard = document.querySelector('.tutorial-card');
    if (tutorialCard) {
      tutorialCard.style.bottom = '';
      tutorialCard.style.top = '';
      tutorialCard.style.transform = '';
    }

    // 3. 隱藏教學浮層
    const overlay = document.getElementById('tutorialOverlay');
    if (overlay) overlay.style.display = 'none';

    // 4. 恢復滾動
    document.body.classList.remove('tutorial-active');
    document.body.style.top = '';
    if (typeof scrollPosition !== 'undefined') {
      window.scrollTo(0, scrollPosition);
    }

    // 5. 噴彩帶
    function launchCanvasConfetti() {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '9999';
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles = [];
      const colors = ['#27ae60', '#3498db', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];

      for (let i = 0; i < 150; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          size: Math.random() * 8 + 3,
          height: Math.random() * 12 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedY: Math.random() * 6 + 4,
          speedX: (Math.random() - 0.5) * 3,
          rotation: Math.random() * 360,
          rotationSpeed: Math.random() * 10 + 5
        });
      }

      let animationId;
      let startTime = Date.now();
      const duration = 2500;

      function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let activeParticles = 0;

        for (let p of particles) {
          p.y += p.speedY;
          p.x += p.speedX;
          p.rotation += p.rotationSpeed;

          if (p.y < canvas.height + 50) {
            activeParticles++;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.height / 2, p.size, p.height);
            ctx.restore();
          }
        }

        if (activeParticles === 0 || Date.now() - startTime > duration) {
          cancelAnimationFrame(animationId);
          canvas.remove();
        } else {
          animationId = requestAnimationFrame(animate);
        }
      }

      animate();
    }

    try {
      launchCanvasConfetti();
    } catch (confettiError) {
      console.warn('彩帶噴射失敗:', confettiError);
    }

    // 6. 清除教學狀態
    currentTutorialPage = null;
    tutorialStepsList = [];
    currentTutorialStep = 0;

    console.log('✅ 新手教學順利結束');

  } catch (error) {
    console.error('❌ 結束教學失敗:', error);
    try {
      const overlay = document.getElementById('tutorialOverlay');
      if (overlay) overlay.style.display = 'none';
      document.body.classList.remove('tutorial-active');
      document.body.style.top = '';
    } catch (e) {
      console.error('緊急恢復失敗:', e);
    }
  }
}

// 掛載到 window
window.startTutorial = startTutorial;
window.showTutorialStep = showTutorialStep;
window.nextTutorialStep = nextTutorialStep;
window.skipTutorial = skipTutorial;
window.endTutorial = endTutorial;

console.log('📖 教學模組已載入');
