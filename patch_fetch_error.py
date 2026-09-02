import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_catch = """    } catch (err: any) {
      console.error(err);
      alert('❌ 서버 연동 실패: ' + (err.message || '학교 내부망(IP) 접근 제한이거나 서버가 꺼져있을 수 있습니다. (Electron PC 앱 권장)'));
    } finally {"""

new_catch = """    } catch (err: any) {
      console.error(err);
      if (err.message === 'Failed to fetch') {
         alert('❌ 서버 연동 실패 (Failed to fetch)\\n웹 브라우저 보안 정책(CORS/Mixed Content)으로 인해 웹 환경에서는 로컬 내부망 IP 주소로 직접 접근할 수 없습니다.\\n제공된 Electron PC 전용 앱을 설치하여 사용하시면 정상적으로 내부망 서버 연동이 가능합니다.');
      } else {
         alert('❌ 서버 연동 실패: ' + (err.message || '학교 내부망(IP) 접근 제한이거나 서버가 꺼져있을 수 있습니다. (Electron PC 앱 권장)'));
      }
    } finally {"""

content = content.replace(old_catch, new_catch)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
