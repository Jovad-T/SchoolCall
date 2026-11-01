export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { url, riroId, riroPw, year, month } = body || {};
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: '리로스쿨 URL이 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let targetUrl = String(url).trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const parsedUrl = new URL(targetUrl);
    const origin = parsedUrl.origin;
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    let cookieHeader = '';

    if (riroId && riroPw) {
      for (const loginPath of ['/user.php?action=signin', '/user.php', '/member/login.php']) {
        try {
          const formData = new URLSearchParams();
          formData.append('id', String(riroId).trim());
          formData.append('pw', String(riroPw).trim());
          formData.append('user_id', String(riroId).trim());
          formData.append('user_pw', String(riroPw).trim());
          formData.append('action', 'signin');

          const loginRes = await fetch(origin + loginPath, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': ua,
              'Referer': origin + '/'
            },
            body: formData.toString(),
            redirect: 'manual'
          });

          const setCookie = loginRes.headers.get('set-cookie');
          if (setCookie) {
            cookieHeader = setCookie
              .split(/,(?=\s*[a-zA-Z0-9_-]+=)/)
              .map(c => c.split(';')[0].trim())
              .join('; ');
            if (cookieHeader) break;
          }
        } catch (e) {}
      }
    }

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': origin + '/',
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {})
      }
    });

    const html = await res.text();
    const isGeoBlocked =
      res.status === 403 ||
      html.includes('해외 IP') ||
      html.includes('접속이 제한되었습니다') ||
      html.includes('국가에서는 접속이 제한');

    return new Response(
      JSON.stringify({
        success: !isGeoBlocked && html.length > 50,
        status: res.status,
        isGeoBlocked,
        data: html
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || '리로스쿨 조회 중 오류 발생' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
