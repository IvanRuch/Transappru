/**
 * Скрипт для тестовой отправки FCM push-уведомления.
 *
 * Использование:
 *   node test-push.js
 *
 * Для отправки с data payload (навигация):
 *   node test-push.js --data '{"screen":"/(authenticated)/notifications"}'
 */

const https = require('https');
const crypto = require('crypto');

// --- КОНФИГУРАЦИЯ ---
const FCM_TOKEN = 'fxrbpUUYTKOb5YUUJyiv9C:APA91bEWF03M_eY2Fs0O_5DvjssBpeo_RbdcEYBX-lyWT8fbC6RzBPO6ZGjPDlGWhQyxvd1SRhq5XMsV61uSkrXv-umAXbfo0pgR_whQJT76Ybw0wLsG3P0';
const PROJECT_ID = 'transapp-d3b24';
const CLIENT_EMAIL = 'firebase-adminsdk-zd85u@transapp-d3b24.iam.gserviceaccount.com';
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDCHFXQtQEYeCP8
i4bSuEK40h80qWIK5vtYzAzUYvv15UJbiRZD8/l7qBXNNgkkx1+bUevKlL4voHhK
Fu8klcZShG9vm0PKGfW80lqwjm57fXf8drmsYh6PlieN+hWcvXUNxoQ7vNc2Gr76
rksJXEC119TI0txoX1h8vhxi3tVom+QMeFOT3owyYAEINCHA2z/sjHI3NZp+uug5
AMAyyh0A2xmAmi9MNM/18VH+iqE+PUdjDnReM2ZGXnWTT+LSM295KHKKd3Lr5exK
pZXnukpp9fHVqzVj3VuubEOOb6H507iBCcZxtXTCIGwWNUw73yMIt9qFS6aUfg9K
i4jL4EwBAgMBAAECggEADs4Hc4wiocGkCQKBTXgVSrBoBeW3Xxp/6CVkAxzrl7Ud
KwsZIiStDhPjWcv5xY7ZSWjloYVXvh0wn4IBSlqMDkYgk7QVZwg02Gp41Ud/wLZw
nNZXUgEH0K7EpI0C8fn3QA44jq/YAD3o/AioG3YoT1Y/WfPPMLy47Ia5docFYt2C
7omSCjK77HJu69frCrlpNa7SEHpnqLJJNqClLbyl4gTBmPmC/PJ+BB2RWDGNpMwA
7con9sf+64VYCyjRS0ff0hRELIf9zSvCPtgGTyvZdLSQkDpnzCMBrXPc1Lksfmd1
mFdkpKKjCsZ5r92GVq3BZwaIBFnT5ag5qtKvtmgDYQKBgQDoFxZ7oet+uIlZZn5s
3fsQDuSoKIibiRQEMamPgBPMxHc1cERGtuBIPqvK2qpI/unApJof3Pc2rEZ+LFYM
NSNXCr/tI/zEKJITUV72/NTFqle5Sl3yEnqUDzw94MzeuW3YKsS1CTKzDUiq6woV
UtRWIUel4iLizxnfUyTVFfxeCQKBgQDWG51GZyRKO9LyzTm4VgKh+AegTS+JcNPj
V3lpefLlItOcen/bFxXYK3MI6A/hgyC8GGjr862KdQaZ4gCZ5IZ5fJ24jJnA2/wR
lknQWyB8jR5fodADtM4PU09Z+W8tfmwSy1lF9Cklc+0qHfhSU2LV4MISOgWk1ncl
Y1HHWMt8OQKBgQCpxdnIblWZyNuP7g2lDWxN/tb8u0nSnJ9rwfhK5GGXdE/PY2RO
ZhACSPXZ2cKeyvmq1b14eWbNM5ANU9lN7MEBNvfWPHD1/Md+IhPZkHEEdurcu62l
GidYjxx+FydF9VaIviBOXYAcwibaADzMBF8W8hk7GwRx7RT77BIRXZfSIQKBgCLL
FgHM3Q7bLeqbAxg7ke30OnkIUgNJvIUjP+2uDZTC1hSFq6VU2Q3p8aWu4HXLM1Sd
ut8tGDR50/rJyUM46clwQMkuwAWhOhM5kwEy7dKPtDHiP8V6akn/RdPfPvvroXBk
bzt48/7MGexQNnxaZKNRBPilSSmCWJZQz4dPnLGxAoGAJV67TRzsKMnSzQAv4o/l
GxDgGm/7Gtp7p8KVmVXsLoLgbMh8Xp1sHt0+7+QzUt0uBpsII7J2l9ga88Kh8DeY
4pWWevkqooUBtmDkysoCfRsGGR8Q4eVssFL5a8TrX6RsMbZiZsVi0J22j8lO71QC
UDR4piSdC+7ZD0jR5LpYlJU=
-----END PRIVATE KEY-----`;

// --- JWT и OAuth2 ---

function base64url(data) {
  return data.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const segments = [
    base64url(Buffer.from(JSON.stringify(header))),
    base64url(Buffer.from(JSON.stringify(payload))),
  ];

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(segments.join('.'));
  const signature = base64url(sign.sign(PRIVATE_KEY));

  return segments.join('.') + '.' + signature;
}

function getAccessToken() {
  return new Promise((resolve, reject) => {
    const jwt = createJWT();
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.access_token) resolve(parsed.access_token);
        else reject(new Error('Failed to get access token: ' + data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// --- Отправка Push ---

function sendPush(accessToken, message) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ message });

    const req = https.request(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// --- Main ---

(async () => {
  try {
    // Парсим --data аргумент если есть
    let extraData = {};
    const dataIdx = process.argv.indexOf('--data');
    if (dataIdx !== -1 && process.argv[dataIdx + 1]) {
      extraData = JSON.parse(process.argv[dataIdx + 1]);
    }

    console.log('Getting OAuth2 access token...');
    const accessToken = await getAccessToken();
    console.log('Access token obtained.');

    const message = {
      token: FCM_TOKEN,
      notification: {
        title: 'Тестовое уведомление',
        body: 'Проверка push-уведомлений ' + new Date().toLocaleTimeString(),
      },
      ...(Object.keys(extraData).length > 0 ? { data: extraData } : {}),
    };

    console.log('Sending push...');
    console.log('Message:', JSON.stringify(message, null, 2));
    const result = await sendPush(accessToken, message);
    console.log('Done!', result.name ? `Message ID: ${result.name}` : '');
  } catch (err) {
    console.error('Error:', err.message || err);
  }
})();