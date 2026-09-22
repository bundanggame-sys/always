// [크로스 브라우징] 네임스페이스 통일
const extBrowser = window.browser || window.chrome;

// DOM 요소 캐싱
const hostnameDisplay = document.getElementById('hostname-display');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const toggleBtn = document.getElementById('toggle-btn');
const btnText = document.getElementById('btn-text');
const siteListContainer = document.getElementById('site-list');

// 현재 접속 중인 탭의 호스트네임
let currentHostname = "";
// 스토리지에 저장된 사이트 목록 (Set으로 관리하여 중복 방지)
let activeSites = new Set();

// 팝업이 로드될 때 실행되는 초기화 로직
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 현재 탭의 URL 정보 가져오기
    extBrowser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].url) {
            try {
                const url = new URL(tabs[0].url);
                currentHostname = url.hostname;
                hostnameDisplay.textContent = currentHostname;
            } catch (e) {
                // chrome:// 나 about: 같은 특수 페이지 처리
                currentHostname = "적용 불가능한 페이지";
                hostnameDisplay.textContent = currentHostname;
                toggleBtn.disabled = true;
                toggleBtn.style.opacity = '0.5';
                toggleBtn.style.cursor = 'not-allowed';
            }
        }
        
        // 2. 저장된 사이트 목록 로드 및 UI 업데이트
        loadSites();
    });
});

// 스토리지에서 사이트 목록을 불러오고 UI를 업데이트하는 함수
function loadSites() {
    extBrowser.storage.sync.get(['always_sites'], (result) => {
        // 저장된 배열이 있으면 Set으로 변환, 없으면 빈 Set
        const sitesArray = result.always_sites || [];
        activeSites = new Set(sitesArray);
        
        updateUI();
        renderSiteList();
    });
}

// 현재 사이트가 활성화 상태인지 확인하여 UI(상태 표시, 버튼 색상)를 업데이트하는 함수
function updateUI() {
    if (!currentHostname || currentHostname === "적용 불가능한 페이지") return;

    const isActive = activeSites.has(currentHostname);

    if (isActive) {
        statusDot.className = 'dot active';
        statusText.textContent = '세션 유지 동작 중';
        
        toggleBtn.className = 'primary-btn remove-mode';
        btnText.textContent = '이 사이트에서 끄기';
    } else {
        statusDot.className = 'dot inactive';
        statusText.textContent = '비활성화됨';
        
        toggleBtn.className = 'primary-btn';
        btnText.textContent = '이 사이트에서 켜기';
    }
}

// 등록된 사이트 목록을 HTML 리스트로 렌더링하는 함수
function renderSiteList() {
    siteListContainer.innerHTML = '';
    
    if (activeSites.size === 0) {
        siteListContainer.innerHTML = '<li style="justify-content:center; color:#a0a0b0;">등록된 사이트가 없습니다.</li>';
        return;
    }

    activeSites.forEach(site => {
        const li = document.createElement('li');
        
        const siteText = document.createElement('span');
        siteText.textContent = site;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-item-btn';
        removeBtn.innerHTML = '&times;'; // X 마크
        removeBtn.title = '삭제';
        // 특정 사이트를 목록에서 직접 제거하는 이벤트
        removeBtn.addEventListener('click', () => {
            activeSites.delete(site);
            saveSites();
        });

        li.appendChild(siteText);
        li.appendChild(removeBtn);
        siteListContainer.appendChild(li);
    });
}

// 현재 상태(Set)를 스토리지에 저장하고 UI를 갱신하는 함수
function saveSites() {
    // Set을 배열로 변환하여 저장
    const sitesArray = Array.from(activeSites);
    extBrowser.storage.sync.set({ always_sites: sitesArray }, () => {
        updateUI();
        renderSiteList();
    });
}

// 메인 토글 버튼 클릭 이벤트
toggleBtn.addEventListener('click', () => {
    if (!currentHostname || currentHostname === "적용 불가능한 페이지") return;

    // 만약 이미 등록되어 있다면 삭제, 없다면 추가
    if (activeSites.has(currentHostname)) {
        activeSites.delete(currentHostname);
    } else {
        activeSites.add(currentHostname);
    }
    
    // 변경사항 저장
    saveSites();
});
