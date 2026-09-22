const fs = require('fs');
const { execSync } = require('child_process');

// 버전 숫자를 분석하여 맨 마지막 자리를 +1 해주는 함수
function bumpVersion(version) {
    const parts = version.split('.');
    if (parts.length > 0) {
        const last = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(last)) {
            parts[parts.length - 1] = (last + 1).toString();
            return parts.join('.');
        }
    }
    return version;
}

try {
    let newVersion = '업데이트';
    
    // 1. manifest.json 버전 업데이트 (확장앱용)
    if (fs.existsSync('manifest.json')) {
        const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
        manifest.version = bumpVersion(manifest.version);
        newVersion = manifest.version;
        fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2), 'utf8');
        console.log(`   - manifest.json 버전이 v${manifest.version}(으)로 업데이트 되었습니다.`);
    }

    // 2. loader.user.js 버전 업데이트 (유저스크립트용)
    if (fs.existsSync('loader.user.js')) {
        let loaderCode = fs.readFileSync('loader.user.js', 'utf8');
        loaderCode = loaderCode.replace(/(\/\/\s*@version\s+)([0-9\.]+)/, (match, p1, p2) => {
            return p1 + bumpVersion(p2);
        });
        fs.writeFileSync('loader.user.js', loaderCode, 'utf8');
        console.log(`   - loader.user.js 버전이 자동으로 업데이트 되었습니다.`);
    }

    console.log("\n>> 2. Github 저장소 자동 업로드 진행 중...");

    // 모든 변경 파일 추적
    execSync('git add .', { stdio: 'ignore' });
    
    // 타임스탬프를 포함한 커밋 메시지 생성
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const commitMsg = `Auto Deploy v${newVersion} (${timeStr})`;
    
    // 커밋 시도 (변경된 내용이 없으면 에러가 발생하므로 try-catch로 무시)
    try {
        execSync(`git commit -m "${commitMsg}"`, { stdio: 'ignore' });
        console.log(`   - 변경사항 커밋 완료: [${commitMsg}]`);
    } catch (e) {
        console.log("   - 변경된 파일이 없어 커밋 단계를 생략합니다.");
    }
    
    // 깃허브 원격 저장소 푸시 시도 (main 브랜치가 실패하면 master로 재시도)
    try {
        execSync('git push origin main', { stdio: 'ignore' });
        console.log("   - Github(main) 업로드 완료!");
    } catch (e) {
        console.log("   - main 브랜치 업로드 실패. master 브랜치로 재시도합니다...");
        execSync('git push origin master', { stdio: 'ignore' });
        console.log("   - Github(master) 업로드 완료!");
    }

} catch (error) {
    console.error("\n[오류 발생] 배포를 완료하지 못했습니다:", error.message);
    console.log("Git 원격 저장소가 올바르게 연결되어 있는지 확인해 주세요.");
}
