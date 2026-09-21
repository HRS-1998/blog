## 使用方法

**安装**

`npm install crypto-js`

**引入**

```js
import CryptoJS from 'crypto-js';

const key = CryptoJS.enc.Utf8.parse('r0TzEqU2qJNXGtYg'); // 密钥
const iv = CryptoJS.enc.Utf8.parse('r0TzEqU2qJNXGtYg'); // 添加密钥偏移量


// AES（高级加密标准）
// AES 是一种对称加密算法，被广泛应用于保护数据的机密性
// 它支持不同的密钥长度（128位、192位和256位）和多种加密模式（如 ECB、CBC 等）
// AES 加密
function encryptAES(encryptData: any) {
  const srcs = CryptoJS.enc.Utf8.parse(encryptData);
  const encrypted = CryptoJS.AES.encrypt(srcs, key, {
    iv, // 使用密钥偏移量
    mode: CryptoJS.mode.ECB,
    // crypto-js 库还支持：
   // 1. ECB（电子密码本模式）2. CFB（密码反馈模式）3. OFB（输出反馈模式）4. CTR（计数器模式） 5.CBC（密码块链模式）
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString();
}


// AES 解密
function decryptAES(encryptData: any) {
  try {
    const decrypt = CryptoJS.AES.decrypt(encryptData, key, {
      iv, // 使用密钥偏移量
      mode: CryptoJS.mode.ECB, // 使用 CBC 模式
      padding: CryptoJS.pad.Pkcs7
    });
    return CryptoJS.enc.Utf8.stringify(decrypt);
  } catch (e) {
    return null; // 返回 null 或其他自定义的错误标识
  }
}


export { encryptAES, decryptAES };
```
