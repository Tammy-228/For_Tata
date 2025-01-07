import tkinter as tk
from tkinter import filedialog
import google.generativeai as genai
import json
import os
import time
from pathlib import Path
import requests

# Gemini API配置
GOOGLE_API_KEY = "Your Google API Key"  # 替换为你的 Google API 密钥
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyAFmxUmSHr-OCvLKx_TR2hvNAU7hWl8wkg"


def select_file():
    """打开文件选择对话框让用户选择MD文件"""
    root = tk.Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(
        title="选择教育Markdown文件",
        filetypes=[("Markdown files", "*.md")]
    )
    return file_path


def read_md_content(file_path):
    """读取MD文件内容"""
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.readlines()


def extract_parenting_topics(lines):
    """提取教育主题和子主题"""
    topics = []
    current_topic = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line[0].isdigit() and '.' in line:
            # 这是主题
            current_topic = line.split('.', 1)[1].strip()
            topics.append({
                'main': current_topic,
                'sub_topics': []
            })
        elif line.startswith('*') or line.startswith('	*'):
            # 这是子主题
            if current_topic and topics:
                sub_topic = line.replace('*', '').strip()
                topics[-1]['sub_topics'].append(sub_topic)

    return topics


def get_ai_explanation(topic, content_point):
    """调用 Gemini API 获取解释"""
    try:
        headers = {
            "Content-Type": "application/json"
        }

        data = {
            "contents": [{
                "parts": [{
                    "text": f"""请详细解释以下教育主题：
主题：{topic}
具体内容：{content_point}

请提供详细的解释、实例和建议。"""
                }]
            }]
        }

        # 打印请求信息用于调试
        print(f"处理主题: {topic} - {content_point}")
        print("发送请求数据:", json.dumps(data, ensure_ascii=False, indent=2))

        response = requests.post(
            API_URL,
            headers=headers,
            json=data
        )

        # 打印响应状态和内容用于调试
        print("状态码:", response.status_code)

        if response.status_code == 200:
            result = response.json()
            # 从响应中提取文本内容
            if 'candidates' in result and result['candidates']:
                content = result['candidates'][0]['content']['parts'][0]['text']
                return content
            else:
                print("API 响应格式不正确")
                return None
        else:
            print(f"请求失败: {response.status_code}")
            print(response.text)
            return None

    except Exception as e:
        print(f"API调用出错: {type(e).__name__}: {str(e)}")
        return None


def save_explanation(topic, content_point, explanation):
    """保存解释内容到MD文件"""
    # 清理文件名中的非法字符
    safe_name = "".join(x for x in f"{topic}_{content_point}" if x.isalnum()
                        or x in (' ', '-', '_'))
    filename = f"[{safe_name}].md"

    # 确保输出目录存在
    output_dir = Path("教育学内容")
    output_dir.mkdir(exist_ok=True)

    file_path = output_dir / filename
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(f"# {topic} - {content_point}\n\n")
        file.write(explanation)

    print(f"已保存文件: {filename}")


def main():
    # 选择文件
    file_path = select_file()
    if not file_path:
        print("未选择文件")
        return

    # 读取内容
    lines = read_md_content(file_path)
    topics = extract_parenting_topics(lines)

    # 处理每个主题和内容点
    for topic in topics:
        print(f"\n处理主题: {topic['main']}")

        for sub_topic in topic['sub_topics']:
            print(f"  处理内容: {sub_topic}")

            # 获取AI解释
            explanation = get_ai_explanation(topic['main'], sub_topic)

            if explanation:
                # 保存解释内容
                save_explanation(topic['main'], sub_topic, explanation)

            # 添加延时以避免API限制
            time.sleep(2)


if __name__ == "__main__":
    main()
