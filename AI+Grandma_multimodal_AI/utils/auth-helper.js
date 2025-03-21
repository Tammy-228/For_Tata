// 引入第三方 JWT 库（需要先安装）
const jwt = require('jsonwebtoken');

export const generateToken = (apiKey) => {
  // 解析 API Key
  const [id, secret] = apiKey.split('.');
  
  // 准备 JWT payload
  const payload = {
    api_key: id,
    exp: Math.floor(Date.now() / 1000) + 60 * 10, // 10分钟有效期
    timestamp: Math.floor(Date.now() / 1000)
  };

  // 生成 JWT
  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}; 