import { config } from './config'

const { GEMINI_API } = config

export const geminiAPI = {
  // OCR识别
  async recognizeImage(imageBase64) {
    try {
      // 检查 base64 数据
      if (!imageBase64) {
        throw new Error('图片数据为空');
      }
      console.log('图片大小:', Math.round(imageBase64.length / 1024), 'KB');

      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${GEMINI_API.BASE_URL}/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API.API_KEY}`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            contents: [
              {
                parts: [
                  {
                    text: GEMINI_API.PROMPTS.OCR || '请识别图片中的文字内容'
                  },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
                    }
                  }
                ]
              }
            ]
          },
          success: (res) => {
            console.log('请求成功，状态码:', res.statusCode);
            console.log('响应数据:', res.data);
            resolve(res);
          },
          fail: (err) => {
            console.error('请求失败:', err);
            reject(err);
          }
        });
      });

      console.log('OCR API 响应:', response);

      // 检查响应对象
      if (!response) {
        throw new Error('请求响应为空');
      }

      // 检查状态码
      console.log('响应状态码:', response.statusCode);

      // 检查响应数据
      console.log('响应数据结构:', JSON.stringify(response.data, null, 2));

      if (!response.data) {
        throw new Error('API 返回为空');
      }

      if (response.statusCode === 400) {
        console.error('400错误详情:', response.data.error);
        throw new Error(`请求错误: ${response.data.error?.message || '未知错误'}`);
      }

      // 检查 candidates 结构
      if (response.data.candidates) {
        console.log('candidates 结构:', JSON.stringify(response.data.candidates, null, 2));
      }

      if (response.data && response.data.candidates && response.data.candidates[0]) {
        const text = response.data.candidates[0].content.parts[0].text;
        console.log('识别出的文本:', text);
        return {
          choices: [{
            message: {
              content: text || ''
            }
          }]
        };
      }

      throw new Error('API 返回格式不正确');
    } catch (error) {
      console.error('OCR识别失败:', error);
      if (error.errMsg) {
        console.error('错误详情:', error.errMsg);
      }
      throw error;
    }
  },

  // 文本翻译和解释
  async translateAndExplain(text, scene) {
    try {
      const promptText = GEMINI_API.PROMPTS.TRANSLATE[scene] + text;
      console.log('翻译提示词:', promptText);
      
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${GEMINI_API.BASE_URL}/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API.API_KEY}`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            contents: [
              {
                parts: [
                  {
                    text: promptText
                  }
                ]
              }
            ]
          },
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });

      console.log('Translate API response:', response);

      // 处理响应
      if (response.data && response.data.candidates && response.data.candidates[0]) {
        const result = response.data.candidates[0].content.parts[0].text || '';
        console.log('Translate result:', result);
        return { 
          choices: [{ 
            message: { 
              content: result 
            } 
          }] 
        };
      }
      throw new Error('翻译API返回格式不正确');
    } catch (error) {
      console.error('文本处理失败:', error)
      throw error
    }
  },

  // 语音合成
  async textToSpeech(text) {
    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://api.siliconflow.cn/v1/audio/speech',
          method: 'POST',
          header: {
            'Authorization':'Bearer sk-gcvfdmwghjpqhrltuvlvzymnjhiclzfudqskncteqtbqduxs',
            'Content-Type': 'application/json'
          },
          data: {
            model: "FunAudioLLM/CosyVoice2-0.5B",
            input: text,
            voice: "FunAudioLLM/CosyVoice2-0.5B:alex",
            response_format: "mp3",
            sample_rate: 32000,
            stream: false,
            speed: 1.0,
            gain: 0
          },
          responseType: 'arraybuffer',
          success: (res) => {
            if (res.statusCode === 200) {
              const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_audio.mp3`;
              wx.getFileSystemManager().writeFile({
                filePath: tempFilePath,
                data: res.data,
                encoding: 'binary',
                success: () => resolve(tempFilePath),
                fail: (err) => reject(new Error('保存音频失败: ' + err.errMsg))
              });
            } else {
              reject(new Error('语音合成失败: ' + res.statusCode));
            }
          },
          fail: reject
        });
      });

      return response;
    } catch (error) {
      console.error('语音合成失败:', error);
      throw error;
    }
  },

  async chat(prompt) {
    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${GEMINI_API.BASE_URL}/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API.API_KEY}`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          },
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });

      console.log('Chat API response:', response);

      if (response.data && response.data.candidates && response.data.candidates[0]) {
        const result = response.data.candidates[0].content.parts[0].text || '';
        console.log('Chat result:', result);
        return { 
          choices: [{ 
            message: { 
              content: result 
            } 
          }] 
        };
      } else {
        console.error('Invalid API response:', response);
        throw new Error('API 返回格式不正确');
      }
    } catch (error) {
      console.error('Gemini chat API error:', error);
      throw error;
    }
  }
}

export const zhipuAPI = {
  // ... 现有代码保持不变
}