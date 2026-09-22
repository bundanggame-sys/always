// [크로스 브라우징] 네임스페이스 통일
const extBrowser = window.browser || window.chrome;

// 3분 간격으로 세션을 연장하는 주기 상수 (ms 단위, 3분 = 180,000ms)
const KEEP_ALIVE_INTERVAL = 3 * 60 * 1000;

// 세션 유지 인터벌의 ID를 보관하는 변수
let sessionIntervalId = null;

// 플로팅 UI DOM 요소를 참조할 변수
let floatingBtn = null;
let panel = null;
let toggleBtn = null;
let statusText = null;

// 현재 페이지의 호스트네임
const currentHostname = window.location.hostname;

/**
 * [핵심 호환성 로직] 모든 환경(템퍼몽키, 바이올렛몽키, 크롬 확장앱, 파이어폭스 확장앱, 구형 그리스몽키)의 
 * 스토리지 규격을 하나로 통일하여 읽어오는 비동기 함수입니다.
 */
function getStorageData() {
    return new Promise((resolve) => {
        if (typeof GM_getValue !== 'undefined') {
            resolve(GM_getValue('always_sites', []));
        } else if (typeof GM !== 'undefined' && typeof GM.getValue !== 'undefined') {
            GM.getValue('always_sites', []).then(resolve);
        } else if (extBrowser && extBrowser.storage) {
            extBrowser.storage.sync.get(['always_sites'], (result) => {
                resolve(result.always_sites || []);
            });
        } else {
            resolve([]);
        }
    });
}

/**
 * 모든 환경의 스토리지 규격을 하나로 통일하여 저장하는 비동기 함수입니다.
 */
function setStorageData(sitesArray) {
    return new Promise((resolve) => {
        if (typeof GM_setValue !== 'undefined') {
            GM_setValue('always_sites', sitesArray);
            resolve();
        } else if (typeof GM !== 'undefined' && typeof GM.setValue !== 'undefined') {
            GM.setValue('always_sites', sitesArray).then(resolve);
        } else if (extBrowser && extBrowser.storage) {
            extBrowser.storage.sync.set({ always_sites: sitesArray }, resolve);
        } else {
            resolve();
        }
    });
}

/**
 * 서버로 GET 요청을 보내어 세션 만료를 방지합니다.
 */
function extendSession() {
    // origin + pathname 형태를 호출하여 루트가 아닌 실제 페이지 경로의 세션을 연장하도록 복구합니다.
    const safeUrl = window.location.origin + window.location.pathname;
    fetch(safeUrl, {
        method: "GET",
        credentials: "include"
    }).catch((err) => {
        console.error("Always: 세션 연장 요청 실패", err);
    });
}

/**
 * 세션 유지를 시작합니다.
 */
function startKeepAlive() {
    if (sessionIntervalId !== null) return;
    console.log(`Always: ${currentHostname} 사이트 세션 유지 시작됨.`);
    sessionIntervalId = setInterval(extendSession, KEEP_ALIVE_INTERVAL);
    updateUIState(true);
}

/**
 * 세션 유지를 중지합니다.
 */
function stopKeepAlive() {
    if (sessionIntervalId !== null) {
        clearInterval(sessionIntervalId);
        sessionIntervalId = null;
        console.log(`Always: ${currentHostname} 사이트 세션 유지 중지됨.`);
    }
    updateUIState(false);
}

/**
 * 현재 활성화 상태에 따라 UI 모양과 텍스트를 업데이트합니다.
 */
function updateUIState(isActive) {
    if (!floatingBtn || !panel) return;
    
    if (isActive) {
        floatingBtn.className = 'is-active';
        floatingBtn.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        statusText.innerHTML = `<span style="color:#00ff88;">동작 중</span> (3분 주기 연장)`;
        toggleBtn.textContent = "이 사이트에서 끄기";
        toggleBtn.style.background = "#ff3366";
        toggleBtn.style.color = "white";
    } else {
        floatingBtn.className = '';
        floatingBtn.style.background = '#888';
        statusText.innerHTML = `비활성화됨`;
        toggleBtn.textContent = "이 사이트에서 켜기";
        toggleBtn.style.background = "#00ff88";
        toggleBtn.style.color = "#000";
    }
}

/**
 * 스토리지에 현재 사이트를 켜거나 끄는(토글) 함수입니다.
 */
function toggleCurrentSite() {
    getStorageData().then(sitesArray => {
        let activeSites = new Set(sitesArray);
        if (activeSites.has(currentHostname)) {
            activeSites.delete(currentHostname);
            stopKeepAlive(); // 즉시 로컬 탭 반영
        } else {
            activeSites.add(currentHostname);
            startKeepAlive(); // 즉시 로컬 탭 반영
        }
        
        // 변경된 상태를 스토리지에 저장
        setStorageData(Array.from(activeSites));
    });
}

/**
 * 화면 우측 하단에 UI(플로팅 아이콘 및 패널)를 항상 주입합니다.
 */
function renderUI() {
    if (document.getElementById('always-ext-root')) return;
    
    const root = document.createElement('div');
    root.id = 'always-ext-root';
    
    floatingBtn = document.createElement('div');
    floatingBtn.id = 'always-ext-fab';
    floatingBtn.innerHTML = 'A';
    
    panel = document.createElement('div');
    panel.id = 'always-ext-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
        <div class="always-ext-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; margin-bottom:12px;">
            <h3 class="always-ext-title" style="margin:0; font-size:14px; font-weight:bold; color:white;">Always 세션 유지</h3>
            <button class="always-ext-close" id="always-ext-close-btn" style="background:none; border:none; color:#a0a0b0; cursor:pointer; font-size:16px;">&times;</button>
        </div>
        <div style="font-size:12px; margin-bottom:12px; color:#e0e0e0;">
            현재 사이트: <strong style="color:#4facfe">${currentHostname}</strong>
        </div>
        <div id="always-ext-status" style="font-size:13px; margin-bottom:12px; text-align:center; color:#e0e0e0;">
            상태 로딩 중...
        </div>
        <button id="always-ext-toggle-btn" style="width:100%; padding:10px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:13px; transition: all 0.2s;">
            설정 변경
        </button>
    `;
    
    root.appendChild(panel);
    root.appendChild(floatingBtn);
    document.body.appendChild(root);
    
    statusText = document.getElementById('always-ext-status');
    toggleBtn = document.getElementById('always-ext-toggle-btn');
    
    floatingBtn.addEventListener('click', () => {
        panel.style.display = (panel.style.display === 'flex') ? 'none' : 'flex';
    });
    
    document.getElementById('always-ext-close-btn').addEventListener('click', () => {
        panel.style.display = 'none';
    });
    
    toggleBtn.addEventListener('click', () => {
        toggleCurrentSite();
    });
}

/**
 * 사용 중인 브라우저가 사내 허가된 브라우저(크롬, 엣지, 웨일)인지 엄격하게 검증합니다.
 */
function isAllowedBrowser() {
    const ua = navigator.userAgent;
    
    // 네이버 웨일 브라우저 확인
    if (ua.includes("Whale/")) return true;
    
    // 마이크로소프트 엣지 브라우저 확인 (크로미움 기반)
    if (ua.includes("Edg/")) return true;
    
    // 구글 크롬 브라우저 확인
    // (오페라(OPR)나 삼성인터넷 등 크롬 기반의 다른 파생 브라우저는 차단)
    if (ua.includes("Chrome/") && !ua.includes("OPR/") && !ua.includes("SamsungBrowser/")) {
        // 프라이버시 브라우저인 Brave는 크롬과 똑같이 위장하므로 전용 API로 차단
        if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
            return false;
        }
        return true;
    }
    
    // 파이어폭스, 사파리, 구형 IE 등 기타 모든 브라우저 차단
    return false;
}

/**
 * 초기화 함수
 */
function init() {
    // 사내 허가된 브라우저(크롬, 엣지, 웨일)가 아니라면 안내 메시지를 띄우고 즉시 실행을 중지합니다.
    if (!isAllowedBrowser()) {
        console.warn("Always 세션 유지: 사내 정책상 크롬, 엣지, 웨일 브라우저에서만 동작합니다.");
        return;
    }

    renderUI();
    getStorageData().then(sitesArray => {
        const activeSites = new Set(sitesArray);
        if (activeSites.has(currentHostname)) {
            startKeepAlive();
        } else {
            updateUIState(false);
        }
    });
}

// 스토리지 변경 사항 실시간 감지 (타 탭 동기화용)
// 구버전 GM_addValueChangeListener 지원
if (typeof GM_addValueChangeListener !== 'undefined') {
    GM_addValueChangeListener('always_sites', (name, oldValue, newValue, remote) => {
        const newSitesArray = newValue || [];
        if (new Set(newSitesArray).has(currentHostname)) startKeepAlive();
        else stopKeepAlive();
    });
} 
// 확장앱 환경 지원
else if (extBrowser && extBrowser.storage) {
    extBrowser.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.always_sites) {
            const newSitesArray = changes.always_sites.newValue || [];
            if (new Set(newSitesArray).has(currentHostname)) startKeepAlive();
            else stopKeepAlive();
        }
    });
}

init();