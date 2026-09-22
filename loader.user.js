// ==UserScript==
// @name         Always - 세션 유지 (실시간 원격 로더)
// @namespace    https://github.com/bundanggame-sys/always
// @version      1.12
// @description  최신 content.js 코드를 실시간으로 불러와 즉시 실행하는 바이올렛몽키/템퍼몽키 호환 뼈대 스크립입니다.
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function() {
    'use strict';
    
    // 알려주신 GitHub 저장소의 Raw 링크로 연결합니다. (기본 브랜치가 main 기준입니다)
    const REMOTE_SCRIPT_URL = 'https://raw.githubusercontent.com/bundanggame-sys/always/main/content.js';
    
    // 브라우저 캐싱(기억)을 무시하고 무조건 최신 코드를 받아오기 위해 시간값을 파라미터로 붙입니다.
    const noCacheUrl = REMOTE_SCRIPT_URL + "?t=" + new Date().getTime();

    // 템퍼몽키(GM_xmlhttpRequest)와 바이올렛몽키(GM.xmlHttpRequest 등)의 API 차이를 자동으로 감지하여 호환되도록 처리합니다.
    const requestAPI = typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : 
                       (typeof GM !== 'undefined' && GM.xmlHttpRequest ? GM.xmlHttpRequest : null);

    if (!requestAPI) {
        console.error("Always 로더: 네트워크 통신 API를 지원하지 않는 확장앱 환경입니다.");
        return;
    }

    // 감지된 API를 사용해 원격 서버에서 최신 코드를 다운로드합니다.
    requestAPI({
        method: "GET",
        url: noCacheUrl,
        onload: function(response) {
            if (response.status === 200) {
                try {
                    // 가져온 코드를 샌드박스 내부에서 즉시 실행합니다.
                    // eval을 사용해야만 다운받은 코드가 스토리지 권한 등 유저스크립트 전용 권한을 그대로 물려받아 사용할 수 있습니다.
                    eval(response.responseText);
                } catch (e) {
                    console.error("Always 로더: 최신 스크립트 실행 중 문법 오류 발생", e);
                }
            } else {
                console.error("Always 로더: 스크립트 다운로드 실패. HTTP 상태 코드:", response.status);
            }
        },
        onerror: function(err) {
            console.error("Always 로더: 네트워크 오류로 최신 스크립트를 가져오지 못했습니다.", err);
        }
    });
})();
