const crypto = require('crypto');

function sign(params, apiSecret) {
  const keys = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort();

  const toSign = keys.map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const mode = body.mode || 'upload';

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing CLOUDINARY_API_SECRET' })
      };
    }

    const timestamp = Math.floor(Date.now() / 1000);

    if (mode === 'upload') {
      const folder = body.folder || process.env.CLOUDINARY_FOLDER || 'products';
      const upload_preset = body.upload_preset || process.env.CLOUDINARY_UPLOAD_PRESET || '';

      const paramsToSign = { folder, timestamp };
      if (upload_preset) paramsToSign.upload_preset = upload_preset;

      const signature = sign(paramsToSign, apiSecret);
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
        body: JSON.stringify({ signature, timestamp, folder, upload_preset })
      };
    }

    if (mode === 'destroy') {
      const public_id = body.public_id;
      if (!public_id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing public_id' }) };
      }
      const paramsToSign = { public_id, timestamp };
      const signature = sign(paramsToSign, apiSecret);
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
        body: JSON.stringify({ signature, timestamp, public_id })
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid mode' }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message || 'Unknown error' }) };
  }
};
